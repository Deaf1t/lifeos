import type { Sphere } from './constants'

export type TimerState = {
  sphere: Sphere
  taskId: string | null
  title: string
  sessionStart: number        // ms: начало сессии
  segmentStart: number | null // ms: начало текущего отрезка (null = пауза)
  accumulated: number         // ms: накоплено до текущего отрезка
  project?: string | null
}

const KEY = 'lifeos.timer'

export function loadTimer(): TimerState | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as TimerState) : null
  } catch {
    return null
  }
}

export function saveTimer(t: TimerState | null) {
  try {
    if (t) localStorage.setItem(KEY, JSON.stringify(t))
    else localStorage.removeItem(KEY)
  } catch {}
}

export const elapsedSec = (t: TimerState, now = Date.now()) =>
  Math.max(0, Math.floor((t.accumulated + (t.segmentStart ? now - t.segmentStart : 0)) / 1000))