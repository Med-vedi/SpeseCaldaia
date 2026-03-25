import { apiSlice } from './apiSlice'
import { normalizeCounterValue, parseCounterValueFromApi } from '../../lib/normalizeApiNumbers'
import type {
  CounterValue,
  CreateCounterValueRequest,
  UpdateCounterValueRequest,
} from './models'

export interface GetCounterValuesParams {
  organization_id?: string
}

function unwrapCounterValuesPayload(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    for (const key of ['data', 'payload', 'results', 'rows'] as const) {
      const v = o[key]
      if (Array.isArray(v)) return v
    }
  }
  return []
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
      transformResponse: (raw: unknown) => {
        const rows = unwrapCounterValuesPayload(raw)
        const out: CounterValue[] = []
        for (const r of rows) {
          const parsed = parseCounterValueFromApi(r)
          if (parsed) out.push(normalizeCounterValue(parsed))
        }
        return out
      },
      providesTags: (result: CounterValue[] | undefined) =>
        result
          ? [
            ...result.map(({ id }) => ({ type: 'CounterValue' as const, id })),
            { type: 'CounterValue', id: 'LIST' },
          ]
          : [{ type: 'CounterValue', id: 'LIST' }],
    }),
    getCounterValueById: builder.query<CounterValue, string>({
      query: (id) => `/counter-values/${id}`,
      transformResponse: (r: CounterValue) => normalizeCounterValue(r),
      providesTags: (_result, _error, id) => [{ type: 'CounterValue', id }],
    }),
    createCounterValue: builder.mutation<CounterValue, CreateCounterValueRequest>({
      query: (valueData) => ({
        url: '/counter-values',
        method: 'POST',
        body: valueData,
      }),
      transformResponse: (r: CounterValue) => normalizeCounterValue(r),
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
      transformResponse: (r: CounterValue) => normalizeCounterValue(r),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'CounterValue', id },
        { type: 'CounterValue', id: 'LIST' },
      ],
    }),
    deleteCounterValue: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/counter-values/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
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

