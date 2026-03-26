import { useState, useMemo, useEffect } from 'react'
import {
  Card,
  Typography,
  Table,
  InputNumber,
  Button,
  Select,
  Space,
  message,
  Alert,
  Divider,
  Tooltip,
} from 'antd'
import {
  SaveOutlined,
  InfoCircleOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useAuth } from '../contexts/AuthContext'
import {
  useGetYearlyFinancialsQuery,
  useGetYearlyFinancialYearsQuery,
  useUpdateYearlyFinancialsMutation,
} from '../store/api/yearlyFinancialsApi'

const { Title, Text, Paragraph } = Typography

interface UnitPriceRow {
  key: string
  name: string
  description: string
  price: number
  editable: boolean
  suffix: string
}

const PrezziPage = () => {
  const { profile } = useAuth()
  const currentYear = new Date().getFullYear()

  const orgId = profile?.organization_id ?? ''
  const skip = !orgId

  const { data: availableYearsData } = useGetYearlyFinancialYearsQuery(
    { organization_id: orgId },
    { skip }
  )

  const [unitYear, setUnitYear] = useState(currentYear)
  const { data: unitYearly, isFetching: unitYearFetching } = useGetYearlyFinancialsQuery(
    { organization_id: orgId, year: unitYear },
    { skip }
  )

  const [updateYearly, { isLoading: savingSettings }] = useUpdateYearlyFinancialsMutation()
  const [localPrices, setLocalPrices] = useState({ acqua: 2, corrente: 0.14 })

  useEffect(() => {
    if (!unitYearly) return
    setLocalPrices({ acqua: unitYearly.acqua, corrente: unitYearly.corrente })
  }, [unitYearly, unitYear])

  const hasUnitChanges = useMemo(() => {
    if (!unitYearly) return false
    return localPrices.acqua !== unitYearly.acqua || localPrices.corrente !== unitYearly.corrente
  }, [localPrices, unitYearly])

  const handleApplyUnitPrices = async () => {
    if (!orgId) return
    try {
      await updateYearly({
        organization_id: orgId,
        year: unitYear,
        acqua: localPrices.acqua,
        corrente: localPrices.corrente,
      }).unwrap()
      message.success('Prezzi acqua e corrente salvati')
    } catch {
      message.error('Non è stato possibile salvare. Riprova.')
    }
  }

  const unitPriceData = useMemo<UnitPriceRow[]>(() => {
    const gasolioEuroL = unitYearly?.computed?.gasolio_per_liter ?? 0
    return [
      {
        key: 'gasolio',
        name: 'Gasolio',
        description: 'Ricavato automaticamente dalle bollette in basso (media pesata sui litri).',
        price: gasolioEuroL,
        editable: false,
        suffix: '€/litro',
      },
      {
        key: 'acqua',
        name: 'Acqua',
        description: 'Costo unitario usato per l’acqua fredda nelle Spese.',
        price: localPrices.acqua,
        editable: true,
        suffix: '€/m³',
      },
      {
        key: 'corrente',
        name: 'Elettricità (comune)',
        description: 'Prezzo al kWh per il contatore elettrico condiviso.',
        price: localPrices.corrente,
        editable: true,
        suffix: '€/kWh',
      },
    ]
  }, [localPrices, unitYearly])

  const unitYearOptions = useMemo(() => {
    const fromDb = availableYearsData?.years ?? []
    const set = new Set<number>([currentYear, currentYear + 1, ...fromDb])
    return Array.from(set)
      .sort((a, b) => b - a)
      .map((y) => ({ value: y, label: y === currentYear ? `${y} — anno in corso` : String(y) }))
  }, [availableYearsData, currentYear])

  const unitColumns: ColumnsType<UnitPriceRow> = [
    {
      title: 'Voce',
      key: 'name',
      width: 200,
      render: (_, record) => (
        <div>
          <Text strong className="block">
            {record.name}
          </Text>
          <Text type="secondary" className="text-xs leading-snug block mt-0.5 max-w-md">
            {record.description}
          </Text>
        </div>
      ),
    },
    {
      title: (
        <span>
          Valore{' '}
          <Tooltip title="Per acqua e corrente modifica qui e premi Salva in basso.">
            <InfoCircleOutlined className="text-zinc-400" />
          </Tooltip>
        </span>
      ),
      dataIndex: 'price',
      key: 'price',
      width: 200,
      align: 'right',
      render: (value: number, record) =>
        record.editable ? (
          <div className="flex flex-col items-end gap-1">
            <InputNumber
              value={value}
              onChange={(val) => {
                const v = val ?? 0
                if (record.key === 'acqua') setLocalPrices((p) => ({ ...p, acqua: v }))
                if (record.key === 'corrente') setLocalPrices((p) => ({ ...p, corrente: v }))
              }}
              style={{ width: '100%', maxWidth: 160 }}
              precision={record.key === 'corrente' ? 4 : 2}
              controls={false}
              addonAfter={record.suffix}
            />
          </div>
        ) : (
          <Text className="text-base tabular-nums">
            {value.toFixed(4)} {record.suffix}
          </Text>
        ),
    },
  ]

  if (skip) {
    return (
      <div className="p-4 md:p-6 max-w-3xl">
        <Title level={2}>Prezzi</Title>
        <Alert
          type="info"
          showIcon
          message="Accesso richiesto"
          description="Effettua il login per gestire prezzi e bollette gasolio."
        />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <header className="mb-6 md:mb-8">
        <Title level={2} className="mb-2!" style={{ fontSize: 'clamp(1.35rem, 4vw, 1.75rem)' }}>
          Prezzi
        </Title>
        <Paragraph type="secondary" className="mb-0! max-w-2xl text-sm md:text-base">
          Imposta i prezzi di acqua ed elettricità per anno. Questi valori alimentano le pagine Spese e Calcolo.
        </Paragraph>
      </header>

      <Card
        title={
          <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="text-base font-semibold">Acqua ed elettricità — {unitYear}</span>
            <Select<number>
              value={unitYear}
              onChange={setUnitYear}
              options={unitYearOptions}
              className="w-full sm:w-[220px]"
              size="middle"
              suffixIcon={<CalendarOutlined />}
              aria-label="Seleziona anno acqua ed elettricità"
            />
          </div>
        }
        className="shadow-sm border-zinc-200/80"
        loading={unitYearFetching && !unitYearly}
      >
        <Table
          columns={unitColumns}
          dataSource={unitPriceData}
          pagination={false}
          bordered
          size="middle"
          rowKey="key"
          scroll={{ x: 'max-content' }}
        />

        <Divider className="my-4" />

        <Space direction="vertical" size="small" className="w-full">
          <Button
            type="primary"
            icon={<SaveOutlined />}
            size="large"
            onClick={() => void handleApplyUnitPrices()}
            loading={savingSettings}
            disabled={!hasUnitChanges}
          >
            Salva acqua e corrente
          </Button>
          {!hasUnitChanges && (
            <Text type="secondary" className="text-sm">
              Modifica i campi acqua o elettricità per abilitare il salvataggio.
            </Text>
          )}
        </Space>
      </Card>

    </div>
  )
}

export default PrezziPage
