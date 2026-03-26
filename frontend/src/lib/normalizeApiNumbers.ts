import type { Counter, CounterValue, GasoilDelivery, YearlyFinancialsResponse } from '../store/api/models'

/** Parse Postgres DECIMAL / locale strings (e.g. "1234,56", "1.234,56") to a finite number. */
export function parseDecimalLike(v: unknown): number {
  if (v == null || v === '') return NaN
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'bigint') return Number(v)
  let s = String(v).trim().replace(/\s/g, '')
  if (s === '') return NaN
  // European: thousands with dot, decimal with comma (e.g. 1.234,56)
  if (s.includes(',') && /\./.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (s.includes(',')) {
    s = s.replace(',', '.')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

/**
 * Build a CounterValue from GET /counter-values rows (snake_case, camelCase, nested counters).
 * Avoids fragile `in` / spread that dropped valid Supabase rows.
 */
export function parseCounterValueFromApi(raw: unknown): CounterValue | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const nested =
    o.counters != null && typeof o.counters === 'object'
      ? (o.counters as { id?: unknown }).id
      : undefined
  const counter_id = o.counter_id ?? o.counterId ?? nested
  const yearRaw = o.year
  const valueRaw = o.value
  if (counter_id == null || yearRaw == null || valueRaw === undefined || valueRaw === null) return null
  const year = Number(yearRaw)
  if (!Number.isFinite(year)) return null
  const value = parseDecimalLike(valueRaw)
  if (!Number.isFinite(value)) return null
  const id = o.id != null ? String(o.id) : ''
  const counters =
    o.counters != null && typeof o.counters === 'object'
      ? (o.counters as Counter)
      : undefined
  return {
    id,
    counter_id: String(counter_id).trim(),
    year,
    value,
    reading_date: (o.reading_date as string | null) ?? null,
    notes: (o.notes as string | null) ?? null,
    created_at: String(o.created_at ?? ''),
    updated_at: String(o.updated_at ?? ''),
    counters,
  }
}

/** Supabase/Postgres DECIMAL often arrives as string; Ant InputNumber needs real numbers. */
export function normalizeCounterValue(cv: CounterValue): CounterValue {
  const n = parseDecimalLike(cv.value)
  return {
    ...cv,
    year: Number(cv.year),
    value: Number.isFinite(n) ? n : 0,
  }
}

export function normalizeGasoilDelivery(d: GasoilDelivery): GasoilDelivery {
  return {
    ...d,
    year: Number(d.year),
    sort_order: Number(d.sort_order),
    liters: parseDecimalLike(d.liters) || 0,
    amount_eur: parseDecimalLike(d.amount_eur) || 0,
  }
}

export function normalizeYearlyFinancialsResponse(data: YearlyFinancialsResponse): YearlyFinancialsResponse {
  const fb = data.gasolio_fallback as unknown
  const gasolio_fallback =
    fb != null && fb !== '' && !(typeof fb === 'number' && Number.isNaN(fb))
      ? Number(fb as string | number)
      : null

  return {
    ...data,
    year: Number(data.year),
    acqua: Number(data.acqua),
    corrente: Number(data.corrente),
    manutenzione: Number(data.manutenzione),
    funzionamento_servizio_pct: Number(data.funzionamento_servizio_pct ?? 20),
    gasolio_fallback,
    gasoil_deliveries: (data.gasoil_deliveries ?? []).map(normalizeGasoilDelivery),
    computed: {
      gasolio_per_liter: Number(data.computed?.gasolio_per_liter ?? 0),
      fattura_gasolio_total: Number(data.computed?.fattura_gasolio_total ?? 0),
      total_liters: Number(data.computed?.total_liters ?? 0),
    },
  }
}
