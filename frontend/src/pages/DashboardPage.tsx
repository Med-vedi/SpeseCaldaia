import { Card, Typography } from 'antd'
import { ContactsOutlined, DollarOutlined, CalculatorOutlined, BarChartOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

const { Title, Text } = Typography

const DashboardPage = () => {
  const navigate = useNavigate()

  const cardConfigs = [
    {
      icon: <ContactsOutlined style={{ fontSize: '24px', color: '#1890ff' }} />,
      title: 'Contattori',
      description: 'Manage contractors',
      path: '/main/contattori',
    },
    {
      icon: <DollarOutlined style={{ fontSize: '24px', color: '#52c41a' }} />,
      title: 'Spese',
      description: 'Track expenses',
      path: '/main/spese',
    },
    {
      icon: <CalculatorOutlined style={{ fontSize: '24px', color: '#fa8c16' }} />,
      title: 'Calcolo',
      description: 'Calculate costs',
      path: '/main/calcolo',
    },
    {
      icon: <BarChartOutlined style={{ fontSize: '24px', color: '#722ed1' }} />,
      title: 'Statistiche',
      description: 'View statistics',
      path: '/main/statistica',
    },
  ]

  const handleCardClick = (path: string) => {
    navigate(path)
  }

  return (
    <div className="p-4 md:p-6">
      <Title level={2} className="mb-4 md:mb-6" style={{ fontSize: '24px' }}>Dashboard</Title>
      <Card>
        <Title level={3} className="text-center mb-4">🎉 Welcome to Spese Caldaia!</Title>
        <Text className="text-lg text-gray-600 block mb-4 text-center">
          Manage your boiler expenses efficiently
        </Text>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {cardConfigs.map((config) => (
            <Card
              key={config.path}
              className="text-center cursor-pointer transition-all hover:shadow-lg hover:scale-105"
              onClick={() => handleCardClick(config.path)}
              style={{
                cursor: 'pointer',
              }}
            >
              {config.icon}
              <Title level={4} className="mt-2">{config.title}</Title>
              <Text>{config.description}</Text>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default DashboardPage

