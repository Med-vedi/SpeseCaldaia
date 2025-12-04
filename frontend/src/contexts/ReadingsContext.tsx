import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { fetchCounterReadings } from '../api/counterReadingsApi'
import { fetchActivePrices } from '../api/pricesApi'
import { fetchExpenses } from '../api/expensesApi'
import { fetchUsersByIds, getUserByKey } from '../api/usersApi'
import { transformCounterReadings, transformPrices, transformExpenses } from '../utils/dataTransformers'
import { upsertCounterReading, getCounterReading } from '../api/counterReadingsApi'
import { createPrice } from '../api/pricesApi'
import { upsertExpense } from '../api/expensesApi'

export interface KCalRow {
  key: string
  name: string
  kCalPrec: number | null
  kCalAtt: number | null
  differenza: number
}

export interface M3Row {
  key: string
  name: string
  m3Prec: number | null
  m3Att: number | null
  differenza: number
}

export interface KWRow {
  key: string
  name: string
  kWPrec: number | null
  kWAtt: number | null
  differenza: number
}

export interface Prices {
  gasolio: number
  acqua: number
  corrente: number
}

export interface Expenses {
  prezzoGasolio: number
  fatturaGasolio: number
  manutenzione: number
  corrente: number
}

interface ReadingsContextType {
  kCalData: KCalRow[]
  m3Data: M3Row[]
  kWData: KWRow[]
  prices: Prices
  expenses: Expenses
  loading: boolean
  error: string | null
  isAdmin: boolean
  currentUserKey: string | null
  refreshData: () => Promise<void>
  updateKCalData: (key: string, field: 'kCalPrec' | 'kCalAtt', value: number | null) => Promise<void>
  updateM3Data: (key: string, field: 'm3Prec' | 'm3Att', value: number | null) => Promise<void>
  updateKWData: (key: string, field: 'kWPrec' | 'kWAtt', value: number | null) => Promise<void>
  updateReadings: (values: Record<string, number>) => Promise<void>
  updatePrice: (key: keyof Prices, value: number) => Promise<void>
  updateExpense: (key: keyof Expenses, value: number) => Promise<void>
  getTotalExpensesPerUser: () => number
  canEditUser: (userKey: string) => boolean
}

const ReadingsContext = createContext<ReadingsContextType | undefined>(undefined)

export const useReadings = () => {
  const context = useContext(ReadingsContext)
  if (context === undefined) {
    throw new Error('useReadings must be used within a ReadingsProvider')
  }
  return context
}

interface ReadingsProviderProps {
  children: ReactNode
}

const getCurrentYear = () => new Date().getFullYear()

export const ReadingsProvider = ({ children }: ReadingsProviderProps) => {
  const { user, userProfile, isAdmin, organizationId } = useAuth()
  const [kCalData, setKCalData] = useState<KCalRow[]>([])
  const [m3Data, setM3Data] = useState<M3Row[]>([])
  const [kWData, setKWData] = useState<KWRow[]>([])
  const [prices, setPrices] = useState<Prices>({
    gasolio: 1.28,
    acqua: 2,
    corrente: 0.14,
  })
  const [expenses, setExpenses] = useState<Expenses>({
    prezzoGasolio: 1.28,
    fatturaGasolio: 1280,
    manutenzione: 120,
    corrente: 46.4,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentUserKey = userProfile?.user_key || null
  const lastLoadedOrgIdRef = useRef<string | null>(null)
  const isLoadingRef = useRef(false)

  // Fetch and transform counter readings
  const fetchCounterReadingsData = useCallback(async (orgId: string) => {
    const currentYear = getCurrentYear()
    const previousYear = currentYear - 1

    const readings = await fetchCounterReadings(orgId, [currentYear, previousYear])
    if (readings.length === 0) {
      setKCalData([])
      setM3Data([])
      setKWData([])
      return
    }

    // Get unique user IDs and fetch user profiles
    const uniqueUserIds = [...new Set(readings.map(r => r.user_id).filter(Boolean))]
    const users = await fetchUsersByIds(uniqueUserIds, orgId)

    // Transform readings to frontend format
    const transformed = transformCounterReadings(readings, users, currentYear, previousYear)
    setKCalData(transformed.kCalData)
    setM3Data(transformed.m3Data)
    setKWData(transformed.kWData)
  }, [])

  // Fetch and transform prices
  const fetchPricesData = useCallback(async (orgId: string) => {
    const pricesData = await fetchActivePrices(orgId)
    const transformed = transformPrices(pricesData)
    setPrices(transformed)
  }, [])

  // Fetch and transform expenses
  const fetchExpensesData = useCallback(async (orgId: string) => {
    const currentYear = getCurrentYear()
    const expensesData = await fetchExpenses(orgId, currentYear)
    const transformed = transformExpenses(expensesData)
    setExpenses(transformed)
  }, [])

  // Load all data
  const loadData = useCallback(async () => {
    const orgId = organizationId || userProfile?.organization_id || '0'
    if (!orgId) return

    setLoading(true)
    setError(null)

    try {
      await Promise.allSettled([
        fetchCounterReadingsData(orgId),
        fetchPricesData(orgId),
        fetchExpensesData(orgId),
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [organizationId, userProfile?.organization_id, fetchCounterReadingsData, fetchPricesData, fetchExpensesData])

  // Load data when organization ID is available
  useEffect(() => {
    const orgId = organizationId || userProfile?.organization_id || (userProfile ? '0' : null)

    if (user && !userProfile) {
      // Wait for profile
      const timeout = setTimeout(() => {
        if (!isLoadingRef.current && lastLoadedOrgIdRef.current !== '0') {
          lastLoadedOrgIdRef.current = '0'
          isLoadingRef.current = true
          loadData().finally(() => {
            isLoadingRef.current = false
          })
        }
      }, 500)
      return () => clearTimeout(timeout)
    }

    if (orgId && orgId !== lastLoadedOrgIdRef.current && !isLoadingRef.current) {
      lastLoadedOrgIdRef.current = orgId
      isLoadingRef.current = true
      loadData().finally(() => {
        isLoadingRef.current = false
      })
    } else if (!user) {
      lastLoadedOrgIdRef.current = null
      setLoading(false)
    }
  }, [organizationId, userProfile, user, loadData])

  const refreshData = useCallback(async () => {
    await loadData()
  }, [loadData])

  // Update counter reading
  const updateCounterReading = useCallback(async (
    userKey: string,
    readingType: 'kcal' | 'm3' | 'kw',
    field: 'kCalPrec' | 'kCalAtt' | 'm3Prec' | 'm3Att' | 'kWPrec' | 'kWAtt',
    value: number | null
  ) => {
    if (!organizationId || !user?.id) {
      throw new Error('No organization_id or user - cannot update readings')
    }

    // Get user ID - must be in same organization
    const userData = await getUserByKey(userKey, organizationId)

    if (!userData) {
      throw new Error(`User not found or not in your organization: ${userKey}`)
    }

    // Check permissions
    if (!isAdmin && userData.id !== user.id) {
      throw new Error('You can only update your own counter readings')
    }

    const currentYear = getCurrentYear()
    const previousYear = currentYear - 1
    const isPrevious = field.includes('Prec')
    const targetYear = isPrevious ? previousYear : currentYear

    // Check if reading exists
    const existing = await getCounterReading(userData.id, readingType, targetYear)

    await upsertCounterReading({
      user_id: userData.id,
      reading_type: readingType,
      period_year: targetYear,
      value: value ?? 0,
      period_label: String(targetYear),
      created_by: !existing ? user.id : undefined,
      updated_by: user.id,
    })
    await fetchCounterReadingsData(organizationId)
  }, [fetchCounterReadingsData, isAdmin, organizationId, user])

  const updateKCalData = useCallback(async (key: string, field: 'kCalPrec' | 'kCalAtt', value: number | null) => {
    if (key === 'totale') return
    await updateCounterReading(key, 'kcal', field, value)
  }, [updateCounterReading])

  const updateM3Data = useCallback(async (key: string, field: 'm3Prec' | 'm3Att', value: number | null) => {
    if (key === 'totale') return
    await updateCounterReading(key, 'm3', field, value)
  }, [updateCounterReading])

  const updateKWData = useCallback(async (_key: string, field: 'kWPrec' | 'kWAtt', value: number | null) => {
    await updateCounterReading('dino', 'kw', field, value)
  }, [updateCounterReading])

  const updateReadings = useCallback(async (values: Record<string, number>) => {
    const users = ['vladi', 'dino', 'cristian']
    for (const userKey of users) {
      if (values[`${userKey}_kCal`] !== undefined) {
        await updateCounterReading(userKey, 'kcal', 'kCalAtt', values[`${userKey}_kCal`])
      }
      if (values[`${userKey}_m3`] !== undefined) {
        await updateCounterReading(userKey, 'm3', 'm3Att', values[`${userKey}_m3`])
      }
    }
  }, [updateCounterReading])

  const updatePrice = useCallback(async (key: keyof Prices, value: number) => {
    if (!user?.id) throw new Error('No user - cannot update price')

    await createPrice({
      price_type: key,
      value,
      created_by: user.id,
      updated_by: user.id,
    })

    setPrices(prev => ({ ...prev, [key]: value }))
    if (key === 'gasolio') {
      setExpenses(prev => ({ ...prev, prezzoGasolio: value }))
    }

    await fetchPricesData(organizationId || '0')
  }, [fetchPricesData, organizationId, user])

  const updateExpense = useCallback(async (key: keyof Expenses, value: number) => {
    if (!isAdmin) {
      throw new Error('Only admins can update expenses')
    }

    if (!organizationId || !user?.id) {
      throw new Error('No organization_id or user - cannot update expenses')
    }

    const expenseTypeMap: Record<keyof Expenses, 'prezzoGasolio' | 'fatturaGasolio' | 'manutenzione' | 'corrente'> = {
      prezzoGasolio: 'prezzoGasolio',
      fatturaGasolio: 'fatturaGasolio',
      manutenzione: 'manutenzione',
      corrente: 'corrente',
    }

    const expenseType = expenseTypeMap[key]
    if (!expenseType) return

    await upsertExpense({
      expense_type: expenseType,
      value,
      period_year: getCurrentYear(),
      created_by: user.id,
      updated_by: user.id,
    })

    setExpenses(prev => ({ ...prev, [key]: value }))
    await fetchExpensesData(organizationId)
  }, [fetchExpensesData, isAdmin, organizationId, user])

  const getTotalExpensesPerUser = useCallback(() => {
    const totaleM3Row = m3Data.find(r => r.key === 'totale')
    const m3Diff = totaleM3Row?.differenza || 0
    const acquaFredda = m3Diff * prices.acqua

    const comuneKWRow = kWData.find(r => r.key === 'comune')
    const kWDiff = comuneKWRow?.differenza || 0
    const corrente = kWDiff * prices.corrente

    const funzionamentoServizio = expenses.fatturaGasolio * 0.2
    const totalExpenses = expenses.fatturaGasolio + expenses.manutenzione + corrente + acquaFredda + funzionamentoServizio

    return totalExpenses / 3
  }, [m3Data, kWData, prices, expenses])

  const canEditUser = useCallback((userKey: string) => {
    if (isAdmin) return true
    if (!currentUserKey) return false
    return currentUserKey === userKey
  }, [isAdmin, currentUserKey])

  const value: ReadingsContextType = {
    kCalData,
    m3Data,
    kWData,
    prices,
    expenses,
    loading,
    error,
    refreshData,
    updateKCalData,
    updateM3Data,
    updateKWData,
    updateReadings,
    updatePrice,
    updateExpense,
    getTotalExpensesPerUser,
    isAdmin,
    currentUserKey,
    canEditUser,
  }

  return (
    <ReadingsContext.Provider value={value}>
      {children}
    </ReadingsContext.Provider>
  )
}
