require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const publicApiKey =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

let anonLikeClient = null

function getPublicSupabaseClient() {
  if (!supabaseUrl || !publicApiKey) {
    throw new Error(
      'Set SUPABASE_URL and SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY'
    )
  }
  if (!anonLikeClient) {
    anonLikeClient = createClient(supabaseUrl, publicApiKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return anonLikeClient
}

/** Validate access token from Authorization: Bearer (same key family as sign-in) */
async function getAuthUserFromBearerToken(token) {
  return getPublicSupabaseClient().auth.getUser(token)
}

module.exports = {
  getPublicSupabaseClient,
  getAuthUserFromBearerToken,
}
