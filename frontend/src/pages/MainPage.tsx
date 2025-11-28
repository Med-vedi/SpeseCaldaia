import { useState } from 'react'
import { Layout, Menu, Button, Avatar, Dropdown, Typography } from 'antd'
import {
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ContactsOutlined,
  DollarOutlined,
  CalculatorOutlined,
  EuroOutlined,
  BarChartOutlined,
  HomeOutlined
} from '@ant-design/icons'
import { useAuth } from '../hooks/useAuth'
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom'
import DashboardPage from './DashboardPage'
import ContattoriPage from './ContattoriPage'
import SpesePage from './SpesePage'
import CalcoloPage from './CalcoloPage'
import PrezziPage from './PrezziPage'
import StatisticaPage from './StatisticaPage'

const { Header, Sider, Content } = Layout
const { Title, Text } = Typography

const MainPage = () => {
  const [collapsed, setCollapsed] = useState(false)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const menuItems = [
    {
      key: '/main',
      icon: <HomeOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/main/contattori',
      icon: <ContactsOutlined />,
      label: 'Contattori',
    },
    {
      key: '/main/spese',
      icon: <DollarOutlined />,
      label: 'Spese',
    },
    {
      key: '/main/calcolo',
      icon: <CalculatorOutlined />,
      label: 'Calcolo',
    },
    {
      key: '/main/prezzi',
      icon: <EuroOutlined />,
      label: 'Prezzi',
    },
    {
      key: '/main/statistica',
      icon: <BarChartOutlined />,
      label: 'Statistica',
    },
  ]

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Profile',
      icon: <UserOutlined />,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      label: 'Sign Out',
      icon: <LogoutOutlined />,
      onClick: handleSignOut,
    },
  ]

  const handleMenuClick = (key: string) => {
    navigate(key)
  }

  return (
    <Layout style={{ minHeight: '100vh', height: '100vh', overflow: 'hidden' }}>
      <Sider
        collapsed={collapsed}
        theme="dark"
        width={240}
        style={{
          background: '#001529',
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <Title level={4} className="text-white m-0" style={{ color: '#fff' }}>
            {collapsed ? 'SC' : 'Spese Caldaia'}
          </Title>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <Menu
            mode="inline"
            theme="dark"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => handleMenuClick(key)}
            style={{
              background: '#001529',
              borderRight: 0,
              height: '100%',
            }}
          />
        </div>
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'center',
            height: '64px',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              color: '#fff',
              fontSize: '16px',
            }}
          />
        </div>
      </Sider>

      <Layout style={{ height: '100vh', overflow: 'hidden' }}>
        <Header
          style={{
            background: '#001529',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: '64px',
            lineHeight: '64px',
          }}
        >
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            Spese Caldaia
          </Title>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Text style={{ color: '#fff' }}>
              Welcome, {user?.email ? user.email.split('@')[0] : 'User'}
            </Text>
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <Avatar
                size="large"
                icon={<UserOutlined />}
                className="cursor-pointer"
                style={{ backgroundColor: '#1890ff' }}
              />
            </Dropdown>
          </div>
        </Header>

        <Content
          style={{
            background: '#f0f2f5',
            height: 'calc(100vh - 64px)',
            overflowY: 'auto',
          }}
        >
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/contattori" element={<ContattoriPage />} />
            <Route path="/spese" element={<SpesePage />} />
            <Route path="/calcolo" element={<CalcoloPage />} />
            <Route path="/prezzi" element={<PrezziPage />} />
            <Route path="/statistica" element={<StatisticaPage />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainPage
