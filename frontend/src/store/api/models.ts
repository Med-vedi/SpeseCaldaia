export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  user: {
    id: string
    email?: string
    [key: string]: any
  }
  session: {
    access_token: string
    refresh_token: string
    expires_at?: number
    [key: string]: any
  }
  profile: {
    id: string
    username: string
    organization_id: string
    role: 'admin' | 'guest' | 'basic'
    created_at: string
    updated_at: string
  } | null
}

export interface UserProfile {
  id: string
  username: string
  organization_id: string
  role: 'admin' | 'guest' | 'basic'
  created_at: string
  updated_at: string
}

export interface MeResponse {
  user: {
    id: string
    email?: string
    [key: string]: any
  }
  profile: UserProfile
}

// Counter types
export type CounterType = 'heat' | 'water' | 'electric' | 'electric_common'

export interface Counter {
  id: string
  organization_id: string
  user_id: string | null
  counter_type: CounterType
  name: string
  created_at: string
  updated_at: string
}

export interface CreateCounterRequest {
  organization_id: string
  user_id?: string | null
  counter_type: CounterType
  name: string
}

export interface UpdateCounterRequest {
  name?: string
  counter_type?: CounterType
  user_id?: string | null
}

export interface CounterValue {
  id: string
  counter_id: string
  year: number
  value: number
  reading_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  counters?: Counter
}

export interface CreateCounterValueRequest {
  counter_id: string
  year: number
  value: number
  reading_date?: string | null
  notes?: string | null
}

export interface UpdateCounterValueRequest {
  value?: number
  reading_date?: string | null
  notes?: string | null
}

