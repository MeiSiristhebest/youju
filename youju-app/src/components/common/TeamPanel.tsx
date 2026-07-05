import { Check, Copy, Crown, Mail, Shield, UserPlus, Users, X } from 'lucide-react'
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
  owner: { label: '所有者', icon: Crown, color: 'text-amber-500 bg-amber-50 border-amber-200' },
  admin: { label: '管理员', icon: Shield, color: 'text-accent bg-accent-bg border-accent-faint' },
  editor: {
    label: '编辑者',
    icon: Users,
    color: 'text-success bg-success-bg border-success-faint',
  },
  viewer: { label: '查看者', icon: Users, color: 'text-ink-muted bg-paper-dark border-rule' },
}

interface TeamPanelProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function TeamPanel({ isOpen, onOpenChange }: TeamPanelProps) {
  const [members, setMembers] = useState<TeamMember[]>(MOCK_MEMBERS)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor')
  const [copied, setCopied] = useState(false)

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

  const removeMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  const activeCount = members.filter((m) => m.status === 'active').length
  const pendingCount = members.filter((m) => m.status === 'pending').length

  if (!isOpen) return null

  return (
    <div className="h-full flex flex-col bg-paper border-l border-rule">
      <div className="flex items-center justify-between px-4 py-3 border-b border-rule">
        <div className="flex items-center gap-2">
          <Users size={14} strokeWidth={1.5} className="text-ink" />
          <span className="text-sm font-medium text-ink">团队协作</span>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="p-1 rounded-md text-ink-faint hover:text-ink hover:bg-paper-dark transition-colors"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>

      <div className="p-4 border-b border-rule/60">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-medium text-ink mb-0.5">法务部团队</h3>
            <p className="text-[10px] text-ink-faint">
              {activeCount} 位成员 · {pendingCount} 位待加入
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowInvite(!showInvite)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-accent text-paper hover:bg-accent-tertiary transition-colors"
          >
            <UserPlus size={12} strokeWidth={1.5} />
            邀请
          </button>
        </div>

        {showInvite && (
          <div className="p-3 bg-paper-dark/50 border border-rule/60 rounded-lg mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="mb-3">
              <label className="text-[10px] font-medium text-ink-faint mb-1 block">邮箱地址</label>
              <div className="relative">
                <Mail
                  size={12}
                  strokeWidth={1.5}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
                />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="输入邮箱邀请成员"
                  className="w-full pl-8 pr-3 py-2 bg-paper border border-rule/60 rounded-md text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent/50"
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="text-[10px] font-medium text-ink-faint mb-1 block">角色</label>
              <div className="flex gap-2">
                {(['editor', 'viewer'] as const).map((role) => {
                  const info = ROLE_INFO[role]
                  const Icon = info.icon
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setInviteRole(role)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium border transition-colors',
                        inviteRole === role
                          ? info.color
                          : 'bg-paper border-rule/60 text-ink-muted hover:border-rule',
                      )}
                    >
                      <Icon size={11} strokeWidth={1.5} />
                      {info.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleInvite}
                className="flex-1 py-1.5 bg-ink text-paper rounded-md text-[11px] font-medium hover:bg-accent transition-colors"
              >
                发送邀请
              </button>
            </div>
            <div className="mt-3 pt-3 border-t border-rule/40">
              <p className="text-[10px] text-ink-faint mb-1.5">或复制邀请链接</p>
              <div className="flex gap-1.5">
                <code className="flex-1 px-2 py-1.5 bg-paper border border-rule/60 rounded text-[10px] text-ink-muted font-mono truncate">
                  {inviteLink}
                </code>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={cn(
                    'px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors',
                    copied
                      ? 'bg-success text-paper'
                      : 'bg-paper-dark text-ink-muted hover:text-ink hover:bg-paper',
                  )}
                >
                  {copied ? (
                    <Check size={12} strokeWidth={1.5} />
                  ) : (
                    <Copy size={12} strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2">
          <p className="text-[10px] font-medium text-ink-faint uppercase tracking-[0.15em] font-mono mb-2">
            团队成员
          </p>
          <ul className="space-y-1">
            {members.map((member) => {
              const roleInfo = ROLE_INFO[member.role]
              const RoleIcon = roleInfo.icon
              return (
                <li
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-paper-dark/50 transition-colors group"
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-medium shrink-0',
                      member.status === 'active'
                        ? 'bg-gradient-to-br from-accent to-accent-tertiary text-paper'
                        : 'bg-paper-dark text-ink-faint border border-dashed border-rule',
                    )}
                  >
                    {member.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-ink truncate">{member.name}</span>
                      {member.status === 'pending' && (
                        <span className="text-[9px] font-medium text-warning bg-warning-bg px-1.5 py-0.5 rounded-full">
                          待加入
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-ink-faint truncate">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border',
                        roleInfo.color,
                      )}
                    >
                      <RoleIcon size={9} strokeWidth={1.5} />
                      {roleInfo.label}
                    </span>
                    {member.role !== 'owner' && (
                      <button
                        type="button"
                        onClick={() => removeMember(member.id)}
                        className="p-1 rounded-md text-ink-faint opacity-0 group-hover:opacity-100 hover:text-danger hover:bg-danger-bg transition-all"
                      >
                        <X size={11} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="px-4 py-3 border-t border-rule/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-ink-faint uppercase tracking-[0.15em] font-mono">
              权限说明
            </span>
          </div>
          <div className="space-y-1.5">
            {Object.entries(ROLE_INFO).map(([role, info]) => {
              const Icon = info.icon
              const permissions = {
                owner: '全部权限，包括计费、团队管理',
                admin: '管理团队、邀请成员、查看所有分析',
                editor: '创建/编辑分析、上传材料',
                viewer: '仅查看分析结果和报告',
              }
              return (
                <div key={role} className="flex items-start gap-2 p-2 rounded-md bg-paper-dark/30">
                  <div
                    className={cn(
                      'w-5 h-5 rounded flex items-center justify-center mt-0.5',
                      info.color,
                    )}
                  >
                    <Icon size={10} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-ink">{info.label}</p>
                    <p className="text-[9px] text-ink-faint leading-relaxed">
                      {permissions[role as keyof typeof permissions]}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
