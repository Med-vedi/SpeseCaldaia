import { useMemo } from 'react'
import { Card, Typography, Table, InputNumber, Select } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useAuth } from '../contexts/AuthContext'
import { useReadings } from '../contexts/ReadingsContext'
import { useGetYearlyFinancialsQuery } from '../store/api/yearlyFinancialsApi'
import { useCalculationYear } from '../hooks/useCalculationYear'
import { yearOverYearDelta } from '../lib/bonificoTotals'

const { Title, Text } = Typography

interface ExpenseRow {
  key: string
  name: string
  importo: number
  isTotal?: boolean
  isCalculated?: boolean
}

const SpesePage = () => {
  const { profile } = useAuth()
  const { kCalData, m3Data, kWData, updateExpense } = useReadings()
  const {
    eligibleYears,
    selectedYear,
    setSelectedYear,
    yearForCalc,
    yearSelectOptions,
  } = useCalculationYear()
  const { data: yearlyForCalc } = useGetYearlyFinancialsQuery(
    { organization_id: profile?.organization_id ?? '', year: yearForCalc },
    { skip: !profile?.organization_id }
  )

  const prices = useMemo(
    () => ({
      acqua: yearlyForCalc?.acqua ?? 2,
      corrente: yearlyForCalc?.corrente ?? 0.14,
    }),
    [yearlyForCalc]
  )

  const expenses = useMemo(
    () => ({
      fatturaGasolio: yearlyForCalc?.computed?.fattura_gasolio_total ?? 0,
      manutenzione: yearlyForCalc?.manutenzione ?? 120,
      funzionamentoServizioPct: yearlyForCalc?.funzionamento_servizio_pct ?? 20,
    }),
    [yearlyForCalc]
  )

  const expenseData = useMemo<ExpenseRow[]>(() => {
    // Calculate Acqua fredda from m3Data
    const totaleM3Row = m3Data.find(r => r.key === 'totale')
    const m3Diff = yearOverYearDelta(totaleM3Row?.yearValues, yearForCalc)
    const acquaFredda = m3Diff * prices.acqua

    // Calculate Corrente from kW difference * corrente price
    const sharedKwRow = kWData.find((r) => r.counterType === 'electric_common')
    const kWDiff = yearOverYearDelta(sharedKwRow?.yearValues, yearForCalc)
    const corrente = kWDiff * prices.corrente

    // Calculate Funzionamento di servizio caldaia (% of Gasolio)
    const funzionamentoServizio = expenses.fatturaGasolio * (expenses.funzionamentoServizioPct / 100)

    // Calculate total
    // Gasolio total is shown for reference, but excluded from "totale da pagare".
    const totale = expenses.manutenzione + corrente + acquaFredda + funzionamentoServizio

    const rows: ExpenseRow[] = [
      {
        key: 'gasolio',
        name: 'Gasolio (tot. bollette, anno prezzi)',
        importo: expenses.fatturaGasolio,
        isCalculated: true,
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
        name: 'Funzionamento servizio caldaia (%)',
        importo: funzionamentoServizio,
        isCalculated: false,
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
  }, [expenses, m3Data, kWData, prices, yearForCalc])

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
          manutenzione: 'manutenzione',
          funzionamentoServizio: 'funzionamentoServizioPct',
        }

        const handleChange = (val: number | null) => {
          const expenseKey = expenseKeyMap[record.key]
          if (expenseKey) {
            void updateExpense(expenseKey, val || 0)
          }
        }

        const displayValue =
          record.key === 'funzionamentoServizio' ? expenses.funzionamentoServizioPct : value

        return isEditable ? (
          <InputNumber
            value={displayValue}
            onChange={handleChange}
            style={{ width: '100%' }}
            precision={2}
            controls={false}
            min={0}
            max={record.key === 'funzionamentoServizio' ? 100 : undefined}
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
      render: (value: number, record) => {
        const userCount = kCalData.filter(r => r.key !== 'totale').length || 3
        if (record.key === 'gasolio') {
          return (
            <span
              style={{
                padding: '4px 8px',
                display: 'inline-block',
                width: '100%',
                color: '#9ca3af',
                fontStyle: 'italic',
                userSelect: 'none',
              }}
            >
              Escluso
            </span>
          )
        }
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
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4 md:mb-6">
        <Title level={2} style={{ margin: 0, fontSize: '24px' }}>Spese</Title>
        <div className="flex flex-col xs:flex-row xs:items-center gap-2">
          <Text className="text-sm text-zinc-600 whitespace-nowrap">Anno (Δ vs anno precedente)</Text>
          <Select<number>
            value={selectedYear}
            onChange={setSelectedYear}
            options={yearSelectOptions}
            disabled={eligibleYears.length === 0}
            placeholder="Nessun anno disponibile"
            className="min-w-[200px]"
            size="large"
          />
        </div>
      </div>

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
