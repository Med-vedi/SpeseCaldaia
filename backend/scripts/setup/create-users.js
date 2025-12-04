#!/usr/bin/env node

/**
 * Script to create the three initial users for SpeseCaldaia
 * Users: vlad (admin), dino (admin, master), cristian (admin)
 * Password: 1111 for all
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL || 'https://szlrayqvddfxhrnwuccz.supabase.co'
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6bHJheXF2ZGRmeGhybnd1Y2N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNjAxNDEsImV4cCI6MjA3OTgzNjE0MX0.pRSjOnP-XcrMbzvzVPEyyh7J2ChtVuw5dtGcIqXRFKY'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Use service role key if available (for admin operations), otherwise use anon key
const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  supabaseServiceKey ? {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  } : undefined
)

const users = [
  {
    email: 'vlad@example.com', // Placeholder email - can be updated later
    username: 'vlad',
    user_key: 'vladi',
    full_name: 'Vlad',
    type: 'admin',
    role: null
  },
  {
    email: 'dino@example.com', // Placeholder email - can be updated later
    username: 'dino',
    user_key: 'dino',
    full_name: 'Dino',
    type: 'admin',
    role: 'master'
  },
  {
    email: 'cristian@example.com', // Placeholder email - can be updated later
    username: 'cristian',
    user_key: 'cristian',
    full_name: 'Cristian',
    type: 'admin',
    role: null
  }
]

const password = '111111' // Temporary password (6 chars minimum for Supabase)

async function createUser(userData) {
  console.log(`\nCreating user: ${userData.username} (${userData.email})...`)

  try {
    // Step 1: Create user in auth
    // If using service role key, use admin API to bypass email validation
    let authData, authError

    if (supabaseServiceKey) {
      // Use admin API to create user without email validation
      const { data, error } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          username: userData.username,
          user_key: userData.user_key,
          full_name: userData.full_name
        }
      })
      authData = { user: data?.user }
      authError = error
    } else {
      // Use regular signup (requires valid email)
      const result = await supabase.auth.signUp({
        email: userData.email,
        password: password,
        options: {
          data: {
            username: userData.username,
            user_key: userData.user_key,
            full_name: userData.full_name
          }
        }
      })
      authData = result.data
      authError = result.error
    }

    if (authError) {
      // Check if user already exists
      if (authError.message.includes('already registered') || authError.code === 'user_already_exists') {
        console.log(`  ⚠ User ${userData.email} already exists in auth, trying to get user...`)

        // Try to get user by email using admin API or sign in
        let signInData, signInError

        if (supabaseServiceKey) {
          // Use admin API to list users and find by email
          const { data: usersList, error: listError } = await supabase.auth.admin.listUsers()
          if (!listError && usersList?.users) {
            const foundUser = usersList.users.find(u => u.email === userData.email)
            if (foundUser) {
              signInData = { user: foundUser }
              signInError = null
            } else {
              signInError = { message: 'User not found' }
            }
          } else {
            signInError = listError
          }
        } else {
          // Try to sign in to get the user ID
          const result = await supabase.auth.signInWithPassword({
            email: userData.email,
            password: password
          })
          signInData = result.data
          signInError = result.error
        }

        if (signInError) {
          console.error(`  ✗ Error signing in: ${signInError.message}`)
          return false
        }

        if (signInData.user) {
          authData.user = signInData.user
          console.log(`  ✓ Found existing auth user: ${authData.user.id}`)
        } else {
          console.error(`  ✗ Could not retrieve user for ${userData.email}`)
          return false
        }
      } else {
        console.error(`  ✗ Error creating auth user: ${authError.message}`)
        return false
      }
    } else {
      console.log(`  ✓ Auth user created: ${authData.user?.id}`)
    }

    if (!authData.user) {
      console.error(`  ✗ No user data returned`)
      return false
    }

    // Wait a moment for the user to be fully created
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Step 2: Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', authData.user.id)
      .single()

    if (existingProfile) {
      console.log(`  ⚠ Profile already exists, updating...`)

      // Update existing profile
      const { error: updateError } = await supabase
        .from('users')
        .update({
          email: userData.email,
          username: userData.username,
          user_key: userData.user_key,
          type: userData.type,
          role: userData.role,
          full_name: userData.full_name,
          is_active: true
        })
        .eq('id', authData.user.id)

      if (updateError) {
        console.error(`  ✗ Error updating profile: ${updateError.message}`)
        return false
      }

      console.log(`  ✓ Profile updated successfully`)
      return true
    }

    // Step 3: Create profile in public.users
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: userData.email,
        username: userData.username,
        user_key: userData.user_key,
        type: userData.type,
        role: userData.role,
        full_name: userData.full_name,
        is_active: true
      })

    if (profileError) {
      console.error(`  ✗ Error creating profile: ${profileError.message}`)
      console.error(`  Details:`, profileError)
      return false
    }

    console.log(`  ✓ Profile created successfully`)
    return true

  } catch (error) {
    console.error(`  ✗ Unexpected error: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('Creating users for SpeseCaldaia...')
  console.log('=====================================\n')

  if (!supabaseServiceKey) {
    console.log('⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY not found in .env')
    console.log('   The script will try to use regular signup, which may fail.')
    console.log('   For best results, add SUPABASE_SERVICE_ROLE_KEY to your .env file.')
    console.log('   Or use the Dashboard method (see CREATE_USERS_DASHBOARD.md)\n')
  }

  const results = []
  for (const user of users) {
    const success = await createUser(user)
    results.push({ user: user.username, success })
  }

  console.log('\n=====================================')
  console.log('Summary:')
  console.log('=====================================')
  results.forEach(({ user, success }) => {
    console.log(`${success ? '✓' : '✗'} ${user}`)
  })

  const allSuccess = results.every(r => r.success)
  if (allSuccess) {
    console.log('\n✓ All users created successfully!')
    console.log('\nYou can now log in with:')
    users.forEach(u => {
      console.log(`  - ${u.email} / ${password}`)
    })
  } else {
    console.log('\n⚠ Some users failed to create. Check the errors above.')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

