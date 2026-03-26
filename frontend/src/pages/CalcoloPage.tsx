import { useMemo } from 'react'
import { Card, Typography, Table, Select, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import { useReadings } from '../contexts/ReadingsContext'
import { useGetYearlyFinancialsQuery } from '../store/api/yearlyFinancialsApi'
import { useCalculationYear } from '../hooks/useCalculationYear'
import { yearOverYearDelta, computeBonificoTotalRows, type BonificoTotalRow } from '../lib/bonificoTotals'

const { Title, Text } = Typography
const BONIFICO_SUM_TOLERANCE = 0.01

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

interface PayToMasterRow {
  key: string
  name: string
  payToMaster: number
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
      funzionamentoServizioPct: yearlyForCalc?.funzionamento_servizio_pct ?? 20,
    }),
    [yearlyForCalc, prices.gasolio]
  )

  const { prezzoGasolio, fatturaGasolio } = expenses

  const { rows: totalData } = useMemo(
    () =>
      computeBonificoTotalRows(yearForCalc, kCalData, m3Data, kWData, prices, {
        fatturaGasolio: expenses.fatturaGasolio,
        manutenzione: expenses.manutenzione,
        funzionamentoServizioPct: expenses.funzionamentoServizioPct,
      }),
    [
      yearForCalc,
      kCalData,
      m3Data,
      kWData,
      prices,
      expenses.fatturaGasolio,
      expenses.manutenzione,
      expenses.funzionamentoServizioPct,
    ]
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
    const funzionamentoServizio = fatturaGasolio * (expenses.funzionamentoServizioPct / 100)
    const heatingBudget = fatturaGasolio - funzionamentoServizio - totalHotWaterExpenses
    const prezzoKCal = heatingBudget > 0 && kCalTotale > 0 ? heatingBudget / kCalTotale : 0

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
  }, [fatturaGasolio, expenses.funzionamentoServizioPct, kCalData, totalHotWaterExpenses, yearForCalc])

  const heatingData = useMemo<HeatingRow[]>(() => {
    const prezzoKCal = kCalCostData[0]?.prezzoKCal || 0
    const userKCalRows = kCalData.filter((r) => r.key !== 'totale')

    return userKCalRows.map((kCalRow) => {
      const kCal = yearOverYearDelta(kCalRow.yearValues, yearForCalc)
      const spesa = prezzoKCal > 0 ? kCal * prezzoKCal : 0

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
        title: `Funzionamento di servizio (${expenses.funzionamentoServizioPct.toFixed(1)}%) (€)`,
        dataIndex: 'funzionamentoServizio',
        key: 'funzionamentoServizio',
        width: 200,
        render: () => (
          <span style={{ padding: '4px 8px', display: 'inline-block', width: '100%' }}>
            {(expenses.fatturaGasolio * (expenses.funzionamentoServizioPct / 100)).toFixed(2)}
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
        title: 'Prezzo kW calcolato (€/kCal)',
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
    [expenses.fatturaGasolio, expenses.funzionamentoServizioPct]
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
        title: 'Prezzo kW calcolato (€/kCal)',
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
        title: 'Funzionamento servizio caldaia (€)',
        dataIndex: 'funzionamentoServizio',
        key: 'funzionamentoServizio',
        width: 180,
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
    []
  )

  const payToMasterData = useMemo<PayToMasterRow[]>(
    () =>
      totalData.map((row) => ({
        key: row.key,
        name: row.name,
        payToMaster: row.payToMaster,
      })),
    [totalData]
  )

  const payToMasterColumns: ColumnsType<PayToMasterRow> = useMemo(
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
        width: 180,
        render: (value: number) => (
          <span style={{ padding: '4px 8px', display: 'inline-block', width: '100%', fontWeight: 'bold' }}>
            {value.toFixed(2)}
          </span>
        ),
      },
    ],
    []
  )

  const payToMasterTotal = useMemo(
    () => payToMasterData.reduce((sum, row) => sum + (Number.isFinite(row.payToMaster) ? row.payToMaster : 0), 0),
    [payToMasterData]
  )

  const totalTotaleSum = useMemo(
    () => totalData.reduce((sum, row) => sum + (Number.isFinite(row.totale) ? row.totale : 0), 0),
    [totalData]
  )
  const bollettaTotal = expenses.fatturaGasolio
  const bonificoSummaryDelta = Math.abs(totalTotaleSum - bollettaTotal)
  const isBonificoSummaryMismatch = bonificoSummaryDelta > BONIFICO_SUM_TOLERANCE

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
        <Title level={4} className="mb-3 md:mb-4 text-sm md:text-base">
          CALCOLO SPESE INDIVIDUALI ACQUA CALDA{' '}
          <Tooltip title="Per ogni utente: Spesa acqua calda = M3 annui * (Prezzo gasolio * 10). La somma di tutte le righe entra nel budget totale bolletta.">
            <QuestionCircleOutlined />
          </Tooltip>
        </Title>
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
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      <strong>Somma Totale</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3}>
                      <strong>{totalHotWaterExpenses.toFixed(2)}</strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </div>
        </div>
      </Card>

      <Card className="mb-4 md:mb-6">
        <Title level={4} className="mb-3 md:mb-4 text-sm md:text-base">
          CALCOLO COSTO kCal (riscaldamento){' '}
          <Tooltip title="Flusso: 1) Funzionamento = Fattura Gasolio * %. 2) Budget riscaldamento = Fattura Gasolio - Funzionamento - Spese acqua calda. 3) Prezzo kCal = Budget riscaldamento / kCal totale.">
            <QuestionCircleOutlined />
          </Tooltip>
        </Title>
        <div className="mb-3 md:mb-4">
          <Text className="text-xs md:text-sm">
            Il prezzo kCal segue il valore annuale di Elettricità (comune), quindi cambia in base all&apos;anno selezionato.
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
        <Title level={4} className="mb-3 md:mb-4 text-sm md:text-base">
          CALCOLO INDIVIDUALE SPESE RISCALDAMENTO{' '}
          <Tooltip title="Per ogni utente: Spesa riscaldamento = kCal utente * Prezzo kCal calcolato.">
            <QuestionCircleOutlined />
          </Tooltip>
        </Title>
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
        <Title level={4} className="mb-3 md:mb-4 text-sm md:text-base">
          DA DARE A DINO (CONTANTI){' '}
          <Tooltip title="Quota cassa separata dal bonifico: (manutenzione + corrente comune + acqua fredda + funzionamento servizio) / numero utenti.">
            <QuestionCircleOutlined />
          </Tooltip>
        </Title>
        <div className="overflow-x-auto -mx-4 md:mx-0 mb-4 md:mb-6">
          <div className="min-w-full px-4 md:px-0">
            <Table<PayToMasterRow>
              columns={payToMasterColumns}
              dataSource={payToMasterData}
              pagination={false}
              bordered
              size="small"
              scroll={{ x: 'max-content' }}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}>
                      <strong>Somma Totale</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <strong>{payToMasterTotal.toFixed(2)}</strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </div>
        </div>

        <Title level={4} className="mb-3 md:mb-4 text-sm md:text-base">
          CALCOLO IMPORTI TOTALI (BONIFICO){' '}
          <Tooltip title="Totale per utente = Spese acqua calda + Funzionamento servizio + Spese riscaldamento. La Somma Totale deve coincidere con Totale bolletta (Fattura Gasolio).">
            <QuestionCircleOutlined />
          </Tooltip>
        </Title>
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="min-w-full px-4 md:px-0">
            <Table<BonificoTotalRow>
              columns={totalColumns}
              dataSource={totalData}
              pagination={false}
              bordered
              size="small"
              scroll={{ x: 'max-content' }}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={4}>
                      <strong>Somma Totale</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4}>
                      {isBonificoSummaryMismatch ? (
                        <Tooltip
                          color="red"
                          title={`Errore coerenza: Somma Totale (${totalTotaleSum.toFixed(2)}€) diversa da Totale bolletta (${bollettaTotal.toFixed(2)}€). Scarto: ${bonificoSummaryDelta.toFixed(2)}€.`}
                        >
                          <strong style={{ color: '#ff4d4f' }}>{totalTotaleSum.toFixed(2)}</strong>
                        </Tooltip>
                      ) : (
                        <strong>{totalTotaleSum.toFixed(2)}</strong>
                      )}
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </div>
        </div>
      </Card>
    </div>
  )
}

export default CalcoloPage
