const pool = require('../lib/db')
const { verifyAccessToken } = require('../lib/jwt')

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' })
    }

    const token = authHeader.split(' ')[1]
    let payload
    try {
      payload = verifyAccessToken(token)
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const { rows } = await pool.query('SELECT id, email FROM public.users WHERE id = $1', [
      payload.sub,
    ])
    if (!rows[0]) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    req.user = rows[0]
    next()
  } catch (error) {
    console.error('Authentication error:', error)
    res.status(401).json({ error: 'Authentication failed' })
  }
}

module.exports = authenticate
