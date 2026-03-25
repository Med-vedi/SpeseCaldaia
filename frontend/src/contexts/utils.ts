import type { Counter, CounterValue, CounterType } from '../store/api/models'

/** First year shown on Lettura contattori tables */
export const MIN_METER_YEAR = 2024

export const calculateDifference = (prec: number | null, att: number | null): number => {
  if (prec === null || att === null) return 0
  return att - prec
}

/** Inclusive range of years [MIN_METER_YEAR .. maxYear], ascending */
export const buildDisplayYearsAsc = (maxYear: number): number[] => {
  const end = Math.max(maxYear, MIN_METER_YEAR)
  const years: number[] = []
  for (let y = MIN_METER_YEAR; y <= end; y++) years.push(y)
  return years
}

/** Safe numeric read (API may send DECIMAL as string; bad data must not become string sums). */
export function toFiniteNumberOrNull(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function coalesceFiniteNumber(v: unknown): number {
  const n = toFiniteNumberOrNull(v)
  return n ?? 0
}

/** Δ between the two rightmost year columns: lastYear − previousYear */
export const tailYearDifference = (
  yearsAsc: number[],
  yearValues: Record<number, number | null>
): number => {
  if (yearsAsc.length < 2) return 0
  const yPrev = yearsAsc[yearsAsc.length - 2]
  const yLast = yearsAsc[yearsAsc.length - 1]
  return calculateDifference(toFiniteNumberOrNull(yearValues[yPrev]), toFiniteNumberOrNull(yearValues[yLast]))
}

/** Compare counter UUIDs from DB vs UI (hyphens / case may differ in some clients). */
function normCounterRef(id: string): string {
  return String(id).replace(/-/g, '').toLowerCase().trim()
}

function rowCounterId(v: CounterValue): string {
  const cid = v.counter_id ?? v.counters?.id
  return cid != null ? String(cid).trim() : ''
}

/** Match counter readings even when API sends year/counter_id as string vs number (strict === would miss). */
export function counterValueRowMatches(v: CounterValue, counterId: string, year: number): boolean {
  const rid = rowCounterId(v)
  if (!rid) return false
  return normCounterRef(rid) === normCounterRef(counterId) && Number(v.year) === Number(year)
}

export const getValueForCounter = (
  counterId: string,
  year: number,
  values: CounterValue[]
): number | null => {
  const row = values.find((v) => counterValueRowMatches(v, counterId, year))
  if (!row) return null
  return toFiniteNumberOrNull(row.value)
}

export const filterCountersByType = (counters: Counter[], type: 'heat' | 'water') => {
  return counters.filter(c => c.counter_type === type)
}

export const filterElectricCounters = (counters: Counter[]) => {
  return counters.filter(c => c.counter_type === 'electric' || c.counter_type === 'electric_common')
}

/** e.g. "dino — Calore" → "Dino"; shared kW (elettrico comune) → "Totale" */
export const formatMeterRowDisplayName = (counter: Counter): string => {
  if (counter.counter_type === 'electric_common') {
    return 'Totale'
  }
  let raw = counter.name?.trim() || ''
  raw = raw.replace(/\s*—\s*(Calore|Acqua|Elettrico)\s*$/i, '').trim()
  if (!raw) raw = counter.name?.trim() || ''
  return raw
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toLocaleUpperCase('it-IT') + w.slice(1).toLocaleLowerCase('it-IT') : ''))
    .filter(Boolean)
    .join(' ')
}

export interface YearValuesRow {
  key: string
  name: string
  yearValues: Record<number, number | null>
  differenza: number
  counterId?: string
  counterType?: CounterType
}

export const transformCounterToYearRow = (
  counter: Counter,
  displayYearsAsc: number[],
  allCounterValues: CounterValue[]
): YearValuesRow => {
  const yearValues: Record<number, number | null> = {}
  for (const y of displayYearsAsc) {
    yearValues[y] = toFiniteNumberOrNull(getValueForCounter(counter.id, y, allCounterValues))
  }
  return {
    key: counter.id,
    name: formatMeterRowDisplayName(counter),
    yearValues,
    differenza: tailYearDifference(displayYearsAsc, yearValues),
    counterId: counter.id,
    counterType: counter.counter_type,
  }
}

export const addKCalTotal = (
  rows: YearValuesRow[],
  displayYearsAsc: number[]
): YearValuesRow[] => {
  if (rows.length === 0) return rows
  const yearValues: Record<number, number | null> = {}
  for (const y of displayYearsAsc) {
    yearValues[y] = rows.reduce((sum, r) => sum + coalesceFiniteNumber(r.yearValues[y]), 0)
  }
  return [
    ...rows,
    {
      key: 'totale',
      name: 'Totale',
      yearValues,
      differenza: tailYearDifference(displayYearsAsc, yearValues),
    },
  ]
}

export const addM3Total = (rows: YearValuesRow[], displayYearsAsc: number[]): YearValuesRow[] => {
  if (rows.length === 0) return rows
  const yearValues: Record<number, number | null> = {}
  for (const y of displayYearsAsc) {
    yearValues[y] = rows.reduce((sum, r) => sum + coalesceFiniteNumber(r.yearValues[y]), 0)
  }
  return [
    ...rows,
    {
      key: 'totale',
      name: 'Totale',
      yearValues,
      differenza: tailYearDifference(displayYearsAsc, yearValues),
    },
  ]
}

