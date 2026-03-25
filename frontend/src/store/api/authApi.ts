import { apiSlice } from './apiSlice'
import type { LoginRequest, LoginResponse, MeResponse } from './models'

// Re-export types for convenience
export type { LoginRequest, LoginResponse, UserProfile, MeResponse } from './models'

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          // Store token in localStorage
          if (data.session?.access_token) {
            localStorage.setItem('auth_token', data.session.access_token)
            localStorage.setItem('refresh_token', data.session.refresh_token || '')
          }
          // Store user info
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user))
          }
          if (data.profile) {
            localStorage.setItem('user_profile', JSON.stringify(data.profile))
          }
          // Dispatch custom event to notify AuthContext
          window.dispatchEvent(new Event('auth-storage-changed'))
        } catch (error) {
          // Handle error
          console.error('Login failed:', error)
        }
      },
      invalidatesTags: ['Auth'],
    }),
    logout: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled
          // Clear localStorage
          localStorage.removeItem('auth_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user')
          localStorage.removeItem('user_profile')
        } catch (error) {
          // Even if logout fails, clear local storage
          localStorage.removeItem('auth_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user')
          localStorage.removeItem('user_profile')
        }
      },
      invalidatesTags: ['Auth'],
    }),
    getMe: builder.query<MeResponse, void>({
      query: () => '/auth/me',
      providesTags: ['Auth'],
    }),
  }),
})

export const { useLoginMutation, useLogoutMutation, useGetMeQuery } = authApi

