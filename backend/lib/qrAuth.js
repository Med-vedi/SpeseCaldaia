const crypto = require('crypto')

function base64UrlEncode(value) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function base64UrlEncodeBytes(value) {
  return Buffer.from(value).toString('base64url')
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function getQrSecret() {
  return (
    process.env.QR_AUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'dev-qr-auth-secret-change-in-production'
  )
}

function getQrUsers() {
  const raw = process.env.QR_AUTH_USERS
  if (!raw) {
    return []
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('QR_AUTH_USERS must be a valid JSON array')
  }

  if (!Array.isArray(parsed)) {
    throw new Error('QR_AUTH_USERS must be a JSON array')
  }

  return parsed
    .filter((item) => item && item.key && item.username && item.password)
    .map((item) => ({
      key: String(item.key),
      username: String(item.username),
      password: String(item.password),
      label: item.label ? String(item.label) : String(item.key),
    }))
}

function signPayload(payload) {
  const secret = getQrSecret()
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest()
  const encodedSignature = base64UrlEncodeBytes(signature)
  return `${encodedPayload}.${encodedSignature}`
}

function verifyToken(token) {
  const secret = getQrSecret()
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    throw new Error('Invalid QR token')
  }

  const [encodedPayload, encodedSignature] = token.split('.')
  if (!encodedPayload || !encodedSignature) {
    throw new Error('Invalid QR token')
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest()
    .toString('base64url')

  if (encodedSignature !== expectedSignature) {
    throw new Error('Invalid QR token signature')
  }

  let payload
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload))
  } catch {
    throw new Error('Invalid QR token payload')
  }

  if (!payload?.k) {
    throw new Error('Invalid QR token fields')
  }

  if (payload.exp && Date.now() > Number(payload.exp)) {
    throw new Error('QR token expired')
  }

  return payload
}

function buildQrLoginUrl(token) {
  const appUrl =
    process.env.PROD_FRONTEND_URL ||
    process.env.FRONTEND_URL ||
    process.env.APP_URL
  if (!appUrl) {
    throw new Error('Missing frontend URL (set PROD_FRONTEND_URL)')
  }

  const withScheme = /^https?:\/\//i.test(appUrl) ? appUrl : `https://${appUrl}`
  const parsed = new URL(withScheme)
  const normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/$/, '')}`
  return `${normalized}/login?qr=${encodeURIComponent(token)}`
}


function createQrToken(userKey, expiresInDays = 365) {
  const expiresAt = Date.now() + expiresInDays * 24 * 60 * 60 * 1000
  return signPayload({ k: userKey, exp: expiresAt })
}

function createStaticQrToken(userKey) {
  return signPayload({ k: userKey })
}

function quickChartQrUrl(targetUrl) {
  return `https://quickchart.io/qr?size=360&text=${encodeURIComponent(targetUrl)}`
}

module.exports = {
  getQrUsers,
  verifyToken,
  createQrToken,
  createStaticQrToken,
  buildQrLoginUrl,
  quickChartQrUrl,
}

