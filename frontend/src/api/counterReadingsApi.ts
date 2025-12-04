import { supabase } from '../lib/supabase'

export interface CounterReading {
    id: string
    user_id: string
    reading_type: 'kcal' | 'm3' | 'kw'
    period_year: number
    period_label: string | null
    value: number
    notes: string | null
    created_at: string
    updated_at: string
}

export interface CounterReadingInput {
    user_id: string
    reading_type: 'kcal' | 'm3' | 'kw'
    period_year: number
    value: number
    period_label?: string
    notes?: string | null
    created_by?: string
    updated_by?: string
}

/**
 * Fetch counter readings for users in an organization
 * Uses backend function to handle organization filtering
 */
export async function fetchCounterReadings(
    organizationId: string,
    years: number[]
): Promise<CounterReading[]> {
    const { data, error } = await supabase.rpc('get_counter_readings_for_organization', {
        p_organization_id: organizationId,
        p_years: years,
    })

    if (error) {
        console.error('Error fetching counter readings:', error)
        return []
    }

    return (data || []) as CounterReading[]
}

/**
 * Upsert a counter reading
 * Uses backend function for consistency
 */
export async function upsertCounterReading(
    reading: CounterReadingInput
): Promise<CounterReading> {
    const { data, error } = await supabase.rpc('upsert_counter_reading', {
        p_user_id: reading.user_id,
        p_reading_type: reading.reading_type,
        p_period_year: reading.period_year,
        p_value: reading.value,
        p_period_label: reading.period_label || null,
        p_notes: reading.notes || null,
        p_created_by: reading.created_by || null,
        p_updated_by: reading.updated_by || null,
    })

    if (error) {
        console.error('Error upserting counter reading:', error)
        throw error
    }

    if (!data || data.length === 0) {
        throw new Error('No data returned from upsert_counter_reading')
    }

    return data[0] as CounterReading
}

/**
 * Get a counter reading by user, type, and year
 * Uses backend function for consistency
 */
export async function getCounterReading(
    userId: string,
    readingType: 'kcal' | 'm3' | 'kw',
    periodYear: number
): Promise<CounterReading | null> {
    const { data, error } = await supabase.rpc('get_counter_reading', {
        p_user_id: userId,
        p_reading_type: readingType,
        p_period_year: periodYear,
    })

    if (error) {
        console.error('Error fetching counter reading:', error)
        return null
    }

    if (!data || data.length === 0) {
        return null
    }

    return data[0] as CounterReading
}

