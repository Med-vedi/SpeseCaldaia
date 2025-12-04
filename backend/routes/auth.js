const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Use anon key for authentication (signInWithPassword requires anon key)
const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY for authentication')
}

// Create client with anon key for user authentication
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey)

// Use service role key for admin operations (like fetching user profile)
const supabase = require('../lib/supabase')

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

    // Check if username is already an email, otherwise convert to email format
    const email = username.includes('@') ? username : `${username}@app.local`

    // Authenticate with Supabase using anon key (required for signInWithPassword)
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      return res.status(401).json({
        error: authError.message || 'Invalid username or password'
      })
    }

    // Get user profile from users table
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      // User might not have a profile yet, return auth data anyway
      return res.json({
        user: authData.user,
        session: authData.session,
        profile: null,
      })
    }

    res.json({
      user: authData.user,
      session: authData.session,
      profile: userProfile,
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error during login' })
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

