'use client'

import { useState, useEffect, useCallback } from 'react'
import { Flame, Smartphone, BookOpen, Brain, CheckCircle2, Save, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Card, Button, inputCls } from '@/components/ui'
import { cx } from '@/lib/utils'

export interface HabitLog {
  id?: string
  user_id?: string
  log_date: string
  instagram_minutes?: number | null
  reading_pages?: number | null
  focus_mode_ok?: boolean | null
  created_at?: string
}

export default function HabitsPage() {
  const { user } = useAuth()
  const [todayStr] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const [log, setLog] = useState<HabitLog>({
    log_date: todayStr,
    instagram_minutes: 0,
    reading_pages: 0,
    focus_mode_ok: false,
  })

  const loadHabit = useCallback(async (date: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('log_date', date)
      .maybeSingle()

    if (data) {
      setLog({
        id: data.id,
        user_id: data.user_id,
        log_date: data.log_date,
        instagram_minutes: data.instagram_minutes ?? 0,
        reading_pages: data.reading_pages ?? 0,
        focus_mode_ok: data.focus_mode_ok ?? false,
      })
    } else {
      setLog({
        log_date: date,
        instagram_minutes: 0,
        reading_pages: 0,
        focus_mode_ok: false,
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadHabit(selectedDate)
  }, [selectedDate, loadHabit])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSaved(false)

    const { data: authData } = await supabase.auth.getUser()
    const userId = user?.id || authData.user?.id

    if (!userId) {
      setLoading(false)
      return
    }

    const payload = {
      user_id: userId,
      log_date: selectedDate,
      instagram_minutes: Number(log.instagram_minutes) || 0,
      reading_pages: Number(log.reading_pages) || 0,
      focus_mode_ok: Boolean(log.focus_mode_ok),
    }

    const { error } = await supabase
      .from('habit_logs')
      .upsert(payload, { onConflict: 'user_id,log_date' })

    setLoading(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Привычки и дисциплина</h1>
          <p className="mt-1 text-xs text-[#8a8f98]">
            Контроль экранного времени, фокуса и вечернего чтения
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-[#8a8f98]" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-[#0c0d12] px-3 py-1.5 text-xs text-[#e6e6e8] outline-none"
          />
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border-white/[0.07] bg-[#0c0d12]/90 p-5 space-y-3">
          <div className="flex items-center gap-2 text-rose-400">
            <Smartphone size={18} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Instagram (макс. 30м)</h3>
          </div>
          <p className="text-[11px] text-[#8a8f98]">Время в соцсетях за день</p>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="number"
              min="0"
              value={log.instagram_minutes ?? 0}
              onChange={(e) => setLog({ ...log, instagram_minutes: Number(e.target.value) })}
              className={inputCls}
            />
            <span className="text-xs text-[#8a8f98]">мин</span>
          </div>
        </Card>

        <Card className="border-white/[0.07] bg-[#0c0d12]/90 p-5 space-y-3">
          <div className="flex items-center gap-2 text-indigo-400">
            <BookOpen size={18} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Чтение перед сном</h3>
          </div>
          <p className="text-[11px] text-[#8a8f98]">Количество прочитанных страниц</p>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="number"
              min="0"
              value={log.reading_pages ?? 0}
              onChange={(e) => setLog({ ...log, reading_pages: Number(e.target.value) })}
              className={inputCls}
            />
            <span className="text-xs text-[#8a8f98]">стр</span>
          </div>
        </Card>

        <Card className="border-white/[0.07] bg-[#0c0d12]/90 p-5 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <Brain size={18} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Режим глубокого фокуса</h3>
          </div>
          <p className="text-[11px] text-[#8a8f98]">День без срывов на отвлекающие факторы</p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setLog({ ...log, focus_mode_ok: !log.focus_mode_ok })}
              className={cx(
                'flex w-full items-center justify-center gap-2 rounded-lg border py-2.5 text-xs font-medium transition-all',
                log.focus_mode_ok
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-white/[0.08] bg-white/[0.02] text-[#8a8f98] hover:text-white',
              )}
            >
              <CheckCircle2 size={16} />
              {log.focus_mode_ok ? 'Выполнено' : 'Не отмечено'}
            </button>
          </div>
        </Card>

        <div className="md:col-span-3 flex justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="bg-indigo-600 px-6 text-xs flex items-center gap-2"
          >
            <Save size={14} />
            {saved ? 'Сохранено!' : loading ? 'Сохранение...' : 'Сохранить данные дня'}
          </Button>
        </div>
      </form>
    </div>
  )
}