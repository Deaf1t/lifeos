'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  Flame,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
  ShieldAlert,
  Dumbbell,
  Utensils,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Brain,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Card, Button, ProgressBar, GradientRing, SphereTag } from '@/components/ui'
import { SPHERES, type Sphere } from '@/lib/constants'
import { cx } from '@/lib/utils'
import FocusTimer from '@/components/FocusTimer'
import AukDeadlinesCard from '@/components/AukDeadlinesCard'

interface DashboardTask {
  id: string
  title: string
  sphere: Sphere
  project: string | null
  bucket: 'top3' | 'sprint' | 'inbox'
  status: 'pending' | 'completed'
  score: number | null
}

interface DashboardBody {
  calories: number
  protein_g: number
  water_ml: number
  creatine: boolean
  workout_type: string | null
}

interface DashboardHabit {
  instagram_minutes: number
  nutrition_ok: boolean
  no_scrolling: boolean
  focus_mode_ok: boolean
}

interface DashboardProject {
  id: string
  title: string
  client_name: string
  stage: 'lead' | 'in_progress' | 'review' | 'paid'
  amount_usd: number
  video_minutes: number
  spent_minutes: number
  market: 'ua' | 'eu' | 'us'
  source: string | null
}

interface DashboardReview {
  score: number | null
  ai_analysis: string | null
}

export default function Dashboard() {
  const { user } = useAuth()
  const [, setLoading] = useState(true)

  const [topTasks, setTopTasks] = useState<DashboardTask[]>([])
  const [bodyData, setBodyData] = useState<DashboardBody | null>(null)
  const [habitData, setHabitData] = useState<DashboardHabit | null>(null)
  const [projects, setProjects] = useState<DashboardProject[]>([])
  const [todayReview, setTodayReview] = useState<DashboardReview | null>(null)
  const [usdRate, setUsdRate] = useState<number>(41.5)

  const todayStr = new Date().toISOString().split('T')[0]

  // Получение актуального курса НБУ
  const fetchUsdRate = useCallback(async () => {
    try {
      const res = await fetch(
        'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json',
      )
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data[0]?.rate) {
          setUsdRate(Number(data[0].rate))
        }
      }
    } catch {
      setUsdRate(41.5)
    }
  }, [])

  // Загрузка всех данных дашборда
  const loadDashboardData = useCallback(async () => {
    if (!user) return
    setLoading(false)

    const [tasksRes, bodyRes, habitRes, projectsRes, reviewRes] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('body_logs').select('*').eq('log_date', todayStr).maybeSingle(),
      supabase.from('habit_logs').select('*').eq('log_date', todayStr).maybeSingle(),
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('daily_reviews').select('*').eq('review_date', todayStr).maybeSingle(),
    ])

    if (tasksRes.data) {
      const top3 = tasksRes.data.filter((t: any) => t.bucket === 'top3')
      setTopTasks(top3 as DashboardTask[])
    }

    if (bodyRes.data) {
      setBodyData(bodyRes.data as DashboardBody)
    }

    if (habitRes.data) {
      setHabitData(habitRes.data as DashboardHabit)
    }

    if (projectsRes.data) {
      setProjects(projectsRes.data as DashboardProject[])
    }

    if (reviewRes.data) {
      setTodayReview({
        score: reviewRes.data.day_score ?? reviewRes.data.score ?? null,
        ai_analysis: reviewRes.data.ai_analysis ?? null,
      })
    }
  }, [user, todayStr])

  useEffect(() => {
    fetchUsdRate()
    loadDashboardData()
  }, [fetchUsdRate, loadDashboardData])

  // Переключение статуса задачи
  const handleToggleTask = async (task: DashboardTask) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed'
    const { error } = await supabase
      .from('tasks')
      .update({ status: nextStatus })
      .eq('id', task.id)

    if (!error) {
      setTopTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)),
      )
    }
  }

  // Расчет Whoop Recovery
  const calculateRecovery = () => {
    let score = 70
    if (bodyData?.workout_type && bodyData.workout_type !== 'rest') score += 10
    if (habitData?.focus_mode_ok) score += 10
    if (habitData?.no_scrolling) score += 5
    if (bodyData?.protein_g && bodyData.protein_g >= 140) score += 5
    return Math.min(score, 98)
  }

  const recoveryScore = calculateRecovery()
  const igMinutes = habitData?.instagram_minutes ?? 0

  // Расчет финансов
  const paidRevenue = useMemo(() => {
    return projects
      .filter((p) => p.stage === 'paid')
      .reduce((sum, p) => sum + Number(p.amount_usd), 0)
  }, [projects])

  const inPipelineRevenue = useMemo(() => {
    return projects
      .filter((p) => p.stage !== 'paid')
      .reduce((sum, p) => sum + Number(p.amount_usd), 0)
  }, [projects])

  // Текущий проект в активном монтаже
  const activeEditingProject = useMemo(() => {
    return (
      projects.find((p) => p.stage === 'in_progress') ||
      projects.find((p) => p.stage === 'review')
    )
  }, [projects])

  const dateFormatted = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  return (
    <div className="space-y-8">
      {/* Верхний бар */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
              Система активна
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white capitalize">
            {dateFormatted}
          </h1>
          <p className="text-xs text-[#8a8f98]">
            Коммерческий монтаж, физическая форма и объективный контроль фокуса
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Тикер курса USD/UAH */}
          <div
            title="Официальный курс НБУ"
            className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#0c0d12] px-3 py-1.5 text-xs shadow-inner"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[#8a8f98] font-medium">USD/UAH:</span>
            <span className="font-mono font-bold text-white">{usdRate.toFixed(2)} ₴</span>
          </div>

          <Link href="/review">
            <Button
              variant="outline"
              size="md"
              className="border-white/[0.08] bg-white/[0.03] text-white hover:border-white/20 hover:bg-white/[0.06] shadow-lg shadow-black/20"
            >
              <Sparkles size={14} className="mr-2 text-indigo-400" />
              Вечерний отчет
            </Button>
          </Link>
        </div>
      </div>

      {/* РЯД 1: 4 КЛЮЧЕВЫЕ МЕТРИКИ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Карточка 1: Whoop Recovery */}
        <Card className="flex items-center justify-between border-white/[0.07] bg-[#0c0d12]/90 p-5 backdrop-blur-xl">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">
              Whoop Recovery
            </span>
            <div className="mt-1 font-mono text-3xl font-extrabold tracking-tight tabular-nums text-white">
              {recoveryScore}%
            </div>
            <span className="text-[11px] font-medium text-emerald-400">
              Высокая готовность
            </span>
          </div>
          <GradientRing
            value={recoveryScore}
            size={68}
            strokeWidth={6}
            from="#10b981"
            to="#84cc16"
          />
        </Card>

        {/* Карточка 2: Доход ($ и ₴) */}
        <Link href="/projects" className="block group">
          <Card className="border-white/[0.07] bg-[#0c0d12]/90 p-5 backdrop-blur-xl group-hover:border-white/15 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">
                Закрыто (Оплачено)
              </span>
              <DollarSign size={16} className="text-emerald-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-extrabold text-emerald-400">
                ${paidRevenue.toLocaleString()}
              </span>
              <span className="font-mono text-xs text-[#8a8f98]">
                ≈ {Math.round(paidRevenue * usdRate).toLocaleString('ru-RU')} ₴
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-[#6b6f78]">
              <span>В работе: ${inPipelineRevenue.toLocaleString()}</span>
              <span className="text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center">
                Пайплайн <ChevronRight size={11} />
              </span>
            </div>
          </Card>
        </Link>

        {/* Карточка 3: AI Оценка Дня (Gemini) */}
        <Link href="/review" className="block group">
          <Card className="border-white/[0.07] bg-[#0c0d12]/90 p-5 backdrop-blur-xl group-hover:border-white/15 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98] flex items-center gap-1.5">
                <Brain size={13} className="text-indigo-400" /> Аудит дня
              </span>
              <Sparkles size={14} className="text-indigo-400" />
            </div>
            <div className="mt-1 font-mono text-3xl font-extrabold tracking-tight tabular-nums text-white">
              {todayReview?.score !== null && todayReview?.score !== undefined ? (
                <>
                  {todayReview.score}
                  <span className="text-lg font-normal text-[#6b6f78]">/10</span>
                </>
              ) : (
                <span className="text-xl font-bold text-[#5b5f66]">Не рассчитан</span>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-[#8a8f98]">
                {todayReview?.score ? 'Оценка зафиксирована' : 'Ждет рефлексии'}
              </span>
              <span className="text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center">
                Обзор <ChevronRight size={11} />
              </span>
            </div>
          </Card>
        </Link>

        {/* Карточка 4: Instagram Focus */}
        <Card className="flex items-center justify-between border-white/[0.07] bg-[#0c0d12]/90 p-5 backdrop-blur-xl">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">
              Instagram (≤ 30м)
            </span>
            <div className="mt-1 font-mono text-3xl font-extrabold tracking-tight tabular-nums text-white">
              {igMinutes}
              <span className="text-sm font-normal text-[#6b6f78]">м</span>
            </div>
            <span
              className={cx(
                'text-[11px] font-medium',
                igMinutes <= 30 ? 'text-emerald-400' : 'text-rose-400',
              )}
            >
              {igMinutes <= 30 ? 'В пределах нормы' : 'Превышение лимита'}
            </span>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
            <ShieldAlert size={22} />
          </div>
        </Card>
      </div>

      {/* РЯД 2: ЦЕНТРАЛЬНЫЙ БЛОК */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* ЛЕВАЯ ЧАСТЬ (7 колонок) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Активный проект в монтаже */}
          {activeEditingProject && (
            <Card className="border-indigo-500/30 bg-gradient-to-r from-indigo-950/20 to-[#0c0d12]/90 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                    Сейчас в монтаже (PR/AE)
                  </span>
                </div>
                <Link
                  href="/projects"
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  В пайплайн <ChevronRight size={12} />
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                <div>
                  <div className="text-xs text-[#8a8f98]">{activeEditingProject.client_name}</div>
                  <h3 className="text-sm font-bold text-white mt-0.5">
                    {activeEditingProject.title}
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-mono text-sm font-bold text-emerald-400">
                      ${activeEditingProject.amount_usd}
                    </div>
                    {activeEditingProject.video_minutes > 0 && (
                      <div className="font-mono text-[10px] text-amber-400">
                        ${Math.round(activeEditingProject.amount_usd / activeEditingProject.video_minutes)}/мин
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Top-3 Задачи */}
          <Card className="border-white/[0.07] bg-[#0c0d12]/90 p-6 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-amber-400" />
                <h2 className="text-sm font-semibold tracking-tight text-white">
                  Главные задачи на сегодня (Top-3)
                </h2>
              </div>
              <Link
                href="/tasks"
                className="flex items-center gap-1 text-xs font-medium text-indigo-400 transition-colors hover:text-indigo-300"
              >
                Все задачи <ArrowUpRight size={13} />
              </Link>
            </div>

            <div className="space-y-2.5">
              {topTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/[0.07] p-6 text-center">
                  <p className="text-xs text-[#6b6f78]">
                    Нет активных приоритетов дня. Сформируй Top-3 задачи во вкладке «Задачи».
                  </p>
                  <Link href="/tasks" className="mt-3 inline-block">
                    <Button variant="outline" size="sm">
                      Добавить в спринт
                    </Button>
                  </Link>
                </div>
              ) : (
                topTasks.map((task) => {
                  const isDone = task.status === 'completed'
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(task)}
                      className={cx(
                        'group flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3.5 py-3 transition-all duration-200',
                        isDone
                          ? 'border-white/[0.04] bg-white/[0.01]'
                          : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]',
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cx(
                            'grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors',
                            isDone
                              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                              : 'border-[#32353e] group-hover:border-white/50',
                          )}
                        >
                          {isDone && <CheckCircle2 size={12} />}
                        </div>
                        <span
                          className={cx(
                            'text-xs font-medium truncate transition-colors',
                            isDone ? 'line-through text-[#5b5f66]' : 'text-[#e6e6e8]',
                          )}
                        >
                          {task.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <SphereTag sphere={task.sphere} />
                        {task.project && (
                          <span className="hidden sm:inline-block max-w-[120px] truncate text-[11px] text-[#6b6f78]">
                            {task.project}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card>

          {/* Баланс сфер жизни */}
          <Card className="border-white/[0.07] bg-[#0c0d12]/90 p-6 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-[#06b6d4]" />
                <h2 className="text-sm font-semibold tracking-tight text-white">
                  Распределение усилий
                </h2>
              </div>
              <span className="text-[11px] text-[#6b6f78]">Фокус по ключевым направлениям</span>
            </div>

            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#c9cacd] font-medium">Моушн-дизайн (Клиенты)</span>
                  <span className="font-mono text-[#8a8f98]">50%</span>
                </div>
                <ProgressBar value={50} from="#6366f1" to="#06b6d4" />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#c9cacd] font-medium">Спорт & Восстановление</span>
                  <span className="font-mono text-[#8a8f98]">25%</span>
                </div>
                <ProgressBar value={25} from="#10b981" to="#84cc16" />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#c9cacd] font-medium">АЮК (Учеба)</span>
                  <span className="font-mono text-[#8a8f98]">15%</span>
                </div>
                <ProgressBar value={15} color="#e0b25c" />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#c9cacd] font-medium">Проекты (LifeOS & Dev)</span>
                  <span className="font-mono text-[#8a8f98]">10%</span>
                </div>
                <ProgressBar value={10} color="#a855f7" />
              </div>
            </div>
          </Card>
        </div>

        {/* ПРАВАЯ ЧАСТЬ (5 колонок) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Deep Work Pomodoro таймер со связкой $/час */}
          <FocusTimer
            projects={projects.filter((p) => p.stage !== 'paid')}
            onTimeLogged={loadDashboardData}
          />

          {/* Академический хаб АЮК с дедлайнами T-minus */}
          <AukDeadlinesCard />

          {/* Карточка атлетики и спортивного питания */}
          <Card className="border-white/[0.07] bg-[#0c0d12]/90 p-6 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell size={16} className="text-emerald-400" />
                <h2 className="text-sm font-semibold tracking-tight text-white">
                  Атлетический лог
                </h2>
              </div>
              <Link
                href="/body"
                className="text-xs font-medium text-emerald-400 hover:underline flex items-center gap-1"
              >
                Whoop экран <ChevronRight size={12} />
              </Link>
            </div>

            <div className="space-y-3 pt-1">
              {/* Прогресс белка */}
              <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3 text-xs">
                <div className="flex justify-between mb-1.5">
                  <span className="text-[#8a8f98] flex items-center gap-1.5">
                    <Utensils size={13} className="text-amber-400" /> Белок дня:
                  </span>
                  <span className="font-mono text-white font-semibold">
                    {bodyData?.protein_g ?? 0} / 160 г
                  </span>
                </div>
                <ProgressBar
                  value={Math.min(Math.round(((bodyData?.protein_g ?? 0) / 160) * 100), 100)}
                  color="#e0b25c"
                />
                <div className="mt-2 flex justify-between text-[10px] text-[#6b6f78]">
                  <span>
                    {bodyData?.creatine ? '⚡ Креатин принят' : '⚪ Без креатина'}
                  </span>
                  <span>{Math.round(((bodyData?.protein_g ?? 0) / 160) * 100)}% нормы</span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] p-3 text-xs">
                <span className="text-[#8a8f98]">Тренировка:</span>
                <span className="font-medium text-white capitalize">
                  {bodyData?.workout_type ? bodyData.workout_type.replace('_', ' ') : 'Не указана'}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] p-3 text-xs">
                <span className="text-[#8a8f98]">Калории дня:</span>
                <span className="font-mono font-medium text-white tabular-nums">
                  {bodyData?.calories ?? 0} / 2800 kcal
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] p-3 text-xs">
                <span className="text-[#8a8f98]">Вода (гидратация):</span>
                <span className="font-mono font-medium text-white tabular-nums">
                  {bodyData?.water_ml ? (bodyData.water_ml / 1000).toFixed(1) : '0'} / 3.0 L
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}