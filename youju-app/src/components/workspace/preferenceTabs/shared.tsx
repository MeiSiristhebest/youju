import { cn } from '../../../lib/utils'

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0',
        checked ? 'bg-accent' : 'bg-paper-dark border border-rule/60',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'cursor-pointer',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-4 h-4 bg-paper rounded-full shadow transition-all duration-200',
          checked ? 'left-5' : 'left-0.5',
        )}
      />
    </button>
  )
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
}) {
  const _pct = ((value - min) / (max - min)) * 100
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-ink">{label}</span>
        <span className="text-xs text-ink-muted font-mono">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-paper-dark rounded-full appearance-none cursor-pointer accent-accent"
      />
    </div>
  )
}

export function SelectRow({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string
  description?: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-rule/40 last:border-b-0 first:pt-0 last:pb-0">
      <div className="flex-1 pr-4">
        <p className="text-xs text-ink font-medium">{label}</p>
        {description && <p className="text-[11px] text-ink-faint mt-0.5">{description}</p>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-1.5 bg-paper-dark border border-rule/60 rounded-md text-xs text-ink cursor-pointer focus:outline-none focus:border-accent/50"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function SettingRow({
  label,
  description,
  action,
}: {
  label: string
  description?: string
  action: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-rule/40 last:border-b-0 first:pt-0 last:pb-0">
      <div className="flex-1 pr-4">
        <p className="text-xs text-ink font-medium">{label}</p>
        {description && <p className="text-[11px] text-ink-faint mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <div className="flex items-start gap-3 mb-3">
      <div className="w-8 h-8 rounded-lg bg-accent-bg flex items-center justify-center text-accent shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-semibold text-ink">{title}</h4>
        {description && <p className="text-[11px] text-ink-faint mt-0.5">{description}</p>}
      </div>
    </div>
  )
}
