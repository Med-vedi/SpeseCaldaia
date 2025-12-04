import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchUserProfile as fetchUserProfileApi, type User as UserProfile } from '../api/usersApi'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  userProfile: UserProfile | null
  loading: boolean
  isAdmin: boolean
  organizationId: string | null
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user profile using API function
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 3000)
      })

      const queryPromise = fetchUserProfileApi(userId)

      return await Promise.race([queryPromise, timeoutPromise])
    } catch (err) {
      console.error('Exception in fetchUserProfile:', err)
      return null
    }
  }

  useEffect(() => {
    // Get initial session and profile
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id)
        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }

      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id)
          setUserProfile(profile)
        } else {
          setUserProfile(null)
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { error }
    }

    if (data?.user) {
      const profile = await fetchUserProfile(data.user.id)
      setUserProfile(profile)
      setUser(data.user)
      setSession(data.session)
    }

    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const isAdmin = userProfile?.type === 'admin'
  const organizationId = userProfile?.organization_id || null

  const value = {
    user,
    session,
    userProfile,
    loading,
    isAdmin,
    organizationId,
    signIn,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
