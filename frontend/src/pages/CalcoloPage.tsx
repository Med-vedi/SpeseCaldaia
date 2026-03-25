import { useMemo } from 'react'
import { Card, Typography, Table, Select } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useAuth } from '../contexts/AuthContext'
import { useReadings } from '../contexts/ReadingsContext'
import { useGetYearlyFinancialsQuery } from '../store/api/yearlyFinancialsApi'
import { useCalculationYear } from '../hooks/useCalculationYear'
import { yearOverYearDelta, computeBonificoTotalRows, type BonificoTotalRow } from '../lib/bonificoTotals'

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

const CalcoloPage = () => {
  const { profile } = useAuth()
  const { kCalData, m3Data, kWData } = useReadings()
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
      gasolio: yearlyForCalc?.computed?.gasolio_per_liter ?? 0,
    }),
    [yearlyForCalc]
  )

  const expenses = useMemo(
    () => ({
      prezzoGasolio: prices.gasolio,
      fatturaGasolio: yearlyForCalc?.computed?.fattura_gasolio_total ?? 0,
      manutenzione: yearlyForCalc?.manutenzione ?? 120,
    }),
    [yearlyForCalc, prices.gasolio]
  )

  const { prezzoGasolio, fatturaGasolio } = expenses

  const { rows: totalData, payToMaster } = useMemo(
    () =>
      computeBonificoTotalRows(yearForCalc, kCalData, m3Data, kWData, prices, {
        fatturaGasolio: expenses.fatturaGasolio,
        manutenzione: expenses.manutenzione,
      }),
    [yearForCalc, kCalData, m3Data, kWData, prices, expenses.fatturaGasolio, expenses.manutenzione]
  )

  const hotWaterData = useMemo<HotWaterRow[]>(() => {
    const userM3Rows = m3Data.filter((r) => r.key !== 'totale')

    return userM3Rows.map((m3Row) => {
      const m3 = yearOverYearDelta(m3Row.yearValues, yearForCalc)
      const spesa = m3 * (prezzoGasolio * 10)

      return {
        key: m3Row.key,
        name: m3Row.name,
        m3,
        spesa,
      }
    })
  }, [m3Data, prezzoGasolio, yearForCalc])

  const totalHotWaterExpenses = useMemo(() => {
    return hotWaterData.reduce((sum, row) => sum + row.spesa, 0)
  }, [hotWaterData])

  const kCalCostData = useMemo<KCalCostRow[]>(() => {
    const totaleRow = kCalData.find((r) => r.key === 'totale')
    const kCalTotale = yearOverYearDelta(totaleRow?.yearValues, yearForCalc)
    const funzionamentoServizio = fatturaGasolio * 0.2
    const prezzoKCal =
      kCalTotale > 0
        ? (fatturaGasolio - funzionamentoServizio - totalHotWaterExpenses) / kCalTotale
        : 0

    return [
      {
        key: 'calc',
        fatturaGasolio,
        funzionamentoServizio,
        speseAcquaCalda: totalHotWaterExpenses,
        kCalTotale,
        prezzoKCal,
      },
    ]
  }, [fatturaGasolio, totalHotWaterExpenses, kCalData, yearForCalc])

  const heatingData = useMemo<HeatingRow[]>(() => {
    const prezzoKCal = kCalCostData[0]?.prezzoKCal || 0
    const userKCalRows = kCalData.filter((r) => r.key !== 'totale')

    return userKCalRows.map((kCalRow) => {
      const kCal = yearOverYearDelta(kCalRow.yearValues, yearForCalc)
      const spesa = prezzoKCal * kCal

      return {
        key: kCalRow.key,
        name: kCalRow.name,
        prezzoKCal,
        kCal,
        spesa,
      }
    })
  }, [kCalData, kCalCostData, yearForCalc])

  const hotWaterColumns: ColumnsType<HotWaterRow> = useMemo(
    () => [
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
          <span
            style={{ padding: '4px 8px', display: 'inline-block', width: '100%', fontWeight: 'bold' }}
          >
            {value.toFixed(2)}
          </span>
        ),
      },
    ],
    [expenses.prezzoGasolio]
  )

  const kCalCostColumns: ColumnsType<KCalCostRow> = useMemo(
    () => [
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
    ],
    [expenses.fatturaGasolio]
  )

  const heatingColumns: ColumnsType<HeatingRow> = useMemo(
    () => [
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
    ],
    []
  )

  const totalColumns: ColumnsType<BonificoTotalRow> = useMemo(
    () => [
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
    ],
    [payToMaster]
  )

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-2 md:mb-4">
        <Title level={2} className="mb-0!" style={{ fontSize: '24px' }}>
          Calcolo
        </Title>
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
      {eligibleYears.length > 0 && (
        <Text type="secondary" className="text-xs md:text-sm -mt-2 mb-2 block">
          Tutti gli importi usano la differenza {yearForCalc - 1} → {yearForCalc}.
        </Text>
      )}

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
            <Table<BonificoTotalRow>
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
