import { Card, Typography } from 'antd'

const { Title, Text } = Typography

const StatisticaPage = () => {
  return (
    <div className="p-4 md:p-6">
      <Title level={2} className="mb-4 md:mb-6" style={{ fontSize: '24px' }}>Statistica</Title>
      <Card>
        <Text>Statistics page - Coming soon...</Text>
      </Card>
    </div>
  )
}

export default StatisticaPage

