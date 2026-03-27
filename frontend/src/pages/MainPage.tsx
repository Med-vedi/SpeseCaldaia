import { useState, useEffect } from 'react'
import { Layout, Menu, Button, Avatar, Dropdown, Typography, Drawer } from 'antd'
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
  HomeOutlined,
  BankOutlined,
  QrcodeOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom'
import DashboardPage from './DashboardPage'
import ContattoriPage from './ContattoriPage'
import SpesePage from './SpesePage'
import CalcoloPage from './CalcoloPage'
import BonificoPage from './BonificoPage'
import PrezziPage from './PrezziPage'
import StatisticaPage from './StatisticaPage'
import ProfilePage from './ProfilePage'
import BollettePage from './BollettePage'
import PrintReportPage from './PrintReportPage'

const { Header, Sider, Content } = Layout
const { Title, Text } = Typography

function formatDisplayName(value?: string | null) {
  if (!value) return 'User'
  return value
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

const MainPage = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth >= 768) {
        setMobileDrawerOpen(false)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
      key: '/main/bollette',
      icon: <FileTextOutlined />,
      label: 'Bollette',
    },
    {
      key: '/main/prezzi',
      icon: <EuroOutlined />,
      label: 'Prezzi',
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
      key: '/main/bonifico',
      icon: <BankOutlined />,
      label: 'Bonifico',
    },
    {
      key: '/main/statistica',
      icon: <BarChartOutlined />,
      label: 'Statistica',
    },
    {
      key: '/main/profile',
      icon: <QrcodeOutlined />,
      label: 'Profilo & QR',
    },
  ]

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Profile',
      icon: <UserOutlined />,
      onClick: () => navigate('/main/profile'),
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
    if (isMobile) {
      setMobileDrawerOpen(false)
    }
  }

  const welcomeName = formatDisplayName(profile?.username || user?.email?.split('@')[0])

  const menuContent = (
    <>
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
          {collapsed && !isMobile ? 'SC' : 'Spese Caldaia'}
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
      {!isMobile && (
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'flex-end',
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
      )}
    </>
  )

  return (
    <Layout style={{ minHeight: '100vh', height: '100vh', overflow: 'hidden' }}>
      {!isMobile && (
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
          {menuContent}
        </Sider>
      )}

      {isMobile && (
        <Drawer
          title="Spese Caldaia"
          placement="left"
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
          bodyStyle={{ padding: 0 }}
          width={280}
          style={{ zIndex: 1001 }}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: '#001529'
          }}>
            {menuContent}
          </div>
        </Drawer>
      )}
      <Layout style={{ height: '100vh', overflow: 'hidden' }}>
        <Header
          style={{
            background: '#001529',
            padding: isMobile ? '0 16px' : '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: '64px',
            lineHeight: '64px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {isMobile && (
              <Button
                type="text"
                icon={<MenuUnfoldOutlined />}
                onClick={() => setMobileDrawerOpen(true)}
                style={{
                  color: '#fff',
                  fontSize: '18px',
                  padding: '4px 8px',
                }}
              />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px' }}>
            {!isMobile && (
              <Text style={{ color: '#fff' }}>
                Welcome, {welcomeName}
              </Text>
            )}
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <Avatar
                size={isMobile ? 'default' : 'large'}
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
            <Route path="/print" element={<PrintReportPage />} />
            <Route path="/bollette" element={<BollettePage />} />
            <Route path="/contattori" element={<ContattoriPage />} />
            <Route path="/spese" element={<SpesePage />} />
            <Route path="/calcolo" element={<CalcoloPage />} />
            <Route path="/bonifico" element={<BonificoPage />} />
            <Route path="/prezzi" element={<PrezziPage />} />
            <Route path="/statistica" element={<StatisticaPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainPage
