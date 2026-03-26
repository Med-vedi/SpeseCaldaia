import { useMemo } from 'react'
import { Card, Typography, Table, Select, Tooltip, Button } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { QuestionCircleOutlined, PrinterOutlined } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import { useReadings } from '../contexts/ReadingsContext'
import { useGetYearlyFinancialsQuery } from '../store/api/yearlyFinancialsApi'
import { useCalculationYear } from '../hooks/useCalculationYear'
import { computeBonificoTotalRows, type BonificoTotalRow } from '../lib/bonificoTotals'

const { Title, Text } = Typography
const BONIFICO_SUM_TOLERANCE = 0.01

interface PayToMasterRow {
  key: string
  name: string
  payToMaster: number
}

const BonificoPage = () => {
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
      fatturaGasolio: yearlyForCalc?.computed?.fattura_gasolio_total ?? 0,
      manutenzione: yearlyForCalc?.manutenzione ?? 120,
      funzionamentoServizioPct: yearlyForCalc?.funzionamento_servizio_pct ?? 20,
    }),
    [yearlyForCalc]
  )

  const { rows: totalData } = useMemo(
    () =>
      computeBonificoTotalRows(yearForCalc, kCalData, m3Data, kWData, prices, expenses),
    [yearForCalc, kCalData, m3Data, kWData, prices, expenses]
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
          Calcolo importi totali (bonifico)
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
          <Button icon={<PrinterOutlined />} onClick={() => window.print()} size="large">
            Stampa tabelle
          </Button>
        </div>
      </div>
      {eligibleYears.length > 0 && (
        <Text type="secondary" className="text-xs md:text-sm -mt-2 mb-2 block">
          Stessi importi della sezione bonifico in Calcolo: differenza {yearForCalc - 1} → {yearForCalc}, una riga per
          ogni utente.
        </Text>
      )}

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

export default BonificoPage
