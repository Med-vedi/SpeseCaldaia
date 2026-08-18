require('dotenv').config()
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

if (!JWT_SECRET) {
  console.error('Missing JWT_SECRET environment variable')
  process.exit(1)
}

function signAccessToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
}
