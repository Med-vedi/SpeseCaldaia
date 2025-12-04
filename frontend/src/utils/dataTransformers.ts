import type { CounterReading } from '../api/counterReadingsApi'
import type { UserProfile } from '../api/usersApi'
import type { Price } from '../api/pricesApi'
import type { Expense } from '../api/expensesApi'
import type { KCalRow, M3Row, KWRow, Prices, Expenses } from '../contexts/ReadingsContext'

const calculateDifference = (prec: number | null, att: number | null): number => {
  if (prec === null || att === null) return 0
  return att - prec
}

/**
 * Transform counter readings from DB format to frontend format
 */
export function transformCounterReadings(
  readings: CounterReading[],
  users: UserProfile[],
  currentYear: number,
  previousYear: number
): {
  kCalData: KCalRow[]
  m3Data: M3Row[]
  kWData: KWRow[]
} {
  // Create user map
  const userMap = new Map(users.map(u => [u.id, u]))

  // Group readings by user and type
  const readingsByUser: Record<string, Record<string, { current?: CounterReading; previous?: CounterReading }>> = {}

  readings.forEach(reading => {
    if (!reading.user_id) return

    if (!readingsByUser[reading.user_id]) {
      readingsByUser[reading.user_id] = {}
    }
    if (!readingsByUser[reading.user_id][reading.reading_type]) {
      readingsByUser[reading.user_id][reading.reading_type] = {}
    }

    if (reading.period_year === currentYear) {
      readingsByUser[reading.user_id][reading.reading_type].current = reading
    } else if (reading.period_year === previousYear) {
      readingsByUser[reading.user_id][reading.reading_type].previous = reading
    }
  })

  const kcalReadings: KCalRow[] = []
  const m3Readings: M3Row[] = []
  const kwReadings: KWRow[] = []

  // Process each user's readings
  Object.entries(readingsByUser).forEach(([userId, userReadings]) => {
    const user = userMap.get(userId)
    const userName = user ? (user.full_name || user.username) : `User ${userId.substring(0, 8)}`
    const userKey = user ? user.user_key : `user-${userId.substring(0, 8)}`

    // kCal readings
    const kcalData = userReadings['kcal']
    if (kcalData) {
      const prec = kcalData.previous?.value ?? null
      const att = kcalData.current?.value ?? null
      const differenza = calculateDifference(prec, att)

      kcalReadings.push({
        key: userKey,
        name: userName,
        kCalPrec: prec,
        kCalAtt: att,
        differenza,
      })
    }

    // m3 readings
    const m3Data = userReadings['m3']
    if (m3Data) {
      const prec = m3Data.previous?.value ?? null
      const att = m3Data.current?.value ?? null
      const differenza = calculateDifference(prec, att)

      m3Readings.push({
        key: userKey,
        name: userName,
        m3Prec: prec,
        m3Att: att,
        differenza,
      })
    }

    // kW readings (only for master user, stored as "comune")
    const kwData = userReadings['kw']
    if (kwData && (userKey === 'dino' || kwReadings.length === 0)) {
      const prec = kwData.previous?.value ?? null
      const att = kwData.current?.value ?? null
      const differenza = calculateDifference(prec, att)

      kwReadings.push({
        key: 'comune',
        name: 'Comune',
        kWPrec: prec,
        kWAtt: att,
        differenza,
      })
    }
  })

  // Calculate totals
  const calculateTotals = <T extends { differenza: number; key: string }>(
    data: T[],
    precField: keyof T,
    attField: keyof T
  ): T => {
    const individuals = data.filter(r => r.key !== 'totale')
    const precSum = individuals.reduce((sum, r) => sum + ((r[precField] as number) || 0), 0)
    const attSum = individuals.reduce((sum, r) => sum + ((r[attField] as number) || 0), 0)
    const diffSum = individuals.reduce((sum, r) => sum + r.differenza, 0)

    return {
      key: 'totale',
      name: 'Totale',
      [precField]: precSum,
      [attField]: attSum,
      differenza: diffSum,
    } as T
  }

  // Add totals
  if (kcalReadings.length > 0) {
    const kCalTotale = calculateTotals(kcalReadings, 'kCalPrec', 'kCalAtt') as KCalRow
    kcalReadings.push(kCalTotale)
  }

  if (m3Readings.length > 0) {
    const m3Totale = calculateTotals(m3Readings, 'm3Prec', 'm3Att') as M3Row
    m3Readings.push(m3Totale)
  }

  return {
    kCalData: kcalReadings,
    m3Data: m3Readings,
    kWData: kwReadings,
  }
}

/**
 * Transform prices from DB format to frontend format
 */
export function transformPrices(prices: Price[]): Prices {
  const priceMap: Partial<Prices> = {}
  prices.forEach(price => {
    if (!priceMap[price.price_type as keyof Prices]) {
      priceMap[price.price_type as keyof Prices] = parseFloat(String(price.value))
    }
  })

  return {
    gasolio: priceMap.gasolio ?? 1.28,
    acqua: priceMap.acqua ?? 2.0,
    corrente: priceMap.corrente ?? 0.14,
  }
}

/**
 * Transform expenses from DB format to frontend format
 */
export function transformExpenses(expenses: Expense[]): Expenses {
  const expenseMap: Partial<Expenses> = {}
  expenses.forEach(expense => {
    if (expense.expense_type === 'fatturaGasolio') {
      expenseMap.fatturaGasolio = parseFloat(String(expense.value))
    } else if (expense.expense_type === 'manutenzione') {
      expenseMap.manutenzione = parseFloat(String(expense.value))
    } else if (expense.expense_type === 'prezzoGasolio') {
      expenseMap.prezzoGasolio = parseFloat(String(expense.value))
    } else if (expense.expense_type === 'corrente') {
      expenseMap.corrente = parseFloat(String(expense.value))
    }
  })

  return {
    prezzoGasolio: expenseMap.prezzoGasolio ?? 1.28,
    fatturaGasolio: expenseMap.fatturaGasolio ?? 1280,
    manutenzione: expenseMap.manutenzione ?? 120,
    corrente: expenseMap.corrente ?? 46.4,
  }
}

