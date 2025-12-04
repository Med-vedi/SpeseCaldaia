import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { supabase } from '../lib/supabase'
import type { CounterReading } from '../api/counterReadingsApi'
import type { Price } from '../api/pricesApi'
import type { Expense } from '../api/expensesApi'
import type { UserProfile } from '../api/usersApi'

// Custom base query using Supabase
const supabaseBaseQuery = async (args: { table: string; select?: string; filters?: Record<string, any> }) => {
  try {
    let query = supabase.from(args.table).select(args.select || '*')

    // Apply filters
    if (args.filters) {
      Object.entries(args.filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value)
        } else if (value !== null && value !== undefined) {
          query = query.eq(key, value)
        }
      })
    }

    const { data, error } = await query

    if (error) {
      return { error: { status: 'CUSTOM_ERROR', error: error.message } }
    }

    return { data }
  } catch (error) {
    return { error: { status: 'CUSTOM_ERROR', error: String(error) } }
  }
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: supabaseBaseQuery as any,
  tagTypes: ['CounterReadings', 'Prices', 'Expenses', 'Users'],
  endpoints: (builder) => ({
    getCounterReadings: builder.query<CounterReading[], { organizationId: string; years: number[] }>({
      queryFn: async ({ organizationId, years }) => {
        const { fetchCounterReadings } = await import('../api/counterReadingsApi')
        const data = await fetchCounterReadings(organizationId, years)
        return { data }
      },
      providesTags: ['CounterReadings'],
    }),
    getPrices: builder.query<Price[], string>({
      queryFn: async (organizationId) => {
        const { fetchActivePrices } = await import('../api/pricesApi')
        const data = await fetchActivePrices(organizationId)
        return { data }
      },
      providesTags: ['Prices'],
    }),
    getExpenses: builder.query<Expense[], { organizationId: string; year: number }>({
      queryFn: async ({ organizationId, year }) => {
        const { fetchExpenses } = await import('../api/expensesApi')
        const data = await fetchExpenses(organizationId, year)
        return { data }
      },
      providesTags: ['Expenses'],
    }),
    getOrganizationUsers: builder.query<UserProfile[], string>({
      queryFn: async (organizationId) => {
        const { fetchOrganizationUsers } = await import('../api/usersApi')
        const data = await fetchOrganizationUsers(organizationId)
        return { data }
      },
      providesTags: ['Users'],
    }),
    updateCounterReading: builder.mutation<CounterReading, any>({
      queryFn: async (input) => {
        const { upsertCounterReading } = await import('../api/counterReadingsApi')
        const data = await upsertCounterReading(input)
        return { data }
      },
      invalidatesTags: ['CounterReadings'],
    }),
    updatePrice: builder.mutation<Price, any>({
      queryFn: async (input) => {
        const { createPrice } = await import('../api/pricesApi')
        const data = await createPrice(input)
        return { data }
      },
      invalidatesTags: ['Prices'],
    }),
    updateExpense: builder.mutation<Expense, any>({
      queryFn: async (input) => {
        const { upsertExpense } = await import('../api/expensesApi')
        const data = await upsertExpense(input)
        return { data }
      },
      invalidatesTags: ['Expenses'],
    }),
  }),
})

export const {
  useGetCounterReadingsQuery,
  useGetPricesQuery,
  useGetExpensesQuery,
  useGetOrganizationUsersQuery,
  useUpdateCounterReadingMutation,
  useUpdatePriceMutation,
  useUpdateExpenseMutation,
} = apiSlice

