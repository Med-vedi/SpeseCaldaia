import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import {
  useGetCounterValuesQuery,
  useCreateCounterValueMutation,
  useUpdateCounterValueMutation,
} from '../store/api/counterValuesApi'
import { useGetCountersQuery } from '../store/api/countersApi'
import {
  useGetYearlyFinancialsQuery,
  useUpdateYearlyFinancialsMutation,
} from '../store/api/yearlyFinancialsApi'
import type { CounterType } from '../store/api/models'
import {
  filterCountersByType,
  filterElectricCounters,
  transformCounterToYearRow,
  addKCalTotal,
  addM3Total,
  buildDisplayYearsAsc,
  MIN_METER_YEAR,
  counterValueRowMatches,
  coalesceFiniteNumber,
  type YearValuesRow,
} from './utils'
import { useDraftMode } from './DraftModeContext'

export type KCalRow = YearValuesRow
export type M3Row = YearValuesRow
export type KWRow = YearValuesRow

export interface Prices {
  gasolio: number
  acqua: number
  corrente: number
}

export interface Expenses {
  prezzoGasolio: number
  fatturaGasolio: number
  manutenzione: number
  funzionamentoServizioPct: number
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
  /** Years shown on Lettura contattori (from MIN_METER_YEAR through latest), ascending */
  meterDisplayYearsAsc: number[]
  /** Anno riferimento per prezzi, bollette gasolio e spese fisse (manutenzione) */
  financialYear: number
  setFinancialYear: (year: number) => void
  /** Anni disponibili nel selettore Prezzi/Spese (progressione da MIN_METER_YEAR) */
  priceSheetYearsAsc: number[]
  updateCounterValues: (params: UpdateCounterValueParams) => Promise<void>
  updateReadings: (values: Record<string, number>, year: number) => void
  updatePrice: (key: keyof Prices, value: number) => Promise<void>
  updateExpense: (key: keyof Expenses, value: number) => Promise<void>
  getTotalExpensesPerUser: () => number
  refreshData: () => void
  /** Organization id used for counters API (empty = letture non richieste). */
  organizationId: string
  /** Errore caricamento contatori o letture (null = ok). */
  metersDataError: string | null
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
  const { isDraftMode } = useDraftMode()
  const currentYear = new Date().getFullYear()

  const [financialYear, setFinancialYear] = useState(currentYear)
  const [draftCounterOverrides, setDraftCounterOverrides] = useState<Record<string, number>>({})
  const [draftExpenseOverridesByYear, setDraftExpenseOverridesByYear] = useState<
    Record<number, Partial<Pick<Expenses, 'manutenzione' | 'funzionamentoServizioPct'>>>
  >({})

  const organizationId = profile?.organization_id?.trim() ?? ''
  // Fetch as soon as we know org (from cache/localStorage); do not wait for /me to finish — that left contattori empty.
  const shouldFetch = organizationId.length > 0

  const countersParams = useMemo(() => {
    if (shouldFetch) {
      return { organization_id: organizationId }
    }
    return undefined
  }, [shouldFetch, organizationId])

  const counterValuesParams = useMemo(() => {
    if (shouldFetch) {
      return { organization_id: organizationId }
    }
    return undefined
  }, [shouldFetch, organizationId])

  const countersQuery = useGetCountersQuery(countersParams, {
    skip: !shouldFetch || !countersParams,
    refetchOnMountOrArgChange: true,
  })
  const { data: counters = [], isLoading: countersLoading } = countersQuery

  const counterValuesQuery = useGetCounterValuesQuery(counterValuesParams, {
    skip: !shouldFetch || !counterValuesParams,
    refetchOnMountOrArgChange: true,
  })
  const { data: allCounterValues = [], isLoading: counterValuesLoading } = counterValuesQuery

  const metersDataError = useMemo((): string | null => {
    const fromRtk = (err: unknown): string | null => {
      if (!err || typeof err !== 'object') return null
      const e = err as { data?: unknown; status?: number }
      if (e.data && typeof e.data === 'object' && e.data !== null && 'error' in e.data) {
        return String((e.data as { error: string }).error)
      }
      if (e.status === 401) return 'Sessione non valida o scaduta. Effettua di nuovo il login.'
      return null
    }
    return (
      fromRtk(countersQuery.error) ??
      fromRtk(counterValuesQuery.error) ??
      (countersQuery.isError ? 'Impossibile caricare l’elenco contatori.' : null) ??
      (counterValuesQuery.isError ? 'Impossibile caricare le letture (counter values).' : null)
    )
  }, [
    countersQuery.error,
    countersQuery.isError,
    counterValuesQuery.error,
    counterValuesQuery.isError,
  ])

  const yearlyFinancialsQuery = useGetYearlyFinancialsQuery(
    { organization_id: organizationId, year: financialYear },
    { skip: !shouldFetch }
  )
  const { data: yearlyData, isFetching: yearlyFetching, refetch: refetchYearlyFinancials } =
    yearlyFinancialsQuery

  const [updateYearlyFinancials] = useUpdateYearlyFinancialsMutation()

  const counterOverrideKey = useCallback((counterId: string, year: number) => `${counterId}_${year}`, [])

  const mergedCounterValues = useMemo(() => {
    if (Object.keys(draftCounterOverrides).length === 0) return allCounterValues

    const out = [...allCounterValues]
    for (const [key, value] of Object.entries(draftCounterOverrides)) {
      const lastSep = key.lastIndexOf('_')
      if (lastSep <= 0) continue
      const counterId = key.slice(0, lastSep)
      const year = Number(key.slice(lastSep + 1))
      if (!counterId || !Number.isFinite(year)) continue

      const idx = out.findIndex((v) => v.counter_id === counterId && v.year === year)
      if (idx >= 0) {
        out[idx] = { ...out[idx], value }
      } else {
        out.push({
          id: `draft-${counterId}-${year}`,
          counter_id: counterId,
          year,
          value,
          reading_date: null,
          notes: null,
          created_at: '',
          updated_at: '',
        })
      }
    }
    return out
  }, [allCounterValues, draftCounterOverrides])

  const meterDisplayYearsAsc = useMemo(() => {
    let maxY = currentYear
    let minY = MIN_METER_YEAR
    for (const cv of allCounterValues) {
      const y = Number(cv.year)
      if (!Number.isFinite(y)) continue
      if (y > maxY) maxY = y
      if (y < minY) minY = y
    }
    const start = Math.min(MIN_METER_YEAR, minY)
    const end = Math.max(MIN_METER_YEAR, maxY)
    const years: number[] = []
    for (let y = start; y <= end; y++) years.push(y)
    return years
  }, [allCounterValues, currentYear])

  const priceSheetYearsAsc = useMemo(() => {
    const maxFromMeters =
      meterDisplayYearsAsc.length > 0
        ? meterDisplayYearsAsc[meterDisplayYearsAsc.length - 1]
        : MIN_METER_YEAR
    const end = Math.max(currentYear + 1, maxFromMeters, financialYear)
    return buildDisplayYearsAsc(end)
  }, [meterDisplayYearsAsc, currentYear, financialYear])

  const prices = useMemo<Prices>(() => {
    const gasolio = yearlyData?.computed?.gasolio_per_liter ?? 0
    return {
      gasolio,
      acqua: yearlyData?.acqua ?? 2,
      corrente: yearlyData?.corrente ?? 0.14,
    }
  }, [yearlyData])

  const expenses = useMemo<Expenses>(() => ({
    prezzoGasolio: prices.gasolio,
    fatturaGasolio: yearlyData?.computed?.fattura_gasolio_total ?? 0,
    manutenzione:
      draftExpenseOverridesByYear[financialYear]?.manutenzione ?? yearlyData?.manutenzione ?? 120,
    funzionamentoServizioPct:
      draftExpenseOverridesByYear[financialYear]?.funzionamentoServizioPct ??
      yearlyData?.funzionamento_servizio_pct ??
      20,
    corrente: 0,
  }), [prices.gasolio, yearlyData, draftExpenseOverridesByYear, financialYear])

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

  const loading = authLoading || countersLoading || counterValuesLoading || yearlyFetching

  const { kCalData, m3Data, kWData } = useMemo(() => {
    const years = meterDisplayYearsAsc
    const preferredOrder = ['dino', 'vladi', 'cristian']

    const normalizeName = (value: string | null | undefined) =>
      String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()

    const rankByPreferredUser = (name: string | null | undefined) => {
      const normalized = normalizeName(name)
      const idx = preferredOrder.findIndex((token) => normalized.includes(token))
      return idx === -1 ? Number.MAX_SAFE_INTEGER : idx
    }

    const sortByPreferredUsers = <T extends { name?: string | null }>(items: T[]) =>
      items.slice().sort((a, b) => {
        const rankA = rankByPreferredUser(a.name)
        const rankB = rankByPreferredUser(b.name)
        if (rankA !== rankB) return rankA - rankB
        return normalizeName(a.name).localeCompare(normalizeName(b.name))
      })

    const kCalRows = addKCalTotal(
      sortByPreferredUsers(filterCountersByType(counters, 'heat')).map((counter) =>
        transformCounterToYearRow(counter, years, mergedCounterValues)
      ),
      years
    )

    const m3Rows = addM3Total(
      sortByPreferredUsers(filterCountersByType(counters, 'water')).map((counter) =>
        transformCounterToYearRow(counter, years, mergedCounterValues)
      ),
      years
    )

    // kW is organization-wide: expose only the shared electric counter.
    const kWRows = filterElectricCounters(counters)
      .filter((counter) => counter.counter_type === 'electric_common')
      .map((counter) => transformCounterToYearRow(counter, years, mergedCounterValues))

    return { kCalData: kCalRows, m3Data: m3Rows, kWData: kWRows }
  }, [counters, mergedCounterValues, meterDisplayYearsAsc])



  const saveCounterValue = useCallback(async (
    counterId: string,
    year: number,
    value: number
  ) => {
    try {
      const existingValue = allCounterValues.find((v) =>
        counterValueRowMatches(v, counterId, year)
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
      if (isDraftMode) {
        setDraftCounterOverrides((prev) => ({
          ...prev,
          [counterOverrideKey(counterId, year)]: value,
        }))
        return
      }
      await saveCounterValue(counterId, year, value)
    } catch (error) {
      console.error('Error updating counter value:', error)
      throw error
    }
  }, [counters, saveCounterValue, isDraftMode, counterOverrideKey])

  const getAvailableYears = useCallback(() => {
    const years = new Set<number>()
    mergedCounterValues.forEach((cv) => {
      if (cv.year >= MIN_METER_YEAR) years.add(cv.year)
    })
    years.add(currentYear)
    meterDisplayYearsAsc.forEach((y) => years.add(y))
    return Array.from(years).sort((a, b) => b - a)
  }, [mergedCounterValues, currentYear, meterDisplayYearsAsc])

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

  const updatePrice = useCallback(
    async (key: keyof Prices, value: number) => {
      if (!profile?.organization_id || key === 'gasolio') return
      try {
        await updateYearlyFinancials({
          organization_id: profile.organization_id,
          year: financialYear,
          [key]: value,
        }).unwrap()
      } catch (error) {
        console.error('Error saving price:', error)
        throw error
      }
    },
    [profile?.organization_id, financialYear, updateYearlyFinancials]
  )

  const updateExpense = useCallback(
    async (key: keyof Expenses, value: number) => {
      if (!profile?.organization_id || !['manutenzione', 'funzionamentoServizioPct'].includes(key)) return
      try {
        if (isDraftMode) {
          setDraftExpenseOverridesByYear((prev) => ({
            ...prev,
            [financialYear]: {
              ...(prev[financialYear] ?? {}),
              [key]: value,
            },
          }))
          return
        }
        await updateYearlyFinancials({
          organization_id: profile.organization_id,
          year: financialYear,
          ...(key === 'manutenzione' ? { manutenzione: value } : {}),
          ...(key === 'funzionamentoServizioPct' ? { funzionamento_servizio_pct: value } : {}),
        }).unwrap()
      } catch (error) {
        console.error('Error saving expense:', error)
        throw error
      }
    },
    [profile?.organization_id, financialYear, updateYearlyFinancials, isDraftMode]
  )

  const getTotalExpensesPerUser = useCallback(() => {
    const totaleM3Row = m3Data.find(r => r.key === 'totale')
    const m3Diff = coalesceFiniteNumber(totaleM3Row?.differenza)
    const acquaFredda = m3Diff * prices.acqua

    const sharedKwRow = kWData.find((r) => r.counterType === 'electric_common')
    const kWDiff = coalesceFiniteNumber(sharedKwRow?.differenza)
    const corrente = kWDiff * prices.corrente

    const funzionamentoServizio = expenses.fatturaGasolio * (expenses.funzionamentoServizioPct / 100)

    // Gasolio total is excluded from shared pay-to-master amount.
    const totalExpenses = expenses.manutenzione + corrente + acquaFredda + funzionamentoServizio

    const userCount = kCalData.filter(r => r.key !== 'totale').length || 3
    return totalExpenses / userCount
  }, [m3Data, kWData, prices, expenses, kCalData])

  const refreshData = useCallback(() => {
    if (organizationId) {
      countersQuery.refetch()
      counterValuesQuery.refetch()
      refetchYearlyFinancials()
    }
  }, [organizationId, countersQuery, counterValuesQuery, refetchYearlyFinancials])

  const value: ReadingsContextType = {
    kCalData,
    m3Data,
    kWData,
    prices,
    expenses,
    loading,
    allCounterValues: mergedCounterValues,
    counters,
    getAvailableYears,
    meterDisplayYearsAsc,
    financialYear,
    setFinancialYear,
    priceSheetYearsAsc,
    updateCounterValues,
    updateReadings,
    updatePrice,
    updateExpense,
    getTotalExpensesPerUser,
    refreshData,
    organizationId,
    metersDataError,
  }

  return (
    <ReadingsContext.Provider value={value}>
      {children}
    </ReadingsContext.Provider>
  )
}
