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
  funzionamentoServizio: number
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
  funzionamentoServizioPct: number
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
  const { fatturaGasolio, manutenzione, funzionamentoServizioPct } = expenses

  const totaleM3Row = m3Data.find((r) => r.key === 'totale')
  const m3Diff = yearOverYearDelta(totaleM3Row?.yearValues, yearForCalc)
  const acquaFredda = m3Diff * acqua

  const sharedKwRow = kWData.find((r) => r.counterType === 'electric_common')
  const kWDiff = yearOverYearDelta(sharedKwRow?.yearValues, yearForCalc)
  const correnteEur = kWDiff * corrente

  const funzionamentoServizio = fatturaGasolio * (funzionamentoServizioPct / 100)
  // Gasolio total is informational and excluded from shared pay-to-master amount.
  const totalExpenses = manutenzione + correnteEur + acquaFredda + funzionamentoServizio

  const userCount = kCalData.filter((r) => r.key !== 'totale').length || 3
  const payToMaster = totalExpenses / userCount
  const funzionamentoServizioPerUser = funzionamentoServizio / userCount

  const userM3Rows = m3Data.filter((r) => r.key !== 'totale')
  const hotWaterData = userM3Rows.map((m3Row) => {
    const m3 = yearOverYearDelta(m3Row.yearValues, yearForCalc)
    const spesa = m3 * (prezzoGasolio * 10)
    return { key: m3Row.key, name: m3Row.name, m3, spesa }
  })

  const totaleKCalRow = kCalData.find((r) => r.key === 'totale')
  const kCalTotale = yearOverYearDelta(totaleKCalRow?.yearValues, yearForCalc)
  const totalHotWaterExpenses = hotWaterData.reduce((sum, row) => sum + row.spesa, 0)
  const heatingBudget = fatturaGasolio - funzionamentoServizio - totalHotWaterExpenses
  const prezzoKCal = heatingBudget > 0 && kCalTotale > 0 ? heatingBudget / kCalTotale : 0

  const userKCalRows = kCalData.filter((r) => r.key !== 'totale')
  const heatingData = userKCalRows.map((kCalRow) => {
    const kCal = yearOverYearDelta(kCalRow.yearValues, yearForCalc)
    const spesa = prezzoKCal > 0 ? kCal * prezzoKCal : 0
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
    // "Da dare a Dino" is paid in cash, so it is shown separately and excluded from bonifico total.
    // Funzionamento servizio is included in bonifico total per user.
    const totale = funzionamentoServizioPerUser + speseAcquaCalda + speseRiscaldamento

    return {
      key,
      name,
      payToMaster,
      funzionamentoServizio: funzionamentoServizioPerUser,
      speseAcquaCalda,
      speseRiscaldamento,
      totale,
    }
  })

  return { rows, payToMaster }
}
