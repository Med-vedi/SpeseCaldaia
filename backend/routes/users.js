const express = require('express')
const router = express.Router()
const { randomUUID } = require('crypto')
const pool = require('../lib/db')
const authenticate = require('../middleware/authenticate')
const { hashPassword } = require('../lib/passwords')
const { createStaticQrToken, buildQrLoginUrl, quickChartQrUrl } = require('../lib/qrAuth')

function toPublicUser(row) {
  if (!row) return row
  const { password_hash, ...publicUser } = row
  return publicUser
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
    const { rows } = await pool.query('SELECT * FROM public.users WHERE id = $1', [req.user.id])
    const profile = rows[0]

    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' })
    }

    const qr = qrPayloadFromProfile(profile)
    return res.json({ profile: toPublicUser(profile), qr })
  } catch (error) {
    console.error('Get my profile error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @route GET /api/users/me/organization-qr
 * @desc Get QR codes for users in the same organization
 */
router.get('/me/organization-qr', authenticate, async (req, res) => {
  try {
    const { rows: currentRows } = await pool.query('SELECT * FROM public.users WHERE id = $1', [
      req.user.id,
    ])
    const currentProfile = currentRows[0]

    if (!currentProfile) {
      return res.status(404).json({ error: 'Current user profile not found' })
    }

    const { rows: orgUsers } = await pool.query(
      'SELECT * FROM public.users WHERE organization_id = $1 ORDER BY username ASC',
      [currentProfile.organization_id]
    )

    const users = orgUsers.map((profile) => ({
      id: profile.id,
      username: profile.username,
      email: profile.email,
      role: profile.role,
      qr: qrPayloadFromProfile(profile),
      isCurrentUser: profile.id === req.user.id,
    }))

    return res.json({ organization_id: currentProfile.organization_id, users })
  } catch (error) {
    console.error('Get organization QR codes error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @route PUT /api/users/me/profile
 * @desc Update current user profile (username, email, password)
 * @body { username?: string, email?: string, password?: string }
 */
router.put('/me/profile', authenticate, async (req, res) => {
  try {
    const { username, email, password } = req.body
    const userId = req.user.id

    const { rows: existingRows } = await pool.query('SELECT * FROM public.users WHERE id = $1', [
      userId,
    ])
    const existingUser = existingRows[0]

    if (!existingUser) {
      return res.status(404).json({ error: 'User profile not found' })
    }

    if (username && username !== existingUser.username) {
      const { rows: usernameCheck } = await pool.query(
        'SELECT id FROM public.users WHERE username = $1 AND id != $2',
        [username, userId]
      )
      if (usernameCheck[0]) {
        return res.status(409).json({ error: 'Username already exists' })
      }
    }

    const updates = {}
    if (username) updates.username = username
    if (email) updates.email = email
    if (password) updates.password_hash = await hashPassword(String(password))
    updates.updated_at = new Date().toISOString()

    const setKeys = Object.keys(updates)
    const setClause = setKeys.map((key, idx) => `${key} = $${idx + 2}`).join(', ')
    const { rows } = await pool.query(
      `UPDATE public.users SET ${setClause} WHERE id = $1 RETURNING *`,
      [userId, ...setKeys.map((key) => updates[key])]
    )
    const updatedProfile = rows[0]

    const qr = qrPayloadFromProfile(updatedProfile)
    return res.json({ profile: toPublicUser(updatedProfile), qr })
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

    const { rows } = await pool.query(
      `UPDATE public.users SET user_key = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [userId, newUserKey]
    )
    const updatedProfile = rows[0]

    if (!updatedProfile) {
      return res.status(500).json({ error: 'Failed to regenerate QR code' })
    }

    const qr = qrPayloadFromProfile(updatedProfile)
    return res.json({ profile: toPublicUser(updatedProfile), qr })
  } catch (error) {
    console.error('Regenerate QR error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @route POST /api/users/:id/force-password
 * @desc Admin-only: force reset password of another user in same organization
 * @body { password: string }
 */
router.post('/:id/force-password', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const { password } = req.body

    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const { rows: requesterRows } = await pool.query(
      'SELECT id, role, organization_id FROM public.users WHERE id = $1',
      [req.user.id]
    )
    const requesterProfile = requesterRows[0]

    if (!requesterProfile) {
      return res.status(403).json({ error: 'Requester profile not found' })
    }

    if (requesterProfile.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can force update user passwords' })
    }

    const { rows: targetRows } = await pool.query(
      'SELECT id, organization_id FROM public.users WHERE id = $1',
      [id]
    )
    const targetProfile = targetRows[0]

    if (!targetProfile) {
      return res.status(404).json({ error: 'Target user not found' })
    }

    if (targetProfile.organization_id !== requesterProfile.organization_id) {
      return res.status(403).json({ error: 'Cannot update users outside your organization' })
    }

    const passwordHash = await hashPassword(String(password))
    await pool.query(
      'UPDATE public.users SET password_hash = $2, updated_at = NOW() WHERE id = $1',
      [id, passwordHash]
    )

    return res.json({ message: 'User password updated successfully' })
  } catch (error) {
    console.error('Force password update error:', error)
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

    const conditions = []
    const params = []
    if (organization_id) {
      params.push(organization_id)
      conditions.push(`organization_id = $${params.length}`)
    }
    if (role) {
      params.push(role)
      conditions.push(`role = $${params.length}`)
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const { rows } = await pool.query(
      `SELECT * FROM public.users ${whereClause} ORDER BY created_at DESC`,
      params
    )

    res.json(rows.map(toPublicUser))
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

    const { rows: existingRows } = await pool.query('SELECT * FROM public.users WHERE id = $1', [
      userId,
    ])
    if (existingRows[0]) {
      return res.json({
        message: 'Profile already exists',
        profile: toPublicUser(existingRows[0]),
      })
    }

    const userEmail = req.user.email
    if (!userEmail) {
      return res.status(400).json({ error: 'User email is required but not found' })
    }

    // Generate defaults
    const defaultUsername = username || userEmail.split('@')[0]
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
      const { rows: existingUserRows } = await pool.query(
        'SELECT id FROM public.users WHERE username = $1',
        [finalUsername]
      )
      if (!existingUserRows[0]) {
        break
      }
      finalUsername = `${defaultUsername}_${suffix}`
      suffix++
    }

    const { rows } = await pool.query(
      `INSERT INTO public.users (id, username, organization_id, role, email, user_key, type)
       VALUES ($1, $2, $3, $4, $5, $6, 'user')
       RETURNING *`,
      [userId, finalUsername, defaultOrgId, defaultRole, userEmail, randomUUID()]
    )

    res.status(201).json({
      message: 'Profile created successfully',
      profile: toPublicUser(rows[0]),
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

    const { rows } = await pool.query('SELECT * FROM public.users WHERE id = $1', [id])

    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json(toPublicUser(rows[0]))
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
    const { rows: existingUserRows } = await pool.query(
      'SELECT id FROM public.users WHERE username = $1',
      [username]
    )
    if (existingUserRows[0]) {
      return res.status(409).json({ error: 'Username already exists' })
    }

    const passwordHash = await hashPassword(String(password))

    const { rows } = await pool.query(
      `INSERT INTO public.users (id, username, organization_id, role, email, password_hash, user_key, type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'user')
       RETURNING *`,
      [randomUUID(), username, organization_id, role, email, passwordHash, randomUUID()]
    )

    res.status(201).json(toPublicUser(rows[0]))
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Username or email already exists' })
    }
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

    const { rows: existingRows } = await pool.query('SELECT * FROM public.users WHERE id = $1', [
      id,
    ])
    const existingUser = existingRows[0]

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Validate role if provided
    if (role && !['admin', 'guest', 'basic'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, guest, or basic' })
    }

    // Check username uniqueness if changing username
    if (username && username !== existingUser.username) {
      const { rows: usernameCheck } = await pool.query(
        'SELECT id FROM public.users WHERE username = $1',
        [username]
      )
      if (usernameCheck[0]) {
        return res.status(409).json({ error: 'Username already exists' })
      }
    }

    // Build update object
    const updates = {}
    if (username) updates.username = username
    if (organization_id) updates.organization_id = organization_id
    if (role) updates.role = role
    updates.updated_at = new Date().toISOString()

    const setKeys = Object.keys(updates)
    const setClause = setKeys.map((key, idx) => `${key} = $${idx + 2}`).join(', ')
    const { rows } = await pool.query(
      `UPDATE public.users SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...setKeys.map((key) => updates[key])]
    )

    res.json(toPublicUser(rows[0]))
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

    // Deleting the user row cascades to their counters (ON DELETE CASCADE).
    const { rows } = await pool.query('DELETE FROM public.users WHERE id = $1 RETURNING id', [id])

    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
