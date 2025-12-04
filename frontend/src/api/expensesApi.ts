import { supabase } from '../lib/supabase'

export interface Expense {
  id: string
  expense_type: 'fatturaGasolio' | 'manutenzione' | 'prezzoGasolio' | 'corrente'
  value: number
  period_year: number
  period_month: number
  description: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface ExpenseInput {
  expense_type: 'fatturaGasolio' | 'manutenzione' | 'prezzoGasolio' | 'corrente'
  value: number
  period_year: number
  period_month?: number
  description?: string | null
  created_by?: string
  updated_by?: string
}

/**
 * Fetch expenses for an organization for a specific year
 * Uses backend function to handle organization filtering
 */
export async function fetchExpenses(
  organizationId: string,
  periodYear: number
): Promise<Expense[]> {
  const { data, error } = await supabase.rpc('get_expenses_for_organization', {
    p_organization_id: organizationId,
    p_period_year: periodYear,
  })

  if (error) {
    console.error('Error fetching expenses:', error)
    return []
  }

  return (data || []) as Expense[]
}

/**
 * Upsert an expense
 * Uses backend function for consistency
 */
export async function upsertExpense(expense: ExpenseInput): Promise<Expense> {
  const { data, error } = await supabase.rpc('upsert_expense', {
    p_expense_type: expense.expense_type,
    p_value: expense.value,
    p_period_year: expense.period_year,
    p_period_month: expense.period_month || null,
    p_description: expense.description || null,
    p_created_by: expense.created_by || null,
    p_updated_by: expense.updated_by || null,
  })

  if (error) {
    console.error('Error upserting expense:', error)
    throw error
  }

  if (!data || data.length === 0) {
    throw new Error('No data returned from upsert_expense')
  }

  return data[0] as Expense
}

