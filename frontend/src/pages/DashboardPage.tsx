import { Card, Typography } from 'antd'
import { ContactsOutlined, DollarOutlined, CalculatorOutlined, BarChartOutlined, PrinterOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const { Title, Text } = Typography

const formatDisplayName = (value?: string | null) => {
  if (!value) return 'Utente'
  return value
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

const DashboardPage = () => {
  const navigate = useNavigate()
  const { profile, user } = useAuth()

  const cardConfigs = [
    {
      icon: <ContactsOutlined style={{ fontSize: '24px', color: '#1890ff' }} />,
      title: 'Contattori',
      description: 'Gestisci le letture dei contatori',
      path: '/main/contattori',
    },
    {
      icon: <DollarOutlined style={{ fontSize: '24px', color: '#52c41a' }} />,
      title: 'Spese',
      description: 'Visualizza e aggiorna le spese',
      path: '/main/spese',
    },
    {
      icon: <CalculatorOutlined style={{ fontSize: '24px', color: '#fa8c16' }} />,
      title: 'Calcolo',
      description: 'Calcola i costi annuali',
      path: '/main/calcolo',
    },
    {
      icon: <BarChartOutlined style={{ fontSize: '24px', color: '#722ed1' }} />,
      title: 'Statistiche',
      description: 'Consulta statistiche e andamento',
      path: '/main/statistica',
    },
    {
      icon: <PrinterOutlined style={{ fontSize: '24px', color: '#eb2f96' }} />,
      title: 'Stampa Report',
      description: 'Stampa il report completo',
      path: '/main/print',
    },
  ]

  const handleCardClick = (path: string) => {
    navigate(path)
  }

  const userName = formatDisplayName(profile?.username || user?.email?.split('@')[0])

  return (
    <div className="p-4 md:p-6">
      <Title level={2} className="mb-4 md:mb-6" style={{ fontSize: '24px' }}>Dashboard</Title>
      <Card>
        <Title level={3} className="text-center mb-4">🎉 Benvenuto, {userName}!</Title>
        <Text className="text-lg text-gray-600 block mb-4 text-center">
          Gestisci in modo semplice le spese della caldaia
        </Text>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-8">
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

