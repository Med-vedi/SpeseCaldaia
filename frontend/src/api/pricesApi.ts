import { supabase } from '../lib/supabase'

export interface Price {
  id: string
  price_type: 'gasolio' | 'acqua' | 'corrente'
  value: number
  effective_from: string
  effective_to: string | null
  is_active: boolean
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface PriceInput {
  price_type: 'gasolio' | 'acqua' | 'corrente'
  value: number
  effective_from?: string
  is_active?: boolean
  created_by?: string
  updated_by?: string
}

/**
 * Fetch active prices for an organization
 * Uses backend function to handle organization filtering
 */
export async function fetchActivePrices(organizationId: string): Promise<Price[]> {
  const { data, error } = await supabase.rpc('get_active_prices_for_organization', {
    p_organization_id: organizationId,
  })

  if (error) {
    console.error('Error fetching prices:', error)
    return []
  }

  return (data || []) as Price[]
}

/**
 * Create a new price (deactivates old ones)
 * Uses backend function for consistency
 */
export async function createPrice(price: PriceInput): Promise<Price> {
  const { data, error } = await supabase.rpc('create_price', {
    p_price_type: price.price_type,
    p_value: price.value,
    p_effective_from: price.effective_from || null,
    p_created_by: price.created_by || null,
    p_updated_by: price.updated_by || null,
  })

  if (error) {
    console.error('Error creating price:', error)
    throw error
  }

  if (!data || data.length === 0) {
    throw new Error('No data returned from create_price')
  }

  return data[0] as Price
}

