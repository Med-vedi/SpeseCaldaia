import { useMemo, useState } from 'react'
import {
  Card,
  Typography,
  Table,
  InputNumber,
  Input,
  Button,
  Select,
  Popconfirm,
  message,
  Modal,
  Form,
  Alert,
  Statistic,
  Row,
  Col,
  Empty,
  Tooltip,
} from 'antd'
import { PlusOutlined, InfoCircleOutlined, CalendarOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useAuth } from '../contexts/AuthContext'
import { useReadings } from '../contexts/ReadingsContext'
import {
  useGetYearlyFinancialsQuery,
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

const BollettePage = () => {
  const { profile } = useAuth()
  const { financialYear, setFinancialYear, priceSheetYearsAsc } = useReadings()
  const orgId = profile?.organization_id ?? ''
  const skip = !orgId

  const { data: yearly, isFetching } = useGetYearlyFinancialsQuery(
    { organization_id: orgId, year: financialYear },
    { skip }
  )

  const [createDelivery, { isLoading: creating }] = useCreateGasoilDeliveryMutation()
  const [updateDelivery] = useUpdateGasoilDeliveryMutation()
  const [deleteDelivery] = useDeleteGasoilDeliveryMutation()

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

  const yearOptions = useMemo(
    () =>
      [...priceSheetYearsAsc]
        .reverse()
        .map((y) => ({ value: y, label: y === new Date().getFullYear() ? `${y} — anno in corso` : String(y) })),
    [priceSheetYearsAsc]
  )

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

  const deliveries = yearly?.gasoil_deliveries ?? []
  const hasDeliveries = deliveries.length > 0

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
        return <Text type="secondary" className="tabular-nums">{pl > 0 ? pl.toFixed(4) : '—'}</Text>
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

  if (skip) {
    return (
      <div className="p-4 md:p-6 max-w-3xl">
        <Title level={2}>Bollette</Title>
        <Alert
          type="info"
          showIcon
          message="Accesso richiesto"
          description="Effettua il login per gestire le bollette gasolio."
        />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <header className="mb-6 md:mb-8">
        <Title level={2} className="mb-2!" style={{ fontSize: 'clamp(1.35rem, 4vw, 1.75rem)' }}>
          Bollette gasolio
        </Title>
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
          </Col>
        </Row>
      </Card>

      <Card
        title={
          <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <Text type="secondary" className="text-xs uppercase tracking-wide block mb-1">
              Bollette gasolio — {financialYear}
            </Text>
            <Button type="primary" icon={<PlusOutlined />} size="middle" onClick={openBollettaModal}>
              Aggiungi bolletta
            </Button>
          </div>
        }
        className="mb-5 shadow-sm border-zinc-200/80"
        loading={isFetching && !yearly}
      >
        {yearly && (
          <Row gutter={[16, 16]} className="mb-5">
            <Col xs={24} sm={8}>
              <Card size="small"><Statistic title="Litri totali (anno)" value={Number(yearly.computed.total_liters)} precision={2} suffix="L" /></Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small"><Statistic title="Spesa gasolio (somma bollette)" value={Number(yearly.computed.fattura_gasolio_total)} precision={2} suffix="€" /></Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small"><Statistic title="Prezzo medio gasolio" value={Number(yearly.computed.gasolio_per_liter)} precision={4} suffix="€/L" /></Card>
            </Col>
          </Row>
        )}

        {!hasDeliveries && !isFetching ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`Nessuna bolletta per il ${financialYear}.`} />
        ) : (
          <Table columns={gasColumns} dataSource={deliveries} pagination={false} bordered rowKey="id" scroll={{ x: 640 }} />
        )}
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
        centered
      >
        <Paragraph type="secondary" className="mb-4! mt-1! text-sm">
          I dati si riferiscono all&apos;anno <strong>{financialYear}</strong>.
        </Paragraph>
        <Form form={bollettaForm} layout="vertical" requiredMark="optional">
          <Form.Item name="label" label="Nome o nota">
            <Input placeholder="es. Consegna marzo 2025" allowClear />
          </Form.Item>
          <Form.Item name="liters" label="Litri consegnati" rules={[{ required: true, message: 'Inserisci i litri' }]}>
            <InputNumber className="w-full" min={0.01} precision={2} controls={false} addonAfter="L" />
          </Form.Item>
          <Form.Item name="amount_eur" label="Totale pagato (da bolletta)" rules={[{ required: true, message: "Inserisci l'importo" }]}>
            <InputNumber className="w-full" min={0.01} precision={2} controls={false} addonAfter="€" />
          </Form.Item>
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 mb-1">
            <Text strong className="text-lg tabular-nums text-emerald-900">
              {modalPrezzoAlLitro != null ? `${modalPrezzoAlLitro.toFixed(4)} €/L` : '— compila litri e importo'}
            </Text>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default BollettePage
