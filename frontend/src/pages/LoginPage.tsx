import { useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { Form, Input, Button, Card, Typography, App, Alert } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useLoginMutation, useQrLoginMutation } from '../store/api/authApi'
import { useAuth } from '../contexts/AuthContext'

const { Title } = Typography

interface LoginForm {
  username: string
  password: string
}

const capitalizeName = (value: string) =>
  value
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')

const LoginPage = () => {
  const [form] = Form.useForm<LoginForm>()
  const [login, { isLoading }] = useLoginMutation()
  const [qrLogin] = useQrLoginMutation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { message } = App.useApp()
  const { user, loading } = useAuth()
  const qrLoginHandledRef = useRef(false)
  const [qrDebugStatus, setQrDebugStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle')
  const [qrDebugError, setQrDebugError] = useState('')
  const prefilledUsername = searchParams.get('u') || searchParams.get('username') || ''
  const welcomeName = prefilledUsername ? capitalizeName(prefilledUsername) : ''
  const qrToken = searchParams.get('qr') || ''
  const runtimeApiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

  // Redirect to main if already authenticated
  useEffect(() => {
    // Check if user is authenticated (either from context or localStorage)
    const token = localStorage.getItem('auth_token')
    const storedUser = localStorage.getItem('user')

    // If we have a token and user data, redirect
    if (token && (user || storedUser)) {
      navigate('/main', { replace: true })
    }
  }, [user, loading, navigate])

  useEffect(() => {
    if (prefilledUsername) {
      form.setFieldValue('username', prefilledUsername)
    }
  }, [prefilledUsername, form])

  useEffect(() => {
    if (!qrToken || qrLoginHandledRef.current) {
      return
    }

    qrLoginHandledRef.current = true
    setQrDebugStatus('running')
    setQrDebugError('')

    const runQrLogin = async () => {
      try {
        await qrLogin({ token: qrToken }).unwrap()
        setQrDebugStatus('success')
        message.success('QR login successful!')
        navigate('/main', { replace: true })
      } catch (error) {
        setQrDebugStatus('error')
        let errorMessage = 'QR login failed'
        if (error && typeof error === 'object' && 'data' in error) {
          const errorData = error.data as { error?: string }
          errorMessage = errorData?.error || errorMessage
        }
        setQrDebugError(errorMessage)
        message.error(errorMessage)
      }
    }

    runQrLogin()
  }, [qrToken, qrLogin, navigate, message])

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div>Loading...</div>
      </div>
    )
  }

  // Check if already authenticated (show nothing while redirecting)
  const token = localStorage.getItem('auth_token')
  const storedUser = localStorage.getItem('user')
  if (token && (user || storedUser)) {
    return null
  }

  const onFinish = async (values: LoginForm) => {
    try {
      const result = await login({
        username: values.username,
        password: values.password,
      }).unwrap()

      if (result) {
        message.success('Login successful!')
        // Navigate immediately after successful login
        // The token and user are already stored in localStorage by authApi
        navigate('/main', { replace: true })
      }
    } catch (error) {
      let errorMessage = 'Invalid username or password'

      if (error && typeof error === 'object' && 'data' in error) {
        const errorData = error.data as { error?: string }
        errorMessage = errorData?.error || errorMessage
      } else if (error && typeof error === 'object' && 'status' in error) {
        const rtkError = error as { status?: number; data?: { error?: string } }
        errorMessage = rtkError.data?.error || errorMessage
      }

      message.error(errorMessage)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
      <Card
        className="w-full max-w-md shadow-lg"
        variant="borderless"
      >
        <div className="text-center mb-8">
          <Title level={2} className="text-gray-800 mb-2">
            {welcomeName ? `Welcome Back, ${welcomeName}` : 'Welcome Back'}
          </Title>
          <p className="text-gray-600">
            Sign in with your username and password
          </p>
        </div>

        {qrToken ? (
          <Alert
            className="mb-4"
            type={qrDebugStatus === 'error' ? 'error' : qrDebugStatus === 'success' ? 'success' : 'info'}
            showIcon
            message="QR Debug"
            description={
              <div>
                <div><strong>QR detected:</strong> yes</div>
                <div><strong>API base:</strong> {runtimeApiBase}</div>
                <div><strong>Status:</strong> {qrDebugStatus}</div>
                {qrDebugError ? <div><strong>Error:</strong> {qrDebugError}</div> : null}
              </div>
            }
          />
        ) : null}

        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
          initialValues={{ username: prefilledUsername }}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please input your username!' }]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              placeholder="Username (or email)"
              className="rounded-lg"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="Password"
              className="rounded-lg"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              block
              className="h-12 rounded-lg font-medium"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default LoginPage
