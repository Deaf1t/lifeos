'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Clock, Gauge, DollarSign, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, Button } from '@/components/ui'
import { cx } from '@/lib/utils'

interface ProjectOption {
  id: string
  title: string
  client_name: string
  amount_usd: number
  spent_minutes: number
}

interface FocusTimerProps {
  projects: ProjectOption[]
  onTimeLogged?: () => void
}

export default function FocusTimer({ projects, onTimeLogged }: FocusTimerProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '')
  const [modeMinutes, setModeMinutes] = useState<number>(50)
  const [timeLeft, setTimeLeft] = useState<number>(50 * 60)
  const [isActive, setIsActive] = useState<boolean>(false)
  const [isLogging, setIsLogging] = useState<boolean>(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Синхронизация выбранного проекта
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  // Тик таймера
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false)
      if (timerRef.current) clearInterval(timerRef.current)
      handleLogSession(modeMinutes)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isActive, timeLeft, modeMinutes])

  // Установка пресета (50м / 25м)
  const handleSetPreset = (mins: number) => {
    setIsActive(false)
    setModeMinutes(mins)
    setTimeLeft(mins * 60)
  }

  // Сброс
  const handleReset = () => {
    setIsActive(false)
    setTimeLeft(modeMinutes * 60)
  }

  // Фиксация времени сессии в проекте
  const handleLogSession = async (minsToAdd: number) => {
    if (!selectedProjectId || isLogging) return
    setIsLogging(true)

    try {
      const currentProj = projects.find((p) => p.id === selectedProjectId)
      const currentMinutes = currentProj?.spent_minutes || 0
      const updatedMinutes = currentMinutes + minsToAdd

      const { error } = await supabase
        .from('projects')
        .update({ spent_minutes: updatedMinutes })
        .eq('id', selectedProjectId)

      if (!error && onTimeLogged) {
        onTimeLogged()
      }
    } finally {
      setIsLogging(false)
    }
  }

  // Текущий проект и его метрики
  const activeProject = projects.find((p) => p.id === selectedProjectId)
  const totalHours = activeProject ? (activeProject.spent_minutes || 0) / 60 : 0
  const realHourlyRate =
    activeProject && totalHours > 0
      ? Math.round(activeProject.amount_usd / totalHours)
      : activeProject
      ? activeProject.amount_usd
      : 0

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className="border-white/[0.08] bg-[#0c0d12]/90 p-6 backdrop-blur-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-indigo-400" />
          <h2 className="text-sm font-semibold tracking-tight text-white">
            Deep Work & Рейт $/час
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          {[50, 25].map((m) => (
            <button
              key={m}
              onClick={() => handleSetPreset(m)}
              className={cx(
                'rounded px-2 py-0.5 text-[10px] font-mono font-semibold transition-all',
                modeMinutes === m
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'bg-white/[0.02] text-[#8a8f98] border border-white/[0.05] hover:text-white',
              )}
            >
              {m}м
            </button>
          ))}
        </div>
      </div>

      {/* Выбор проекта для привязки времени */}
      <div>
        <label className="text-[10px] font-medium uppercase tracking-wider text-[#8a8f98] mb-1.5 block">
          Привязка к коммерческому проекту
        </label>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-xs text-[#e6e6e8] outline-none focus:border-indigo-500"
        >
          {projects.length === 0 ? (
            <option value="">Нет активных проектов</option>
          ) : (
            projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.client_name} — {p.title} (${p.amount_usd})
              </option>
            ))
          )}
        </select>
      </div>

      {/* Таймер + кнопки старта */}
      <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-black/40 p-4">
        <div>
          <div className="font-mono text-4xl font-black tracking-tight text-white tabular-nums">
            {formatTime(timeLeft)}
          </div>
          <span className="text-[10px] text-[#6b6f78] font-mono">
            {isActive ? 'Сессия в потоке...' : 'Ожидание запуска'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsActive(!isActive)}
            className="bg-gradient-to-r from-[#6366f1] to-[#06b6d4] text-xs font-semibold px-4"
          >
            {isActive ? <Pause size={14} className="mr-1.5" /> : <Play size={14} className="mr-1.5" />}
            {isActive ? 'Пауза' : 'Старт'}
          </Button>

          <button
            onClick={handleReset}
            className="rounded-lg border border-white/[0.08] p-2 text-[#8a8f98] hover:text-white transition-colors"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Блок живого расчета $/час */}
      {activeProject && (
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.05]">
          <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5">
            <span className="text-[10px] text-[#8a8f98] block">На таймлайне:</span>
            <span className="font-mono text-xs font-bold text-white">
              {activeProject.spent_minutes || 0} мин{' '}
              <span className="text-[10px] font-normal text-[#6b6f78]">
                ({totalHours.toFixed(1)}ч)
              </span>
            </span>
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
            <span className="text-[10px] text-[#8a8f98] block flex items-center gap-1">
              <Gauge size={11} className="text-amber-400" /> Фактический $/час:
            </span>
            <span className="font-mono text-xs font-bold text-amber-400">
              ${realHourlyRate}
              <span className="text-[10px] font-normal text-[#8a8f98]"> / час</span>
            </span>
          </div>
        </div>
      )}
    </Card>
  )
}