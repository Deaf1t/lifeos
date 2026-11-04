export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')

export const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 3725 -> "1ч 02м", 600 -> "10м" */
export const fmtDuration = (sec: number) => {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h ? `${h}ч ${pad(m)}м` : `${m}м`
}

/** 3725 -> "01:02:05" */
export const fmtClock = (sec: number) => {
  const s = Math.max(0, Math.floor(sec))
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

export const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

/**
 * Productivity score 1–10:
 * 60% — средняя оценка задач, 40% — доля выполненных задач.
 */
export function calcScore(tasks: { status: string; productivity_score: number | null }[]): number | null {
  if (!tasks.length) return null
  const rated = tasks.filter(t => t.productivity_score != null)
  const avg = rated.length ? rated.reduce((s, t) => s + t.productivity_score!, 0) / rated.length : null
  const completion = tasks.filter(t => t.status === 'done').length / tasks.length
  const v = avg == null ? completion * 10 : avg * 0.6 + completion * 10 * 0.4
  return +v.toFixed(1)
}