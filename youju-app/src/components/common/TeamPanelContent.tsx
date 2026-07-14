import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  Mail,
  Shield,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/utils'

interface TeamMember {
  id: string
  name: string
  email: string
  avatar: string
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  status: 'active' | 'pending' | 'inactive'
  joinDate: string
}

const MOCK_MEMBERS: TeamMember[] = [
  {
    id: 'm1',
    name: '张伟',
    email: 'zhangwei@company.com',
    avatar: 'ZW',
    role: 'owner',
    status: 'active',
    joinDate: '2024-01-15',
  },
  {
    id: 'm2',
    name: '李娜',
    email: 'lina@company.com',
    avatar: 'LN',
    role: 'admin',
    status: 'active',
    joinDate: '2024-02-20',
  },
  {
    id: 'm3',
    name: '王芳',
    email: 'wangfang@company.com',
    avatar: 'WF',
    role: 'editor',
    status: 'active',
    joinDate: '2024-03-10',
  },
  {
    id: 'm4',
    name: '陈明',
    email: 'chenming@company.com',
    avatar: 'CM',
    role: 'editor',
    status: 'active',
    joinDate: '2024-04-05',
  },
  {
    id: 'm5',
    name: '刘洋',
    email: 'liuyang@company.com',
    avatar: 'LY',
    role: 'viewer',
    status: 'pending',
    joinDate: '2024-06-18',
  },
]

const ROLE_INFO = {
  owner: { label: '所有者', icon: Crown, color: 'text-accent bg-accent-bg border-accent-faint' },
  admin: { label: '管理员', icon: Shield, color: 'text-ink bg-paper-dark border-rule' },
  editor: {
    label: '编辑者',
    icon: Users,
    color: 'text-ink-muted bg-paper-dark border-rule',
  },
  viewer: { label: '查看者', icon: Users, color: 'text-ink-faint bg-paper-dark border-rule' },
}

export function TeamPanelContent({ onClose }: { onClose?: () => void }) {
  const [members, setMembers] = useState<TeamMember[]>(MOCK_MEMBERS)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor')
  const [copied, setCopied] = useState(false)

  // TODO: 接入真实邀请链接生成 API，当前为 mock 占位
  const inviteLink = 'https://youju.app/invite/abc123xyz'

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleInvite = () => {
    if (!inviteEmail.trim()) return
    const newMember: TeamMember = {
      id: `m_${Date.now()}`,
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      avatar: inviteEmail.slice(0, 2).toUpperCase(),
      role: inviteRole,
      status: 'pending',
      joinDate: new Date().toISOString().split('T')[0],
    }
    setMembers((prev) => [...prev, newMember])
    setInviteEmail('')
    setShowInvite(false)
  }

  const activeCount = members.filter((m) => m.status === 'active').length
  const pendingCount = members.filter((m) => m.status === 'pending').length

  return (
    <div className="h-full flex flex-col">
      {/* 即将上线提示 */}
      <div className="px-4 py-2 bg-accent-bg/30 border-b border-accent-faint/40">
        <p className="text-[11px] text-accent flex items-center gap-1.5">
          <Sparkles size={12} />
          即将上线 · 团队协作功能正在开发中，当前为预览界面
        </p>
      </div>
      <div className="p-6 border-b border-rule/60">
        <div className="flex items-center gap-3 mb-4">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-ink-muted hover:text-ink hover:bg-paper-dark/50 transition-colors shrink-0"
            >
              <ArrowLeft size={14} strokeWidth={1.5} />
              返回
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-ink mb-1">法务部团队</h3>
            <p className="text-xs text-ink-faint">
              {activeCount} 位成员 · {pendingCount} 位待加入
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowInvite(!showInvite)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-ink text-paper hover:bg-accent transition-colors shrink-0"
          >
            <UserPlus size={14} strokeWidth={1.5} />
            邀请成员
          </button>
        </div>

        {showInvite && (
          <div className="p-4 bg-paper-dark/50 border border-rule/60 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="mb-4">
              <p className="text-xs font-medium text-ink-faint mb-1.5">邮箱地址</p>
              <div className="relative">
                <Mail
                  size={14}
                  strokeWidth={1.5}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="输入邮箱邀请成员"
                  className="w-full pl-10 pr-3 py-2.5 bg-paper border border-rule/60 rounded-md text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent/50"
                />
              </div>
            </div>
            <div className="mb-4">
              <p className="text-xs font-medium text-ink-faint mb-1.5">角色</p>
              <div className="flex gap-3">
                {(['editor', 'viewer'] as const).map((role) => {
                  const info = ROLE_INFO[role]
                  const Icon = info.icon
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setInviteRole(role)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium border transition-colors',
                        inviteRole === role
                          ? info.color
                          : 'bg-paper border-rule/60 text-ink-muted hover:border-rule',
                      )}
                    >
                      <Icon size={14} strokeWidth={1.5} />
                      {info.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleInvite}
                className="flex-1 py-2 bg-ink text-paper rounded-md text-xs font-medium hover:bg-accent transition-colors"
              >
                发送邀请
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-rule/40">
              <p className="text-xs text-ink-faint mb-2">或复制邀请链接</p>
              <div className="flex gap-2">
                <code className="flex-1 px-3 py-2 bg-paper border border-rule/60 rounded text-xs text-ink-muted font-mono truncate">
                  {inviteLink}
                </code>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={cn(
                    'px-3 py-2 rounded-md text-xs font-medium transition-colors',
                    copied
                      ? 'bg-success text-paper'
                      : 'bg-paper-dark text-ink-muted hover:text-ink hover:bg-paper',
                  )}
                >
                  {copied ? (
                    <Check size={14} strokeWidth={1.5} />
                  ) : (
                    <Copy size={14} strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <p className="text-xs font-medium text-ink-faint uppercase tracking-[0.15em] font-mono mb-3">
          团队成员
        </p>
        <ul className="space-y-2">
          {members.map((member) => {
            const roleInfo = ROLE_INFO[member.role]
            const RoleIcon = roleInfo.icon
            return (
              <li
                key={member.id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-paper-dark/50 transition-colors group"
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center text-xs font-medium shrink-0',
                    member.status === 'active'
                      ? 'bg-paper-dark text-ink border border-rule'
                      : 'bg-paper-dark/50 text-ink-faint border border-dashed border-rule',
                  )}
                >
                  {member.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink truncate">{member.name}</span>
                    {member.status === 'pending' && (
                      <span className="text-xs font-medium text-warning bg-warning-bg px-2 py-0.5 rounded-full">
                        待加入
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-faint truncate">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border',
                      roleInfo.color,
                    )}
                  >
                    <RoleIcon size={12} strokeWidth={1.5} />
                    {roleInfo.label}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
