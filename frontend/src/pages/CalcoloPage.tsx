import { useMemo } from 'react'
import { Card, Typography, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useReadings } from '../contexts/ReadingsContext'

const { Title, Text } = Typography

interface KCalCostRow {
  key: string
  fatturaGasolio: number
  funzionamentoServizio: number
  speseAcquaCalda: number
  kCalTotale: number
  prezzoKCal: number
}

interface HotWaterRow {
  key: string
  name: string
  m3: number
  spesa: number
}

interface HeatingRow {
  key: string
  name: string
  prezzoKCal: number
  kCal: number
  spesa: number
}

interface TotalRow {
  key: string
  name: string
  payToMaster: number
  speseAcquaCalda: number
  speseRiscaldamento: number
  totale: number
}

const CalcoloPage = () => {
  const { kCalData, m3Data, expenses, getTotalExpensesPerUser, allCounterValues } = useReadings()
  const { prezzoGasolio, fatturaGasolio } = expenses
  const payToMaster = getTotalExpensesPerUser()
  const currentYear = new Date().getFullYear()
  const twoYearsAgo = currentYear - 2

  const hotWaterData = useMemo<HotWaterRow[]>(() => {
    // Filter out the 'totale' row and get only user rows
    const userM3Rows = m3Data.filter(r => r.key !== 'totale')

    return userM3Rows.map(m3Row => {
      const hasCounterId = !!m3Row.counterId

      // Calculate difference for last 2 years: current year - 2 years ago
      const currentYearValue = hasCounterId
        ? allCounterValues.find(
          cv => cv.counter_id === m3Row.counterId && cv.year === currentYear
        )?.value ?? null
        : null

      const twoYearsAgoValue = hasCounterId
        ? allCounterValues.find(
          cv => cv.counter_id === m3Row.counterId && cv.year === twoYearsAgo
        )?.value ?? null
        : null

      // Calculate 2-year difference
      // If 2-year data is not available, fall back to 1-year difference (differenza)
      const hasTwoYearData = currentYearValue !== null && twoYearsAgoValue !== null
      const hasOneYearData = m3Row.differenza !== null && m3Row.differenza !== undefined

      const m3 = hasTwoYearData
        ? Number(currentYearValue) - Number(twoYearsAgoValue)
        : hasOneYearData
          ? m3Row.differenza
          : 0

      const spesa = m3 * (prezzoGasolio * 10)

      return {
        key: m3Row.key,
        name: m3Row.name,
        m3,
        spesa,
      }
    })
  }, [m3Data, prezzoGasolio, allCounterValues, currentYear, twoYearsAgo])

  const totalHotWaterExpenses = useMemo(() => {
    return hotWaterData.reduce((sum, row) => sum + row.spesa, 0)
  }, [hotWaterData])

  const kCalCostData = useMemo<KCalCostRow[]>(() => {
    const totaleRow = kCalData.find(r => r.key === 'totale')
    const kCalTotale = totaleRow?.differenza || 0
    const funzionamentoServizio = fatturaGasolio * 0.2
    const prezzoKCal = kCalTotale > 0
      ? (fatturaGasolio - funzionamentoServizio - totalHotWaterExpenses) / kCalTotale
      : 0

    return [{
      key: 'calc',
      fatturaGasolio,
      funzionamentoServizio,
      speseAcquaCalda: totalHotWaterExpenses,
      kCalTotale,
      prezzoKCal,
    }]
  }, [fatturaGasolio, totalHotWaterExpenses, kCalData])

  const heatingData = useMemo<HeatingRow[]>(() => {
    const prezzoKCal = kCalCostData[0]?.prezzoKCal || 0
    // Filter out the 'totale' row and get only user rows
    const userKCalRows = kCalData.filter(r => r.key !== 'totale')

    return userKCalRows.map(kCalRow => {
      const kCal = kCalRow.differenza || 0
      const spesa = prezzoKCal * kCal

      return {
        key: kCalRow.key,
        name: kCalRow.name,
        prezzoKCal,
        kCal,
        spesa,
      }
    })
  }, [kCalData, kCalCostData])

  const totalData = useMemo<TotalRow[]>(() => {
    return hotWaterData.map(hwRow => {
      // Match heating data by user name since keys are different counter IDs
      const heatingRow = heatingData.find(h => h.name === hwRow.name)
      const speseRiscaldamento = heatingRow?.spesa || 0
      const totale = payToMaster + hwRow.spesa + speseRiscaldamento

      return {
        key: hwRow.key,
        name: hwRow.name,
        payToMaster,
        speseAcquaCalda: hwRow.spesa,
        speseRiscaldamento,
        totale,
      }
    })
  }, [hotWaterData, heatingData, payToMaster])

  const hotWaterColumns: ColumnsType<HotWaterRow> = [
    {
      title: '',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: 'M3',
      dataIndex: 'm3',
      key: 'm3',
      width: 100,
      render: (value: number) => (
        <span style={{ padding: '4px 8px', display: 'inline-block', width: '100%' }}>
          {value}
        </span>
      ),
    },
    {
      title: 'Prezzo gasolio*10 (€)',
      dataIndex: 'prezzoGasolio',
      key: 'prezzoGasolio',
      width: 150,
      render: () => (
        <span style={{ padding: '4px 8px', display: 'inline-block', width: '100%' }}>
          {expenses.prezzoGasolio.toFixed(2)}
        </span>
      ),
    },
    {
      title: '',
      dataIndex: 'spesa',
      key: 'spesa',
      width: 120,
      render: (value: number) => (
        <span style={{ padding: '4px 8px', display: 'inline-block', width: '100%', fontWeight: 'bold' }}>
          {value.toFixed(2)}
        </span>
      ),
    },
  ]

  const kCalCostColumns: ColumnsType<KCalCostRow> = [
    {
      title: 'Fattura Gasolio (€)',
      dataIndex: 'fatturaGasolio',
      key: 'fatturaGasolio',
      width: 150,
      render: () => (
        <span style={{ padding: '4px 8px', display: 'inline-block', width: '100%' }}>
          {expenses.fatturaGasolio.toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Funzionamento di servizio (20%) (€)',
      dataIndex: 'funzionamentoServizio',
      key: 'funzionamentoServizio',
      width: 200,
      render: () => (
        <span style={{ padding: '4px 8px', display: 'inline-block', width: '100%' }}>
          {(expenses.fatturaGasolio * 0.2).toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Spese acqua calda (€)',
      dataIndex: 'speseAcquaCalda',
      key: 'speseAcquaCalda',
      width: 150,
      render: (value: number) => (
        <span style={{ padding: '4px 8px', display: 'inline-block', width: '100%' }}>
          {value.toFixed(2)}
        </span>
      ),
    },
    {
      title: 'kCal totale (kCal)',
      dataIndex: 'kCalTotale',
      key: 'kCalTotale',
      width: 120,
      render: (value: number) => (
        <span style={{ padding: '4px 8px', display: 'inline-block', width: '100%' }}>
          {value.toFixed(1)}
        </span>
      ),
    },
    {
      title: '(A1-B1-C1):D1 prezzo kCal (€/kCal)',
      dataIndex: 'prezzoKCal',
      key: 'prezzoKCal',
      width: 150,
      render: (value: number) => (
        <span style={{ padding: '4px 8px', display: 'inline-block', width: '100%', fontWeight: 'bold' }}>
          {value.toFixed(6)}
        </span>
      ),
    },
  ]

  const heatingColumns: ColumnsType<HeatingRow> = [
    {
      title: '',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: 'Prezzo kCal (€/kCal)',
      dataIndex: 'prezzoKCal',
      key: 'prezzoKCal',
      width: 120,
      render: (value: number) => (
        <span style={{ padding: '4px 8px', display: 'inline-block', width: '100%' }}>
          {value.toFixed(2)}
        </span>
      ),
    },
    {
      title: 'kCal (kCal)',
      dataIndex: 'kCal',
      key: 'kCal',
      width: 120,
      render: (value: number) => (
        <span style={{ padding: '4px 8px', display: 'inline-block', width: '100%' }}>
          {value.toFixed(1)}
        </span>
      ),
    },
    {
      title: 'Spesa (€)',
      dataIndex: 'spesa',
      key: 'spesa',
      width: 120,
      render: (value: number) => (
        <span style={{ padding: '4px 8px', display: 'inline-block', width: '100%', fontWeight: 'bold' }}>
          {value.toFixed(2)}
        </span>
      ),
    },
  ]

  const totalColumns: ColumnsType<TotalRow> = [
    {
      title: '',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: 'Da dare a Dino (€)',
      dataIndex: 'payToMaster',
      key: 'payToMaster',
      width: 150,
      render: () => (
        <span style={{ padding: '4px 8px', display: 'inline-block', width: '100%' }}>
          {payToMaster.toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Spese individuali acqua calda (€)',
      dataIndex: 'speseAcquaCalda',
      key: 'speseAcquaCalda',
      width: 200,
      render: (value: number) => (
        <span style={{ padding: '4px 8px', display: 'inline-block', width: '100%' }}>
          {value.toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Spese riscaldamento (€)',
      dataIndex: 'speseRiscaldamento',
      key: 'speseRiscaldamento',
      width: 150,
      render: (value: number) => (
        <span style={{ padding: '4px 8px', display: 'inline-block', width: '100%' }}>
          {value.toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Totale (€)',
      dataIndex: 'totale',
      key: 'totale',
      width: 120,
      render: (value: number) => (
        <span style={{ padding: '4px 8px', display: 'inline-block', width: '100%', fontWeight: 'bold' }}>
          {value.toFixed(2)}
        </span>
      ),
    },
  ]

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4">
      <Title level={2} className="mb-4 md:mb-6" style={{ fontSize: '24px' }}>Calcolo</Title>

      <Card className="mb-4 md:mb-6">
        <Title level={4} className="mb-3 md:mb-4 text-sm md:text-base">CALCOLO SPESE INDIVIDUALI ACQUA CALDA</Title>
        <div className="mb-3 md:mb-4">
          <Text className="text-xs md:text-sm">
            M3 acqua per euro al m3 acqua calda che varia in base al prezzo gasolio. Esempio: prezzo gasolio 1,28 fa m3*(1,28*10)
          </Text>
        </div>
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="min-w-full px-4 md:px-0">
            <Table
              columns={hotWaterColumns}
              dataSource={hotWaterData}
              pagination={false}
              bordered
              size="small"
              scroll={{ x: 'max-content' }}
            />
          </div>
        </div>
      </Card>

      <Card className="mb-4 md:mb-6">
        <Title level={4} className="mb-3 md:mb-4 text-sm md:text-base">CALCOLO COSTO kCal (riscaldamento)</Title>
        <div className="mb-3 md:mb-4">
          <Text className="text-xs md:text-sm">
            Al costo totale fattura gasolio sottraggo le spese di funzionamento servizio caldaia e il totale spese acqua calda,
            ciò il resto lo divido per la somma totale dei kCal, ciò di Dino, Vladi, Cristian
          </Text>
        </div>
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="min-w-full px-4 md:px-0">
            <Table
              columns={kCalCostColumns}
              dataSource={kCalCostData}
              pagination={false}
              bordered
              size="small"
              scroll={{ x: 'max-content' }}
            />
          </div>
        </div>
      </Card>

      <Card className="mb-4 md:mb-6">
        <Title level={4} className="mb-3 md:mb-4 text-sm md:text-base">CALCOLO INDIVIDUALE SPESE RISCALDAMENTO</Title>
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="min-w-full px-4 md:px-0">
            <Table
              columns={heatingColumns}
              dataSource={heatingData}
              pagination={false}
              bordered
              size="small"
              scroll={{ x: 'max-content' }}
            />
          </div>
        </div>
      </Card>

      <Card>
        <Title level={4} className="mb-3 md:mb-4 text-sm md:text-base">CALCOLO IMPORTI TOTALI (BONIFICO)</Title>
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="min-w-full px-4 md:px-0">
            <Table
              columns={totalColumns}
              dataSource={totalData}
              pagination={false}
              bordered
              size="small"
              scroll={{ x: 'max-content' }}
            />
          </div>
        </div>
      </Card>
    </div>
  )
}

export default CalcoloPage

