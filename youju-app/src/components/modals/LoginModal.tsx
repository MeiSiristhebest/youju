import { Lock, Mail, MessageCircle, QrCode, RefreshCw, User, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  loggingIn: boolean
  onWechatLogin: () => void
  onEmailLogin: (email: string, password: string) => void
  onRegister: (email: string, password: string, nickname: string) => void
  onFetchQrCode: () => void
  onStartPolling: () => void
  onStopPolling: () => void
  qrCodeUrl: string | null
  pollingStatus: 'idle' | 'polling' | 'success' | 'failed'
  pollingMessage: string
  emailLoginError: string | null
  registerError: string | null
}

type FormMode = 'login' | 'register' | 'wechat-qrcode'

export function LoginModal({
  isOpen,
  onClose,
  loggingIn,
  onWechatLogin,
  onEmailLogin,
  onRegister,
  onFetchQrCode,
  onStartPolling,
  onStopPolling,
  qrCodeUrl,
  pollingStatus,
  pollingMessage,
  emailLoginError,
  registerError,
}: LoginModalProps) {
  const [mode, setMode] = useState<FormMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setMode('login')
      setEmail('')
      setPassword('')
      setNickname('')
      onStopPolling()
    }
  }, [isOpen, onStopPolling])

  useEffect(() => {
    if (mode === 'wechat-qrcode' && !qrCodeUrl) {
      onFetchQrCode()
    }
    if (mode === 'wechat-qrcode' && qrCodeUrl && pollingStatus === 'idle') {
      onStartPolling()
    }
  }, [mode, qrCodeUrl, pollingStatus, onFetchQrCode, onStartPolling])

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email && password) {
      onEmailLogin(email, password)
    }
  }

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email && password && nickname) {
      onRegister(email, password, nickname)
    }
  }

  const handleRetryQrCode = () => {
    onStopPolling()
    onFetchQrCode()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="presentation"
    >
      <div
        className="bg-paper border border-rule rounded-xl p-8 w-[400px] shadow-lg relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
      >
        <button
          type="button"
          className="absolute top-4 right-4 p-1 rounded-md hover:bg-paper-dark text-ink-muted hover:text-ink transition-colors cursor-pointer border-none"
          onClick={onClose}
          aria-label="关闭"
        >
          <X size={18} strokeWidth={1.5} />
        </button>

        <div className="text-center mb-6">
          <div
            className="w-16 h-16 bg-ink rounded-xl mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-paper font-display"
            aria-hidden="true"
          >
            据
          </div>
          <h2
            id="login-modal-title"
            className="text-xl font-semibold text-ink mb-2 font-display tracking-tight"
          >
            {mode === 'register' ? '注册 有据' : '登录 有据'}
          </h2>
          <p className="text-sm text-ink-faint">
            {mode === 'register' ? '注册后可保存任务和云端同步' : '登录后可保存任务和云端同步'}
          </p>
        </div>

        <div
          className="flex gap-1 mb-6 p-1 bg-paper-dark/60 rounded-lg"
          role="tablist"
          aria-label="登录方式"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            aria-controls="panel-login"
            id="tab-login"
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer border-none ${
              mode === 'login' ? 'bg-paper text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
            }`}
            onClick={() => {
              setMode('login')
              onStopPolling()
            }}
          >
            邮箱登录
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            aria-controls="panel-register"
            id="tab-register"
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer border-none ${
              mode === 'register' ? 'bg-paper text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
            }`}
            onClick={() => setMode('register')}
          >
            注册账号
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'wechat-qrcode'}
            aria-controls="panel-wechat-qrcode"
            id="tab-wechat-qrcode"
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer border-none flex items-center justify-center gap-1 ${
              mode === 'wechat-qrcode'
                ? 'bg-paper text-ink shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
            onClick={() => setMode('wechat-qrcode')}
          >
            <QrCode size={12} />
            扫码登录
          </button>
        </div>

        {mode === 'login' && (
          <form
            onSubmit={handleEmailSubmit}
            className="space-y-4"
            role="tabpanel"
            id="panel-login"
            aria-labelledby="tab-login"
          >
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-medium text-ink-muted mb-1.5"
              >
                邮箱
              </label>
              <div className="relative">
                <Mail
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入邮箱"
                  className="w-full pl-9 pr-4 py-2.5 bg-paper-dark/60 border border-rule rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors"
                  disabled={loggingIn}
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-ink-muted mb-1.5"
              >
                密码
              </label>
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full pl-9 pr-10 py-2.5 bg-paper-dark/60 border border-rule rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors"
                  disabled={loggingIn}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink cursor-pointer bg-transparent border-none"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <Lock size={14} strokeWidth={1.5} aria-hidden="true" />
                  ) : (
                    <Lock size={14} strokeWidth={1.5} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {(emailLoginError as any)?.msg && (
              <div className="text-xs text-danger bg-danger-bg/60 px-3 py-2 rounded-lg">
                {(emailLoginError as any).msg}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-ink hover:bg-accent text-paper rounded-lg font-medium text-sm transition-colors duration-200 cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loggingIn || !email || !password}
            >
              {loggingIn ? '登录中…' : '登录'}
            </button>
          </form>
        )}

        {mode === 'register' && (
          <form
            onSubmit={handleRegisterSubmit}
            className="space-y-4"
            role="tabpanel"
            id="panel-register"
            aria-labelledby="tab-register"
          >
            <div>
              <label
                htmlFor="register-nickname"
                className="block text-xs font-medium text-ink-muted mb-1.5"
              >
                昵称
              </label>
              <div className="relative">
                <User
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <input
                  id="register-nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="请输入昵称"
                  className="w-full pl-9 pr-4 py-2.5 bg-paper-dark/60 border border-rule rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors"
                  disabled={loggingIn}
                  autoComplete="nickname"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="block text-xs font-medium text-ink-muted mb-1.5"
              >
                邮箱
              </label>
              <div className="relative">
                <Mail
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入邮箱"
                  className="w-full pl-9 pr-4 py-2.5 bg-paper-dark/60 border border-rule rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors"
                  disabled={loggingIn}
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="block text-xs font-medium text-ink-muted mb-1.5"
              >
                密码
              </label>
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full pl-9 pr-4 py-2.5 bg-paper-dark/60 border border-rule rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors"
                  disabled={loggingIn}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink cursor-pointer bg-transparent border-none"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <Lock size={14} strokeWidth={1.5} aria-hidden="true" />
                  ) : (
                    <Lock size={14} strokeWidth={1.5} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {(registerError as any)?.msg && (
              <div className="text-xs text-danger bg-danger-bg/60 px-3 py-2 rounded-lg">
                {(registerError as any).msg}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-ink hover:bg-accent text-paper rounded-lg font-medium text-sm transition-colors duration-200 cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loggingIn || !email || !password || !nickname}
            >
              {loggingIn ? '注册中…' : '注册'}
            </button>
          </form>
        )}

        {mode === 'wechat-qrcode' && (
          <div
            className="space-y-4"
            role="tabpanel"
            id="panel-wechat-qrcode"
            aria-labelledby="tab-wechat-qrcode"
          >
            <div className="flex flex-col items-center">
              {qrCodeUrl ? (
                <div className="w-48 h-48 bg-paper-dark/60 rounded-xl flex items-center justify-center border border-rule overflow-hidden">
                  <img
                    src={qrCodeUrl}
                    alt="微信扫码登录"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-48 h-48 bg-paper-dark/60 rounded-xl flex items-center justify-center border border-rule">
                  <RefreshCw size={24} className="text-ink-muted animate-spin" strokeWidth={1} />
                </div>
              )}

              <div className="mt-4 text-center">
                <div
                  className={`text-sm font-medium ${
                    pollingStatus === 'success'
                      ? 'text-success'
                      : pollingStatus === 'failed'
                        ? 'text-danger'
                        : 'text-ink'
                  }`}
                >
                  {pollingMessage || '请使用微信扫码登录'}
                </div>
                {pollingStatus === 'polling' && (
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse"></span>
                    <span
                      className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse"
                      style={{ animationDelay: '0.2s' }}
                    ></span>
                    <span
                      className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse"
                      style={{ animationDelay: '0.4s' }}
                    ></span>
                  </div>
                )}
              </div>
            </div>

            {(pollingStatus === 'failed' || !qrCodeUrl) && (
              <button
                type="button"
                className="w-full py-2.5 border border-rule hover:bg-paper-dark/60 text-ink rounded-lg font-medium text-sm transition-colors duration-200 cursor-pointer flex items-center justify-center gap-2"
                onClick={handleRetryQrCode}
              >
                <RefreshCw size={14} strokeWidth={1.5} />
                重新获取二维码
              </button>
            )}

            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 bg-ink hover:bg-accent text-paper py-3 rounded-lg font-medium transition-colors duration-200 cursor-pointer border-none mb-4"
              onClick={onWechatLogin}
            >
              <MessageCircle size={18} strokeWidth={1.5} />
              快捷登录
            </button>
          </div>
        )}

        <div className="text-center text-xs text-ink-faint mt-6">
          登录即表示同意用户协议和隐私政策
        </div>
      </div>
    </div>
  )
}
