import { useMemo } from 'react'
import { Card, Typography, Table, InputNumber } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useReadings } from '../contexts/ReadingsContext'

const { Title } = Typography

interface ExpenseRow {
  key: string
  name: string
  importo: number
  isTotal?: boolean
  isCalculated?: boolean
}

const SpesePage = () => {
  const { kCalData, m3Data, kWData, prices, expenses, updateExpense } = useReadings()

  const expenseData = useMemo<ExpenseRow[]>(() => {
    // Calculate Acqua fredda from m3Data
    const totaleM3Row = m3Data.find(r => r.key === 'totale')
    const m3Diff = totaleM3Row?.differenza || 0
    const acquaFredda = m3Diff * prices.acqua

    // Calculate Corrente from kW difference * corrente price
    // Find the comune (electric_common) row - it's the one that's not 'totale'
    const comuneKWRow = kWData.find(r => r.key !== 'totale')
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
        const expenseKeyMap: Record<string, keyof typeof expenses> = {
          gasolio: 'fatturaGasolio',
          manutenzione: 'manutenzione',
          corrente: 'corrente',
        }

        const handleChange = (val: number | null) => {
          const expenseKey = expenseKeyMap[record.key]
          if (expenseKey) {
            updateExpense(expenseKey, val || 0)
          }
        }

        return isEditable ? (
          <InputNumber
            value={value}
            onChange={handleChange}
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
      title: `Diviso per ${kCalData.filter(r => r.key !== 'totale').length || 3} (€)`,
      dataIndex: 'importo',
      key: 'payToMaster',
      width: 200,
      render: (value: number) => {
        const userCount = kCalData.filter(r => r.key !== 'totale').length || 3
        return (
          <span
            style={{
              padding: '4px 8px',
              display: 'inline-block',
              width: '100%',
            }}
          >
            {(value / userCount).toFixed(2)}
          </span>
        )
      },
    },
  ]

  return (
    <div className="p-4 md:p-6">
      <Title level={2} className="mb-4 md:mb-6" style={{ fontSize: '24px' }}>Spese</Title>

      <Card className="mb-4 md:mb-6">
        <Title level={4} className="mb-3 md:mb-4 text-sm md:text-base">SPESE DA SOSTENERE</Title>
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="min-w-full px-4 md:px-0">
            <Table
              columns={expenseColumns}
              dataSource={expenseData}
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

export default SpesePage
