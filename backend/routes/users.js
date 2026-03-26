const express = require('express')
const router = express.Router()
const { randomUUID } = require('crypto')
const supabase = require('../lib/supabase')
const {
  createStaticQrToken,
  buildQrLoginUrl,
  quickChartQrUrl,
} = require('../lib/qrAuth')

// Middleware to verify authentication
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    req.user = user
    next()
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' })
  }
}

function qrPayloadFromProfile(profile) {
  const token = createStaticQrToken(profile.user_key)
  const loginUrl = buildQrLoginUrl(token)
  return {
    token,
    loginUrl,
    qrImageUrl: quickChartQrUrl(loginUrl),
  }
}

/**
 * @route GET /api/users/me/profile
 * @desc Get current user profile and QR login details
 */
router.get('/me/profile', authenticate, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single()

    if (error || !profile) {
      return res.status(404).json({ error: 'User profile not found' })
    }

    const qr = qrPayloadFromProfile(profile)
    return res.json({ profile, qr })
  } catch (error) {
    console.error('Get my profile error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @route PUT /api/users/me/profile
 * @desc Update current user profile + auth email/password
 * @body { username?: string, email?: string, password?: string }
 */
router.put('/me/profile', authenticate, async (req, res) => {
  try {
    const { username, email, password } = req.body
    const userId = req.user.id

    const { data: existingUser, error: existingError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (existingError || !existingUser) {
      return res.status(404).json({ error: 'User profile not found' })
    }

    if (username && username !== existingUser.username) {
      const { data: usernameCheck } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .neq('id', userId)
        .single()

      if (usernameCheck) {
        return res.status(409).json({ error: 'Username already exists' })
      }
    }

    if (email || password) {
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(userId, {
        ...(email ? { email } : {}),
        ...(password ? { password } : {}),
      })

      if (authUpdateError) {
        return res.status(400).json({ error: authUpdateError.message })
      }
    }

    const updates = {
      ...(username ? { username } : {}),
      ...(email ? { email } : {}),
      updated_at: new Date().toISOString(),
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('*')
      .single()

    if (updateError || !updatedProfile) {
      return res.status(500).json({ error: updateError?.message || 'Failed to update profile' })
    }

    const qr = qrPayloadFromProfile(updatedProfile)
    return res.json({ profile: updatedProfile, qr })
  } catch (error) {
    console.error('Update my profile error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @route POST /api/users/me/qr/regenerate
 * @desc Regenerate current user QR key
 */
router.post('/me/qr/regenerate', authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    const newUserKey = randomUUID()

    const { data: updatedProfile, error } = await supabase
      .from('users')
      .update({
        user_key: newUserKey,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('*')
      .single()

    if (error || !updatedProfile) {
      return res.status(500).json({ error: error?.message || 'Failed to regenerate QR code' })
    }

    const qr = qrPayloadFromProfile(updatedProfile)
    return res.json({ profile: updatedProfile, qr })
  } catch (error) {
    console.error('Regenerate QR error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @route GET /api/users
 * @desc Get all users (with optional filters)
 * @query { organization_id?: string, role?: string }
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { organization_id, role } = req.query

    let query = supabase.from('users').select('*')

    // Apply filters
    if (organization_id) {
      query = query.eq('organization_id', organization_id)
    }
    if (role) {
      query = query.eq('role', role)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json(data)
  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @route POST /api/users/create-profile
 * @desc Create a profile for the current authenticated user if it doesn't exist
 * @body { username?: string, organization_id?: string, role?: 'admin' | 'guest' | 'basic' }
 */
router.post('/create-profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    const { username, organization_id, role } = req.body

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      return res.json({
        message: 'Profile already exists',
        profile: existingProfile,
      })
    }

    // Get user email from auth (required field)
    let userEmail = req.user.email
    if (!userEmail) {
      // Fetch from auth.users if not in req.user
      const { data: authUser } = await supabase.auth.admin.getUserById(userId)
      if (!authUser?.user?.email) {
        return res.status(400).json({ error: 'User email is required but not found' })
      }
      userEmail = authUser.user.email
    }

    // Generate defaults
    const defaultUsername = username ||
      (userEmail ? userEmail.split('@')[0] : `user_${userId.substring(0, 8)}`)
    const defaultOrgId = organization_id || 'default-org'
    const defaultRole = role || 'basic'

    // Validate role
    if (defaultRole && !['admin', 'guest', 'basic'].includes(defaultRole)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, guest, or basic' })
    }

    // Ensure username is unique
    let finalUsername = defaultUsername
    let suffix = 1
    while (true) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', finalUsername)
        .single()

      if (!existingUser) {
        break
      }
      finalUsername = `${defaultUsername}_${suffix}`
      suffix++
    }

    // Create profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert({
        id: userId,
        username: finalUsername,
        organization_id: defaultOrgId,
        role: defaultRole,
        email: userEmail,
        user_key: randomUUID(),
        type: 'user', // Default type, adjust if your schema requires different values
      })
      .select()
      .single()

    if (profileError) {
      return res.status(500).json({
        error: 'Failed to create user profile: ' + profileError.message
      })
    }

    res.status(201).json({
      message: 'Profile created successfully',
      profile,
    })
  } catch (error) {
    console.error('Create profile error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @route GET /api/users/:id
 * @desc Get user by ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' })
      }
      return res.status(500).json({ error: error.message })
    }

    res.json(data)
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @route POST /api/users
 * @desc Create a new user
 * @body { username: string, email: string, password: string, organization_id: string, role: 'admin' | 'guest' | 'basic' }
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { username, email, password, organization_id, role } = req.body

    // Validation
    if (!username || !email || !password || !organization_id || !role) {
      return res.status(400).json({
        error: 'Missing required fields: username, email, password, organization_id, role'
      })
    }

    if (!['admin', 'guest', 'basic'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, guest, or basic' })
    }

    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' })
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        username,
      },
    })

    if (authError) {
      return res.status(400).json({ error: authError.message })
    }

    // Create user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        username,
        organization_id,
        role,
        email,
        user_key: randomUUID(),
        type: 'user', // Default type, adjust if your schema requires different values
      })
      .select()
      .single()

    if (profileError) {
      // Cleanup: delete auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return res.status(500).json({ error: 'Failed to create user profile: ' + profileError.message })
    }

    res.status(201).json(profile)
  } catch (error) {
    console.error('Create user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @route PUT /api/users/:id
 * @desc Update user by ID
 * @body { username?: string, organization_id?: string, role?: 'admin' | 'guest' | 'basic' }
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const { username, organization_id, role } = req.body

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Validate role if provided
    if (role && !['admin', 'guest', 'basic'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, guest, or basic' })
    }

    // Check username uniqueness if changing username
    if (username && username !== existingUser.username) {
      const { data: usernameCheck } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single()

      if (usernameCheck) {
        return res.status(409).json({ error: 'Username already exists' })
      }
    }

    // Build update object
    const updates = {}
    if (username) updates.username = username
    if (organization_id) updates.organization_id = organization_id
    if (role) updates.role = role
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json(data)
  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @route DELETE /api/users/:id
 * @desc Delete user by ID
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !existingUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Delete auth user (this will cascade delete the profile due to ON DELETE CASCADE)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(id)

    if (deleteError) {
      return res.status(500).json({ error: 'Failed to delete user: ' + deleteError.message })
    }

    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router

