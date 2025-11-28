import { Card, Typography } from 'antd'
import { ContactsOutlined, DollarOutlined, CalculatorOutlined, BarChartOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

const DashboardPage = () => {
  return (
    <div className="p-6">
      <Title level={2} className="mb-6">Dashboard</Title>
      <Card>
        <Title level={3} className="text-center mb-4">🎉 Welcome to Spese Caldaia!</Title>
        <Text className="text-lg text-gray-600 block mb-4 text-center">
          Manage your boiler expenses efficiently
        </Text>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <Card className="text-center">
            <ContactsOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <Title level={4} className="mt-2">Contattori</Title>
            <Text>Manage contractors</Text>
          </Card>
          <Card className="text-center">
            <DollarOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
            <Title level={4} className="mt-2">Spese</Title>
            <Text>Track expenses</Text>
          </Card>
          <Card className="text-center">
            <CalculatorOutlined style={{ fontSize: '24px', color: '#fa8c16' }} />
            <Title level={4} className="mt-2">Calcolo</Title>
            <Text>Calculate costs</Text>
          </Card>
          <Card className="text-center">
            <BarChartOutlined style={{ fontSize: '24px', color: '#722ed1' }} />
            <Title level={4} className="mt-2">Statistiche</Title>
            <Text>View statistics</Text>
          </Card>
        </div>
      </Card>
    </div>
  )
}

export default DashboardPage

