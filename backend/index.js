require('dotenv').config()
const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' })
})

// Import routes
const userRoutes = require('./routes/users')
app.use('/api/users', userRoutes)

// Auth routes
const authRoutes = require('./routes/auth')
app.use('/api/auth', authRoutes)

// Counter routes
const counterRoutes = require('./routes/counters')
app.use('/api/counters', counterRoutes)

// Counter values routes
const counterValueRoutes = require('./routes/counterValues')
app.use('/api/counter-values', counterValueRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

