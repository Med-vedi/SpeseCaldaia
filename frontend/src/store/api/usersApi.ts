import { apiSlice } from './apiSlice'

export interface User {
  id: string
  username: string
  email?: string
  organization_id: string
  role: 'admin' | 'guest' | 'basic'
  created_at: string
  updated_at: string
}

export interface UserQrData {
  token: string
  loginUrl: string
  qrImageUrl: string
}

export interface MyProfileResponse {
  profile: User
  qr: UserQrData
}

export interface UpdateMyProfileRequest {
  username?: string
  email?: string
  password?: string
}

export interface CreateUserRequest {
  username: string
  email: string
  password: string
  organization_id: string
  role: 'admin' | 'guest' | 'basic'
}

export interface UpdateUserRequest {
  username?: string
  organization_id?: string
  role?: 'admin' | 'guest' | 'basic'
}

export interface GetUsersParams {
  organization_id?: string
  role?: string
}

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<User[], GetUsersParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams()
        if (params?.organization_id) {
          queryParams.append('organization_id', params.organization_id)
        }
        if (params?.role) {
          queryParams.append('role', params.role)
        }
        const queryString = queryParams.toString()
        return `/users${queryString ? `?${queryString}` : ''}`
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'User' as const, id })),
              { type: 'User', id: 'LIST' },
            ]
          : [{ type: 'User', id: 'LIST' }],
    }),
    getUserById: builder.query<User, string>({
      query: (id) => `/users/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'User', id }],
    }),
    createUser: builder.mutation<User, CreateUserRequest>({
      query: (userData) => ({
        url: '/users',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),
    updateUser: builder.mutation<User, { id: string; data: UpdateUserRequest }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),
    deleteUser: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),
    getMyProfile: builder.query<MyProfileResponse, void>({
      query: () => '/users/me/profile',
      providesTags: [{ type: 'User', id: 'ME' }],
    }),
    updateMyProfile: builder.mutation<MyProfileResponse, UpdateMyProfileRequest>({
      query: (data) => ({
        url: '/users/me/profile',
        method: 'PUT',
        body: data,
      }),
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          localStorage.setItem('user_profile', JSON.stringify(data.profile))
          window.dispatchEvent(new Event('auth-storage-changed'))
        } catch (error) {
          console.error('Update my profile failed:', error)
        }
      },
      invalidatesTags: [{ type: 'User', id: 'ME' }, { type: 'User', id: 'LIST' }, 'Auth'],
    }),
    regenerateMyQr: builder.mutation<MyProfileResponse, void>({
      query: () => ({
        url: '/users/me/qr/regenerate',
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'User', id: 'ME' }],
    }),
  }),
})

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
  useRegenerateMyQrMutation,
} = usersApi

