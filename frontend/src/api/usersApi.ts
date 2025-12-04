import { supabase } from '../lib/supabase'

export interface User {
  id: string
  email: string
  username: string
  user_key: string
  organization_id: string | null
  role: 'master' | null
  type: 'admin' | 'user' | 'guest'
  full_name: string | null
  is_active: boolean
}

export interface UserProfile {
  id: string
  user_key: string
  full_name: string | null
  username: string
}

/**
 * Fetch user profile by ID
 * Uses backend function for consistency
 */
export async function fetchUserProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase.rpc('get_user_profile_by_id', {
    p_user_id: userId,
  })

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  if (!data || data.length === 0) {
    return null
  }

  return data[0] as User
}

/**
 * Fetch users by IDs
 * Uses backend function for consistency
 */
export async function fetchUsersByIds(userIds: string[], organizationId?: string): Promise<UserProfile[]> {
  if (userIds.length === 0) return []

  const { data, error } = await supabase.rpc('get_users_by_ids', {
    p_user_ids: userIds,
    p_organization_id: organizationId || null,
  })

  if (error) {
    console.error('Error fetching users by IDs:', error)
    return []
  }

  return (data || []) as UserProfile[]
}

/**
 * Fetch all users in an organization
 * Uses backend function to handle organization filtering
 */
export async function fetchOrganizationUsers(organizationId: string): Promise<UserProfile[]> {
  const { data, error } = await supabase.rpc('get_users_for_organization', {
    p_organization_id: organizationId,
  })

  if (error) {
    console.error('Error fetching organization users:', error)
    return []
  }

  return (data || []) as UserProfile[]
}

/**
 * Get user IDs for an organization
 * Uses backend function to handle organization filtering
 */
export async function getOrganizationUserIds(organizationId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_users_for_organization', {
    p_organization_id: organizationId,
  })

  if (error) {
    console.error('Error fetching organization user IDs:', error)
    return []
  }

  return (data || []).map((u: { id: string }) => u.id)
}

/**
 * Get user by user_key within an organization
 * Uses backend function for consistency
 */
export async function getUserByKey(
  userKey: string,
  organizationId: string
): Promise<{ id: string; organization_id: string; user_key: string } | null> {
  const { data, error } = await supabase.rpc('get_user_by_key', {
    p_user_key: userKey,
    p_organization_id: organizationId,
  })

  if (error) {
    console.error('Error fetching user by key:', error)
    return null
  }

  if (!data || data.length === 0) {
    return null
  }

  return data[0] as { id: string; organization_id: string; user_key: string }
}

