import { useMemo } from 'react'
import { Card, Typography, Select, Button, Table, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PrinterOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import { useReadings } from '../contexts/ReadingsContext'
import { useGetYearlyFinancialsQuery } from '../store/api/yearlyFinancialsApi'
import { useCalculationYear } from '../hooks/useCalculationYear'
import { yearOverYearDelta, computeBonificoTotalRows, type BonificoTotalRow } from '../lib/bonificoTotals'

const { Title, Text } = Typography
const BONIFICO_SUM_TOLERANCE = 0.01

interface HotWaterRow {
  key: string
  name: string
  m3: number
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

interface PayToMasterRow {
  key: string
  name: string
  payToMaster: number
}

const PrintReportPage = () => {
  const { profile } = useAuth()
  const { kCalData, m3Data, kWData } = useReadings()
  const { eligibleYears, selectedYear, setSelectedYear, yearForCalc, yearSelectOptions } = useCalculationYear()

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

  const hotWaterData = useMemo<HotWaterRow[]>(() => {
    const userM3Rows = m3Data.filter((r) => r.key !== 'totale')
    return userM3Rows.map((m3Row) => {
      const m3 = yearOverYearDelta(m3Row.yearValues, yearForCalc)
      const spesa = m3 * (expenses.prezzoGasolio * 10)
      return { key: m3Row.key, name: m3Row.name, m3, spesa }
    })
  }, [m3Data, expenses.prezzoGasolio, yearForCalc])

  const totalHotWaterExpenses = useMemo(
    () => hotWaterData.reduce((sum, row) => sum + row.spesa, 0),
    [hotWaterData]
  )

  const kCalCostData = useMemo<KCalCostRow[]>(() => {
    const totaleRow = kCalData.find((r) => r.key === 'totale')
    const kCalTotale = yearOverYearDelta(totaleRow?.yearValues, yearForCalc)
    const funzionamentoServizio = expenses.fatturaGasolio * (expenses.funzionamentoServizioPct / 100)
    const heatingBudget = expenses.fatturaGasolio - funzionamentoServizio - totalHotWaterExpenses
    const prezzoKCal = heatingBudget > 0 && kCalTotale > 0 ? heatingBudget / kCalTotale : 0
    return [
      {
        key: 'calc',
        fatturaGasolio: expenses.fatturaGasolio,
        funzionamentoServizio,
        speseAcquaCalda: totalHotWaterExpenses,
        kCalTotale,
        prezzoKCal,
      },
    ]
  }, [expenses.fatturaGasolio, expenses.funzionamentoServizioPct, kCalData, totalHotWaterExpenses, yearForCalc])

  const heatingData = useMemo<HeatingRow[]>(() => {
    const prezzoKCal = kCalCostData[0]?.prezzoKCal || 0
    const userKCalRows = kCalData.filter((r) => r.key !== 'totale')
    return userKCalRows.map((kCalRow) => {
      const kCal = yearOverYearDelta(kCalRow.yearValues, yearForCalc)
      const spesa = prezzoKCal > 0 ? kCal * prezzoKCal : 0
      return { key: kCalRow.key, name: kCalRow.name, prezzoKCal, kCal, spesa }
    })
  }, [kCalData, kCalCostData, yearForCalc])

  const { rows: totalData } = useMemo(
    () =>
      computeBonificoTotalRows(yearForCalc, kCalData, m3Data, kWData, prices, {
        fatturaGasolio: expenses.fatturaGasolio,
        manutenzione: expenses.manutenzione,
        funzionamentoServizioPct: expenses.funzionamentoServizioPct,
      }),
    [yearForCalc, kCalData, m3Data, kWData, prices, expenses]
  )

  const payToMasterData = useMemo<PayToMasterRow[]>(
    () => totalData.map((row) => ({ key: row.key, name: row.name, payToMaster: row.payToMaster })),
    [totalData]
  )

  const payToMasterTotal = useMemo(
    () => payToMasterData.reduce((sum, row) => sum + row.payToMaster, 0),
    [payToMasterData]
  )
  const totalTotaleSum = useMemo(
    () => totalData.reduce((sum, row) => sum + row.totale, 0),
    [totalData]
  )
  const bollettaTotal = expenses.fatturaGasolio
  const bonificoSummaryDelta = Math.abs(totalTotaleSum - bollettaTotal)
  const isBonificoSummaryMismatch = bonificoSummaryDelta > BONIFICO_SUM_TOLERANCE

  const onPrint = () => window.print()

  const hotWaterColumns: ColumnsType<HotWaterRow> = [
    { title: 'Nome', dataIndex: 'name', key: 'name' },
    { title: 'M3', dataIndex: 'm3', key: 'm3', render: (v) => v.toFixed(0) },
    { title: 'Spesa acqua calda (€)', dataIndex: 'spesa', key: 'spesa', render: (v) => v.toFixed(2) },
  ]
  const kCalCostColumns: ColumnsType<KCalCostRow> = [
    { title: 'Fattura Gasolio (€)', dataIndex: 'fatturaGasolio', key: 'fatturaGasolio', render: (v) => v.toFixed(2) },
    { title: `Funzionamento (${expenses.funzionamentoServizioPct.toFixed(1)}%) (€)`, dataIndex: 'funzionamentoServizio', key: 'funzionamentoServizio', render: (v) => v.toFixed(2) },
    { title: 'Spese acqua calda (€)', dataIndex: 'speseAcquaCalda', key: 'speseAcquaCalda', render: (v) => v.toFixed(2) },
    { title: 'kCal totale', dataIndex: 'kCalTotale', key: 'kCalTotale', render: (v) => v.toFixed(1) },
    { title: 'Prezzo kCal (€/kCal)', dataIndex: 'prezzoKCal', key: 'prezzoKCal', render: (v) => v.toFixed(6) },
  ]
  const heatingColumns: ColumnsType<HeatingRow> = [
    { title: 'Nome', dataIndex: 'name', key: 'name' },
    { title: 'kCal', dataIndex: 'kCal', key: 'kCal', render: (v) => v.toFixed(1) },
    { title: 'Spesa riscaldamento (€)', dataIndex: 'spesa', key: 'spesa', render: (v) => v.toFixed(2) },
  ]
  const payToMasterColumns: ColumnsType<PayToMasterRow> = [
    { title: 'Nome', dataIndex: 'name', key: 'name' },
    { title: 'Da dare a Dino (€)', dataIndex: 'payToMaster', key: 'payToMaster', render: (v) => v.toFixed(2) },
  ]
  const totalColumns: ColumnsType<BonificoTotalRow> = [
    { title: 'Nome', dataIndex: 'name', key: 'name' },
    { title: 'Spese acqua calda (€)', dataIndex: 'speseAcquaCalda', key: 'speseAcquaCalda', render: (v) => v.toFixed(2) },
    { title: 'Funzionamento servizio (€)', dataIndex: 'funzionamentoServizio', key: 'funzionamentoServizio', render: (v) => v.toFixed(2) },
    { title: 'Spese riscaldamento (€)', dataIndex: 'speseRiscaldamento', key: 'speseRiscaldamento', render: (v) => v.toFixed(2) },
    { title: 'Totale (€)', dataIndex: 'totale', key: 'totale', render: (v) => <strong>{v.toFixed(2)}</strong> },
  ]

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4">
      <style>{`
        @media print {
          /* Hide in-page controls */
          .print-hide { display: none !important; }

          /* Prevent the app layout (100vh + overflow hidden) from clipping content */
          html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
          .ant-layout { height: auto !important; min-height: auto !important; overflow: visible !important; }
          .ant-layout-content { height: auto !important; overflow: visible !important; }

          /* Avoid printing side UI; keep the report focused */
          .ant-layout-header { display: none !important; }
          .ant-layout-sider { display: none !important; }

          /* Reduce awkward page splits for cards/tables */
          .ant-card { break-inside: avoid; page-break-inside: avoid; }
          table { break-inside: auto; }

          /* Ensure horizontal overflow containers don't clip tables */
          .overflow-x-auto { overflow-x: visible !important; }
        }
      `}</style>
      <div className="print-hide flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <Title level={2} className="mb-0!" style={{ fontSize: '24px' }}>Report calcoli</Title>
        <div className="flex gap-2">
          <Select<number>
            value={selectedYear}
            onChange={setSelectedYear}
            options={yearSelectOptions}
            disabled={eligibleYears.length === 0}
            className="min-w-[200px]"
            size="large"
          />
          <Button type="primary" icon={<PrinterOutlined />} onClick={onPrint} size="large">
            Stampa / Salva PDF
          </Button>
        </div>
      </div>

      <Card className="mobile-card-title-compact" title="CALCOLO SPESE INDIVIDUALI ACQUA CALDA">
        <Table
          columns={hotWaterColumns}
          dataSource={hotWaterData}
          pagination={false}
          bordered
          size="small"
          rowKey="key"
          summary={() => (
            <Table.Summary>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}><strong>Somma Totale</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={2}><strong>{totalHotWaterExpenses.toFixed(2)}</strong></Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>
      <Card className="mobile-card-title-compact" title="CALCOLO COSTO kCal (RISCALDAMENTO)">
        <Table columns={kCalCostColumns} dataSource={kCalCostData} pagination={false} bordered size="small" rowKey="key" />
      </Card>
      <Card className="mobile-card-title-compact" title="CALCOLO INDIVIDUALE SPESE RISCALDAMENTO">
        <Table columns={heatingColumns} dataSource={heatingData} pagination={false} bordered size="small" rowKey="key" />
      </Card>
      <Card className="mobile-card-title-compact" title="DA DARE A DINO (CONTANTI)">
        <Table<PayToMasterRow>
          columns={payToMasterColumns}
          dataSource={payToMasterData}
          pagination={false}
          bordered
          size="small"
          summary={() => (
            <Table.Summary>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}><strong>Somma Totale</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={1}><strong>{payToMasterTotal.toFixed(2)}</strong></Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>
      <Card
        className="mobile-card-title-compact"
        title={
          <span>
            CALCOLO IMPORTI TOTALI (BONIFICO){' '}
            <Tooltip title="Somma Totale deve combaciare con Totale bolletta (Fattura Gasolio).">
              <QuestionCircleOutlined />
            </Tooltip>
          </span>
        }
      >
        <Table<BonificoTotalRow>
          columns={totalColumns}
          dataSource={totalData}
          pagination={false}
          bordered
          size="small"
          rowKey="key"
          summary={() => (
            <Table.Summary>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4}><strong>Somma Totale</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={4}>
                  {isBonificoSummaryMismatch ? (
                    <Tooltip color="red" title={`Errore coerenza: Somma Totale ${totalTotaleSum.toFixed(2)}€ vs Totale bolletta ${bollettaTotal.toFixed(2)}€ (scarto ${bonificoSummaryDelta.toFixed(2)}€)`}>
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
        <div className="mt-3">
          <Text strong>Risultato finale (Totale bolletta): {bollettaTotal.toFixed(2)} €</Text>
        </div>
      </Card>
    </div>
  )
}

export default PrintReportPage
