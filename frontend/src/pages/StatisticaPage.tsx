import { useState, useMemo, useEffect } from 'react'
import { Card, Typography, Select, DatePicker } from 'antd'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useReadings } from '../contexts/ReadingsContext'
import { coalesceFiniteNumber, toFiniteNumberOrNull } from '../contexts/utils'
import { useAuth } from '../contexts/AuthContext'
import { useLazyGetYearlyFinancialsQuery } from '../store/api/yearlyFinancialsApi'
import { computeBonificoTotalRows } from '../lib/bonificoTotals'
import type { YearlyFinancialsResponse } from '../store/api/models'
import dayjs from 'dayjs'

const { Title } = Typography
const { RangePicker } = DatePicker

type SectionType = 'users' | 'calculations' | 'financials'
type UserMetric = 'kCal' | 'm3' | 'kW'
type CalcMetric = 'acquaCalda' | 'riscaldamento' | 'totaleBonifico'
type ViewMode =
  | 'users:kCal'
  | 'users:m3'
  | 'users:kW'
  | 'calculations:acquaCalda'
  | 'calculations:riscaldamento'
  | 'calculations:totaleBonifico'
  | 'financials:overview'

interface ChartDataPoint {
  name: string
  [key: string]: string | number
}

interface PieDataPoint {
  name: string
  value: number
  [key: string]: string | number
}

const StatisticaPage = () => {
  const { profile } = useAuth()
  const { kCalData, m3Data, kWData, getAvailableYears } = useReadings()
  const organizationId = profile?.organization_id ?? ''
  const currentYear = new Date().getFullYear()
  const yearsDesc = useMemo(() => getAvailableYears(), [getAvailableYears])
  const yearsAsc = useMemo(() => yearsDesc.slice().sort((a, b) => a - b), [yearsDesc])
  const selectableYears = yearsAsc.length > 0 ? yearsAsc : [currentYear]
  const minYear = selectableYears[0]
  const maxYear = selectableYears[selectableYears.length - 1]

  const [viewMode, setViewMode] = useState<ViewMode>('users:kCal')
  const [yearRange, setYearRange] = useState<[number, number]>([minYear, maxYear])
  const [selectedUsers, setSelectedUsers] = useState<string[]>(['Vladi', 'Dino', 'Cristian'])
  const [yearlyByYear, setYearlyByYear] = useState<Record<number, YearlyFinancialsResponse>>({})
  const [fetchYearlyFinancial] = useLazyGetYearlyFinancialsQuery()

  const section: SectionType = useMemo(() => {
    if (viewMode.startsWith('users:')) return 'users'
    if (viewMode.startsWith('calculations:')) return 'calculations'
    return 'financials'
  }, [viewMode])

  const userMetric: UserMetric = useMemo(() => {
    if (viewMode === 'users:m3') return 'm3'
    if (viewMode === 'users:kW') return 'kW'
    return 'kCal'
  }, [viewMode])

  const calcMetric: CalcMetric = useMemo(() => {
    if (viewMode === 'calculations:acquaCalda') return 'acquaCalda'
    if (viewMode === 'calculations:riscaldamento') return 'riscaldamento'
    return 'totaleBonifico'
  }, [viewMode])

  const effectiveYearRange = useMemo<[number, number]>(() => {
    const start = Math.max(minYear, Math.min(yearRange[0], yearRange[1]))
    const end = Math.min(maxYear, Math.max(yearRange[0], yearRange[1]))
    return [start, end]
  }, [yearRange, minYear, maxYear])

  const yearsInRange = useMemo(
    () => yearsAsc.filter((y) => y >= effectiveYearRange[0] && y <= effectiveYearRange[1]),
    [yearsAsc, effectiveYearRange]
  )

  useEffect(() => {
    if (!organizationId || yearsInRange.length === 0) return
    let cancelled = false
    const load = async () => {
      const entries = await Promise.all(
        yearsInRange.map(async (year) => {
          try {
            const data = await fetchYearlyFinancial(
              { organization_id: organizationId, year },
              true
            ).unwrap()
            return [year, data] as const
          } catch {
            return null
          }
        })
      )
      if (cancelled) return
      setYearlyByYear((prev) => {
        const next = { ...prev }
        entries.forEach((entry) => {
          if (entry) next[entry[0]] = entry[1]
        })
        return next
      })
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [organizationId, yearsInRange, fetchYearlyFinancial])

  const prices = useMemo(
    () => (year: number) => {
      const yf = yearlyByYear[year]
      return {
        acqua: yf?.acqua ?? 2,
        corrente: yf?.corrente ?? 0.14,
        gasolio: yf?.computed?.gasolio_per_liter ?? 0,
      }
    },
    [yearlyByYear]
  )

  const expenses = useMemo(
    () => (year: number) => {
      const yf = yearlyByYear[year]
      return {
        fatturaGasolio: yf?.computed?.fattura_gasolio_total ?? 0,
        manutenzione: yf?.manutenzione ?? 120,
        funzionamentoServizioPct: yf?.funzionamento_servizio_pct ?? 20,
      }
    },
    [yearlyByYear]
  )

  const allUserNames = useMemo(() => {
    const names = new Set<string>()
    kCalData.forEach((r) => {
      if (r.key !== 'totale') names.add(r.name)
    })
    m3Data.forEach((r) => {
      if (r.key !== 'totale') names.add(r.name)
    })
    return Array.from(names)
  }, [kCalData, m3Data])

  const userOptions = useMemo(
    () => allUserNames.map((name) => ({ label: name, value: name })),
    [allUserNames]
  )

  const getDeltaByYear = (
    yearValues: Record<number, number | null> | undefined,
    year: number
  ): number => {
    if (!yearValues) return 0
    const cur = toFiniteNumberOrNull(yearValues[year])
    const prev = toFiniteNumberOrNull(yearValues[year - 1])
    if (cur == null || prev == null) return 0
    return cur - prev
  }

  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (section === 'users') {
      const yearsToShow = yearsInRange
      return yearsToShow.map((year) => {
        const point: ChartDataPoint = { name: String(year) }
        if (userMetric === 'kW') {
          const row = kWData.find((r) => r.counterType === 'electric_common')
          point.Totale = getDeltaByYear(row?.yearValues, year)
          return point
        }
        const sourceRows = userMetric === 'kCal' ? kCalData : m3Data
        sourceRows
          .filter((r) => r.key !== 'totale' && selectedUsers.includes(r.name))
          .forEach((r) => {
            point[r.name] = getDeltaByYear(r.yearValues, year)
          })
        return point
      })
    }

    if (section === 'calculations') {
      const yearsToShow = yearsInRange
      return yearsToShow.map((year) => {
        const point: ChartDataPoint = { name: String(year) }
        const { rows } = computeBonificoTotalRows(year, kCalData, m3Data, kWData, prices(year), expenses(year))
        rows
          .filter((r) => selectedUsers.includes(r.name))
          .forEach((r) => {
            if (calcMetric === 'acquaCalda') point[r.name] = coalesceFiniteNumber(r.speseAcquaCalda)
            if (calcMetric === 'riscaldamento') point[r.name] = coalesceFiniteNumber(r.speseRiscaldamento)
            if (calcMetric === 'totaleBonifico') point[r.name] = coalesceFiniteNumber(r.totale)
          })
        return point
      })
    }

    return yearsInRange.map((year) => {
      const yf = yearlyByYear[year]
      return {
        name: String(year),
        'Totale bollette gasolio': coalesceFiniteNumber(yf?.computed?.fattura_gasolio_total),
        'Litri totali': coalesceFiniteNumber(yf?.computed?.total_liters),
        'Prezzo medio gasolio (€/L)': coalesceFiniteNumber(yf?.computed?.gasolio_per_liter),
        'Prezzo acqua (€/m³)': coalesceFiniteNumber(yf?.acqua),
        'Prezzo elettricita comune (€/kWh)': coalesceFiniteNumber(yf?.corrente),
      }
    })
  }, [
    section,
    userMetric,
    calcMetric,
    yearsInRange,
    selectedUsers,
    kCalData,
    m3Data,
    kWData,
    prices,
    expenses,
    yearlyByYear,
  ])

  const getChartKeys = () => {
    if (chartData.length === 0) return []
    const firstData = chartData[0]
    return Object.keys(firstData).filter(key => key !== 'name')
  }

  const chartKeys = getChartKeys()

  // Color mapping for users
  const getUserColor = (userName: string): string => {
    const colorMap: Record<string, string> = {
      'Vladi': '#1890ff',
      'Dino': '#52c41a',
      'Cristian': '#faad14',
      Totale: '#722ed1',
    }
    return colorMap[userName] || '#eb2f96'
  }

  const pieData = useMemo<PieDataPoint[]>(() => {
    if (!(section === 'calculations' && calcMetric === 'totaleBonifico')) return []
    if (yearsInRange.length === 0) return []
    const latestYear = yearsInRange[yearsInRange.length - 1]
    const { rows } = computeBonificoTotalRows(
      latestYear,
      kCalData,
      m3Data,
      kWData,
      prices(latestYear),
      expenses(latestYear)
    )
    return rows
      .filter((r) => selectedUsers.includes(r.name))
      .map((r) => ({ name: r.name, value: coalesceFiniteNumber(r.totale) }))
      .filter((r) => r.value > 0)
  }, [section, calcMetric, yearsInRange, kCalData, m3Data, kWData, prices, expenses, selectedUsers])

  const renderChart = () => {
    if (chartData.length === 0) {
      return <div>Nessun dato disponibile</div>
    }

    return (
      <div className="flex flex-col gap-6">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              label={{
                value: 'Anno',
                position: 'insideBottom',
                offset: -5
              }}
            />
            <YAxis
              label={{
                value:
                  section === 'users'
                    ? userMetric === 'kCal'
                      ? 'Differenza (kCal)'
                      : userMetric === 'm3'
                        ? 'Differenza (M³)'
                        : 'Differenza (kW)'
                    : 'Valore (€ / unità)',
                angle: -90,
                position: 'insideLeft'
              }}
              domain={['auto', 'auto']}
            />
            <Tooltip
              formatter={(value: number) => {
                if (section === 'users') {
                  return value.toLocaleString('it-IT', { maximumFractionDigits: 1 })
                }
                return `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              }}
            />
            <Legend />
            {chartKeys.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                fill={getUserColor(key)}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>

        {section === 'calculations' && calcMetric === 'totaleBonifico' && pieData.length > 0 && (
          <ResponsiveContainer width="100%" height={360}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={getUserColor(entry.name)} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) =>
                  `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                }
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 md:mb-6">
        <Title level={2} style={{ margin: 0, fontSize: '24px' }}>Statistica</Title>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Select
            value={viewMode}
            onChange={(value) => setViewMode(value as ViewMode)}
            style={{ width: 300 }}
            size="large"
            options={[
              {
                label: 'Valori utenti',
                options: [
                  { label: 'kCal - Contatore Calore', value: 'users:kCal' },
                  { label: 'M³ - Contatore Acqua', value: 'users:m3' },
                  { label: 'kW - Contatore Elettrico', value: 'users:kW' },
                ],
              },
              {
                label: 'Calcoli',
                options: [
                  { label: 'Spese acqua calda', value: 'calculations:acquaCalda' },
                  { label: 'Spese riscaldamento', value: 'calculations:riscaldamento' },
                  { label: 'Totale bonifico', value: 'calculations:totaleBonifico' },
                ],
              },
              {
                label: 'Prezzi e bollette',
                options: [{ label: 'Overview annuale', value: 'financials:overview' }],
              },
            ]}
          />
          <RangePicker
            picker="year"
            allowClear={false}
            value={[dayjs(`${effectiveYearRange[0]}-01-01`), dayjs(`${effectiveYearRange[1]}-01-01`)]}
            onChange={(values) => {
              if (!values || values.length !== 2 || !values[0] || !values[1]) return
              const start = values[0].year()
              const end = values[1].year()
              setYearRange([Math.max(minYear, Math.min(start, end)), Math.min(maxYear, Math.max(start, end))])
            }}
            minDate={dayjs(`${minYear}-01-01`)}
            maxDate={dayjs(`${maxYear}-12-31`)}
            format="YYYY"
            size="large"
          />
          {section !== 'financials' && (
            <Select
              mode="multiple"
              value={selectedUsers}
              onChange={setSelectedUsers}
              style={{ minWidth: 280 }}
              size="large"
              options={userOptions}
              placeholder="Filtra utenti"
              maxTagCount="responsive"
            />
          )}
        </div>
      </div>

      <Card>
        {renderChart()}
      </Card>
    </div>
  )
}

export default StatisticaPage

