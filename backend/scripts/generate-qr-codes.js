require('dotenv').config()
const { getQrUsers, createQrToken, buildQrLoginUrl } = require('../lib/qrAuth')

function quickChartQrUrl(targetUrl) {
  return `https://quickchart.io/qr?size=360&text=${encodeURIComponent(targetUrl)}`
}

function main() {
  const users = getQrUsers()
  if (users.length !== 3) {
    console.error(
      `Expected exactly 3 QR users in QR_AUTH_USERS, got ${users.length}.`
    )
    process.exit(1)
  }

  const output = users.map((user) => {
    const token = createQrToken(user.key)
    const loginUrl = buildQrLoginUrl(token)
    return {
      label: user.label,
      key: user.key,
      loginUrl,
      qrImageUrl: quickChartQrUrl(loginUrl),
    }
  })

  console.log(JSON.stringify(output, null, 2))
}

main()

