import { apiSlice } from './apiSlice'
import {
  normalizeYearlyFinancialsResponse,
  normalizeGasoilDelivery,
} from '../../lib/normalizeApiNumbers'
import type {
  YearlyFinancialsResponse,
  UpdateYearlyFinancialsRequest,
  GasoilDelivery,
  CreateGasoilDeliveryRequest,
  UpdateGasoilDeliveryRequest,
} from './models'

function yearlyTag(organization_id: string, year: number) {
  return { type: 'YearlyFinancials' as const, id: `${organization_id}-${year}` }
}

export const yearlyFinancialsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getYearlyFinancialYears: builder.query<{ years: number[] }, { organization_id: string }>({
      query: ({ organization_id }) =>
        `/yearly-financials/years?organization_id=${encodeURIComponent(organization_id)}`,
      providesTags: (_r, _e, { organization_id }) => [yearlyTag(organization_id, -1)],
    }),
    getYearlyFinancials: builder.query<
      YearlyFinancialsResponse,
      { organization_id: string; year: number }
    >({
      query: ({ organization_id, year }) =>
        `/yearly-financials?organization_id=${encodeURIComponent(organization_id)}&year=${year}`,
      transformResponse: (r: YearlyFinancialsResponse) => normalizeYearlyFinancialsResponse(r),
      providesTags: (_r, _e, { organization_id, year }) => [yearlyTag(organization_id, year)],
    }),
    updateYearlyFinancials: builder.mutation<YearlyFinancialsResponse, UpdateYearlyFinancialsRequest>({
      query: (body) => ({
        url: '/yearly-financials',
        method: 'PUT',
        body,
      }),
      transformResponse: (r: YearlyFinancialsResponse) => normalizeYearlyFinancialsResponse(r),
      invalidatesTags: (_r, _e, { organization_id, year }) => [
        yearlyTag(organization_id, year),
        yearlyTag(organization_id, -1),
      ],
    }),
    createGasoilDelivery: builder.mutation<GasoilDelivery, CreateGasoilDeliveryRequest>({
      query: (body) => ({
        url: '/gasoil-deliveries',
        method: 'POST',
        body,
      }),
      transformResponse: (r: GasoilDelivery) => normalizeGasoilDelivery(r),
      invalidatesTags: (_r, _e, { organization_id, year }) => [
        yearlyTag(organization_id, year),
        yearlyTag(organization_id, -1),
      ],
    }),
    updateGasoilDelivery: builder.mutation<
      GasoilDelivery,
      { id: string; organization_id: string; year: number; data: UpdateGasoilDeliveryRequest }
    >({
      query: ({ id, data }) => ({
        url: `/gasoil-deliveries/${id}`,
        method: 'PUT',
        body: data,
      }),
      transformResponse: (r: GasoilDelivery) => normalizeGasoilDelivery(r),
      invalidatesTags: (_r, _e, { organization_id, year }) => [
        yearlyTag(organization_id, year),
        yearlyTag(organization_id, -1),
      ],
    }),
    deleteGasoilDelivery: builder.mutation<
      { message: string },
      { id: string; organization_id: string; year: number }
    >({
      query: ({ id }) => ({
        url: `/gasoil-deliveries/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { organization_id, year }) => [
        yearlyTag(organization_id, year),
        yearlyTag(organization_id, -1),
      ],
    }),
  }),
})

export const {
  useGetYearlyFinancialYearsQuery,
  useGetYearlyFinancialsQuery,
  useLazyGetYearlyFinancialsQuery,
  useUpdateYearlyFinancialsMutation,
  useCreateGasoilDeliveryMutation,
  useUpdateGasoilDeliveryMutation,
  useDeleteGasoilDeliveryMutation,
} = yearlyFinancialsApi
