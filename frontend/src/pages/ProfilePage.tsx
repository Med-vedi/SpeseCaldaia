import { useEffect } from 'react'
import { Card, Form, Input, Button, Typography, Space, App, Spin, Row, Col, Divider, Alert } from 'antd'
import { CopyOutlined, ReloadOutlined, SaveOutlined, QrcodeOutlined, UserOutlined } from '@ant-design/icons'
import {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
  useRegenerateMyQrMutation,
} from '../store/api/usersApi'

const { Title, Text, Link } = Typography

interface ProfileFormValues {
  username: string
  email: string
  password?: string
}

const ProfilePage = () => {
  const { message } = App.useApp()
  const [form] = Form.useForm<ProfileFormValues>()
  const { data, isLoading, isError, error, refetch } = useGetMyProfileQuery()
  const [updateMyProfile, { isLoading: isUpdating }] = useUpdateMyProfileMutation()
  const [regenerateMyQr, { isLoading: isRegenerating }] = useRegenerateMyQrMutation()

  useEffect(() => {
    if (!data?.profile) return
    form.setFieldsValue({
      username: data.profile.username || '',
      email: data.profile.email || '',
      password: '',
    })
  }, [data, form])

  const handleSave = async (values: ProfileFormValues) => {
    try {
      await updateMyProfile({
        username: values.username,
        email: values.email,
        ...(values.password ? { password: values.password } : {}),
      }).unwrap()
      message.success('Profile updated successfully')
      form.setFieldValue('password', '')
    } catch (error) {
      let errorMessage = 'Failed to update profile'
      if (error && typeof error === 'object' && 'data' in error) {
        const errorData = error.data as { error?: string }
        errorMessage = errorData?.error || errorMessage
      }
      message.error(errorMessage)
    }
  }

  const handleRegenerateQr = async () => {
    try {
      await regenerateMyQr().unwrap()
      await refetch()
      message.success('QR code regenerated. Old QR is now invalid.')
    } catch (error) {
      let errorMessage = 'Failed to regenerate QR code'
      if (error && typeof error === 'object' && 'data' in error) {
        const errorData = error.data as { error?: string }
        errorMessage = errorData?.error || errorMessage
      }
      message.error(errorMessage)
    }
  }

  const copyQrLink = async () => {
    if (!data?.qr?.loginUrl) return
    try {
      await navigator.clipboard.writeText(data.qr.loginUrl)
      message.success('Login link copied')
    } catch {
      message.error('Could not copy link')
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <Spin />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Title level={3} style={{ margin: 0 }}>Profile Settings</Title>
        <Text type="secondary">Update your account details and manage your QR quick access.</Text>
        {isError ? (
          <Alert
            type="error"
            showIcon
            message="Could not load profile data"
            description={
              (error as { data?: { error?: string } })?.data?.error ||
              'Please try again or check backend configuration.'
            }
          />
        ) : null}

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card title={<Space><UserOutlined /> Account Information</Space>}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
          >
            <Form.Item
              label="Name"
              name="username"
              rules={[{ required: true, message: 'Please enter your name' }]}
            >
              <Input placeholder="Your name" />
            </Form.Item>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input placeholder="name@example.com" />
            </Form.Item>
            <Form.Item
              label="Password"
              name="password"
              tooltip="Leave empty to keep current password"
              rules={[
                {
                  min: 6,
                  message: 'Password must be at least 6 characters',
                },
              ]}
            >
              <Input.Password placeholder="New password (optional)" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={isUpdating} icon={<SaveOutlined />}>
              Save profile
            </Button>
          </Form>
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card title={<Space><QrcodeOutlined /> QR Auto Login</Space>}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Text type="secondary">
                  Share this QR code with your phone to login quickly. It remains the same until you regenerate it.
                </Text>
                {data?.qr?.qrImageUrl ? (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <img
                      src={data.qr.qrImageUrl}
                      alt="QR login code"
                      style={{
                        width: 240,
                        height: 240,
                        objectFit: 'contain',
                        border: '1px solid #f0f0f0',
                        borderRadius: 12,
                        padding: 8,
                        background: '#fff',
                      }}
                    />
                  </div>
                ) : null}

                <Divider style={{ margin: '8px 0' }} />

                {data?.qr?.loginUrl ? (
                  <>
                    <Input value={data.qr.loginUrl} readOnly />
                    <Space wrap>
                      <Button icon={<CopyOutlined />} onClick={copyQrLink}>
                        Copy link
                      </Button>
                      <Link href={data.qr.loginUrl} target="_blank">
                        Test login URL
                      </Link>
                    </Space>
                  </>
                ) : null}

                <Button
                  onClick={handleRegenerateQr}
                  loading={isRegenerating}
                  icon={<ReloadOutlined />}
                >
                  Regenerate QR code
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  )
}

export default ProfilePage

