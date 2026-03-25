import type { YearValuesRow } from '../contexts/utils'

/** Consumi / Δ = lettura anno − lettura anno precedente (per calcolo annuale) */
export function yearOverYearDelta(
  yearValues: Record<number, number | null> | undefined,
  year: number
): number {
  if (!yearValues) return 0
  const cur = yearValues[year]
  const prev = yearValues[year - 1]
  if (cur == null || prev == null) return 0
  return Number(cur) - Number(prev)
}

export interface BonificoTotalRow {
  key: string
  name: string
  payToMaster: number
  speseAcquaCalda: number
  speseRiscaldamento: number
  totale: number
}

export interface BonificoPrices {
  acqua: number
  corrente: number
  gasolio: number
}

export interface BonificoExpenses {
  fatturaGasolio: number
  manutenzione: number
}

/**
 * Stessa logica della pagina Calcolo: quota “Da dare a Dino”, acqua calda e riscaldamento per ogni utente, totale bonifico.
 */
export function computeBonificoTotalRows(
  yearForCalc: number,
  kCalData: YearValuesRow[],
  m3Data: YearValuesRow[],
  kWData: YearValuesRow[],
  prices: BonificoPrices,
  expenses: BonificoExpenses
): { rows: BonificoTotalRow[]; payToMaster: number } {
  const { acqua, corrente, gasolio: prezzoGasolio } = prices
  const { fatturaGasolio, manutenzione } = expenses

  const totaleM3Row = m3Data.find((r) => r.key === 'totale')
  const m3Diff = yearOverYearDelta(totaleM3Row?.yearValues, yearForCalc)
  const acquaFredda = m3Diff * acqua

  const sharedKwRow = kWData.find((r) => r.counterType === 'electric_common')
  const kWDiff = yearOverYearDelta(sharedKwRow?.yearValues, yearForCalc)
  const correnteEur = kWDiff * corrente

  const funzionamentoServizio = fatturaGasolio * 0.2
  const totalExpenses =
    fatturaGasolio + manutenzione + correnteEur + acquaFredda + funzionamentoServizio

  const userCount = kCalData.filter((r) => r.key !== 'totale').length || 3
  const payToMaster = totalExpenses / userCount

  const userM3Rows = m3Data.filter((r) => r.key !== 'totale')
  const hotWaterData = userM3Rows.map((m3Row) => {
    const m3 = yearOverYearDelta(m3Row.yearValues, yearForCalc)
    const spesa = m3 * (prezzoGasolio * 10)
    return { key: m3Row.key, name: m3Row.name, m3, spesa }
  })

  const totalHotWaterExpenses = hotWaterData.reduce((sum, row) => sum + row.spesa, 0)

  const totaleRow = kCalData.find((r) => r.key === 'totale')
  const kCalTotale = yearOverYearDelta(totaleRow?.yearValues, yearForCalc)
  const prezzoKCal =
    kCalTotale > 0
      ? (fatturaGasolio - funzionamentoServizio - totalHotWaterExpenses) / kCalTotale
      : 0

  const userKCalRows = kCalData.filter((r) => r.key !== 'totale')
  const heatingData = userKCalRows.map((kCalRow) => {
    const kCal = yearOverYearDelta(kCalRow.yearValues, yearForCalc)
    const spesa = prezzoKCal * kCal
    return { key: kCalRow.key, name: kCalRow.name, spesa }
  })

  const orderedNames = [
    ...new Set([...userKCalRows.map((r) => r.name), ...userM3Rows.map((r) => r.name)]),
  ]

  const rows: BonificoTotalRow[] = orderedNames.map((name) => {
    const hwRow = hotWaterData.find((h) => h.name === name)
    const heatingRow = heatingData.find((h) => h.name === name)
    const speseAcquaCalda = hwRow?.spesa ?? 0
    const speseRiscaldamento = heatingRow?.spesa ?? 0
    const key = hwRow?.key ?? heatingRow?.key ?? name
    const totale = payToMaster + speseAcquaCalda + speseRiscaldamento

    return {
      key,
      name,
      payToMaster,
      speseAcquaCalda,
      speseRiscaldamento,
      totale,
    }
  })

  return { rows, payToMaster }
}
