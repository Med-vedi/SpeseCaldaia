import { useMemo } from 'react'
import { Card, Typography, Table, InputNumber } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useReadings } from '../contexts/ReadingsContext'

const { Title, Text } = Typography

interface HotWaterRow {
  key: string
  name: string
  m3: number
  prezzoGasolio: number
  spesa: number
}

interface KCalCostRow {
  key: string
  fatturaGasolio: number
  funzionamentoServizio: number
  speseAcquaCalda: number
  kCalTotale: number
  prezzoKCal: number
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

interface ExpenseRow {
  key: string
  name: string
  importo: number
  isTotal?: boolean
  isCalculated?: boolean
}

const SpesePage = () => {
  const { kCalData, m3Data, kWData, prices, expenses, updateExpense, getTotalExpensesPerUser } = useReadings()
  const { prezzoGasolio, fatturaGasolio } = expenses
  const payToMaster = getTotalExpensesPerUser()

  const hotWaterData = useMemo<HotWaterRow[]>(() => {
    const users = ['dino', 'vladi', 'cristian']
    return users.map(userKey => {
      const m3Row = m3Data.find(r => r.key === userKey)
      const m3 = m3Row?.differenza || 0
      const spesa = m3 * (prezzoGasolio * 10)

      return {
        key: userKey,
        name: m3Row?.name || userKey,
        m3,
        prezzoGasolio,
        spesa,
      }
    })
  }, [m3Data, prezzoGasolio])

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
    const users = ['dino', 'vladi', 'cristian']

    return users.map(userKey => {
      const kCalRow = kCalData.find(r => r.key === userKey)
      const kCal = kCalRow?.differenza || 0
      const spesa = prezzoKCal * kCal

      return {
        key: userKey,
        name: kCalRow?.name || userKey,
        prezzoKCal,
        kCal,
        spesa,
      }
    })
  }, [kCalData, kCalCostData])

  const expenseData = useMemo<ExpenseRow[]>(() => {
    // Calculate Acqua fredda from m3Data
    const totaleM3Row = m3Data.find(r => r.key === 'totale')
    const m3Diff = totaleM3Row?.differenza || 0
    const acquaFredda = m3Diff * 2

    // Calculate Corrente from kW difference * corrente price
    const comuneKWRow = kWData.find(r => r.key === 'comune')
    const kWDiff = comuneKWRow?.differenza || 0
    const corrente = kWDiff * prices.corrente

    // Calculate Funzionamento di servizio caldaia (20% of Gasolio)
    const funzionamentoServizio = expenses.fatturaGasolio * 0.2

    // Calculate total
    const totale = expenses.fatturaGasolio + expenses.manutenzione + corrente + acquaFredda + funzionamentoServizio

    const rows: ExpenseRow[] = [
      {
        key: 'gasolio',
        name: 'Gasolio',
        importo: expenses.fatturaGasolio,
        isCalculated: false,
      },
      {
        key: 'manutenzione',
        name: 'Manutenzione',
        importo: expenses.manutenzione,
        isCalculated: false,
      },
      {
        key: 'corrente',
        name: 'Corrente',
        importo: corrente,
        isCalculated: true,
      },
      {
        key: 'acquaFredda',
        name: 'Acqua fredda (M3 diff*$2)',
        importo: acquaFredda,
        isCalculated: true,
      },
      {
        key: 'funzionamentoServizio',
        name: 'Funzionamento di servizio caldaia (prezzo gasolio*20%)',
        importo: funzionamentoServizio,
        isCalculated: true,
      },
      {
        key: 'totale',
        name: 'Totale',
        importo: totale,
        isTotal: true,
        isCalculated: true,
      },
    ]

    return rows
  }, [expenses, m3Data, kWData, prices])

  const totalData = useMemo<TotalRow[]>(() => {
    return hotWaterData.map(hwRow => {
      const heatingRow = heatingData.find(h => h.key === hwRow.key)
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
      title: 'M³',
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

  const expenseColumns: ColumnsType<ExpenseRow> = [
    {
      title: '',
      dataIndex: 'name',
      key: 'name',
      width: 300,
      render: (value: string, record) => (
        <span
          style={{
            padding: '4px 8px',
            display: 'inline-block',
            width: '100%',
            fontWeight: record.isTotal ? 'bold' : 'normal',
          }}
        >
          {value}
        </span>
      ),
    },
    {
      title: 'Importo (€)',
      dataIndex: 'importo',
      key: 'importo',
      width: 150,
      render: (value: number, record) => {
        const isEditable = !record.isCalculated && !record.isTotal

        return isEditable ? (
          <InputNumber
            value={value}
            onChange={(val) => {
              if (record.key === 'gasolio') updateExpense('fatturaGasolio', val || 0)
              if (record.key === 'manutenzione') updateExpense('manutenzione', val || 0)
              if (record.key === 'corrente') updateExpense('corrente', val || 0)
            }}
            style={{ width: '100%' }}
            precision={2}
            controls={false}
          />
        ) : (
          <span
            style={{
              padding: '4px 8px',
              display: 'inline-block',
              width: '100%',
              fontWeight: record.isTotal ? 'bold' : 'normal',
            }}
          >
            {value.toFixed(2)}
          </span>
        )
      },
    },
    {
      title: 'Da dare a Dino (A/3) (€)',
      dataIndex: 'importo',
      key: 'payToMaster',
      width: 200,
      render: (value: number) => (
        <span
          style={{
            padding: '4px 8px',
            display: 'inline-block',
            width: '100%',
          }}
        >
          {(value / 3).toFixed(2)}
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
      render: () => {
        return (
          <span style={{ padding: '4px 8px', display: 'inline-block', width: '100%' }}>
            {payToMaster.toFixed(2)}
          </span>
        )
      },
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
    <div className="p-6">
      <Title level={2} className="mb-6">Spese</Title>

      <Card className="mb-6">
        <Title level={4} className="mb-4">SPESE DA SOSTENERE</Title>
        <Table
          columns={expenseColumns}
          dataSource={expenseData}
          pagination={false}
          bordered
          size="small"
        />
      </Card>

      <Card className="mb-6">
        <Title level={4} className="mb-4">CALCOLO SPESE INDIVIDUALI ACQUA CALDA</Title>
        <div className="mb-4">
          <Text>
            M3 acqua per euro al m3 acqua calda che varia in base al prezzo gasolio.
            Esempio: prezzo gasolio 1,28 fa m3*(1,28*10)
          </Text>
        </div>
        <Table
          columns={hotWaterColumns}
          dataSource={hotWaterData}
          pagination={false}
          bordered
          size="small"
        />
      </Card>

      <Card className="mb-6">
        <Title level={4} className="mb-4">CALCOLO COSTO kCal (riscaldamento)</Title>
        <div className="mb-4">
          <Text>
            Al costo totale fattura gasolio sottraggo le spese di funzionamento servizio caldaia e il totale spese acqua calda,
            ciò il resto lo divido per la somma totale dei kCal, ciò di Dino, Vladi, Cristian
          </Text>
        </div>
        <Table
          columns={kCalCostColumns}
          dataSource={kCalCostData}
          pagination={false}
          bordered
          size="small"
        />
      </Card>

      <Card className="mb-6">
        <Title level={4} className="mb-4">CALCOLO INDIVIDUALE SPESE RISCALDAMENTO</Title>
        <Table
          columns={heatingColumns}
          dataSource={heatingData}
          pagination={false}
          bordered
          size="small"
        />
      </Card>

      <Card>
        <Title level={4} className="mb-4">CALCOLO IMPORTI TOTALI (BONIFICO)</Title>
        <Table
          columns={totalColumns}
          dataSource={totalData}
          pagination={false}
          bordered
          size="small"
        />
      </Card>
    </div>
  )
}

export default SpesePage
