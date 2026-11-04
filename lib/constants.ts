import {
  Dumbbell,
  Moon,
  Clapperboard,
  GraduationCap,
  ShieldCheck,
  FolderKanban,
  type LucideIcon,
} from 'lucide-react'

export type Sphere = 'gym' | 'sleep' | 'motion' | 'university' | 'habits' | 'projects'

export const SPHERES: Record<Sphere, { label: string; color: string; icon: LucideIcon }> = {
  gym:         { label: 'Зал',           color: '#7c8cf8', icon: Dumbbell },
  sleep:       { label: 'Сон',           color: '#5eb0d6', icon: Moon },
  motion:      { label: 'Моушн-дизайн', color: '#c78bf0', icon: Clapperboard },
  university:  { label: 'АЮК',           color: '#e0b25c', icon: GraduationCap },
  habits:      { label: 'Привычки',     color: '#6fcf97', icon: ShieldCheck },
  projects:    { label: 'Проекты',      color: '#a855f7', icon: FolderKanban },
}

export const SPHERE_KEYS = Object.keys(SPHERES) as Sphere[]

export const toISODate = (d: Date) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}

export const GRADIENTS = {
  sleep:    { from: '#06b6d4', to: '#3b82f6' },
  recovery: { from: '#10b981', to: '#84cc16' },
  focus:    { from: '#6366f1', to: '#8b5cf6' },
  fuel:     { from: '#f59e0b', to: '#ef4444' },
}