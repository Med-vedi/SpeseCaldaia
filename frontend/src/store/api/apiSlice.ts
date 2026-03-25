import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Base query with authentication
const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers) => {
    // Get token from localStorage or state
    const token = localStorage.getItem('auth_token')
    if (token) {
      headers.set('authorization', `Bearer ${token}`)
    }
    return headers
  },
})

export const apiSlice = createApi({
  baseQuery,
  tagTypes: ['User', 'Auth', 'Counter', 'CounterValue', 'YearlyFinancials'],
  endpoints: () => ({}),
})

