import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { authStorage } from '../services/apiClient'
import { authApi, type LoginResult } from '../services/authApi'
import { useUIPreferenceStore } from '../stores'

export const useAuth = () => {
  const { user, token, setUser, setToken, setShowLoginModal, setLoggingIn } = useUIPreferenceStore()
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [qrState, setQrState] = useState<string | null>(null)
  const [pollingStatus, setPollingStatus] = useState<'idle' | 'polling' | 'success' | 'failed'>(
    'idle',
  )
  const [pollingMessage, setPollingMessage] = useState('')
  const queryClient = useQueryClient()

  const checkLoginStatus = async () => {
    if (!token) return
    try {
      const userData = await authApi.getUserInfo()
      setUser(userData)
      authStorage.setUser(userData)
    } catch {
      setToken(null)
      setUser(null)
      authStorage.setToken(null)
      authStorage.setUser(null)
    }
  }

  useEffect(() => {
    const savedToken = localStorage.getItem('youju_token')
    const savedUser = authStorage.getUser()
    if (savedToken) {
      setToken(savedToken)
    }
    if (savedUser) {
      setUser(savedUser)
    }
  }, [setToken, setUser])

  useEffect(() => {
    if (token) {
      checkLoginStatus()
    }
  }, [token, checkLoginStatus])

  useEffect(() => {
    if (!token) return

    const checkExpiration = () => {
      const currentToken = localStorage.getItem('youju_token')
      if (!currentToken) return

      try {
        const base64Url = currentToken.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const payload = JSON.parse(atob(base64))
        const exp = payload.exp * 1000
        const timeUntilExpiry = exp - Date.now()

        if (timeUntilExpiry > 0 && timeUntilExpiry < 5 * 60 * 1000) {
          const refreshToken = authStorage.getRefreshToken()
          if (refreshToken) {
            authApi
              .refreshToken(refreshToken)
              .then((result) => {
                setToken(result.token)
                setUser(result.user)
              })
              .catch(() => {})
          }
        }
      } catch {}
    }

    const interval = setInterval(checkExpiration, 60 * 1000)
    return () => clearInterval(interval)
  }, [token, setToken, setUser])

  const handleLoginSuccess = useCallback(
    (data: LoginResult) => {
      const { token: newToken, user: userData, refreshToken } = data
      setToken(newToken)
      setUser(userData)
      authStorage.setToken(newToken)
      authStorage.setRefreshToken(refreshToken)
      authStorage.setUser(userData)
      setShowLoginModal(false)
      setPollingStatus('success')
      queryClient.invalidateQueries()
    },
    [setToken, setUser, setShowLoginModal, queryClient],
  )

  const wechatLoginMutation = useMutation({
    mutationFn: (code: string) => authApi.wechatLogin(code),
    onMutate: () => {
      setLoggingIn(true)
    },
    onSuccess: handleLoginSuccess,
    onSettled: () => {
      setLoggingIn(false)
    },
  })

  const emailLoginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.emailLogin(email, password),
    onMutate: () => {
      setLoggingIn(true)
    },
    onSuccess: handleLoginSuccess,
    onSettled: () => {
      setLoggingIn(false)
    },
  })

  const registerMutation = useMutation({
    mutationFn: ({
      email,
      password,
      nickname,
    }: {
      email: string
      password: string
      nickname: string
    }) => authApi.register(email, password, nickname),
    onMutate: () => {
      setLoggingIn(true)
    },
    onSuccess: handleLoginSuccess,
    onSettled: () => {
      setLoggingIn(false)
    },
  })

  const handleWechatLogin = async () => {
    const mockCode = `mock_${Date.now()}`
    wechatLoginMutation.mutate(mockCode)
  }

  const handleEmailLogin = async (email: string, password: string) => {
    emailLoginMutation.mutate({ email, password })
  }

  const handleRegister = async (email: string, password: string, nickname: string) => {
    registerMutation.mutate({ email, password, nickname })
  }

  const fetchWechatQrCode = async () => {
    try {
      const result = await authApi.wechatQrCode()
      setQrCodeUrl(result.qrCodeUrl)
      setQrState(result.state)
      setPollingStatus('idle')
    } catch (error: any) {
      console.error('获取二维码失败:', error)
    }
  }

  const startWechatPolling = async () => {
    if (!qrState) return

    setPollingStatus('polling')
    setPollingMessage('请使用微信扫码登录')

    const poll = async () => {
      try {
        const result = await authApi.wechatLoginPoll(qrState)

        switch (result.status) {
          case 'pending':
            setPollingMessage('等待扫码...')
            setTimeout(poll, 2000)
            break
          case 'success':
            if (result.data) {
              handleLoginSuccess(result.data)
              setPollingMessage('登录成功')
            }
            break
          case 'failed':
            setPollingStatus('failed')
            setPollingMessage('登录失败，请重试')
            break
        }
      } catch {
        setPollingStatus('failed')
        setPollingMessage('连接失败，请重试')
      }
    }

    poll()
  }

  const stopWechatPolling = () => {
    setPollingStatus('idle')
    setQrCodeUrl(null)
    setQrState(null)
    setPollingMessage('')
  }

  const handleLogout = () => {
    setToken(null)
    setUser(null)
    authStorage.setToken(null)
    authStorage.setRefreshToken(null)
    authStorage.setUser(null)
    queryClient.clear()
  }

  return {
    user,
    token,
    isLoggedIn: !!token,
    login: handleWechatLogin,
    logout: handleLogout,
    loggingIn:
      wechatLoginMutation.isPending || emailLoginMutation.isPending || registerMutation.isPending,
    emailLogin: handleEmailLogin,
    register: handleRegister,
    fetchWechatQrCode,
    startWechatPolling,
    stopWechatPolling,
    qrCodeUrl,
    qrState,
    pollingStatus,
    pollingMessage,
    emailLoginError: emailLoginMutation.error,
    registerError: registerMutation.error,
  }
}
