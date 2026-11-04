'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import {
  AlertTriangle, BedDouble, Camera, Check, Droplets, Dumbbell, Flame, Footprints, Minus, Moon, Pill, Plus,
  Smartphone, Sunrise, Swords, Utensils, Wind, Zap, type LucideIcon,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { GRADIENTS, toISODate } from '@/lib/constants'
import { addDays, cx, fmtDuration } from '@/lib/utils'
import { HABIT_COLS, INSTAGRAM_LIMIT, type HabitLog } from '@/lib/habits'
import {
  BODY_COLS, SLEEP_COLS, TARGETS, WORKOUTS, avgBedtime, buildSleep, computeMetrics, emptyBody, rpeColor,
  type BodyLog, type SleepLog, type WorkoutType,
} from '@/lib/body'
import {
  Button, Card, CardBody, CardHeader, ErrorBanner, GradientRing, PageHeader, PageLoader, ProgressBar, Toggle, inputCls,
} from '@/components/ui'

const WORKOUT_ICONS: Record<WorkoutType, LucideIcon> = {
  gym_hypertrophy: Dumbbell, gym_legs: Dumbbell, gym_upper: Dumbbell, run: Footprints, kickboxing: Swords, rest: BedDouble,
}
const MINUTE_PRESETS = [30, 45, 60, 90]
const TOOLTIP = {
  contentStyle: { background: '#0e1017', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12, color: '#e6e6e8' },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
  labelStyle: { color: '#8a8f98' },
}

type DbResult = PromiseLike<{ error: { message: string } | null }>

export default function BodyPage() {
  const { userId } = useAuth()
  const today = toISODate(new Date())

  const [habits, setHabits] = useState<HabitLog[]>([])
  const [sleep, setSleep] = useState<SleepLog[]>([])
  const [body, setBody] = useState<BodyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // форма сна
  const [sleepDate, setSleepDate] = useState(today)
  const [bed, setBed] = useState('23:30')
  const [wake, setWake] = useState('07:00')
  const [quality, setQuality] = useState(7)
  const [savingSleep, setSavingSleep] = useState(false)
  const [sleepSaved, setSleepSaved] = useState(false)

  // очередь записей: гарантирует, что последнее значение запишется последним
  const queue = useRef<Promise<void>>(Promise.resolve())
  const enqueue = (fn: () => DbResult) => {
    queue.current = queue.current.then(async () => {
      const { error } = await fn()
      if (error) setError(error.message)
    })
  }

  const load = useCallback(async () => {
    const [h, s, b] = await Promise.all([
      supabase.from('habit_logs').select(HABIT_COLS).gte('log_date', toISODate(addDays(new Date(), -13))),
      supabase.from('sleep_logs').select(SLEEP_COLS).gte('log_date', toISODate(addDays(new Date(), -29))).order('log_date'),
      supabase.from('body_logs').select(BODY_COLS).gte('log_date', toISODate(addDays(new Date(), -13))),
    ])
    const err = h.error ?? s.error ?? b.error
    if (err) setError(err.message)
    setHabits((h.data ?? []) as HabitLog[])
    setSleep((s.data ?? []) as SleepLog[])
    setBody((b.data ?? []) as BodyLog[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // при смене даты подставляем уже сохраненный сон
  useEffect(() => {
    const ex = sleep.find(s => s.log_date === sleepDate)
    if (ex) {
      const b = new Date(ex.bedtime), w = new Date(ex.wake_time)
      setBed(`${String(b.getHours()).padStart(2, '0')}:${String(b.getMinutes()).padStart(2, '0')}`)
      setWake(`${String(w.getHours()).padStart(2, '0')}:${String(w.getMinutes()).padStart(2, '0')}`)
      if (ex.quality) setQuality(ex.quality)
    }
    setSleepSaved(false)
  }, [sleepDate, sleep])

  /* ---------- Сегодняшние записи ---------- */
  const habitToday: HabitLog = habits.find(h => h.log_date === today) ?? {
    log_date: today, instagram_minutes: 0, nutrition_ok: false, no_porn: false, no_scrolling: false, focus_mode_ok: false,
  }
  const hasHabitToday = habits.some(h => h.log_date === today)
  const bodyToday: BodyLog = body.find(b => b.log_date === today) ?? emptyBody(today)
  const hasBodyToday = body.some(b => b.log_date === today)

  function saveHabit(values: Partial<HabitLog>) {
    const next = { ...habitToday, ...values }
    setHabits(p => [...p.filter(h => h.log_date !== today), next])
    enqueue(() => supabase.from('habit_logs').upsert({ user_id: userId, ...next }, { onConflict: 'user_id,log_date' }))
  }

  function saveBody(values: Partial<BodyLog>) {
    const next = { ...bodyToday, ...values }
    setBody(p => [...p.filter(b => b.log_date !== today), next])
    enqueue(() => supabase.from('body_logs').upsert({ user_id: userId, ...next }, { onConflict: 'user_id,log_date' }))
  }

  /* ---------- Метрики ---------- */
  const m = useMemo(
    () => computeMetrics(sleep, hasHabitToday ? habitToday : undefined, hasBodyToday ? bodyToday : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sleep, habits, body],
  )

  const preview = buildSleep(sleepDate, bed, wake)
  const previewOk = preview.minutes > 0 && preview.minutes <= 20 * 60

  async function saveSleep(e: React.FormEvent) {
    e.preventDefault()
    if (!previewOk) return setError('Проверь время отбоя и подъема.')
    setSavingSleep(true)
    const { error } = await supabase.from('sleep_logs').upsert(
      {
        user_id: userId, log_date: sleepDate,
        bedtime: preview.bedAt.toISOString(), wake_time: preview.wakeAt.toISOString(), quality,
      },
      { onConflict: 'user_id,log_date' },
    )
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

  const week = useMemo(() => {
    const map = new Map(body.map(b => [b.log_date, b]))
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(new Date(), i - 6)
      return { iso: toISODate(d), label: d.toLocaleDateString('ru-RU', { weekday: 'short' }), log: map.get(toISODate(d)) }
    })
    const load = days.reduce((s, d) => s + (d.log && d.log.workout_type !== 'rest' ? d.log.workout_minutes * (d.log.workout_rpe ?? 0) : 0), 0)
    const sessions = days.filter(d => d.log?.workout_type && d.log.workout_type !== 'rest').length
    return { days, load, sessions }
  }, [body])

  const avgBed = avgBedtime(sleep.slice(-7))
  const avgSleepMin = (() => {
    const r = sleep.slice(-7).filter(s => s.duration_minutes)
    return r.length ? r.reduce((a, s) => a + (s.duration_minutes ?? 0), 0) / r.length : null
  })()

  const debtTone = m.debtMin < 120 ? '#10b981' : m.debtMin < TARGETS.sleepDebtCriticalMin ? '#f59e0b' : '#ef4444'
  const igOver = habitToday.instagram_minutes > INSTAGRAM_LIMIT
  const isRest = bodyToday.workout_type === 'rest'

  if (loading) return <PageLoader />

  return (
    <>
      <PageHeader
        title="Тело и Восстановление"
        subtitle={new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
      />
      <ErrorBanner message={error} onClose={() => setError(null)} />

      {/* ---------- Кольца Whoop ---------- */}
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <RingCard
          title="Recovery" value={m.recovery} {...GRADIENTS.recovery}
          hint={m.recovery == null ? 'Запиши сон, чтобы получить оценку' : m.recovery >= 67 ? 'Готов к высокой нагрузке' : m.recovery >= 34 ? 'Умеренная нагрузка' : 'Нужен отдых'}
          lines={[
            ['Качество сна', m.lastSleep?.quality != null ? `${m.lastSleep.quality}/10` : '—'],
            ['Соблюдение режима', m.adherence != null ? `${Math.round(m.adherence * 100)}%` : '—'],
          ]}
        />
        <RingCard
          title="Sleep Performance" value={m.sleepPerf} {...GRADIENTS.sleep}
          hint={m.lastSleep?.duration_minutes ? `${fmtDuration(m.lastSleep.duration_minutes * 60)} из ${fmtDuration(TARGETS.sleepMin * 60)}` : 'Нет записи за последнюю ночь'}
          lines={[
            ['Регулярность отбоя', m.regularity != null ? `${m.regularity}%` : 'нужно ≥ 3 ночей'],
            ['Sleep Debt', fmtDuration(m.debtMin * 60)],
          ]}
        />
        <RingCard
          title="Fuel / Nutrition" value={m.fuel} {...GRADIENTS.recovery}
          hint={m.fuel == null ? 'Внеси питание за сегодня' : `${bodyToday.calories} ккал · ${bodyToday.protein_g} г белка`}
          lines={[
            ['Вода', `${(bodyToday.water_ml / 1000).toFixed(1)} / ${(TARGETS.waterMl / 1000).toFixed(1)} л`],
            ['План питания', habitToday.nutrition_ok ? 'без срывов' : 'не отмечен'],
          ]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---------- Сон ---------- */}
        <Card className="lg:row-span-2">
          <CardHeader title="Sleep" icon={Moon} hint="дата — день пробуждения" />
          <CardBody className="space-y-5">
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

              <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#0a0c11] px-4 py-3">
                <span className="text-xs text-[#8a8f98]">Продолжительность</span>
                <span
                  className="bg-clip-text text-xl font-semibold tabular-nums text-transparent"
                  style={{ backgroundImage: `linear-gradient(90deg, ${GRADIENTS.sleep.from}, ${GRADIENTS.sleep.to})` }}
                >
                  {previewOk ? fmtDuration(preview.minutes * 60) : '—'}
                </span>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-xs text-[#8a8f98]">
                  <span>Качество сна</span><span className="tabular-nums">{quality}/10</span>
                </div>
                <input type="range" min={1} max={10} value={quality} onChange={e => setQuality(+e.target.value)} className="w-full accent-cyan-400" />
              </div>

              <Button type="submit" variant="primary" size="lg" className="w-full" loading={savingSleep} icon={sleepSaved ? Check : undefined}>
                {sleepSaved ? 'Сохранено' : sleep.some(s => s.log_date === sleepDate) ? 'Обновить запись' : 'Сохранить сон'}
              </Button>
            </form>

            {/* Sleep Debt */}
            <div className="rounded-lg border border-white/[0.06] bg-[#0a0c11] p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs text-[#8a8f98]">
                  <AlertTriangle size={13} style={{ color: debtTone }} />Sleep Debt · 7 дней
                </span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: debtTone }}>{fmtDuration(m.debtMin * 60)}</span>
              </div>
              <ProgressBar value={(m.debtMin / TARGETS.sleepDebtCriticalMin) * 100} color={debtTone} className="mt-3" />
              <p className="mt-2 text-[11px] text-[#5b5f66]">Цель — {fmtDuration(TARGETS.sleepMin * 60)} в сутки. Учитываются ночи с записью.</p>
            </div>

            {/* График */}
            <div>
              <div className="mb-2 flex items-baseline justify-between text-xs text-[#8a8f98]">
                <span>Динамика за неделю</span>
                <span className="tabular-nums text-[#5b5f66]">
                  {avgSleepMin != null ? `среднее ${fmtDuration(avgSleepMin * 60)}` : ''}{avgBed ? ` · отбой ${avgBed}` : ''}
                </span>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sleepSeries} margin={{ left: -22, right: 4, top: 8 }}>
                    <defs>
                      <linearGradient id="sleepBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={GRADIENTS.sleep.from} />
                        <stop offset="100%" stopColor={GRADIENTS.sleep.to} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="label" stroke="#5b5f66" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 12]} ticks={[0, 4, 8, 12]} stroke="#5b5f66" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip {...TOOLTIP} formatter={(v: any) => [`${v} ч`, 'Сон']} />
                    <ReferenceLine y={TARGETS.sleepMin / 60} stroke="#06b6d4" strokeOpacity={0.5} strokeDasharray="4 4"
                      label={{ value: '8.5 ч', position: 'right', fill: '#5b5f66', fontSize: 10 }} />
                    <Bar dataKey="hours" radius={[5, 5, 0, 0]} maxBarSize={34}>
                      {sleepSeries.map((d, i) => (
                        <Cell key={i} fill="url(#sleepBar)" fillOpacity={(d.hours ?? 0) >= 7 ? 1 : 0.45} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* ---------- Daily Fuel ---------- */}
        <Card>
          <CardHeader title="Daily Fuel" icon={Utensils} hint="питание и атлетический режим" />
          <CardBody className="space-y-5">
            <Meter
              icon={Flame} label="Калории" unit="ккал" value={bodyToday.calories} target={TARGETS.kcal} step={100}
              {...GRADIENTS.recovery} onChange={v => saveBody({ calories: v })}
            />
            <Meter
              icon={Zap} label="Белок" unit="г" value={bodyToday.protein_g} target={TARGETS.protein} step={10}
              {...GRADIENTS.focus} onChange={v => saveBody({ protein_g: v })}
            />
            <Meter
              icon={Droplets} label="Вода" unit="мл" value={bodyToday.water_ml} target={TARGETS.waterMl} step={250}
              quick={[250, 500]} {...GRADIENTS.sleep} onChange={v => saveBody({ water_ml: v })}
            />

            <ul className="divide-y divide-white/[0.05] border-t border-white/[0.05]">
              <CheckRow icon={Pill} label="Креатин (5 г)" checked={bodyToday.creatine} onChange={v => saveBody({ creatine: v })} />
              <CheckRow icon={Utensils} label="Питание по плану (без срывов)" checked={habitToday.nutrition_ok} onChange={v => saveHabit({ nutrition_ok: v })} />
              <CheckRow icon={Wind} label="Растяжка / МФР" checked={bodyToday.stretching} onChange={v => saveBody({ stretching: v })} />
            </ul>
          </CardBody>
        </Card>

        {/* ---------- Тренировка ---------- */}
        <Card>
          <CardHeader
            title="Тренировка дня"
            icon={Dumbbell}
            hint={`неделя: ${week.sessions} тренир. · нагрузка ${Math.round(week.load)} AU`}
          />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {WORKOUTS.map(w => {
                const Icon = WORKOUT_ICONS[w.key]
                const active = bodyToday.workout_type === w.key
                return (
                  <button
                    key={w.key}
                    type="button"
                    onClick={() => saveBody(
                      w.key === 'rest'
                        ? { workout_type: 'rest', workout_minutes: 0, workout_rpe: null }
                        : { workout_type: active ? null : w.key },
                    )}
                    className={cx(
                      'flex h-10 items-center gap-2 rounded-lg border px-3 text-left text-[13px] transition-colors',
                      active
                        ? 'border-lime-400/40 bg-lime-400/[0.08] text-white'
                        : 'border-white/[0.07] text-[#8a8f98] hover:bg-white/[0.03] hover:text-white',
                    )}
                  >
                    <Icon size={14} className={active ? 'text-lime-300' : ''} />
                    {w.label}
                  </button>
                )
              })}
            </div>

            {bodyToday.workout_type && !isRest && (
              <>
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-[#8a8f98]">
                    <span>Длительность</span>
                    <span className="tabular-nums text-[#c9cacd]">{bodyToday.workout_minutes} мин</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button size="sm" icon={Minus} aria-label="Минус 5 минут" onClick={() => saveBody({ workout_minutes: Math.max(0, bodyToday.workout_minutes - 5) })} />
                    <Button size="sm" icon={Plus} aria-label="Плюс 5 минут" onClick={() => saveBody({ workout_minutes: Math.min(600, bodyToday.workout_minutes + 5) })} />
                    {MINUTE_PRESETS.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => saveBody({ workout_minutes: p })}
                        className={cx(
                          'h-7 rounded-md border px-2.5 text-xs tabular-nums transition-colors',
                          bodyToday.workout_minutes === p ? 'border-lime-400/40 bg-lime-400/[0.08] text-white' : 'border-white/[0.07] text-[#8a8f98] hover:text-white',
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-[#8a8f98]">
                    <span>RPE — интенсивность</span>
                    <span className="tabular-nums text-[#c9cacd]">{bodyToday.workout_rpe ?? '—'}/10</span>
                  </div>
                  <div className="grid grid-cols-10 gap-1">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
                      const active = bodyToday.workout_rpe === n
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => saveBody({ workout_rpe: active ? null : n })}
                          className="h-8 rounded-md border text-xs tabular-nums transition-all"
                          style={active
                            ? { background: `${rpeColor(n)}26`, borderColor: `${rpeColor(n)}99`, color: '#fff' }
                            : { borderColor: 'rgba(255,255,255,0.07)', color: '#8a8f98' }}
                        >
                          {n}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Неделя */}
            <div className="grid grid-cols-7 gap-1.5 border-t border-white/[0.05] pt-4">
              {week.days.map(d => {
                const t = d.log?.workout_type
                const active = t && t !== 'rest'
                return (
                  <div key={d.iso} className="text-center">
                    <div
                      title={t ? `${d.log?.workout_minutes} мин · RPE ${d.log?.workout_rpe ?? '—'}` : 'нет данных'}
                      className="mx-auto grid h-8 w-full place-items-center rounded-md text-[11px] tabular-nums"
                      style={{
                        background: active ? `${rpeColor(d.log?.workout_rpe ?? 5)}26` : 'rgba(255,255,255,0.04)',
                        color: active ? '#fff' : '#4a4d55',
                      }}
                    >
                      {active ? (d.log?.workout_rpe ?? '·') : t === 'rest' ? '–' : ''}
                    </div>
                    <div className="mt-1 text-[10px] text-[#5b5f66]">{d.label}</div>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>

        {/* ---------- Дисциплина и дофамин ---------- */}
        <Card className="lg:col-span-2">
          <CardHeader title="Дисциплина и дофамин" icon={Smartphone} hint="лимит соцсетей и осознанный фокус" />
          <CardBody>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[13px] text-[#c9cacd]"><Camera size={14} className="text-[#6b6f78]" />Instagram</span>
                  <span className={cx('text-xs tabular-nums', igOver ? 'text-red-400' : 'text-[#8a8f98]')}>
                    {habitToday.instagram_minutes} / {INSTAGRAM_LIMIT} мин
                  </span>
                </div>
                <ProgressBar
                  value={(habitToday.instagram_minutes / INSTAGRAM_LIMIT) * 100}
                  {...(igOver ? { color: '#ef4444' } : GRADIENTS.recovery)}
                  className="mt-2.5"
                />
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Button size="sm" icon={Minus} aria-label="Минус 5 минут"
                    onClick={() => saveHabit({ instagram_minutes: Math.max(0, habitToday.instagram_minutes - 5) })} />
                  <Button size="sm" icon={Plus} aria-label="Плюс 5 минут"
                    onClick={() => saveHabit({ instagram_minutes: habitToday.instagram_minutes + 5 })} />
                  <Button size="sm" onClick={() => saveHabit({ instagram_minutes: habitToday.instagram_minutes + 15 })}>+15</Button>
                  <Button size="sm" variant="ghost" onClick={() => saveHabit({ instagram_minutes: 0 })}>Сброс</Button>
                </div>
                {igOver && <p className="mt-2 text-xs text-red-400">Лимит превышен — серия по Instagram обнулится.</p>}
              </div>

              <ul className="divide-y divide-white/[0.05]">
                <CheckRow icon={Smartphone} label="Без бессмысленного скроллинга" checked={habitToday.no_scrolling} onChange={v => saveHabit({ no_scrolling: v })} />
                <CheckRow icon={Zap} label="Фокус-режим соблюден" checked={habitToday.focus_mode_ok} onChange={v => saveHabit({ focus_mode_ok: v })} />
              </ul>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  )
}

/* ---------- Локальные компоненты ---------- */

function RingCard({ title, value, from, to, hint, lines }: {
  title: string; value: number | null; from: string; to: string; hint: string; lines: [string, string][]
}) {
  return (
    <Card className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-[0.16] blur-3xl"
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      />
      <div className="relative flex items-center gap-5 p-5">
        <GradientRing value={value} size={120} stroke={10} from={from} to={to}>
          <div className="text-center">
            <div className="text-[28px] font-semibold leading-none tabular-nums">
              {value ?? '—'}
              {value != null && <span className="ml-0.5 text-sm font-normal text-[#6b6f78]">%</span>}
            </div>
          </div>
        </GradientRing>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#6b6f78]">{title}</div>
          <div className="mt-1 text-[13px] leading-snug text-[#c9cacd]">{hint}</div>
          <dl className="mt-3 space-y-1">
            {lines.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 text-xs">
                <dt className="text-[#5b5f66]">{k}</dt>
                <dd className="tabular-nums text-[#8a8f98]">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Card>
  )
}

function Meter({ icon: Icon, label, unit, value, target, step, quick, from, to, onChange }: {
  icon: LucideIcon; label: string; unit: string; value: number; target: number; step: number
  quick?: number[]; from: string; to: string; onChange: (v: number) => void
}) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => { setDraft(String(value)) }, [value])
  const commit = (n: number) => onChange(Math.max(0, Math.round(n)))

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[13px] text-[#c9cacd]"><Icon size={14} className="text-[#6b6f78]" />{label}</span>
        <span className="text-xs tabular-nums text-[#8a8f98]">{Math.round((value / target) * 100)}% · цель {target} {unit}</span>
      </div>
      <ProgressBar value={(value / target) * 100} from={from} to={to} className="mt-2.5" />
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Button size="sm" icon={Minus} aria-label={`Минус ${step}`} onClick={() => commit(value - step)} />
        <input
          type="number" min={0} inputMode="numeric" aria-label={label}
          className={`${inputCls} h-7 w-24 text-center text-xs tabular-nums`}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => commit(Number(draft) || 0)}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        />
        <Button size="sm" icon={Plus} aria-label={`Плюс ${step}`} onClick={() => commit(value + step)} />
        {quick?.map(q => <Button key={q} size="sm" variant="ghost" onClick={() => commit(value + q)}>+{q}</Button>)}
        <span className="text-xs text-[#5b5f66]">{unit}</span>
      </div>
    </div>
  )
}

function CheckRow({ icon: Icon, label, checked, onChange }: {
  icon: LucideIcon; label: ReactNode; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <span className="flex items-center gap-2.5 text-[13px] text-[#c9cacd]"><Icon size={14} className="text-[#6b6f78]" />{label}</span>
      <Toggle checked={checked} label={typeof label === 'string' ? label : 'Переключатель'} onChange={onChange} />
    </li>
  )
}
