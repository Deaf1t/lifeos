import { toISODate } from './constants'
import { addDays } from './utils'

export type HabitLog = {
  log_date: string
  instagram_minutes: number
  nutrition_ok: boolean
  no_porn: boolean
  no_scrolling: boolean
  focus_mode_ok: boolean
}

export const HABIT_COLS = 'log_date,instagram_minutes,nutrition_ok,no_porn,no_scrolling,focus_mode_ok'
export const INSTAGRAM_LIMIT = 30

export const HABITS = [
  { key: 'instagram',    label: 'Instagram ≤ 30 мин', ok: (l: HabitLog) => l.instagram_minutes <= INSTAGRAM_LIMIT },
  { key: 'nutrition',    label: 'Питание по плану',   ok: (l: HabitLog) => l.nutrition_ok },
  { key: 'no_scrolling', label: 'Без скроллинга',     ok: (l: HabitLog) => l.no_scrolling },
  { key: 'no_porn',      label: 'Без порно',          ok: (l: HabitLog) => l.no_porn },
] as const

export const allOk = (l: HabitLog) => HABITS.every(h => h.ok(l))

/**
 * Серия дней подряд без срывов. Сегодняшний день, если записи еще нет,
 * не рвет серию; любой прошлый день без записи — рвет.
 */
export function streak(logs: HabitLog[], ok: (l: HabitLog) => boolean): number {
  const map = new Map(logs.map(l => [l.log_date, l]))
  const today = new Date()
  let n = 0
  for (let i = 0; i < 400; i++) {
    const l = map.get(toISODate(addDays(today, -i)))
    if (!l) {
      if (i === 0) continue
      break
    }
    if (!ok(l)) break
    n++
  }
  return n
}