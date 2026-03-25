import { useState, useMemo } from 'react'
import { Card, Typography, Select } from 'antd'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useReadings } from '../contexts/ReadingsContext'
import { coalesceFiniteNumber } from '../contexts/utils'

const { Title } = Typography

type DataType = 'kCal' | 'm3' | 'kW' | 'payments'

interface ChartDataPoint {
  name: string
  [key: string]: string | number
}

const StatisticaPage = () => {
  const { kCalData, m3Data, kWData, expenses, getTotalExpensesPerUser } = useReadings()
  const [dataType, setDataType] = useState<DataType>('kCal')

  const chartData = useMemo<ChartDataPoint[]>(() => {
    const users = ['vladi', 'dino', 'cristian']
    // Structure ready for multiple years of difference data
    // For now, we have one period (2024-2025), but this can be extended
    const periods = ['2024-2025']

    switch (dataType) {
      case 'kCal': {
        // Show differences over time periods (ready for future years)
        return periods.map(period => {
          const dataPoint: ChartDataPoint = { name: period }
          users.forEach(userKey => {
            const row = kCalData.find(r => r.key === userKey)
            if (!row) return
            const userName = row.name
            // For now, we only have one period's difference
            // When more years are added, this will show trends
            dataPoint[userName] = coalesceFiniteNumber(row.differenza)
          })
          return dataPoint
        })
      }
      case 'm3': {
        // Show differences over time periods (ready for future years)
        return periods.map(period => {
          const dataPoint: ChartDataPoint = { name: period }
          users.forEach(userKey => {
            const row = m3Data.find(r => r.key === userKey)
            if (!row) return
            const userName = row.name
            dataPoint[userName] = coalesceFiniteNumber(row.differenza)
          })
          return dataPoint
        })
      }
      case 'kW': {
        return periods.map((period) => {
          const row = kWData.find((r) => r.counterType === 'electric_common')
          if (!row) return { name: period, Totale: 0 }
          return {
            name: period,
            [row.name]: coalesceFiniteNumber(row.differenza),
          }
        })
      }
      case 'payments': {
        // Calculate payments (Totale from CALCOLO IMPORTI TOTALI table)
        // Structure ready for multiple years - current year calculated, previous years from DB
        const payToMaster = getTotalExpensesPerUser()

        // Calculate current year payments
        const users = ['vladi', 'dino', 'cristian']

        // Calculate hot water expenses
        const hotWaterData = users.map(userKey => {
          const m3Row = m3Data.find(r => r.key === userKey)
          const m3 = coalesceFiniteNumber(m3Row?.differenza)
          const speseAcquaCalda = m3 * (expenses.prezzoGasolio * 10)
          return { userKey, name: m3Row?.name || userKey, speseAcquaCalda }
        })

        const totalHotWaterExpenses = hotWaterData.reduce((sum, row) => sum + row.speseAcquaCalda, 0)

        // Calculate kCal cost
        const totaleKCal = kCalData
          .filter(r => r.key !== 'totale')
          .reduce((sum, r) => sum + coalesceFiniteNumber(r.differenza), 0)

        const funzionamentoServizio = expenses.fatturaGasolio * 0.2
        const prezzoKCal = totaleKCal > 0
          ? (expenses.fatturaGasolio - funzionamentoServizio - totalHotWaterExpenses) / totaleKCal
          : 0

        // Calculate heating expenses
        const heatingData = users.map(userKey => {
          const kCalRow = kCalData.find(r => r.key === userKey)
          const kCal = coalesceFiniteNumber(kCalRow?.differenza)
          const speseRiscaldamento = prezzoKCal * kCal
          return { userKey, name: kCalRow?.name || userKey, speseRiscaldamento }
        })

        // Current year (2025) - calculated from current data
        // Future: previous years will come from DB
        const years = ['2025'] // Will be extended with previous years from DB

        return years.map(year => {
          const dataPoint: ChartDataPoint = { name: year }
          users.forEach(userKey => {
            const hwRow = hotWaterData.find(r => r.userKey === userKey)
            const heatRow = heatingData.find(r => r.userKey === userKey)
            const userName = hwRow?.name || userKey

            // Calculate total payment (Totale) for each user
            const speseAcquaCalda = hwRow?.speseAcquaCalda || 0
            const speseRiscaldamento = heatRow?.speseRiscaldamento || 0
            const totale = payToMaster + speseAcquaCalda + speseRiscaldamento

            dataPoint[userName] = totale
          })
          return dataPoint
        })
      }
      default:
        return []
    }
  }, [dataType, kCalData, m3Data, kWData, expenses, getTotalExpensesPerUser])

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

  const renderChart = () => {
    if (chartData.length === 0) {
      return <div>Nessun dato disponibile</div>
    }

    const strokeWidth = 3

    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            label={{
              value: dataType === 'kCal' || dataType === 'm3' || dataType === 'kW'
                ? 'Periodo'
                : 'Anno',
              position: 'insideBottom',
              offset: -5
            }}
          />
          <YAxis
            label={{
              value: dataType === 'kCal' ? 'Differenza (kCal)' :
                dataType === 'm3' ? 'Differenza (M³)' :
                  dataType === 'kW' ? 'Differenza (kW)' :
                    'Totale (€)',
              angle: -90,
              position: 'insideLeft'
            }}
            domain={['auto', 'auto']}
          />
          <Tooltip
            formatter={(value: number) => {
              if (dataType === 'kCal' || dataType === 'm3' || dataType === 'kW') {
                return value.toLocaleString('it-IT', { maximumFractionDigits: 1 })
              }
              return `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }}
          />
          <Legend />
          {chartKeys.map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={getUserColor(key)}
              strokeWidth={strokeWidth}
              dot={{ r: 6 }}
              activeDot={{ r: 8 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 md:mb-6">
        <Title level={2} style={{ margin: 0, fontSize: '24px' }}>Statistica</Title>
        <Select
          value={dataType}
          onChange={(value) => setDataType(value)}
          style={{ width: 200 }}
          size="large"
          options={[
            { label: 'kCal - Contatore Calore', value: 'kCal' },
            { label: 'M³ - Contatore Acqua', value: 'm3' },
            { label: 'kW - Contatore Elettrico', value: 'kW' },
            { label: 'Pagamenti (Bonifico)', value: 'payments' },
          ]}
        />
      </div>

      <Card>
        {renderChart()}
      </Card>
    </div>
  )
}

export default StatisticaPage

