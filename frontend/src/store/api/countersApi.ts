import { apiSlice } from './apiSlice'
import type { Counter, CreateCounterRequest, UpdateCounterRequest } from './models'

export interface GetCountersParams {
  organization_id?: string
  counter_type?: string
  user_id?: string
}

export const countersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCounters: builder.query<Counter[], GetCountersParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams()
        if (params?.organization_id) {
          queryParams.append('organization_id', params.organization_id)
        }
        if (params?.counter_type) {
          queryParams.append('counter_type', params.counter_type)
        }
        if (params?.user_id) {
          queryParams.append('user_id', params.user_id)
        }
        const queryString = queryParams.toString()
        return `/counters${queryString ? `?${queryString}` : ''}`
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Counter' as const, id })),
              { type: 'Counter', id: 'LIST' },
            ]
          : [{ type: 'Counter', id: 'LIST' }],
    }),
    getCounterById: builder.query<Counter, string>({
      query: (id) => `/counters/${id}`,
      providesTags: (result, error, id) => [{ type: 'Counter', id }],
    }),
    createCounter: builder.mutation<Counter, CreateCounterRequest>({
      query: (counterData) => ({
        url: '/counters',
        method: 'POST',
        body: counterData,
      }),
      invalidatesTags: [{ type: 'Counter', id: 'LIST' }],
    }),
    updateCounter: builder.mutation<Counter, { id: string; data: UpdateCounterRequest }>({
      query: ({ id, data }) => ({
        url: `/counters/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Counter', id },
        { type: 'Counter', id: 'LIST' },
      ],
    }),
    deleteCounter: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/counters/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Counter', id },
        { type: 'Counter', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useGetCountersQuery,
  useGetCounterByIdQuery,
  useCreateCounterMutation,
  useUpdateCounterMutation,
  useDeleteCounterMutation,
} = countersApi

