import React, { createContext, useContext, useEffect, useState } from 'react'
import { useGetMeQuery, useLogoutMutation } from '../store/api/authApi'
import type { UserProfile } from '../store/api/models'

interface User {
  id: string
  email?: string
  [key: string]: unknown
}

interface Session {
  access_token: string
  refresh_token: string
  expires_at?: number
  [key: string]: unknown
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
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
  // Initialize state from localStorage immediately
  const getInitialProfile = (): UserProfile | null => {
    try {
      const stored = localStorage.getItem('user_profile')
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      console.error('Error parsing initial profile:', e)
    }
    return null
  }

  const getInitialUser = (): User | null => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      console.error('Error parsing initial user:', e)
    }
    return null
  }

  const [user, setUser] = useState<User | null>(getInitialUser())
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(getInitialProfile())
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'))

  const { data: meData, isLoading: isLoadingMe, error: meError } = useGetMeQuery(undefined, {
    skip: !token,
  })
  const [logout] = useLogoutMutation()

  // Watch for localStorage changes (e.g., after login)
  useEffect(() => {
    const checkStorage = () => {
      const storedToken = localStorage.getItem('auth_token')
      if (storedToken !== token) {
        setToken(storedToken)
      }
    }

    // Listen for custom auth-storage-changed event (from login)
    window.addEventListener('auth-storage-changed', checkStorage)
    // Also listen for standard storage events (from other tabs)
    window.addEventListener('storage', checkStorage)

    return () => {
      window.removeEventListener('auth-storage-changed', checkStorage)
      window.removeEventListener('storage', checkStorage)
    }
  }, [token])

  // Load user from localStorage on mount and when token changes
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const storedProfile = localStorage.getItem('user_profile')
    const storedToken = localStorage.getItem('auth_token')

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (e) {
        console.error('Error parsing stored user:', e)
      }
    }

    if (storedProfile) {
      try {
        setProfile(JSON.parse(storedProfile))
      } catch (e) {
        console.error('Error parsing stored profile:', e)
      }
    }

    if (storedToken) {
      setSession({ access_token: storedToken } as Session)
    }
  }, [token]) // Re-run when token changes

  // Also load on initial mount (in case token was already set)
  useEffect(() => {
    const storedProfile = localStorage.getItem('user_profile')
    if (storedProfile && !profile) {
      try {
        setProfile(JSON.parse(storedProfile))
      } catch (e) {
        console.error('Error parsing stored profile on mount:', e)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run only on mount

  useEffect(() => {
    // Update user and profile when meData changes
    if (meData) {
      setUser(meData.user)
      // Do not clear profile when /me returns profile: null (e.g. transient DB miss); org_id is required for counters.
      if (meData.profile) {
        setProfile(meData.profile)
        localStorage.setItem('user_profile', JSON.stringify(meData.profile))
      }
      // Also update localStorage with fresh data
      if (meData.user) {
        localStorage.setItem('user', JSON.stringify(meData.user))
      }
    } else if (meError) {
      // Only clear if we don't have localStorage data (token might be expired)
      // If we have localStorage data, keep it and let the user continue
      const storedUser = localStorage.getItem('user')

      // Only clear if token is truly invalid (401) and we have no stored user
      if (meError && 'status' in meError && meError.status === 401 && !storedUser) {
        setUser(null)
        setSession(null)
        setProfile(null)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        localStorage.removeItem('user_profile')
      }
      // For 404 or other errors, keep the existing user from localStorage
    }
  }, [meData, meError])

  const signOut = async () => {
    try {
      await logout().unwrap()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setSession(null)
      setProfile(null)
    }
  }

  const loading = isLoadingMe && !!token

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

