import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

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
  updateKCalData: (key: string, field: 'kCalPrec' | 'kCalAtt', value: number | null) => void
  updateM3Data: (key: string, field: 'm3Prec' | 'm3Att', value: number | null) => void
  updateKWData: (key: string, field: 'kWPrec' | 'kWAtt', value: number | null) => void
  updateReadings: (values: Record<string, number>) => void
  updatePrice: (key: keyof Prices, value: number) => void
  updateExpense: (key: keyof Expenses, value: number) => void
  getTotalExpensesPerUser: () => number
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

const calculateDifference = (prec: number | null, att: number | null): number => {
  if (prec === null || att === null) return 0
  return att - prec
}

export const ReadingsProvider = ({ children }: ReadingsProviderProps) => {
  const [kCalData, setKCalData] = useState<KCalRow[]>([
    { key: 'vladi', name: 'Vladi', kCalPrec: 124637.7, kCalAtt: 125769.7, differenza: 1132 },
    { key: 'dino', name: 'Dino', kCalPrec: 80818.7, kCalAtt: 82048.3, differenza: 1229.6 },
    { key: 'cristian', name: 'Cristian', kCalPrec: 86479, kCalAtt: 86479, differenza: 0 },
    { key: 'totale', name: 'Totale', kCalPrec: 291935.4, kCalAtt: 294297, differenza: 2361.6 },
  ])

  const [m3Data, setM3Data] = useState<M3Row[]>([
    { key: 'vladi', name: 'Vladi', m3Prec: 390, m3Att: 422, differenza: 32 },
    { key: 'dino', name: 'Dino', m3Prec: 782, m3Att: 830, differenza: 48 },
    { key: 'cristian', name: 'Cristian', m3Prec: 342, m3Att: 359, differenza: 17 },
    { key: 'totale', name: 'Totale', m3Prec: null, m3Att: null, differenza: 97 },
  ])

  const [kWData, setKWData] = useState<KWRow[]>([
    { key: 'comune', name: 'Comune', kWPrec: 2861, kWAtt: 3192.3, differenza: 331.3 },
  ])

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

  const updateKCalData = useCallback((key: string, field: 'kCalPrec' | 'kCalAtt', value: number | null) => {
    setKCalData(prevData => {
      const newData = prevData.map(row => {
        const isTarget = row.key === key
        const isTotal = key === 'totale'

        const updated = isTarget
          ? { ...row, [field]: value }
          : row

        const shouldRecalc = isTarget && (isTotal || !isTotal)
        updated.differenza = shouldRecalc
          ? calculateDifference(updated.kCalPrec, updated.kCalAtt)
          : updated.differenza

        return updated
      })

      const totale = newData.find(r => r.key === 'totale')
      if (totale) {
        const individuals = newData.filter(r => r.key !== 'totale')
        const precSum = individuals.reduce((sum, r) => sum + (r.kCalPrec || 0), 0)
        const attSum = individuals.reduce((sum, r) => sum + (r.kCalAtt || 0), 0)
        totale.kCalPrec = precSum
        totale.kCalAtt = attSum
        totale.differenza = calculateDifference(totale.kCalPrec, totale.kCalAtt)
      }

      return newData
    })
  }, [])

  const updateM3Data = useCallback((key: string, field: 'm3Prec' | 'm3Att', value: number | null) => {
    setM3Data(prevData => {
      const newData = prevData.map(row => {
        const isTarget = row.key === key
        const isTotal = key === 'totale'

        const updated = isTarget
          ? { ...row, [field]: value }
          : row

        const shouldRecalc = isTarget && !isTotal
        updated.differenza = shouldRecalc
          ? calculateDifference(updated.m3Prec, updated.m3Att)
          : updated.differenza

        return updated
      })

      const totale = newData.find(r => r.key === 'totale')
      if (totale) {
        const individuals = newData.filter(r => r.key !== 'totale')
        const diffSum = individuals.reduce((sum, r) => sum + r.differenza, 0)
        totale.differenza = diffSum
      }

      return newData
    })
  }, [])

  const updateKWData = useCallback((key: string, field: 'kWPrec' | 'kWAtt', value: number | null) => {
    setKWData(prevData => {
      return prevData.map(row => {
        const isTarget = row.key === key
        const updated = isTarget
          ? { ...row, [field]: value }
          : row

        updated.differenza = isTarget
          ? calculateDifference(updated.kWPrec, updated.kWAtt)
          : updated.differenza

        return updated
      })
    })
  }, [])

  const updateReadings = useCallback((values: Record<string, number>) => {
    const users = ['vladi', 'dino', 'cristian']

    // Update kCal data
    setKCalData(prevKCalData => {
      const newKCalData = prevKCalData.map(row => {
        const isUser = users.includes(row.key)
        const isTotal = row.key === 'totale'

        const shouldUpdate = isUser && values[`${row.key}_kCal`] !== undefined
        const newValue = shouldUpdate ? values[`${row.key}_kCal`] : row.kCalAtt

        const updated = shouldUpdate
          ? { ...row, kCalAtt: newValue }
          : row

        const shouldRecalcDiff = isUser || isTotal
        updated.differenza = shouldRecalcDiff
          ? calculateDifference(updated.kCalPrec, updated.kCalAtt)
          : updated.differenza

        return updated
      })

      // Recalculate totals
      const totale = newKCalData.find(r => r.key === 'totale')
      if (totale) {
        const individuals = newKCalData.filter(r => r.key !== 'totale')
        const precSum = individuals.reduce((sum, r) => sum + (r.kCalPrec || 0), 0)
        const attSum = individuals.reduce((sum, r) => sum + (r.kCalAtt || 0), 0)
        totale.kCalPrec = precSum
        totale.kCalAtt = attSum
        totale.differenza = calculateDifference(totale.kCalPrec, totale.kCalAtt)
      }

      return newKCalData
    })

    // Update M3 data
    setM3Data(prevM3Data => {
      const newM3Data = prevM3Data.map(row => {
        const isUser = users.includes(row.key)
        const isTotal = row.key === 'totale'

        const shouldUpdate = isUser && values[`${row.key}_m3`] !== undefined
        const newValue = shouldUpdate ? values[`${row.key}_m3`] : row.m3Att

        const updated = shouldUpdate
          ? { ...row, m3Att: newValue }
          : row

        const shouldRecalcDiff = isUser && !isTotal
        updated.differenza = shouldRecalcDiff
          ? calculateDifference(updated.m3Prec, updated.m3Att)
          : updated.differenza

        return updated
      })

      // Recalculate total difference
      const totale = newM3Data.find(r => r.key === 'totale')
      if (totale) {
        const individuals = newM3Data.filter(r => r.key !== 'totale')
        const diffSum = individuals.reduce((sum, r) => sum + r.differenza, 0)
        totale.differenza = diffSum
      }

      return newM3Data
    })
  }, [])

  const updatePrice = useCallback((key: keyof Prices, value: number) => {
    setPrices(prev => ({ ...prev, [key]: value }))
    // Sync expenses.prezzoGasolio when prices.gasolio is updated
    if (key === 'gasolio') {
      setExpenses(prev => ({ ...prev, prezzoGasolio: value }))
    }
  }, [])

  const updateExpense = useCallback((key: keyof Expenses, value: number) => {
    setExpenses(prev => ({ ...prev, [key]: value }))
  }, [])

  const getTotalExpensesPerUser = useCallback(() => {
    // Calculate acquaFredda from m3Data
    const totaleM3Row = m3Data.find(r => r.key === 'totale')
    const m3Diff = totaleM3Row?.differenza || 0
    const acquaFredda = m3Diff * prices.acqua

    // Calculate corrente from kW difference * corrente price
    const comuneKWRow = kWData.find(r => r.key === 'comune')
    const kWDiff = comuneKWRow?.differenza || 0
    const corrente = kWDiff * prices.corrente

    // Calculate funzionamentoServizio (20% of fatturaGasolio)
    const funzionamentoServizio = expenses.fatturaGasolio * 0.2

    // Calculate total expenses
    const totalExpenses = expenses.fatturaGasolio + expenses.manutenzione + corrente + acquaFredda + funzionamentoServizio

    // Divide by number of users (3)
    return totalExpenses / 3
  }, [m3Data, kWData, prices, expenses])

  const value: ReadingsContextType = {
    kCalData,
    m3Data,
    kWData,
    prices,
    expenses,
    updateKCalData,
    updateM3Data,
    updateKWData,
    updateReadings,
    updatePrice,
    updateExpense,
    getTotalExpensesPerUser,
  }

  return (
    <ReadingsContext.Provider value={value}>
      {children}
    </ReadingsContext.Provider>
  )
}

