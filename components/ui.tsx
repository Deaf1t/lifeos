'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2, type LucideIcon } from 'lucide-react'
import { cx } from '@/lib/utils'
import { SPHERES, SPHERE_KEYS, type Sphere } from '@/lib/constants'

/* ---------- Поля ввода ---------- */
export const inputCls =
  'w-full rounded-md bg-[#0a0b0c] border border-[#23252a] px-3 text-sm text-[#e6e6e8] placeholder:text-[#4a4d55] ' +
  'outline-none transition-colors hover:border-[#2d3036] focus:border-[#5e6ad2] [color-scheme:dark]'

/* ---------- Карточки ---------- */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx('rounded-xl border border-[#1c1d21] bg-[#0d0e10]', className)}>{children}</section>
}

export function CardHeader({
  title,
  hint,
  right,
  icon: Icon,
}: {
  title: string
  hint?: string
  right?: ReactNode
  icon?: LucideIcon
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon size={14} className="shrink-0 text-[#6b6f78]" />}
        <div className="min-w-0">
          <h2 className="text-[13px] font-medium text-[#e6e6e8] truncate">{title}</h2>
          {hint && <p className="text-xs text-[#5b5f66] mt-0.5">{hint}</p>}
        </div>
      </div>
      {right}
    </div>
  )
}

export const CardBody = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={cx('px-5 pb-5', className)}>{children}</div>
)

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[#6b6f78]">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </header>
  )
}

/* ---------- Кнопки ---------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: LucideIcon
}

export function Button({
  variant = 'outline',
  size = 'md',
  loading,
  icon: Icon,
  className,
  children,
  disabled,
  ...rest
}: BtnProps) {
  const v = {
    primary: 'bg-[#5e6ad2] text-white border border-transparent hover:bg-[#6b77e0]',
    outline: 'border border-[#23252a] text-[#c9cacd] hover:bg-[#15161a] hover:border-[#2d3036]',
    ghost:   'border border-transparent text-[#8a8f98] hover:text-white hover:bg-[#15161a]',
    danger:  'border border-red-500/30 text-red-300 hover:bg-red-500/10',
  }[variant]
  const s = { sm: 'h-7 px-2.5 text-xs gap-1.5', md: 'h-8 px-3 text-[13px] gap-2', lg: 'h-10 px-5 text-sm gap-2' }[size]
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors select-none',
        'disabled:opacity-50 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5e6ad2]',
        v,
        s,
        className,
      )}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : Icon ? <Icon size={13} /> : null}
      {children}
    </button>
  )
}

/* ---------- Переключатели ---------- */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
}) {
  return (
    <div className="inline-flex rounded-md border border-[#23252a] bg-[#0a0b0c] p-0.5 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'px-2.5 py-1 rounded transition-colors',
            value === o.value ? 'bg-[#1f2025] text-white' : 'text-[#8a8f98] hover:text-white',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('relative h-5 w-9 shrink-0 rounded-full transition-colors', checked ? 'bg-[#5e6ad2]' : 'bg-[#25272c]')}
    >
      <span
        className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', checked ? 'left-[18px]' : 'left-0.5')}
      />
    </button>
  )
}

/* ---------- Сферы ---------- */
export function SphereTag({ sphere }: { sphere: Sphere }) {
  const s = SPHERES[sphere]
  const Icon = s.icon
  return (
    <span
      className="inline-flex h-5 items-center gap-1.5 rounded px-1.5 text-[11px]"
      style={{ color: s.color, background: `${s.color}16` }}
    >
      <Icon size={11} />
      {s.label}
    </span>
  )
}

export function SpherePicker({
  value,
  onChange,
  disabled,
}: {
  value: Sphere
  onChange: (s: Sphere) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SPHERE_KEYS.map((k) => {
        const s = SPHERES[k]
        const Icon = s.icon
        const active = value === k
        return (
          <button
            key={k}
            type="button"
            disabled={disabled}
            onClick={() => onChange(k)}
            className={cx(
              'inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors disabled:opacity-50',
              active ? 'text-white' : 'border-[#23252a] text-[#8a8f98] hover:text-white hover:bg-[#15161a]',
            )}
            style={active ? { borderColor: `${s.color}66`, background: `${s.color}14` } : undefined}
          >
            <Icon size={12} style={{ color: s.color }} />
            {s.label}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Прогресс и оценка ---------- */
export function ProgressBar({
  value,
  color = '#5e6ad2',
  from,
  to,
  className,
}: {
  value: number
  color?: string
  from?: string
  to?: string
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, value))
  const background = from && to ? `linear-gradient(90deg, ${from}, ${to})` : color

  return (
    <div className={cx('h-1.5 overflow-hidden rounded-full bg-[#1a1b1f]', className)}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${clamped}%`, background }}
      />
    </div>
  )
}

export function GradientRing({
  value,
  size = 90,
  strokeWidth,
  stroke,
  from = '#6366f1',
  to = '#8b5cf6',
  label,
  sub,
  className,
  children,
}: {
  value: number | null
  size?: number
  strokeWidth?: number
  stroke?: number
  from?: string
  to?: string
  label?: string
  sub?: string
  className?: string
  children?: ReactNode
}) {
  const sw = stroke ?? strokeWidth ?? 8
  const numValue = value ?? 0
  const radius = (size - sw) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, numValue))
  const strokeDashoffset = circumference - (clamped / 100) * circumference
  const gradId = `grad-${from.replace('#', '')}-${to.replace('#', '')}`

  return (
    <div className={cx('relative inline-flex flex-col items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#1b1c21"
          strokeWidth={sw}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={`url(#${gradId})`}
          strokeWidth={sw}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children ? (
          children
        ) : (
          <>
            <span className="text-base font-bold tabular-nums tracking-tight text-white">
              {value != null ? `${Math.round(value)}%` : '—'}
            </span>
            {sub && <span className="text-[10px] text-[#8a8f98]">{sub}</span>}
          </>
        )}
      </div>
      {label && <span className="mt-2 text-xs font-medium text-[#c9cacd]">{label}</span>}
    </div>
  )
}

export function ScoreRing({
  value,
  size = 112,
  stroke = 7,
  caption,
}: {
  value: number | null
  size?: number
  stroke?: number
  caption?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = value == null ? 0 : Math.min(1, value / 10)
  const color = value == null ? '#2a2d33' : value >= 7 ? '#6fcf97' : value >= 4 ? '#e0b25c' : '#e5676b'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a1b1f" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset .8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-2xl font-semibold leading-none tabular-nums">{value ?? '—'}</div>
          {caption && <div className="mt-1 text-[11px] text-[#5b5f66]">{caption}</div>}
        </div>
      </div>
    </div>
  )
}

/* ---------- Состояния ---------- */
export function PageLoader() {
  return (
    <div className="grid h-64 place-items-center text-[#5b5f66]">
      <Loader2 size={18} className="animate-spin" />
    </div>
  )
}

export function Empty({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="grid h-9 w-9 place-items-center rounded-lg border border-[#23252a] text-[#6b6f78]">
        <Icon size={16} />
      </div>
      <p className="text-sm text-[#c9cacd]">{title}</p>
      {text && <p className="max-w-xs text-xs text-[#5b5f66]">{text}</p>}
    </div>
  )
}

export function ErrorBanner({ message, onClose }: { message: string | null; onClose?: () => void }) {
  if (!message) return null
  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="text-red-300/70 hover:text-red-200" aria-label="Закрыть">
          ×
        </button>
      )}
    </div>
  )
}