'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import { Camera, Check, EyeOff, Flame, Minus, Moon, Plus, Smartphone, Sunrise, Utensils } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { toISODate } from '@/lib/constants'
import { addDays, cx, fmtDuration, hhmm } from '@/lib/utils'
import { HABITS, HABIT_COLS, INSTAGRAM_LIMIT, allOk, streak, type HabitLog } from '@/lib/habits'
import { Button, Card, CardBody, CardHeader, ErrorBanner, PageHeader, PageLoader, ProgressBar, Toggle, inputCls } from '@/components/ui'

type SleepLog = {
  log_date: string
  bedtime: string
  wake_time: string
  duration_minutes: number | null
  quality: number | null
}

const ICONS: Record<string, LucideIcon> = { instagram: Camera, nutrition: Utensils, no_scrolling: Smartphone, no_porn: EyeOff }
const SLEEP_TARGET_H = 8
const TOOLTIP = {
  contentStyle: { background: '#0f1011', border: '1px solid #23252a', borderRadius: 8, fontSize: 12, color: '#e6e6e8' },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
  labelStyle: { color: '#8a8f98' },
}

function buildSleep(date: string, bed: string, wake: string) {
  const wakeAt = new Date(`${date}T${wake}`)
  let bedAt = new Date(`${date}T${bed}`)
  if (bedAt >= wakeAt) bedAt = addDays(bedAt, -1) // лег до полуночи
  return { bedAt, wakeAt, minutes: Math.round((wakeAt.getTime() - bedAt.getTime()) / 60000) }
}

export default function HabitsPage() {
  const { userId } = useAuth()
  const today = toISODate(new Date())

  const [logs, setLogs] = useState<HabitLog[]>([])
  const [sleep, setSleep] = useState<SleepLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // сон
  const [sleepDate, setSleepDate] = useState(today)
  const [bed, setBed] = useState('23:30')
  const [wake, setWake] = useState('07:30')
  const [quality, setQuality] = useState(7)
  const [savingSleep, setSavingSleep] = useState(false)
  const [sleepSaved, setSleepSaved] = useState(false)

  const [igDraft, setIgDraft] = useState('0')

  const load = useCallback(async () => {
    const [h, s] = await Promise.all([
      supabase.from('habit_logs').select(HABIT_COLS).gte('log_date', toISODate(addDays(new Date(), -89))),
      supabase.from('sleep_logs').select('log_date,bedtime,wake_time,duration_minutes,quality')
        .gte('log_date', toISODate(addDays(new Date(), -29))).order('log_date'),
    ])
    const err = h.error ?? s.error
    if (err) setError(err.message)
    const hl = (h.data ?? []) as HabitLog[]
    setLogs(hl)
    setSleep((s.data ?? []) as SleepLog[])
    setIgDraft(String(hl.find(l => l.log_date === today)?.instagram_minutes ?? 0))
    setLoading(false)
  }, [today])

  useEffect(() => { load() }, [load])

  // при смене даты подставляем уже сохраненный сон
  useEffect(() => {
    const ex = sleep.find(s => s.log_date === sleepDate)
    if (ex) {
      setBed(hhmm(new Date(ex.bedtime)))
      setWake(hhmm(new Date(ex.wake_time)))
      if (ex.quality) setQuality(ex.quality)
    }
    setSleepSaved(false)
  }, [sleepDate, sleep])

  /* ---------- Привычки ---------- */
  const todayLog = logs.find(l => l.log_date === today)

  async function saveHabit(values: Partial<HabitLog>) {
    const base: HabitLog = todayLog ?? { log_date: today, instagram_minutes: 0, nutrition_ok: false, no_porn: false, no_scrolling: false }
    const next = { ...base, ...values }
    setLogs(p => [...p.filter(l => l.log_date !== today), next])
    const { error } = await supabase.from('habit_logs').upsert({ user_id: userId, ...next }, { onConflict: 'user_id,log_date' })
    if (error) { setError(error.message); load() }
  }

  const setIg = (n: number) => {
    const v = Math.max(0, Math.min(1440, Math.round(n)))
    setIgDraft(String(v))
    saveHabit({ instagram_minutes: v })
  }
  const igMinutes = todayLog?.instagram_minutes ?? 0
  const igOver = igMinutes > INSTAGRAM_LIMIT

  const streaks = useMemo(() => ({
    all: streak(logs, allOk),
    byHabit: HABITS.map(h => ({ h, n: streak(logs, h.ok) })),
  }), [logs])

  const last14 = useMemo(() => {
    const map = new Map(logs.map(l => [l.log_date, l]))
    return Array.from({ length: 14 }, (_, i) => {
      const d = addDays(new Date(), i - 13)
      const iso = toISODate(d)
      return { iso, label: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }), log: map.get(iso) }
    })
  }, [logs])

  /* ---------- Сон ---------- */
  const preview = buildSleep(sleepDate, bed, wake)
  const previewOk = preview.minutes > 0 && preview.minutes <= 20 * 60

  async function saveSleep(e: React.FormEvent) {
    e.preventDefault()
    if (!previewOk) return setError('Проверь время отбоя и подъема.')
    setSavingSleep(true)
    const { error } = await supabase.from('sleep_logs').upsert({
      user_id: userId, log_date: sleepDate,
      bedtime: preview.bedAt.toISOString(), wake_time: preview.wakeAt.toISOString(), quality,
    }, { onConflict: 'user_id,log_date' })
    setSavingSleep(false)
    if (error) return setError(error.message)
    setSleepSaved(true)
    load()
  }

  const sleepSeries = useMemo(() => {
    const map = new Map(sleep.map(s => [s.log_date, s]))
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(new Date(), i - 6)
      const s = map.get(toISODate(d))
      return {
        label: d.toLocaleDateString('ru-RU', { weekday: 'short' }),
        hours: s?.duration_minutes ? +(s.duration_minutes / 60).toFixed(1) : null,
      }
    })
  }, [sleep])

  const sleepStats = useMemo(() => {
    const recent = sleep.slice(-7).filter(s => s.duration_minutes)
    if (!recent.length) return null
    const avgMin = recent.reduce((a, s) => a + (s.duration_minutes ?? 0), 0) / recent.length
    // средний отбой: считаем минуты от 18:00, чтобы 23:30 и 00:30 усреднялись корректно
    const offs = recent.map(s => {
      const d = new Date(s.bedtime)
      return (d.getHours() * 60 + d.getMinutes() - 18 * 60 + 1440) % 1440
    })
    const avgBed = (offs.reduce((a, b) => a + b, 0) / offs.length + 18 * 60) % 1440
    return { avgMin, avgBed: `${String(Math.floor(avgBed / 60)).padStart(2, '0')}:${String(Math.round(avgBed % 60)).padStart(2, '0')}` }
  }, [sleep])

  if (loading) return <PageLoader />

  return (
    <>
      <PageHeader title="Сон и дисциплина" subtitle="Режим сна, лимит соцсетей и серии без срывов" />
      <ErrorBanner message={error} onClose={() => setError(null)} />

      {/* Стрики */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="col-span-2 rounded-xl border border-[#1c1d21] bg-[#0d0e10] px-4 py-3 lg:col-span-1">
          <div className="flex items-center gap-2 text-xs text-[#6b6f78]"><Flame size={13} className={streaks.all ? 'text-amber-400' : ''} />Все привычки</div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-3xl font-semibold tabular-nums tracking-tight">{streaks.all}</span>
            <span className="text-xs text-[#5b5f66]">дн. подряд</span>
          </div>
        </div>
        {streaks.byHabit.map(({ h, n }) => {
          const Icon = ICONS[h.key]
          return (
            <div key={h.key} className="rounded-xl border border-[#1c1d21] bg-[#0d0e10] px-4 py-3">
              <div className="flex items-center gap-2 truncate text-xs text-[#6b6f78]"><Icon size={13} />{h.label}</div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold tabular-nums tracking-tight">{n}</span>
                <span className="text-xs text-[#5b5f66]">дн.</span>
              </div>
              <div className="mt-2.5 flex gap-[3px]" aria-label="Последние 14 дней">
                {last14.map(d => (
                  <span
                    key={d.iso}
                    title={d.label}
                    className="h-3 flex-1 rounded-[2px]"
                    style={{ background: !d.log ? '#1a1b1f' : h.ok(d.log) ? '#4fae7a' : '#b4565a' }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Привычки сегодня */}
        <Card>
          <CardHeader title="Сегодня" hint="отмечай по ходу дня — запись создается автоматически" />
          <CardBody className="space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] text-[#c9cacd]"><Camera size={14} className="text-[#6b6f78]" />Instagram</span>
                <span className={cx('text-xs tabular-nums', igOver ? 'text-[#e5676b]' : 'text-[#8a8f98]')}>
                  {igMinutes} / {INSTAGRAM_LIMIT} мин
                </span>
              </div>
              <ProgressBar value={(igMinutes / INSTAGRAM_LIMIT) * 100} color={igOver ? '#e5676b' : '#6fcf97'} className="mt-2.5" />
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" icon={Minus} aria-label="Минус 5 минут" onClick={() => setIg(igMinutes - 5)} />
                <input
                  type="number" min={0} inputMode="numeric" className={`${inputCls} h-8 w-20 text-center tabular-nums`}
                  value={igDraft}
                  onChange={e => setIgDraft(e.target.value)}
                  onBlur={() => setIg(Number(igDraft) || 0)}
                />
                <Button size="sm" icon={Plus} aria-label="Плюс 5 минут" onClick={() => setIg(igMinutes + 5)} />
                <span className="text-xs text-[#5b5f66]">мин сегодня</span>
              </div>
              {igOver && <p className="mt-2 text-xs text-[#e5676b]">Лимит превышен — серия по Instagram обнулится.</p>}
            </div>

            <ul className="divide-y divide-[#141518] border-t border-[#141518]">
              {([
                { key: 'nutrition' as const,    label: 'Питание по плану', icon: Utensils,   value: todayLog?.nutrition_ok ?? false },
                { key: 'no_scrolling' as const, label: 'Без скроллинга',   icon: Smartphone, value: todayLog?.no_scrolling ?? false },
                { key: 'no_porn' as const,      label: 'Без порно',        icon: EyeOff,     value: todayLog?.no_porn ?? false },
              ]).map(r => (
                <li key={r.key} className="flex items-center justify-between py-3">
                  <span className="flex items-center gap-2.5 text-[13px] text-[#c9cacd]"><r.icon size={14} className="text-[#6b6f78]" />{r.label}</span>
                  <Toggle checked={r.value} label={r.label} onChange={v => saveHabit({ [r.key]: v })} />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        {/* Сон */}
        <Card>
          <CardHeader title="Логирование сна" icon={Moon} hint="дата — день пробуждения" />
          <CardBody>
            <form onSubmit={saveSleep} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs text-[#8a8f98]">Дата</span>
                  <input type="date" className={`${inputCls} h-9`} value={sleepDate} max={today} onChange={e => setSleepDate(e.target.value)} required />
                </label>
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1 text-xs text-[#8a8f98]"><Moon size={11} />Отбой</span>
                  <input type="time" className={`${inputCls} h-9`} value={bed} onChange={e => setBed(e.target.value)} required />
                </label>
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1 text-xs text-[#8a8f98]"><Sunrise size={11} />Подъем</span>
                  <input type="time" className={`${inputCls} h-9`} value={wake} onChange={e => setWake(e.target.value)} required />
                </label>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-[#1c1d21] bg-[#0a0b0c] px-4 py-3">
                <span className="text-xs text-[#8a8f98]">Продолжительность</span>
                <span className={cx('text-lg font-semibold tabular-nums', !previewOk ? 'text-[#e5676b]' : preview.minutes >= 420 ? 'text-[#6fcf97]' : 'text-[#e0b25c]')}>
                  {previewOk ? fmtDuration(preview.minutes * 60) : '—'}
                </span>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-xs text-[#8a8f98]"><span>Самочувствие после сна</span><span className="tabular-nums">{quality}/10</span></div>
                <input type="range" min={1} max={10} value={quality} onChange={e => setQuality(+e.target.value)} className="w-full accent-[#5e6ad2]" />
              </div>

              <Button type="submit" variant="primary" size="lg" className="w-full" loading={savingSleep} icon={sleepSaved ? Check : undefined}>
                {sleepSaved ? 'Сохранено' : sleep.some(s => s.log_date === sleepDate) ? 'Обновить запись' : 'Сохранить сон'}
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* График сна */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Сон за 7 дней"
            hint={sleepStats ? `в среднем ${fmtDuration(sleepStats.avgMin * 60)} · средний отбой ${sleepStats.avgBed}` : 'нет записей'}
          />
          <CardBody>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sleepSeries} margin={{ left: -22, right: 4, top: 8 }}>
                  <CartesianGrid stroke="#16171a" vertical={false} />
                  <XAxis dataKey="label" stroke="#5b5f66" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 12]} ticks={[0, 4, 8, 12]} stroke="#5b5f66" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip {...TOOLTIP} formatter={(v: any) => [`${v} ч`, 'Сон']} />
                  <ReferenceLine y={SLEEP_TARGET_H} stroke="#34373e" strokeDasharray="4 4" />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    {sleepSeries.map((d, i) => <Cell key={i} fill={(d.hours ?? 0) >= 7 ? '#5eb0d6' : '#e0b25c'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  )
}
