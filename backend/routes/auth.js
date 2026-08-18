const express = require('express')
const router = express.Router()
const pool = require('../lib/db')
const { signAccessToken, verifyAccessToken } = require('../lib/jwt')
const { verifyPassword } = require('../lib/passwords')
const { getQrUsers, verifyToken } = require('../lib/qrAuth')
const authenticate = require('../middleware/authenticate')

function buildSession(userId) {
  const accessToken = signAccessToken(userId)
  const { exp } = verifyAccessToken(accessToken)
  return {
    access_token: accessToken,
    refresh_token: '',
    expires_at: exp,
  }
}

function toPublicUser(row) {
  const { password_hash, ...publicUser } = row
  return publicUser
}

async function authenticateWithCredentials(username, password) {
  const normalizedUsername = String(username || '').trim()

  const { rows } = normalizedUsername.includes('@')
    ? await pool.query('SELECT * FROM public.users WHERE lower(email) = lower($1)', [
        normalizedUsername,
      ])
    : await pool.query('SELECT * FROM public.users WHERE lower(username) = lower($1)', [
        normalizedUsername,
      ])

  const profile = rows[0]
  if (!profile) {
    return { error: 'Invalid username or password', status: 401 }
  }

  const passwordOk = await verifyPassword(password, profile.password_hash)
  if (!passwordOk) {
    return { error: 'Invalid username or password', status: 401 }
  }

  const publicUser = toPublicUser(profile)
  return {
    user: { id: publicUser.id, email: publicUser.email },
    session: buildSession(profile.id),
    profile: publicUser,
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

    // Preferred path: persistent per-user key saved in users.user_key.
    const { rows } = await pool.query('SELECT * FROM public.users WHERE user_key = $1', [
      payload.k,
    ])
    const profileByKey = rows[0]

    if (profileByKey) {
      const publicUser = toPublicUser(profileByKey)
      return res.json({
        user: { id: publicUser.id, email: publicUser.email },
        session: buildSession(profileByKey.id),
        profile: publicUser,
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
 * @desc Logout user (client-side session management; JWTs are stateless, nothing to invalidate server-side)
 */
router.post('/logout', async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided' })
  }

  res.json({ message: 'Logged out successfully' })
})

/**
 * @route GET /api/auth/me
 * @desc Get current user profile
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM public.users WHERE id = $1', [req.user.id])
    const profile = rows[0]

    res.json({
      user: req.user,
      profile: profile ? toPublicUser(profile) : null,
    })
  } catch (error) {
    console.error('Get me error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
