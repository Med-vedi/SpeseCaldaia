import type { Counter, CounterValue, CounterType } from '../store/api/models'

export const calculateDifference = (prec: number | null, att: number | null): number => {
  if (prec === null || att === null) return 0
  return att - prec
}

export const getValueForCounter = (
  counterId: string,
  year: number,
  values: CounterValue[]
): number | null => {
  const value = values.find(v => v.counter_id === counterId && v.year === year)
  return value?.value ?? null
}

export const filterCountersByType = (counters: Counter[], type: 'heat' | 'water') => {
  return counters.filter(c => c.counter_type === type)
}

export const filterElectricCounters = (counters: Counter[]) => {
  return counters.filter(c => c.counter_type === 'electric' || c.counter_type === 'electric_common')
}

interface TransformedRow {
  key: string
  name: string
  prec: number | null
  att: number | null
  differenza: number
  counterId: string
  counterType: CounterType
}

export const transformCounterToRow = (
  counter: Counter,
  previousYear: number,
  currentYear: number,
  previousYearValues: CounterValue[],
  currentYearValues: CounterValue[]
): TransformedRow => {
  const prec = getValueForCounter(counter.id, previousYear, previousYearValues)
  const att = getValueForCounter(counter.id, currentYear, currentYearValues)
  return {
    key: counter.id,
    name: counter.name,
    prec,
    att,
    differenza: calculateDifference(prec, att),
    counterId: counter.id,
    counterType: counter.counter_type,
  }
}

export const addKCalTotal = (
  rows: Array<{ kCalPrec: number | null; kCalAtt: number | null; differenza: number; key: string; name: string; counterId?: string; counterType?: CounterType }>
): typeof rows => {
  if (rows.length === 0) return rows
  const precSum = rows.reduce((sum, r) => sum + (r.kCalPrec || 0), 0)
  const attSum = rows.reduce((sum, r) => sum + (r.kCalAtt || 0), 0)
  return [
    ...rows,
    {
      key: 'totale',
      name: 'Totale',
      kCalPrec: precSum,
      kCalAtt: attSum,
      differenza: calculateDifference(precSum, attSum),
    } as typeof rows[0],
  ]
}

export const addM3Total = (
  rows: Array<{ m3Prec: number | null; m3Att: number | null; differenza: number; key: string; name: string; counterId?: string; counterType?: CounterType }>
): typeof rows => {
  if (rows.length === 0) return rows
  const diffSum = rows.reduce((sum, r) => sum + r.differenza, 0)
  return [
    ...rows,
    {
      key: 'totale',
      name: 'Totale',
      m3Prec: null,
      m3Att: null,
      differenza: diffSum,
    } as typeof rows[0],
  ]
}

