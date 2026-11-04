import { toISODate } from './constants'
import { addDays } from './utils'
import { INSTAGRAM_LIMIT, type HabitLog } from './habits'

export type SleepLog = {
  log_date: string
  bedtime: string
  wake_time: string
  duration_minutes: number | null
  quality: number | null
}
export const SLEEP_COLS = 'log_date,bedtime,wake_time,duration_minutes,quality'

export type WorkoutType = 'gym_hypertrophy' | 'gym_legs' | 'gym_upper' | 'run' | 'kickboxing' | 'rest'

export const WORKOUTS: { key: WorkoutType; label: string }[] = [
  { key: 'gym_hypertrophy', label: 'Зал · Гипертрофия' },
  { key: 'gym_legs',        label: 'Зал · Ноги' },
  { key: 'gym_upper',       label: 'Зал · Верх' },
  { key: 'run',             label: 'Бег / Кросс' },
  { key: 'kickboxing',      label: 'Кикбоксинг' },
  { key: 'rest',            label: 'Отдых' },
]

export type BodyLog = {
  log_date: string
  calories: number
  protein_g: number
  water_ml: number
  creatine: boolean
  stretching: boolean
  workout_type: WorkoutType | null
  workout_minutes: number
  workout_rpe: number | null
}
export const BODY_COLS = 'log_date,calories,protein_g,water_ml,creatine,stretching,workout_type,workout_minutes,workout_rpe'

export const emptyBody = (date: string): BodyLog => ({
  log_date: date, calories: 0, protein_g: 0, water_ml: 0, creatine: false, stretching: false,
  workout_type: null, workout_minutes: 0, workout_rpe: null,
})

export const TARGETS = {
  sleepMin: 510,              // 8.5 ч
  sleepDebtCriticalMin: 300,  // 5 ч долга = «красная зона»
  kcal: 2800,
  protein: 160,
  waterMl: 3000,
} as const

export function buildSleep(date: string, bed: string, wake: string) {
  const wakeAt = new Date(`${date}T${wake}`)
  let bedAt = new Date(`${date}T${bed}`)
  if (bedAt >= wakeAt) bedAt = addDays(bedAt, -1) // лег до полуночи
  return { bedAt, wakeAt, minutes: Math.round((wakeAt.getTime() - bedAt.getTime()) / 60000) }
}

/** Минуты от 18:00 — чтобы 23:30 и 00:30 усреднялись корректно */
const offsetFrom18 = (iso: string) => {
  const d = new Date(iso)
  return (d.getHours() * 60 + d.getMinutes() - 18 * 60 + 1440) % 1440
}

export function avgBedtime(logs: SleepLog[]): string | null {
  if (!logs.length) return null
  const avg = (logs.reduce((s, l) => s + offsetFrom18(l.bedtime), 0) / logs.length + 18 * 60) % 1440
  return `${String(Math.floor(avg / 60)).padStart(2, '0')}:${String(Math.round(avg % 60)).padStart(2, '0')}`
}

/** Регулярность отбоя 0–100 (по последним 7 ночам, нужно ≥ 3). sd = 0 → 100, sd ≥ 90 мин → 0 */
export function bedtimeRegularity(logs: SleepLog[]): number | null {
  const recent = logs.slice(-7)
  if (recent.length < 3) return null
  const xs = recent.map(l => offsetFrom18(l.bedtime))
  const m = xs.reduce((a, b) => a + b, 0) / xs.length
  const sd = Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length)
  return Math.round(Math.max(0, 100 - (sd / 90) * 100))
}

/** Sleep Performance: 80% — факт/цель 8.5 ч, 20% — регулярность отбоя */
export function sleepPerformance(durationMin: number, regularity: number | null): number {
  const perf = Math.min(100, (durationMin / TARGETS.sleepMin) * 100)
  return Math.round(regularity == null ? perf : perf * 0.8 + regularity * 0.2)
}

/** Накопленный недосып за 7 дней (учитываются только ночи с записью) */
export function sleepDebtMin(logs: SleepLog[]): number {
  const from = toISODate(addDays(new Date(), -6))
  return logs
    .filter(l => l.log_date >= from && l.duration_minutes != null)
    .reduce((s, l) => s + Math.max(0, TARGETS.sleepMin - (l.duration_minutes ?? 0)), 0)
}

/** Fuel 0–100: среднее по калориям, белку и воде (каждый ограничен 100%) */
export function fuelScore(b?: BodyLog | null): number | null {
  if (!b) return null
  const parts = [b.calories / TARGETS.kcal, b.protein_g / TARGETS.protein, b.water_ml / TARGETS.waterMl]
  return Math.round((parts.reduce((s, p) => s + Math.min(1, p), 0) / parts.length) * 100)
}

/** Доля выполненных пунктов режима за день (0–1) или null, если за день нет ни одной записи */
export function regimeAdherence(h?: HabitLog, b?: BodyLog): number | null {
  if (!h && !b) return null
  const checks = [
    h?.nutrition_ok ?? false,
    h?.no_scrolling ?? false,
    h ? h.instagram_minutes <= INSTAGRAM_LIMIT : false,
    h?.focus_mode_ok ?? false,
    b?.stretching ?? false,
    b?.creatine ?? false,
  ]
  return checks.filter(Boolean).length / checks.length
}

export type BodyMetrics = {
  lastSleep: SleepLog | null
  sleepPerf: number | null
  regularity: number | null
  debtMin: number
  recovery: number | null
  fuel: number | null
  adherence: number | null
}

/**
 * Recovery 0–100 = 40% качество сна (1–10) + 30% Sleep Performance + 30% соблюдение режима,
 * минус штраф за недосып (3 п. за каждый час долга, максимум 15).
 */
export function computeMetrics(sleep: SleepLog[], habit?: HabitLog, body?: BodyLog): BodyMetrics {
  const sorted = [...sleep].sort((a, b) => a.log_date.localeCompare(b.log_date))
  const yesterday = toISODate(addDays(new Date(), -1))
  const latest = sorted[sorted.length - 1]
  const lastSleep = latest && latest.log_date >= yesterday ? latest : null

  const regularity = bedtimeRegularity(sorted)
  const sleepPerf = lastSleep?.duration_minutes ? sleepPerformance(lastSleep.duration_minutes, regularity) : null
  const debtMin = sleepDebtMin(sorted)
  const adherence = regimeAdherence(habit, body)

  let recovery: number | null = null
  if (lastSleep && sleepPerf != null) {
    const parts: { w: number; v: number }[] = [{ w: 0.3, v: sleepPerf }]
    if (lastSleep.quality != null) parts.push({ w: 0.4, v: lastSleep.quality * 10 })
    if (adherence != null) parts.push({ w: 0.3, v: adherence * 100 })
    const wsum = parts.reduce((s, p) => s + p.w, 0)
    const base = parts.reduce((s, p) => s + p.w * p.v, 0) / wsum
    const penalty = Math.min(15, (debtMin / 60) * 3)
    recovery = Math.round(Math.max(0, Math.min(100, base - penalty)))
  }

  return { lastSleep, sleepPerf, regularity, debtMin, recovery, fuel: fuelScore(body), adherence }
}

export const rpeColor = (n: number) => (n <= 3 ? '#84cc16' : n <= 6 ? '#f59e0b' : n <= 8 ? '#f97316' : '#ef4444')