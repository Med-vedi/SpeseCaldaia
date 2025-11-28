import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, App as AntdApp } from 'antd'
import { AuthProvider } from './hooks/useAuth'
import { ReadingsProvider } from './contexts/ReadingsContext'
import LoginPage from './pages/LoginPage'
import MainPage from './pages/MainPage'

// Protected Route component - TEMPORARILY BYPASSED
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // Temporarily bypass authentication check
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
  )
}

export default App
