import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Card, Typography, App } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../hooks/useAuth'

const { Title } = Typography

interface LoginForm {
  username: string
  password: string
}

const LoginPage = () => {
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const { message } = App.useApp()

  const onFinish = async (values: LoginForm) => {
    setLoading(true)
    try {
      // Check if username is already an email (contains @)
      // If not, treat it as username and append @app.local for backward compatibility
      const email = values.username.includes('@')
        ? values.username
        : `${values.username}@app.local`
      const { error } = await signIn(email, values.password)

      if (error) {
        message.error('Invalid username or password')
      } else {
        message.success('Login successful!')
        navigate('/main')
      }
    } catch (error) {
      message.error('An error occurred during login')
    } finally {
      setLoading(false)
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
            Welcome Back
          </Title>
          <p className="text-gray-600">
            Please sign in to your account
          </p>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please input your email or username!' }]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              placeholder="Email address (e.g., medvedivladislav@gmail.com)"
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
              loading={loading}
              block
              className="h-12 rounded-lg font-medium"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center text-sm text-gray-500 mt-6">
          <p>Enter your email address to sign in</p>
        </div>
      </Card>
    </div>
  )
}

export default LoginPage
