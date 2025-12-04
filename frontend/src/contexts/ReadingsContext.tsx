import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import {
  useGetCounterValuesQuery,
  useCreateCounterValueMutation,
  useUpdateCounterValueMutation,
} from '../store/api/counterValuesApi'
import { useGetCountersQuery } from '../store/api/countersApi'
import type { Counter, CounterType } from '../store/api/models'
import {
  filterCountersByType,
  filterElectricCounters,
  transformCounterToRow as transformCounter,
  addKCalTotal,
  addM3Total,
} from './utils'

export interface KCalRow {
  key: string
  name: string
  kCalPrec: number | null
  kCalAtt: number | null
  differenza: number
  counterId?: string
  counterType?: CounterType
}

export interface M3Row {
  key: string
  name: string
  m3Prec: number | null
  m3Att: number | null
  differenza: number
  counterId?: string
  counterType?: CounterType
}

export interface KWRow {
  key: string
  name: string
  kWPrec: number | null
  kWAtt: number | null
  differenza: number
  counterId?: string
  counterType?: CounterType
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

interface UpdateCounterValueParams {
  counterType: CounterType
  counterId: string
  year: number
  value: number | null
}

interface ReadingsContextType {
  kCalData: KCalRow[]
  m3Data: M3Row[]
  kWData: KWRow[]
  prices: Prices
  expenses: Expenses
  loading: boolean
  allCounterValues: import('../store/api/models').CounterValue[]
  counters: import('../store/api/models').Counter[]
  getAvailableYears: () => number[]
  updateCounterValues: (params: UpdateCounterValueParams) => Promise<void>
  updateReadings: (values: Record<string, number>, year: number) => void
  updatePrice: (key: keyof Prices, value: number) => void
  updateExpense: (key: keyof Expenses, value: number) => void
  getTotalExpensesPerUser: () => number
  refreshData: () => void
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

export const ReadingsProvider = ({ children }: ReadingsProviderProps) => {
  const { profile, loading: authLoading } = useAuth()
  const currentYear = new Date().getFullYear()
  const previousYear = currentYear - 1

  const [prices, setPrices] = useState<Prices>({
    gasolio: 1.28,
    acqua: 2,
    corrente: 0.14,
  })

  const [expenses, setExpenses] = useState<Expenses>({
    prezzoGasolio: prices.gasolio,
    fatturaGasolio: 1280,
    manutenzione: 120,
    corrente: 46.4,
  })

  const shouldFetch = !authLoading && !!profile?.organization_id

  const countersParams = useMemo(() => {
    if (shouldFetch && profile?.organization_id) {
      return { organization_id: profile.organization_id }
    }
    return undefined
  }, [shouldFetch, profile?.organization_id])

  const counterValuesParams = useMemo(() => {
    if (shouldFetch && profile?.organization_id) {
      return { organization_id: profile.organization_id }
    }
    return undefined
  }, [shouldFetch, profile?.organization_id])

  const countersQuery = useGetCountersQuery(countersParams, { skip: !shouldFetch })
  const { data: counters = [], isLoading: countersLoading } = countersQuery

  const counterValuesQuery = useGetCounterValuesQuery(counterValuesParams, { skip: !shouldFetch })
  const { data: allCounterValues = [], isLoading: counterValuesLoading } = counterValuesQuery

  // Filter by year on frontend from all values
  const currentYearValues = useMemo(() => {
    return (allCounterValues || []).filter((cv) => cv.year === currentYear)
  }, [allCounterValues, currentYear])

  const previousYearValues = useMemo(() => {
    return (allCounterValues || []).filter((cv) => cv.year === previousYear)
  }, [allCounterValues, previousYear])

  const [createCounterValue] = useCreateCounterValueMutation()
  const [updateCounterValue] = useUpdateCounterValueMutation()

  useEffect(() => {
    if (shouldFetch) {
      const timer = setTimeout(() => {
        if (countersQuery.isUninitialized) {
          countersQuery.refetch()
        }
        if (counterValuesQuery.isUninitialized) {
          counterValuesQuery.refetch()
        }
      }, 200)

      return () => clearTimeout(timer)
    }
  }, [shouldFetch, countersQuery, counterValuesQuery])

  const loading = authLoading || countersLoading || counterValuesLoading

  const { kCalData, m3Data, kWData } = useMemo(() => {
    const transformCounterWithParams = (counter: Counter) =>
      transformCounter(counter, previousYear, currentYear, previousYearValues, currentYearValues)

    const transformToKCalRow = (row: ReturnType<typeof transformCounter>): KCalRow => ({
      key: row.key,
      name: row.name,
      kCalPrec: row.prec,
      kCalAtt: row.att,
      differenza: row.differenza,
      counterId: row.counterId,
      counterType: row.counterType,
    })

    const transformToM3Row = (row: ReturnType<typeof transformCounter>): M3Row => ({
      key: row.key,
      name: row.name,
      m3Prec: row.prec,
      m3Att: row.att,
      differenza: row.differenza,
      counterId: row.counterId,
      counterType: row.counterType,
    })

    const transformToKWRow = (row: ReturnType<typeof transformCounter>): KWRow => ({
      key: row.key,
      name: row.name,
      kWPrec: row.prec,
      kWAtt: row.att,
      differenza: row.differenza,
      counterId: row.counterId,
      counterType: row.counterType,
    })

    const kCalRows = addKCalTotal(
      filterCountersByType(counters, 'heat').map(counter => transformToKCalRow(transformCounterWithParams(counter)))
    )

    const m3Rows = addM3Total(
      filterCountersByType(counters, 'water').map(counter => transformToM3Row(transformCounterWithParams(counter)))
    )

    const kWRows = filterElectricCounters(counters).map(counter => transformToKWRow(transformCounterWithParams(counter)))

    return { kCalData: kCalRows, m3Data: m3Rows, kWData: kWRows }
  }, [counters, currentYearValues, previousYearValues, currentYear, previousYear])



  const saveCounterValue = useCallback(async (
    counterId: string,
    year: number,
    value: number
  ) => {
    try {
      const existingValue = allCounterValues.find(
        v => v.counter_id === counterId && v.year === year
      )

      if (existingValue) {
        await updateCounterValue({
          id: existingValue.id,
          data: { value },
        }).unwrap()
      } else {
        await createCounterValue({
          counter_id: counterId,
          year,
          value,
        }).unwrap()
      }
    } catch (error) {
      console.error('Error saving counter value:', error)
      throw error
    }
  }, [allCounterValues, createCounterValue, updateCounterValue])

  const updateCounterValues = useCallback(async ({
    counterType,
    counterId,
    year,
    value,
  }: UpdateCounterValueParams) => {
    if (value === null) return

    const counter = counters.find(c => c.id === counterId && c.counter_type === counterType)
    if (!counter) {
      console.error(`Counter not found: ${counterId} with type ${counterType}`)
      return
    }

    try {
      await saveCounterValue(counterId, year, value)
    } catch (error) {
      console.error('Error updating counter value:', error)
      throw error
    }
  }, [counters, saveCounterValue])

  const getAvailableYears = useCallback(() => {
    const years = new Set<number>()
    allCounterValues.forEach(cv => years.add(cv.year))
    // Always include current year even if no values exist
    years.add(currentYear)
    return Array.from(years).sort((a, b) => b - a) // Sort descending
  }, [allCounterValues, currentYear])

  const updateReadings = useCallback(async (values: Record<string, number>, year: number) => {
    const ReadingType = {
      KCAL: '_kCal',
      M3: '_m3',
    } as const

    type ReadingTypeValue = typeof ReadingType[keyof typeof ReadingType]

    const getReadingType = (key: string): ReadingTypeValue | null => {
      if (key.endsWith(ReadingType.KCAL)) return ReadingType.KCAL
      if (key.endsWith(ReadingType.M3)) return ReadingType.M3
      return null
    }

    const extractCounterKey = (key: string, type: ReadingTypeValue): string => {
      return key.replace(type, '')
    }

    const updateSingleReading = async (key: string, value: number): Promise<void> => {
      const readingType = getReadingType(key)
      if (!readingType) return

      const counterKey = extractCounterKey(key, readingType)

      switch (readingType) {
        case ReadingType.KCAL: {
          const row = kCalData.find(r => r.key === counterKey)
          if (row?.counterId && row?.counterType) {
            await updateCounterValues({
              counterType: row.counterType,
              counterId: row.counterId,
              year,
              value,
            })
          }
          break
        }
        case ReadingType.M3: {
          const row = m3Data.find(r => r.key === counterKey)
          if (row?.counterId && row?.counterType) {
            await updateCounterValues({
              counterType: row.counterType,
              counterId: row.counterId,
              year,
              value,
            })
          }
          break
        }
      }
    }

    await Promise.all(
      Object.entries(values).map(([key, value]) => updateSingleReading(key, value))
    )
  }, [kCalData, m3Data, updateCounterValues])

  const updatePrice = useCallback((key: keyof Prices, value: number) => {
    setPrices(prev => ({ ...prev, [key]: value }))
    if (key === 'gasolio') {
      setExpenses(prev => ({ ...prev, prezzoGasolio: value }))
    }
  }, [])

  const updateExpense = useCallback((key: keyof Expenses, value: number) => {
    setExpenses(prev => ({ ...prev, [key]: value }))
  }, [])

  const getTotalExpensesPerUser = useCallback(() => {
    const totaleM3Row = m3Data.find(r => r.key === 'totale')
    const m3Diff = totaleM3Row?.differenza || 0
    const acquaFredda = m3Diff * prices.acqua

    const comuneKWRow = kWData.find(r => r.key !== 'totale')
    const kWDiff = comuneKWRow?.differenza || 0
    const corrente = kWDiff * prices.corrente

    const funzionamentoServizio = expenses.fatturaGasolio * 0.2

    const totalExpenses = expenses.fatturaGasolio + expenses.manutenzione + corrente + acquaFredda + funzionamentoServizio

    const userCount = kCalData.filter(r => r.key !== 'totale').length || 3
    return totalExpenses / userCount
  }, [m3Data, kWData, prices, expenses, kCalData])

  const refreshData = useCallback(() => {
    if (profile?.organization_id) {
      countersQuery.refetch()
      counterValuesQuery.refetch()
    }
  }, [profile?.organization_id, countersQuery, counterValuesQuery])

  const value: ReadingsContextType = {
    kCalData,
    m3Data,
    kWData,
    prices,
    expenses,
    loading,
    allCounterValues,
    counters,
    getAvailableYears,
    updateCounterValues,
    updateReadings,
    updatePrice,
    updateExpense,
    getTotalExpensesPerUser,
    refreshData,
  }

  return (
    <ReadingsContext.Provider value={value}>
      {children}
    </ReadingsContext.Provider>
  )
}
