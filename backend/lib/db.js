require('dotenv').config()
const { Pool } = require('pg')

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('Missing DATABASE_URL environment variable')
  process.exit(1)
}

const pool = new Pool({ connectionString })

module.exports = pool
