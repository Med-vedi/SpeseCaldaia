const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const {
  getQrUsers,
  verifyToken,
} = require('../lib/qrAuth')
require('dotenv').config()

// Use anon / publishable key for auth (signInWithPassword); never use service_role here.
const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing SUPABASE_URL and a public API key for authentication (set SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY)'
  )
  process.exit(1)
}

const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey)

// Use service role key for admin operations (like fetching user profile)
const supabase = require('../lib/supabase')

async function authenticateWithCredentials(username, password) {
  const normalizedUsername = String(username || '').trim()
  let email

  if (normalizedUsername.includes('@')) {
    // Allow direct email login as a convenience.
    email = normalizedUsername
  } else {
    // Real username login: resolve users.username -> auth.users email.
    // We intentionally do not trust public.users.email because it can be stale.
    const { data: profileByUsername, error: profileLookupError } = await supabase
      .from('users')
      .select('id')
      .ilike('username', normalizedUsername)
      .maybeSingle()

    if (profileLookupError || !profileByUsername?.id) {
      return {
        error: 'Invalid username or password',
        status: 401,
      }
    }

    const { data: authUserData, error: authUserError } = await supabase.auth.admin.getUserById(
      profileByUsername.id
    )
    if (authUserError || !authUserData?.user?.email) {
      return {
        error: 'Invalid username or password',
        status: 401,
      }
    }
    email = authUserData.user.email
  }

  // Authenticate with Supabase using anon key (required for signInWithPassword)
  const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    return {
      error: authError.message || 'Invalid username or password',
      status: 401,
    }
  }

  // Get user profile from users table
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single()

  if (profileError) {
    console.error('Error fetching user profile:', profileError)
    return {
      user: authData.user,
      session: authData.session,
      profile: null,
    }
  }

  return {
    user: authData.user,
    session: authData.session,
    profile: userProfile,
  }
}

/**
 * @route POST /api/auth/login
 * @desc Login user with username and password
 * @body { username: string, password: string }
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }

    const result = await authenticateWithCredentials(username, password)
    if (result.error) {
      return res.status(result.status || 401).json({ error: result.error })
    }

    res.json(result)
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error during login' })
  }
})

/**
 * @route POST /api/auth/qr-login
 * @desc Login with QR token
 * @body { token: string }
 */
router.post('/qr-login', async (req, res) => {
  try {
    const { token } = req.body
    if (!token) {
      return res.status(400).json({ error: 'QR token is required' })
    }

    let payload
    try {
      payload = verifyToken(token)
    } catch (error) {
      return res.status(401).json({ error: error.message || 'Invalid QR token' })
    }

    // New flow: use persistent per-user key saved in users.user_key.
    const { data: profileByKey, error: profileByKeyError } = await supabase
      .from('users')
      .select('id, email')
      .eq('user_key', payload.k)
      .single()

    if (!profileByKeyError && profileByKey?.id) {
      let email = profileByKey.email
      if (!email) {
        const { data: authUserData, error: authUserError } = await supabase.auth.admin.getUserById(
          profileByKey.id
        )
        if (authUserError || !authUserData?.user?.email) {
          return res.status(400).json({ error: 'Unable to resolve user email for QR login' })
        }
        email = authUserData.user.email
      }

      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
      })

      if (linkError || !linkData?.properties?.hashed_token) {
        return res.status(500).json({ error: 'Failed to generate QR login session' })
      }

      // Prefer action_link tokens for immediate server-side session creation.
      const actionLink = linkData?.properties?.action_link
      let accessToken = null
      let refreshToken = null
      let expiresAt

      // Preferred path: use action_link tokens when present.
      if (actionLink) {
        const parsed = new URL(actionLink)
        accessToken = parsed.searchParams.get('access_token')
        refreshToken = parsed.searchParams.get('refresh_token')
        const expiresInRaw = parsed.searchParams.get('expires_in')
        const expiresIn = expiresInRaw ? Number(expiresInRaw) : null
        expiresAt = Number.isFinite(expiresIn) && expiresIn
          ? Math.floor(Date.now() / 1000) + expiresIn
          : undefined
      }

      // Fallback path: exchange hashed_token to a session (more reliable across providers).
      if (!accessToken || !refreshToken) {
        const { data: otpData, error: otpError } = await supabaseAuth.auth.verifyOtp({
          type: 'magiclink',
          email,
          token_hash: linkData.properties.hashed_token,
        })

        if (otpError || !otpData?.session?.access_token || !otpData?.session?.refresh_token) {
          return res.status(500).json({ error: 'Failed to create QR login session' })
        }

        accessToken = otpData.session.access_token
        refreshToken = otpData.session.refresh_token
        expiresAt = otpData.session.expires_at
      }

      const { data: userData, error: userError } = await supabase.auth.getUser(accessToken)
      if (userError || !userData?.user) {
        return res.status(401).json({ error: 'Failed to resolve user for QR login' })
      }

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userData.user.id)
        .single()

      return res.json({
        user: userData.user,
        session: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt,
        },
        profile: profileError ? null : userProfile,
      })
    }

    // Backward-compatible fallback: env-based QR users.
    const qrUsers = getQrUsers()
    const qrUser = qrUsers.find((item) => item.key === payload.k)
    if (!qrUser) {
      return res.status(401).json({ error: 'Unknown QR user' })
    }

    const result = await authenticateWithCredentials(qrUser.username, qrUser.password)
    if (result.error) {
      return res.status(result.status || 401).json({ error: result.error })
    }

    return res.json(result)
  } catch (error) {
    console.error('QR login error:', error)
    return res.status(500).json({ error: 'Internal server error during QR login' })
  }
})

/**
 * @route POST /api/auth/logout
 * @desc Logout user (client-side session management)
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' })
    }

    const token = authHeader.split(' ')[1]
    const { error } = await supabase.auth.signOut()

    if (error) {
      return res.status(500).json({ error: 'Error during logout' })
    }

    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Internal server error during logout' })
  }
})

/**
 * @route GET /api/auth/me
 * @desc Get current user profile
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' })
    }

    const token = authHeader.split(' ')[1]

    // Verify token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    // Get user profile (optional - user might not have a profile yet)
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    // Return user even if profile doesn't exist (consistent with login endpoint)
    res.json({
      user,
      profile: profileError ? null : profile,
    })
  } catch (error) {
    console.error('Get me error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router

