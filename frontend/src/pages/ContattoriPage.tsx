import { useState } from 'react'
import { Card, Typography, Table, InputNumber, Button } from 'antd'
import { FireOutlined, DropboxOutlined, ThunderboltOutlined, EditOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useReadings, type KCalRow, type M3Row, type KWRow } from '../contexts/ReadingsContext'
import UpdateReadingsDrawer from '../components/UpdateReadingsDrawer'

const { Title } = Typography

const ContattoriPage = () => {
  const { kCalData, m3Data, kWData, updateKCalData, updateM3Data, updateKWData, updateReadings } = useReadings()
  const [drawerOpen, setDrawerOpen] = useState(false)


  const renderKCalPrec = (value: number | null, record: KCalRow) => {
    const isTotal = record.key === 'totale'
    return isTotal
      ? <span>{value?.toFixed(1) || ''}</span>
      : <InputNumber
        value={value}
        onChange={(val) => updateKCalData(record.key, 'kCalPrec', val)}
        style={{ width: '100%' }}
        precision={1}
        controls={false}
      />
  }

  const renderKCalAtt = (value: number | null, record: KCalRow) => {
    const isTotal = record.key === 'totale'
    return isTotal
      ? <span>{value?.toFixed(1) || ''}</span>
      : <InputNumber
        value={value}
        onChange={(val) => updateKCalData(record.key, 'kCalAtt', val)}
        style={{ width: '100%' }}
        precision={1}
        controls={false}
      />
  }

  const renderM3Prec = (value: number | null, record: M3Row) => {
    const isTotal = record.key === 'totale'
    return isTotal
      ? <span>-</span>
      : <InputNumber
        value={value}
        onChange={(val) => updateM3Data(record.key, 'm3Prec', val)}
        style={{ width: '100%' }}
        precision={0}
        controls={false}
      />
  }

  const renderM3Att = (value: number | null, record: M3Row) => {
    const isTotal = record.key === 'totale'
    return isTotal
      ? <span>-</span>
      : <InputNumber
        value={value}
        onChange={(val) => updateM3Data(record.key, 'm3Att', val)}
        style={{ width: '100%' }}
        precision={0}
        controls={false}
      />
  }

  const kCalColumns: ColumnsType<KCalRow> = [
    {
      title: '',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      fixed: 'left' as const,
    },
    {
      title: "2024 (kCal)",
      dataIndex: 'kCalPrec',
      key: 'kCalPrec',
      width: 120,
      render: renderKCalPrec,
    },
    {
      title: "2025 (kCal)",
      dataIndex: 'kCalAtt',
      key: 'kCalAtt',
      width: 120,
      render: renderKCalAtt,
    },
    {
      title: 'Differenza (kCal)',
      dataIndex: 'differenza',
      key: 'differenza',
      width: 100,
      render: (value: number) => <span style={{ fontWeight: 'bold' }}>{value.toFixed(1)}</span>,
    },
  ]

  const m3Columns: ColumnsType<M3Row> = [
    {
      title: '',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      fixed: 'left' as const,
    },
    {
      title: "2024 (M³)",
      dataIndex: 'm3Prec',
      key: 'm3Prec',
      width: 120,
      render: renderM3Prec,
    },
    {
      title: "2025 (M³)",
      dataIndex: 'm3Att',
      key: 'm3Att',
      width: 120,
      render: renderM3Att,
    },
    {
      title: 'Differenza (M³)',
      dataIndex: 'differenza',
      key: 'differenza',
      width: 120,
      render: (value: number) => <span style={{ fontWeight: 'bold' }}>{value}</span>,
    },
  ]

  const kWColumns: ColumnsType<KWRow> = [
    {
      title: '',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      fixed: 'left' as const,
    },
    {
      title: "2024 (kW)",
      dataIndex: 'kWPrec',
      key: 'kWPrec',
      width: 120,
      render: (value: number | null, record) => (
        <InputNumber
          value={value}
          onChange={(val) => updateKWData(record.key, 'kWPrec', val)}
          style={{ width: '100%' }}
          precision={1}
          controls={false}
        />
      ),
    },
    {
      title: "2025 (kW)",
      dataIndex: 'kWAtt',
      key: 'kWAtt',
      width: 120,
      render: (value: number | null, record) => (
        <InputNumber
          value={value}
          onChange={(val) => updateKWData(record.key, 'kWAtt', val)}
          style={{ width: '100%' }}
          precision={1}
          controls={false}
        />
      ),
    },
    {
      title: 'Differenza (kW)',
      dataIndex: 'differenza',
      key: 'differenza',
      width: 100,
      render: (value: number) => <span style={{ fontWeight: 'bold' }}>{value.toFixed(1)}</span>,
    },
  ]

  const handleOpenDrawer = () => {
    setDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
  }

  const handleUpdateReadings = (values: Record<string, number>) => {
    updateReadings(values)
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 md:mb-6">
        <Title level={2} style={{ margin: 0, fontSize: '24px' }}>Lettura contattori</Title>
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={handleOpenDrawer}
          size="large"
          className="w-full sm:w-auto"
        >
          Aggiorna
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:gap-6">
        <Card
          title={
            <span className="text-sm md:text-base">
              <FireOutlined style={{ marginRight: 8, color: '#ff4d4f' }} />
              kCal - Contatore Calore
            </span>
          }
        >
          <div className="-mx-4 md:mx-0">
            <div className="px-4 md:px-0">
              <Table
                columns={kCalColumns}
                dataSource={kCalData}
                pagination={false}
                bordered
                size="small"
                rowClassName={(record) => record.key === 'totale' ? 'font-semibold' : ''}
                scroll={{ x: 'max-content' }}
              />
            </div>
          </div>
        </Card>

        <Card
          title={
            <span className="text-sm md:text-base">
              <DropboxOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              M³ - Contatore Acqua
            </span>
          }
        >
          <div className="-mx-4 md:mx-0">
            <div className="px-4 md:px-0">
              <Table
                columns={m3Columns}
                dataSource={m3Data}
                pagination={false}
                bordered
                size="small"
                rowClassName={(record) => record.key === 'totale' ? 'font-semibold' : ''}
                scroll={{ x: 'max-content' }}
              />
            </div>
          </div>
        </Card>

        <Card
          title={
            <span className="text-sm md:text-base">
              <ThunderboltOutlined style={{ marginRight: 8, color: '#faad14' }} />
              kW - Contatore Elettrico
            </span>
          }
        >
          <div className="-mx-4 md:mx-0">
            <div className="px-4 md:px-0">
              <Table
                columns={kWColumns}
                dataSource={kWData}
                pagination={false}
                bordered
                size="small"
                scroll={{ x: 'max-content' }}
              />
            </div>
          </div>
        </Card>
      </div>

      <UpdateReadingsDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        kCalData={kCalData}
        m3Data={m3Data}
        onUpdate={handleUpdateReadings}
      />
    </div>
  )
}

export default ContattoriPage
