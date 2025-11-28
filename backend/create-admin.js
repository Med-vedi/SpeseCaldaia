require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables')
  process.exit(1)
}

// Use anon key for regular operations, but we'll create user through signup
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createAdminUser() {
  try {
    console.log('Creating admin user via signup...')

    // Use a real email address for production Supabase
    const { data, error } = await supabase.auth.signUp({
      email: 'admin@app.local', // Change this to your real email
      password: 'admin12!',
      options: {
        data: {
          username: 'admin'
        }
      }
    })

    if (error) {
      console.error('Error creating user:', error)
      console.error('If email confirmation is required, check your email and click the confirmation link.')
      return
    }

    console.log('User signup initiated successfully!')
    console.log('User ID:', data.user?.id)
    console.log('Please check your email (admin@app.local) and click the confirmation link.')
    console.log('After confirming, run this script again to create the user profile.')

    // If user is already confirmed, create profile
    if (data.user && data.user.email_confirmed_at) {
      await createUserProfile(data.user.id)
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

async function createUserProfile(userId) {
  console.log('Creating user profile...')

  const { error: profileError } = await supabase
    .from('users')
    .insert({
      id: userId,
      username: 'admin',
      organization_id: 'default-org',
      role: 'admin'
    })

  if (profileError) {
    console.error('Error creating user profile:', profileError)
  } else {
    console.log('User profile created successfully!')
  }
}

createAdminUser()
