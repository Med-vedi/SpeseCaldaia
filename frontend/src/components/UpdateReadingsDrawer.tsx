import { useEffect, useCallback, useMemo, useState } from 'react'
import { Drawer, Button, Form, Space, Card, InputNumber, App, Select } from 'antd'
import { FireOutlined, DropboxOutlined } from '@ant-design/icons'
import type { KCalRow, M3Row } from '../contexts/ReadingsContext'
import type { CounterValue, Counter } from '../store/api/models'
import { getValueForCounter, formatMeterRowDisplayName } from '../contexts/utils'

interface UpdateReadingsDrawerProps {
  open: boolean
  onClose: () => void
  kCalData: KCalRow[]
  m3Data: M3Row[]
  allCounterValues: CounterValue[]
  counters: Counter[]
  availableYears: number[]
  onUpdate: (values: Record<string, number>, year: number) => void
}

const UpdateReadingsDrawer = ({
  open,
  onClose,
  kCalData,
  m3Data,
  allCounterValues,
  counters,
  availableYears,
  onUpdate,
}: UpdateReadingsDrawerProps) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [drawerWidth, setDrawerWidth] = useState(480)
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const yearOptions = useMemo(() => {
    const maxAvailableYear = availableYears.length > 0 ? Math.max(...availableYears) : currentYear
    const nextAvailableYear = maxAvailableYear + 1
    const years = new Set<number>([
      ...availableYears,
      currentYear,
      selectedYear,
      selectedYear + 1,
      nextAvailableYear,
    ])
    return Array.from(years).sort((a, b) => a - b)
  }, [availableYears, currentYear, selectedYear])

  useEffect(() => {
    const updateWidth = () => {
      setDrawerWidth(window.innerWidth < 768 ? window.innerWidth : 480)
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const setInitialValues = useCallback(() => {
    const initialValues: Record<string, number> = {}

    // Get values for the selected year
    const selectedYearValues = allCounterValues.filter(cv => cv.year === selectedYear)

    kCalData.forEach(row => {
      if (row.key !== 'totale' && row.counterId) {
        const value = getValueForCounter(row.counterId, selectedYear, selectedYearValues)
        initialValues[`${row.key}_kCal`] = value ?? 0
      }
    })

    m3Data.forEach(row => {
      if (row.key !== 'totale' && row.counterId) {
        const value = getValueForCounter(row.counterId, selectedYear, selectedYearValues)
        initialValues[`${row.key}_m3`] = value ?? 0
      }
    })

    form.setFieldsValue(initialValues)
  }, [kCalData, m3Data, allCounterValues, selectedYear, form])

  useEffect(() => {
    if (!open) {
      form.resetFields()
      setSelectedYear(currentYear)
      return
    }
    setInitialValues()
  }, [open, setInitialValues, form, currentYear])

  useEffect(() => {
    if (open) {
      setInitialValues()
    }
  }, [selectedYear, open, setInitialValues])

  const getMinKCal = (counterId: string | undefined): number => {
    if (!counterId) return 0
    const previousYear = selectedYear - 1
    const previousYearValues = allCounterValues.filter(cv => cv.year === previousYear)
    const value = getValueForCounter(counterId, previousYear, previousYearValues)
    return value ?? 0
  }

  const getMinM3 = (counterId: string | undefined): number => {
    if (!counterId) return 0
    const previousYear = selectedYear - 1
    const previousYearValues = allCounterValues.filter(cv => cv.year === previousYear)
    const value = getValueForCounter(counterId, previousYear, previousYearValues)
    return value ?? 0
  }

  const validateKCal = (counterId: string | undefined) => (_: unknown, value: number) => {
    const minValue = getMinKCal(counterId)
    const isValid = value >= minValue
    return isValid
      ? Promise.resolve()
      : Promise.reject(new Error(`Il valore deve essere maggiore o uguale a ${minValue.toFixed(1)}`))
  }

  const validateM3 = (counterId: string | undefined) => (_: unknown, value: number) => {
    const minValue = getMinM3(counterId)
    const isValid = value >= minValue
    return isValid
      ? Promise.resolve()
      : Promise.reject(new Error(`Il valore deve essere maggiore o uguale a ${minValue}`))
  }

  const handleSubmit = () => {
    form.validateFields().then(values => {
      onUpdate(values, selectedYear)
      message.success('Valori aggiornati con successo!')
      onClose()
    })
  }


  // Get all user rows (excluding totals)
  const userRows = [
    ...kCalData.filter(r => r.key !== 'totale'),
    ...m3Data.filter(r => r.key !== 'totale'),
  ]

  // Group by user_id or name to show both kCal and m3 in same card
  const userGroups = userRows.reduce((acc, row) => {
    const counter = counters.find(c => c.id === row.counterId)
    // Use user_id as grouping key, or counter name if user_id is null
    const groupKey = counter?.user_id || counter?.name || row.key

    if (!acc[groupKey]) {
      acc[groupKey] = {
        kCalRow: null,
        m3Row: null,
        userName: counter ? formatMeterRowDisplayName(counter) : row.name
      }
    }
    if (row.counterType === 'heat') {
      acc[groupKey].kCalRow = row as KCalRow
    } else if (row.counterType === 'water') {
      acc[groupKey].m3Row = row as M3Row
    }
    return acc
  }, {} as Record<string, { kCalRow: KCalRow | null; m3Row: M3Row | null; userName: string }>)

  return (
    <Drawer
      title="Aggiorna Letture Annuali"
      placement="right"
      onClose={onClose}
      open={open}
      width={drawerWidth}
      extra={
        <Space>
          <Button onClick={onClose} size="large">Annulla</Button>
          <Button type="primary" onClick={handleSubmit} size="large">
            Salva
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Anno"
          name="year"
          initialValue={currentYear}
        >
          <Select
            value={selectedYear}
            onChange={setSelectedYear}
            style={{ width: '100%' }}
            size="large"
          >
            {yearOptions.map(year => (
              <Select.Option key={year} value={year}>
                {year}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {Object.entries(userGroups).map(([groupKey, { kCalRow, m3Row, userName }]) => {
          const counterIdKCal = kCalRow?.counterId
          const counterIdM3 = m3Row?.counterId
          const minKCal = getMinKCal(counterIdKCal)
          const minM3 = getMinM3(counterIdM3)
          const yearShort = selectedYear.toString().slice(-2)

          return (
            <Card
              key={groupKey}
              title={userName}
              style={{ marginBottom: 16 }}
            >
              {kCalRow && (
                <Form.Item
                  label={
                    <span>
                      <FireOutlined style={{ marginRight: 4, color: '#ff4d4f' }} />
                      kCal ('{yearShort})
                    </span>
                  }
                  name={`${kCalRow.key}_kCal`}
                  rules={[
                    { required: true, message: 'Inserisci il valore kCal' },
                    { validator: validateKCal(counterIdKCal) },
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    precision={1}
                    controls={false}
                    placeholder={`Min: ${minKCal.toFixed(1)}`}
                  />
                </Form.Item>
              )}

              {m3Row && (
                <Form.Item
                  label={
                    <span>
                      <DropboxOutlined style={{ marginRight: 4, color: '#1890ff' }} />
                      M³ ('{yearShort})
                    </span>
                  }
                  name={`${m3Row.key}_m3`}
                  rules={[
                    { required: true, message: 'Inserisci il valore M³' },
                    { validator: validateM3(counterIdM3) },
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    precision={0}
                    controls={false}
                    placeholder={`Min: ${minM3}`}
                  />
                </Form.Item>
              )}
            </Card>
          )
        })}
      </Form>
    </Drawer>
  )
}

export default UpdateReadingsDrawer
