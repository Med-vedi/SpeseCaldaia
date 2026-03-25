import { useState, useMemo, useEffect } from 'react'
import {
  Card,
  Typography,
  Table,
  InputNumber,
  Input,
  Button,
  Select,
  Space,
  Popconfirm,
  message,
  Modal,
  Form,
  Alert,
  Statistic,
  Row,
  Col,
  Divider,
  Empty,
  Tooltip,
} from 'antd'
import {
  PlusOutlined,
  SaveOutlined,
  InfoCircleOutlined,
  CalendarOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useAuth } from '../contexts/AuthContext'
import { useReadings } from '../contexts/ReadingsContext'
import {
  useGetYearlyFinancialsQuery,
  useUpdateYearlyFinancialsMutation,
  useCreateGasoilDeliveryMutation,
  useUpdateGasoilDeliveryMutation,
  useDeleteGasoilDeliveryMutation,
} from '../store/api/yearlyFinancialsApi'
import type { GasoilDelivery } from '../store/api/models'

const { Title, Text, Paragraph } = Typography

function rtkErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'data' in err) {
    const d = (err as { data?: { error?: string } }).data
    if (d && typeof d.error === 'string') return d.error
  }
  return 'Operazione non riuscita'
}

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
  const { financialYear, setFinancialYear, priceSheetYearsAsc } = useReadings()

  const orgId = profile?.organization_id ?? ''
  const skip = !orgId

  const { data: yearly, isFetching } = useGetYearlyFinancialsQuery(
    { organization_id: orgId, year: financialYear },
    { skip }
  )

  const [updateYearly, { isLoading: savingSettings }] = useUpdateYearlyFinancialsMutation()
  const [createDelivery, { isLoading: creating }] = useCreateGasoilDeliveryMutation()
  const [updateDelivery] = useUpdateGasoilDeliveryMutation()
  const [deleteDelivery] = useDeleteGasoilDeliveryMutation()

  const [localPrices, setLocalPrices] = useState({ acqua: 2, corrente: 0.14 })
  const [bollettaModalOpen, setBollettaModalOpen] = useState(false)
  const [bollettaForm] = Form.useForm<{ label?: string; liters: number; amount_eur: number }>()

  const modalLiters = Form.useWatch('liters', bollettaForm)
  const modalAmount = Form.useWatch('amount_eur', bollettaForm)

  const modalPrezzoAlLitro = useMemo(() => {
    const l = Number(modalLiters)
    const e = Number(modalAmount)
    if (!Number.isFinite(l) || !Number.isFinite(e) || l <= 0 || e < 0) return null
    return e / l
  }, [modalLiters, modalAmount])

  useEffect(() => {
    if (!yearly) return
    setLocalPrices({ acqua: yearly.acqua, corrente: yearly.corrente })
  }, [yearly, financialYear])

  const hasUnitChanges = useMemo(() => {
    if (!yearly) return false
    return localPrices.acqua !== yearly.acqua || localPrices.corrente !== yearly.corrente
  }, [localPrices, yearly])

  const handleApplyUnitPrices = async () => {
    if (!orgId) return
    try {
      await updateYearly({
        organization_id: orgId,
        year: financialYear,
        acqua: localPrices.acqua,
        corrente: localPrices.corrente,
      }).unwrap()
      message.success('Prezzi acqua e corrente salvati')
    } catch {
      message.error('Non è stato possibile salvare. Riprova.')
    }
  }

  const handleFallbackChange = async (val: number | null) => {
    if (!orgId) return
    const num = val != null && !Number.isNaN(val) ? val : null
    try {
      await updateYearly({
        organization_id: orgId,
        year: financialYear,
        gasolio_fallback: num != null && num >= 0 ? num : null,
      }).unwrap()
      message.success('Prezzo manuale aggiornato')
    } catch {
      message.error('Errore nel salvataggio')
    }
  }

  const openBollettaModal = () => {
    bollettaForm.resetFields()
    setBollettaModalOpen(true)
  }

  const submitBollettaModal = async () => {
    if (!orgId) return
    try {
      const values = await bollettaForm.validateFields()
      await createDelivery({
        organization_id: orgId,
        year: financialYear,
        label: values.label?.trim() ? values.label.trim() : null,
        liters: values.liters,
        amount_eur: values.amount_eur,
      }).unwrap()
      message.success('Bolletta aggiunta correttamente')
      setBollettaModalOpen(false)
      bollettaForm.resetFields()
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error(rtkErrorMessage(err))
    }
  }

  const patchDelivery = async (
    id: string,
    data: { label?: string | null; liters?: number; amount_eur?: number }
  ) => {
    if (!orgId) return
    try {
      await updateDelivery({ id, organization_id: orgId, year: financialYear, data }).unwrap()
    } catch {
      message.error('Impossibile aggiornare la riga')
    }
  }

  const handleRemoveDelivery = async (id: string) => {
    if (!orgId) return
    try {
      await deleteDelivery({ id, organization_id: orgId, year: financialYear }).unwrap()
      message.success('Bolletta eliminata')
    } catch {
      message.error('Errore durante l’eliminazione')
    }
  }

  const unitPriceData = useMemo<UnitPriceRow[]>(() => {
    const gasolioEuroL = yearly?.computed?.gasolio_per_liter ?? 0
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
  }, [localPrices, yearly])

  const yearOptions = useMemo(
    () =>
      [...priceSheetYearsAsc]
        .reverse()
        .map((y) => ({ value: y, label: y === new Date().getFullYear() ? `${y} — anno in corso` : String(y) })),
    [priceSheetYearsAsc]
  )

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

  const gasColumns: ColumnsType<GasoilDelivery> = [
    {
      title: 'Descrizione',
      key: 'label',
      width: 180,
      render: (_: unknown, row) => (
        <Input
          size="middle"
          defaultValue={row.label ?? ''}
          key={`lbl-${row.id}-${row.updated_at}`}
          onBlur={(e) => {
            const next = e.target.value.trim() || null
            if (next !== (row.label ?? null)) {
              void patchDelivery(row.id, { label: next })
            }
          }}
          placeholder="es. Fornitura autunno"
        />
      ),
    },
    {
      title: 'Litri',
      key: 'liters',
      width: 120,
      align: 'right',
      render: (_: unknown, row) => (
        <InputNumber
          value={row.liters}
          min={0}
          onChange={(val) => {
            void patchDelivery(row.id, { liters: val ?? 0 })
          }}
          style={{ width: '100%' }}
          precision={2}
          controls={false}
          addonAfter="L"
        />
      ),
    },
    {
      title: 'Totale bolletta',
      key: 'amount_eur',
      width: 150,
      align: 'right',
      render: (_: unknown, row) => (
        <InputNumber
          value={row.amount_eur}
          min={0}
          onChange={(val) => {
            void patchDelivery(row.id, { amount_eur: val ?? 0 })
          }}
          style={{ width: '100%' }}
          precision={2}
          controls={false}
          addonAfter="€"
        />
      ),
    },
    {
      title: (
        <Tooltip title="Importo della riga diviso i litri — solo informativo.">
          <span>€/litro</span> <InfoCircleOutlined className="text-zinc-400 text-xs" />
        </Tooltip>
      ),
      key: 'per_l',
      width: 100,
      align: 'right',
      render: (_: unknown, row) => {
        const l = Number(row.liters)
        const e = Number(row.amount_eur)
        const pl = l > 0 ? e / l : 0
        return (
          <Text type="secondary" className="tabular-nums">
            {pl > 0 ? pl.toFixed(4) : '—'}
          </Text>
        )
      },
    },
    {
      title: '',
      key: 'actions',
      width: 56,
      align: 'center',
      render: (_: unknown, row) => (
        <Popconfirm
          title="Eliminare questa bolletta?"
          description="I totali dell’anno si aggiorneranno subito."
          okText="Sì, elimina"
          cancelText="No"
          onConfirm={() => void handleRemoveDelivery(row.id)}
        >
          <Button type="text" danger size="small" icon={<DeleteOutlined />} aria-label="Elimina bolletta" />
        </Popconfirm>
      ),
    },
  ]

  const deliveries = yearly?.gasoil_deliveries ?? []
  const hasDeliveries = deliveries.length > 0

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
          Prezzi e bollette
        </Title>
        <Paragraph type="secondary" className="mb-0! max-w-2xl text-sm md:text-base">
          Scegli l&apos;anno, registra le bollette del gasolio (di solito una o due all&apos;anno), poi imposta i
          prezzi di acqua ed elettricità. Questi valori alimentano le pagine Spese e Calcolo.
        </Paragraph>
      </header>

      <Card className="mb-5 shadow-sm border-zinc-200/80" styles={{ body: { padding: '16px 20px' } }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={10}>
            <Text type="secondary" className="text-xs uppercase tracking-wide block mb-1">
              Anno di riferimento
            </Text>
            <Select<number>
              value={financialYear}
              onChange={setFinancialYear}
              options={yearOptions}
              className="w-full max-w-xs"
              size="large"
              suffixIcon={<CalendarOutlined />}
              aria-label="Seleziona anno"
            />
            <Text type="secondary" className="text-xs block mt-2">
              Tutti i dati in questa pagina (bollette e prezzi) sono per l&apos;anno scelto.
            </Text>
          </Col>
        </Row>
      </Card>

      <Card
        title={
          <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <Text type="secondary" className="text-xs uppercase tracking-wide block mb-1">
              Bollette gasolio — {financialYear}
            </Text>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="middle"
              onClick={openBollettaModal}
              className="w-full shrink-0 sm:w-auto"
            >
              Aggiungi bolletta
            </Button>
          </div>
        }
        className="mb-5 shadow-sm border-zinc-200/80 max-sm:[&_.ant-card-head]:pt-4! [&_.ant-card-head-title]:flex-1! [&_.ant-card-head-title]:min-w-0!"
        loading={isFetching && !yearly}
      >
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message="Come funziona"
          description={
            <span>
              Per ogni consegna inserisci <strong>quanti litri</strong> sono stati forniti e <strong>quanto hai pagato</strong> in
              bolletta. L&apos;app calcola il prezzo al litro e la media dell&apos;anno per il gasolio. Puoi modificare le
              righe in tabella in qualsiasi momento.
            </span>
          }
        />

        {yearly && (
          <Row gutter={[16, 16]} className="mb-5">
            <Col xs={24} sm={8}>
              <Card size="small" className="bg-zinc-50/80 border-zinc-100">
                <Statistic
                  title="Litri totali (anno)"
                  value={Number(yearly.computed.total_liters)}
                  precision={2}
                  suffix="L"
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small" className="bg-zinc-50/80 border-zinc-100">
                <Statistic
                  title="Spesa gasolio (somma bollette)"
                  value={Number(yearly.computed.fattura_gasolio_total)}
                  precision={2}
                  suffix="€"
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small" className="bg-zinc-50/80 border-zinc-100">
                <Statistic
                  title="Prezzo medio gasolio"
                  value={Number(yearly.computed.gasolio_per_liter)}
                  precision={4}
                  suffix="€/L"
                />
              </Card>
            </Col>
          </Row>
        )}

        {!hasDeliveries && !isFetching ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className="text-zinc-600">
                Nessuna bolletta per il {financialYear}.{' '}
                <Button type="link" className="p-0 h-auto" onClick={openBollettaModal}>
                  Aggiungi la prima bolletta
                </Button>
              </span>
            }
          />
        ) : (
          <div className="overflow-x-auto -mx-1">
            <Table
              columns={gasColumns}
              dataSource={deliveries}
              pagination={false}
              bordered
              size="middle"
              rowKey="id"
              scroll={{ x: 640 }}
              locale={{ emptyText: 'Nessuna bolletta' }}
            />
          </div>
        )}

        {yearly && yearly.computed.total_liters <= 0 && hasDeliveries && (
          <Alert
            className="mt-4"
            type="warning"
            showIcon
            message="Litri a zero"
            description="Se tutte le righe hanno 0 litri, imposta un prezzo al litro qui sotto oppure correggi i litri in tabella."
          />
        )}

        {yearly && yearly.computed.total_liters <= 0 && (
          <div className="mt-4 p-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50">
            <Text strong className="block mb-1">
              Prezzo gasolio manuale (solo senza litri)
            </Text>
            <Text type="secondary" className="text-sm block mb-2">
              Usalo solo se non hai i litri in bolletta: quando aggiungi litri, questo valore non serve più.
            </Text>
            <InputNumber
              value={yearly.gasolio_fallback ?? undefined}
              onChange={(v) => void handleFallbackChange(v)}
              min={0}
              precision={4}
              placeholder="es. 1,28"
              addonAfter="€/L"
              className="max-w-[200px]"
            />
          </div>
        )}
      </Card>

      <Card
        title={<span className="text-base font-semibold">Acqua ed elettricità — {financialYear}</span>}
        className="shadow-sm border-zinc-200/80"
        loading={isFetching && !yearly}
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

      <Modal
        title="Aggiungi bolletta gasolio"
        open={bollettaModalOpen}
        onCancel={() => {
          setBollettaModalOpen(false)
          bollettaForm.resetFields()
        }}
        okText="Salva bolletta"
        cancelText="Annulla"
        confirmLoading={creating}
        onOk={() => void submitBollettaModal()}
        destroyOnHidden
        width={480}
        centered
      >
        <Paragraph type="secondary" className="mb-4! mt-1! text-sm">
          I dati si riferiscono all&apos;anno <strong>{financialYear}</strong>. Dopo il salvataggio potrai modificarli
          dalla tabella.
        </Paragraph>
        <Form form={bollettaForm} layout="vertical" requiredMark="optional">
          <Form.Item
            name="label"
            label="Nome o nota"
            extra="Opzionale — utile se hai più forniture (es. primavera / autunno)."
          >
            <Input placeholder="es. Consegna marzo 2025" allowClear />
          </Form.Item>
          <Form.Item
            name="liters"
            label="Litri consegnati"
            rules={[
              {
                validator: (_: unknown, value: unknown) => {
                  const n = typeof value === 'number' ? value : Number(value)
                  if (value == null || value === '' || Number.isNaN(n)) {
                    return Promise.reject(new Error('Inserisci i litri'))
                  }
                  if (n <= 0) {
                    return Promise.reject(new Error('I litri devono essere maggiori di zero'))
                  }
                  return Promise.resolve()
                },
              },
            ]}
          >
            <InputNumber
              className="w-full"
              min={0.01}
              precision={2}
              placeholder="Quantità in litri"
              controls={false}
              addonAfter="L"
            />
          </Form.Item>
          <Form.Item
            name="amount_eur"
            label="Totale pagato (da bolletta)"
            rules={[
              {
                validator: (_: unknown, value: unknown) => {
                  const n = typeof value === 'number' ? value : Number(value)
                  if (value == null || value === '' || Number.isNaN(n)) {
                    return Promise.reject(new Error("Inserisci l'importo"))
                  }
                  if (n <= 0) {
                    return Promise.reject(new Error("L'importo deve essere maggiore di zero"))
                  }
                  return Promise.resolve()
                },
              },
            ]}
          >
            <InputNumber
              className="w-full"
              min={0.01}
              precision={2}
              placeholder="Importo ivato se applicabile"
              controls={false}
              addonAfter="€"
            />
          </Form.Item>
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 mb-1">
            <Text type="secondary" className="text-xs block mb-0.5">
              Prezzo al litro (calcolato)
            </Text>
            <Text strong className="text-lg tabular-nums text-emerald-900">
              {modalPrezzoAlLitro != null ? `${modalPrezzoAlLitro.toFixed(4)} €/L` : '— compila litri e importo'}
            </Text>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default PrezziPage
