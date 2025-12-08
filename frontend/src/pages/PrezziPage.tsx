import { useState, useMemo } from 'react'
import { Card, Typography, Table, InputNumber, Button } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useReadings } from '../contexts/ReadingsContext'

const { Title } = Typography

interface PriceRow {
  key: string
  name: string
  price: number
}

const PrezziPage = () => {
  const { prices, updatePrice } = useReadings()
  // Initialize local state from context values
  const [localPrices, setLocalPrices] = useState(() => ({
    gasolio: prices.gasolio,
    acqua: prices.acqua,
    corrente: prices.corrente,
  }))

  const hasChanges = useMemo(() => {
    return localPrices.gasolio !== prices.gasolio ||
      localPrices.acqua !== prices.acqua ||
      localPrices.corrente !== prices.corrente
  }, [localPrices, prices])

  const handleApply = () => {
    updatePrice('gasolio', localPrices.gasolio)
    updatePrice('acqua', localPrices.acqua)
    updatePrice('corrente', localPrices.corrente)
  }

  const handleLocalPriceChange = (key: 'gasolio' | 'acqua' | 'corrente', value: number | null) => {
    setLocalPrices(prev => ({ ...prev, [key]: value || 0 }))
  }

  const priceData = useMemo<PriceRow[]>(() => [
    { key: 'gasolio', name: 'Gasolio', price: localPrices.gasolio },
    { key: 'acqua', name: 'Acqua', price: localPrices.acqua },
    { key: 'corrente', name: 'Corrente kW', price: localPrices.corrente },
  ], [localPrices])

  const columns: ColumnsType<PriceRow> = [
    {
      title: '',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: 'Euro (€)',
      dataIndex: 'price',
      key: 'price',
      width: 150,
      align: 'right',
      render: (value: number, record) => (
        <InputNumber
          value={value}
          onChange={(val) => handleLocalPriceChange(record.key as 'gasolio' | 'acqua' | 'corrente', val)}
          style={{ width: '100%' }}
          precision={2}
          controls={false}
        />
      ),
    },
  ]

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 md:mb-6">
        <Title level={2} style={{ margin: 0, fontSize: '24px' }}>Prezzi</Title>
        {hasChanges && (
          <Button type="primary" onClick={handleApply} size="large" className="w-full sm:w-auto">
            Applica
          </Button>
        )}
      </div>
      <Card className="max-w-full sm:max-w-120">
        <Table
          columns={columns}
          dataSource={priceData}
          pagination={false}
          bordered
          size="middle"
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  )
}

export default PrezziPage

