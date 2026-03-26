import { useEffect, useState } from 'react'
import { Card, Form, Input, Button, Typography, Space, App, Spin, Row, Col, Divider, Alert, Collapse, Modal } from 'antd'
import { CopyOutlined, ReloadOutlined, SaveOutlined, QrcodeOutlined, UserOutlined, LockOutlined } from '@ant-design/icons'
import {
  useGetMyProfileQuery,
  useGetOrganizationQrCodesQuery,
  useUpdateMyProfileMutation,
  useRegenerateMyQrMutation,
  useForceUpdateUserPasswordMutation,
  type OrganizationQrUser,
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
  const [forcePasswordForm] = Form.useForm<{ password: string; confirmPassword: string }>()
  const { data, isLoading, isError, error, refetch } = useGetMyProfileQuery()
  const { data: orgQrData, isLoading: isOrgQrLoading } = useGetOrganizationQrCodesQuery()
  const [updateMyProfile, { isLoading: isUpdating }] = useUpdateMyProfileMutation()
  const [regenerateMyQr, { isLoading: isRegenerating }] = useRegenerateMyQrMutation()
  const [forceUpdateUserPassword, { isLoading: isForceUpdatingPassword }] = useForceUpdateUserPasswordMutation()
  const [forcePasswordOpen, setForcePasswordOpen] = useState(false)
  const [targetUserForForcePassword, setTargetUserForForcePassword] = useState<OrganizationQrUser | null>(null)
  const isAdmin = data?.profile?.role === 'admin'

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

  const copyQrLinkForUser = async (loginUrl: string) => {
    try {
      await navigator.clipboard.writeText(loginUrl)
      message.success('Login link copied')
    } catch {
      message.error('Could not copy link')
    }
  }

  const openForcePasswordModal = (orgUser: OrganizationQrUser) => {
    setTargetUserForForcePassword(orgUser)
    forcePasswordForm.resetFields()
    setForcePasswordOpen(true)
  }

  const closeForcePasswordModal = () => {
    setForcePasswordOpen(false)
    setTargetUserForForcePassword(null)
    forcePasswordForm.resetFields()
  }

  const handleForcePasswordSubmit = async () => {
    if (!targetUserForForcePassword) return
    try {
      const values = await forcePasswordForm.validateFields()
      await forceUpdateUserPassword({
        id: targetUserForForcePassword.id,
        password: values.password,
      }).unwrap()
      message.success(`Password updated for ${targetUserForForcePassword.username}`)
      closeForcePasswordModal()
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
      let errorMessage = 'Failed to update user password'
      if (error && typeof error === 'object' && 'data' in error) {
        const errorData = error.data as { error?: string }
        errorMessage = errorData?.error || errorMessage
      }
      message.error(errorMessage)
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
            <Card className="mobile-card-title-compact" title={<Space><UserOutlined /> Account Information</Space>}>
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
            <Card className="mobile-card-title-compact" title={<Space><QrcodeOutlined /> QR Auto Login</Space>}>
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

        <Card>
          <Collapse
            defaultActiveKey={[]}
            items={[
              {
                key: 'other-users-qr',
                label: 'Other Users QR Codes',
                children: (
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Text type="secondary">
                      QR codes for users in your organization. Section is collapsed by default.
                    </Text>
                    {isOrgQrLoading ? (
                      <Spin />
                    ) : (
                      <Row gutter={[12, 12]}>
                        {(orgQrData?.users || [])
                          .filter((item) => !item.isCurrentUser)
                          .map((orgUser) => (
                            <Col xs={24} md={12} lg={8} key={orgUser.id}>
                              <Card
                                size="small"
                                title={orgUser.username}
                                extra={<Text type="secondary">{orgUser.role}</Text>}
                              >
                                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <img
                                      src={orgUser.qr.qrImageUrl}
                                      alt={`QR for ${orgUser.username}`}
                                      style={{
                                        width: 160,
                                        height: 160,
                                        objectFit: 'contain',
                                        border: '1px solid #f0f0f0',
                                        borderRadius: 8,
                                        background: '#fff',
                                      }}
                                    />
                                  </div>
                                  <Input value={orgUser.qr.loginUrl} readOnly />
                                  <Button
                                    icon={<CopyOutlined />}
                                    onClick={() => copyQrLinkForUser(orgUser.qr.loginUrl)}
                                  >
                                    Copy link
                                  </Button>
                                  {isAdmin && (
                                    <Button
                                      icon={<LockOutlined />}
                                      onClick={() => openForcePasswordModal(orgUser)}
                                    >
                                      Force update password
                                    </Button>
                                  )}
                                </Space>
                              </Card>
                            </Col>
                          ))}
                      </Row>
                    )}
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      </Space>
      <Modal
        title={`Force update password${targetUserForForcePassword ? ` — ${targetUserForForcePassword.username}` : ''}`}
        open={forcePasswordOpen}
        onCancel={closeForcePasswordModal}
        okText="Update password"
        cancelText="Cancel"
        confirmLoading={isForceUpdatingPassword}
        onOk={() => void handleForcePasswordSubmit()}
        afterOpenChange={(open) => {
          // Defensive cleanup for occasional stale mask/scroll-lock states.
          if (!open) {
            document.body.classList.remove('ant-scrolling-effect')
            document.body.style.removeProperty('width')
          }
        }}
        destroyOnHidden
      >
        <Form form={forcePasswordForm} layout="vertical">
          <Form.Item
            label="New password"
            name="password"
            rules={[
              { required: true, message: 'Please enter a password' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
          >
            <Input.Password placeholder="Enter new password" />
          </Form.Item>
          <Form.Item
            label="Confirm password"
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('Passwords do not match'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirm password" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ProfilePage

