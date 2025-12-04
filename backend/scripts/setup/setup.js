#!/usr/bin/env node

/**
 * Setup script for SpeseCaldaia backend
 * This script helps initialize the database and create initial users
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const readline = require('readline')

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

async function checkDatabaseConnection() {
  console.log('Checking database connection...')
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1)
    if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist (which is ok)
      throw error
    }
    console.log('✓ Database connection successful')
    return true
  } catch (error) {
    console.error('✗ Database connection failed:', error.message)
    console.log('\nMake sure Supabase is running:')
    console.log('  - For local: Run "supabase start"')
    console.log('  - For production: Check your SUPABASE_URL and SUPABASE_ANON_KEY')
    return false
  }
}

async function createUser() {
  console.log('\n=== Create User ===')

  const email = await question('Email: ')
  const password = await question('Password: ')
  const username = await question('Username: ')
  const userKey = await question('User key (e.g., vladi, dino, cristian): ')
  const fullName = await question('Full name (optional): ') || null
  const userType = await question('Type (admin/user/guest) [user]: ') || 'user'
  const userRole = await question('Role (master or leave empty): ') || null

  if (!['admin', 'user', 'guest'].includes(userType)) {
    console.error('Invalid type. Must be admin, user, or guest')
    return false
  }

  if (userRole && userRole !== 'master') {
    console.error('Invalid role. Must be "master" or empty')
    return false
  }

  try {
    // Create user in auth
    console.log('\nCreating user in auth...')
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          user_key: userKey
        }
      }
    })

    if (authError) {
      console.error('Error creating auth user:', authError.message)
      return false
    }

    if (!authData.user) {
      console.error('Failed to create auth user')
      return false
    }

    console.log('✓ Auth user created:', authData.user.id)

    // Wait a bit for the user to be available
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Create profile in public.users
    console.log('Creating user profile...')
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        username,
        user_key: userKey,
        role: userRole || null,
        type: userType,
        full_name: fullName,
        is_active: true
      })

    if (profileError) {
      console.error('Error creating user profile:', profileError.message)
      console.log('You may need to create the profile manually after email confirmation')
      return false
    }

    console.log('✓ User profile created successfully!')
    return true
  } catch (error) {
    console.error('Unexpected error:', error.message)
    return false
  }
}

async function main() {
  console.log('SpeseCaldaia Backend Setup\n')
  console.log('This script helps you set up the backend database and create users.\n')

  // Check connection
  const connected = await checkDatabaseConnection()
  if (!connected) {
    rl.close()
    process.exit(1)
  }

  // Ask what to do
  console.log('\nWhat would you like to do?')
  console.log('1. Create a new user')
  console.log('2. Exit')

  const choice = await question('\nChoice [1]: ') || '1'

  if (choice === '1') {
    await createUser()
  }

  rl.close()
  console.log('\nSetup complete!')
}

main().catch(error => {
  console.error('Fatal error:', error)
  rl.close()
  process.exit(1)
})

