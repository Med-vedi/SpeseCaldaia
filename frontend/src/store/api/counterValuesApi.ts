import { apiSlice } from './apiSlice'
import type {
  CounterValue,
  CreateCounterValueRequest,
  UpdateCounterValueRequest,
} from './models'

export interface GetCounterValuesParams {
  organization_id?: string
}

export const counterValuesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCounterValues: builder.query<CounterValue[], GetCounterValuesParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams()
        if (params?.organization_id) {
          queryParams.append('organization_id', params.organization_id)
        }
        const queryString = queryParams.toString()
        return `/counter-values${queryString ? `?${queryString}` : ''}`
      },
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({ type: 'CounterValue' as const, id })),
            { type: 'CounterValue', id: 'LIST' },
          ]
          : [{ type: 'CounterValue', id: 'LIST' }],
    }),
    getCounterValueById: builder.query<CounterValue, string>({
      query: (id) => `/counter-values/${id}`,
      providesTags: (result, error, id) => [{ type: 'CounterValue', id }],
    }),
    createCounterValue: builder.mutation<CounterValue, CreateCounterValueRequest>({
      query: (valueData) => ({
        url: '/counter-values',
        method: 'POST',
        body: valueData,
      }),
      invalidatesTags: [
        { type: 'CounterValue', id: 'LIST' },
        { type: 'Counter', id: 'LIST' },
      ],
    }),
    updateCounterValue: builder.mutation<
      CounterValue,
      { id: string; data: UpdateCounterValueRequest }
    >({
      query: ({ id, data }) => ({
        url: `/counter-values/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'CounterValue', id },
        { type: 'CounterValue', id: 'LIST' },
      ],
    }),
    deleteCounterValue: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/counter-values/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'CounterValue', id },
        { type: 'CounterValue', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useGetCounterValuesQuery,
  useGetCounterValueByIdQuery,
  useCreateCounterValueMutation,
  useUpdateCounterValueMutation,
  useDeleteCounterValueMutation,
} = counterValuesApi

