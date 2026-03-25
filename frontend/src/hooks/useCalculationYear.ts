import { useMemo, useState, useEffect } from 'react'
import { useReadings } from '../contexts/ReadingsContext'

/** Anno per calcoli Δ vs anno precedente + sync con Prezzi/Spese (financial year). */
export function useCalculationYear() {
  const { meterDisplayYearsAsc, setFinancialYear } = useReadings()
  const actualYear = new Date().getFullYear()

  const eligibleYears = useMemo(
    () => meterDisplayYearsAsc.filter((y) => meterDisplayYearsAsc.includes(y - 1)),
    [meterDisplayYearsAsc]
  )

  const [selectedYear, setSelectedYear] = useState(actualYear)

  useEffect(() => {
    if (eligibleYears.length === 0) return
    setSelectedYear((y) => {
      if (eligibleYears.includes(y)) return y
      if (eligibleYears.includes(actualYear)) return actualYear
      return eligibleYears[eligibleYears.length - 1]
    })
  }, [eligibleYears, actualYear])

  const yearForCalc = eligibleYears.includes(selectedYear)
    ? selectedYear
    : eligibleYears.includes(actualYear)
      ? actualYear
      : eligibleYears[eligibleYears.length - 1] ?? actualYear

  useEffect(() => {
    if (eligibleYears.length === 0) return
    setFinancialYear(yearForCalc)
  }, [yearForCalc, eligibleYears.length, setFinancialYear])

  const yearSelectOptions = useMemo(
    () =>
      [...eligibleYears]
        .reverse()
        .map((y) => ({
          label: y === actualYear ? `${y} (attuale)` : String(y),
          value: y,
        })),
    [eligibleYears, actualYear]
  )

  return {
    eligibleYears,
    selectedYear,
    setSelectedYear,
    yearForCalc,
    yearSelectOptions,
    actualYear,
  }
}
