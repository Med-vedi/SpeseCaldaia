import { useEffect, useCallback, useState } from 'react'
import { Drawer, Button, Form, Space, Card, InputNumber, App } from 'antd'
import { FireOutlined, DropboxOutlined } from '@ant-design/icons'
import type { KCalRow, M3Row } from '../contexts/ReadingsContext'

interface UpdateReadingsDrawerProps {
  open: boolean
  onClose: () => void
  kCalData: KCalRow[]
  m3Data: M3Row[]
  onUpdate: (values: Record<string, number>) => void
}

const UpdateReadingsDrawer = ({
  open,
  onClose,
  kCalData,
  m3Data,
  onUpdate,
}: UpdateReadingsDrawerProps) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [drawerWidth, setDrawerWidth] = useState(480)

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
    const users = ['vladi', 'dino', 'cristian']

    users.forEach(userKey => {
      const kCalRow = kCalData.find(r => r.key === userKey)
      const m3Row = m3Data.find(r => r.key === userKey)

      initialValues[`${userKey}_kCal`] = kCalRow?.kCalAtt || 0
      initialValues[`${userKey}_m3`] = m3Row?.m3Att || 0
    })

    form.setFieldsValue(initialValues)
  }, [kCalData, m3Data, form])

  useEffect(() => {
    if (!open) {
      form.resetFields()
      return
    }
    setInitialValues()
  }, [open, setInitialValues, form])

  const getMinKCal = (userKey: string): number => {
    const row = kCalData.find(r => r.key === userKey)
    return row?.kCalPrec || 0
  }

  const getMinM3 = (userKey: string): number => {
    const row = m3Data.find(r => r.key === userKey)
    return row?.m3Prec || 0
  }

  const validateKCal = (userKey: string) => (_: unknown, value: number) => {
    const minValue = getMinKCal(userKey)
    const isValid = value >= minValue
    return isValid
      ? Promise.resolve()
      : Promise.reject(new Error(`Il valore deve essere maggiore o uguale a ${minValue.toFixed(1)}`))
  }

  const validateM3 = (userKey: string) => (_: unknown, value: number) => {
    const minValue = getMinM3(userKey)
    const isValid = value >= minValue
    return isValid
      ? Promise.resolve()
      : Promise.reject(new Error(`Il valore deve essere maggiore o uguale a ${minValue}`))
  }

  const handleSubmit = () => {
    form.validateFields().then(values => {
      onUpdate(values)
      message.success('Valori aggiornati con successo!')
      onClose()
    })
  }

  const renderUserForm = (userKey: string) => {
    const userRow = kCalData.find(r => r.key === userKey)
    const userName = userRow?.name || userKey
    const minKCal = getMinKCal(userKey)
    const minM3 = getMinM3(userKey)

    return (
      <Card
        key={userKey}
        title={userName}
        style={{ marginBottom: 16 }}
      >
        <Form.Item
          label={
            <span>
              <FireOutlined style={{ marginRight: 4, color: '#ff4d4f' }} />
              kCal ('25)
            </span>
          }
          name={`${userKey}_kCal`}
          rules={[
            { required: true, message: 'Inserisci il valore kCal' },
            { validator: validateKCal(userKey) },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            precision={1}
            controls={false}
            placeholder={`Min: ${minKCal.toFixed(1)}`}
          />
        </Form.Item>

        <Form.Item
          label={
            <span>
              <DropboxOutlined style={{ marginRight: 4, color: '#1890ff' }} />
              M³ ('25)
            </span>
          }
          name={`${userKey}_m3`}
          rules={[
            { required: true, message: 'Inserisci il valore M³' },
            { validator: validateM3(userKey) },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            precision={0}
            controls={false}
            placeholder={`Min: ${minM3}`}
          />
        </Form.Item>
      </Card>
    )
  }

  return (
    <Drawer
      title="Aggiorna Letture Mensili"
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
        {['vladi', 'dino', 'cristian'].map(renderUserForm)}
      </Form>
    </Drawer>
  )
}

export default UpdateReadingsDrawer
