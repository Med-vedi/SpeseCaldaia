import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { ConfigProvider, App as AntdApp } from 'antd'
import { Provider } from 'react-redux'
import { store } from './store/store'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ReadingsProvider } from './contexts/ReadingsContext'
import LoginPage from './pages/LoginPage'
import MainPage from './pages/MainPage'

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true })
    }
  }, [user, loading, navigate])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}

// Public Route component - TEMPORARILY BYPASSED
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  // Temporarily bypass authentication check
  return <>{children}</>
}

function AppContent() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/main/*"
            element={
              <ProtectedRoute>
                <MainPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

function App() {
  return (
    <Provider store={store}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 6,
          },
        }}
      >
        <AntdApp>
          <AuthProvider>
            <ReadingsProvider>
              <AppContent />
            </ReadingsProvider>
          </AuthProvider>
        </AntdApp>
      </ConfigProvider>
    </Provider>
  )
}

export default App
