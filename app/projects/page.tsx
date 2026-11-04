'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  DollarSign,
  Plus,
  Trash2,
  Calendar,
  Briefcase,
  ChevronRight,
  TrendingUp,
  Clock,
  Gauge,
  Film,
  Share2,
  RefreshCw,
  Hourglass,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Button, Card, ProgressBar, inputCls } from '@/components/ui'
import { cx } from '@/lib/utils'

export type ProjectStage = 'lead' | 'in_progress' | 'review' | 'paid'
export type ProjectMarket = 'ua' | 'eu' | 'us'

export interface ProjectItem {
  id: string
  user_id: string
  client_name: string
  title: string
  stage: ProjectStage
  market: ProjectMarket
  source: string | null
  amount_usd: number
  video_minutes: number
  spent_minutes: number
  deadline: string | null
  created_at: string
}

const STAGES: { key: ProjectStage; label: string; color: string }[] = [
  { key: 'lead', label: 'Лид / Переговоры', color: '#6b6f78' },
  { key: 'in_progress', label: 'В монтаже (PR/AE)', color: '#6366f1' },
  { key: 'review', label: 'Правки / Рендер', color: '#e0b25c' },
  { key: 'paid', label: 'Сдано / Оплачено', color: '#10b981' },
]

const MARKETS: { key: ProjectMarket; label: string; flag: string }[] = [
  { key: 'ua', label: 'УКР', flag: '🇺🇦' },
  { key: 'eu', label: 'ЕС', flag: '🇪🇺' },
  { key: 'us', label: 'США', flag: '🇺🇸' },
]

const COMMON_SOURCES = [
  'Instagram',
  'Upwork',
  'Cold Outreach',
  'Сарафан / Рекомендация',
  'Telegram',
]

const MONTHLY_TARGET_USD = 2000

export default function ProjectsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [usdRate, setUsdRate] = useState<number>(41.5)
  const [rateLoading, setRateLoading] = useState(false)

  // Поля модального окна создания
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [clientName, setClientName] = useState('')
  const [title, setTitle] = useState('')
  const [amountUsd, setAmountUsd] = useState('')
  const [videoMinutes, setVideoMinutes] = useState('')
  const [market, setMarket] = useState<ProjectMarket>('ua')
  const [source, setSource] = useState('Instagram')
  const [stage, setStage] = useState<ProjectStage>('lead')
  const [deadline, setDeadline] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Получение актуального курса валют НБУ
  const fetchUsdRate = useCallback(async () => {
    setRateLoading(true)
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
    } finally {
      setRateLoading(false)
    }
  }, [])

  // Загрузка списка проектов
  const loadProjects = useCallback(async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setProjects(data as ProjectItem[])
    }
  }, [])

  useEffect(() => {
    loadProjects()
    fetchUsdRate()
  }, [loadProjects, fetchUsdRate])

  // Безопасное получение user_id
  const getUserId = async (): Promise<string | null> => {
    if (user?.id) return user.id
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  }

  // Создание проекта
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !clientName.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const userId = await getUserId()
      if (!userId) {
        alert('Сессия пользователя не найдена.')
        return
      }

      const newProj = {
        user_id: userId,
        client_name: clientName.trim(),
        title: title.trim(),
        stage,
        market,
        source: source.trim() || null,
        amount_usd: Number(amountUsd) || 0,
        video_minutes: Number(videoMinutes) || 0,
        spent_minutes: 0,
        deadline: deadline || null,
      }

      const { data, error } = await supabase.from('projects').insert(newProj).select().single()

      if (error) {
        alert(`Ошибка Supabase: ${error.message}`)
        return
      }

      if (data) {
        setProjects((prev) => [data as ProjectItem, ...prev])
        setIsModalOpen(false)
        setTitle('')
        setClientName('')
        setAmountUsd('')
        setVideoMinutes('')
        setDeadline('')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Смена статуса
  const handleUpdateStage = async (id: string, nextStage: ProjectStage) => {
    const { error } = await supabase.from('projects').update({ stage: nextStage }).eq('id', id)
    if (!error) {
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, stage: nextStage } : p)),
      )
    }
  }

  // Удаление проекта
  const handleDeleteProject = async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (!error) {
      setProjects((prev) => prev.filter((p) => p.id !== id))
    }
  }

  // Суммы доходов
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

  // Средний рейт $/мин
  const avgRatePerMinute = useMemo(() => {
    const valid = projects.filter((p) => Number(p.video_minutes) > 0 && Number(p.amount_usd) > 0)
    if (valid.length === 0) return 0
    const totalAmount = valid.reduce((s, p) => s + Number(p.amount_usd), 0)
    const totalMinutes = valid.reduce((s, p) => s + Number(p.video_minutes), 0)
    return totalMinutes > 0 ? Math.round(totalAmount / totalMinutes) : 0
  }, [projects])

  const targetProgress = Math.min(Math.round((paidRevenue / MONTHLY_TARGET_USD) * 100), 100)

  // Расчетный рейт в форме
  const formCalculatedRate = useMemo(() => {
    const amt = Number(amountUsd)
    const mins = Number(videoMinutes)
    if (amt > 0 && mins > 0) {
      return (amt / mins).toFixed(1)
    }
    return null
  }, [amountUsd, videoMinutes])

  return (
    <div className="space-y-8">
      {/* Шапка */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Пайплайн проектов и Доход</h1>
          <p className="mt-1 text-xs text-[#8a8f98]">
            Учет коммерческих заказов, рынков (УКР/ЕС/США), фактического $/час и курса НБУ
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
            <span className="font-mono font-bold text-white tracking-wide">
              {usdRate.toFixed(2)} ₴
            </span>
            <button
              onClick={fetchUsdRate}
              className="ml-1 text-[#6b6f78] hover:text-white transition-colors"
            >
              <RefreshCw size={11} className={rateLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-[#6366f1] to-[#06b6d4] text-xs font-semibold shadow-lg shadow-indigo-500/20"
          >
            <Plus size={14} className="mr-1.5" /> Новый проект
          </Button>
        </div>
      </div>

      {/* 4 Карточки ключевых метрик */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Карточка 1: Закрыто */}
        <Card className="border-white/[0.07] bg-[#0c0d12]/90 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">
              Закрыто (Оплачено)
            </span>
            <DollarSign size={16} className="text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="font-mono text-3xl font-extrabold text-emerald-400">
              ${paidRevenue.toLocaleString()}
            </div>
            <div className="font-mono text-xs text-[#8a8f98] mt-0.5">
              ≈ {Math.round(paidRevenue * usdRate).toLocaleString('ru-RU')} ₴
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[11px] mb-1 text-[#8a8f98]">
              <span>Цель: ${MONTHLY_TARGET_USD.toLocaleString()}</span>
              <span className="font-mono text-white">{targetProgress}%</span>
            </div>
            <ProgressBar value={targetProgress} from="#10b981" to="#06b6d4" className="h-1.5" />
          </div>
        </Card>

        {/* Карточка 2: В работе */}
        <Card className="border-white/[0.07] bg-[#0c0d12]/90 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">
              В работе (Потенциал)
            </span>
            <TrendingUp size={16} className="text-indigo-400" />
          </div>
          <div className="mt-2">
            <div className="font-mono text-3xl font-extrabold text-white">
              ${inPipelineRevenue.toLocaleString()}
            </div>
            <div className="font-mono text-xs text-[#8a8f98] mt-0.5">
              ≈ {Math.round(inPipelineRevenue * usdRate).toLocaleString('ru-RU')} ₴
            </div>
          </div>
          <p className="mt-3 text-[11px] text-[#6b6f78]">
            Сумма активных проектов в монтаже и правках
          </p>
        </Card>

        {/* Карточка 3: Средний рейт */}
        <Card className="border-white/[0.07] bg-[#0c0d12]/90 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">
              Средний рейт
            </span>
            <Gauge size={16} className="text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="font-mono text-3xl font-extrabold text-amber-400">
              ${avgRatePerMinute}
              <span className="text-xs text-[#8a8f98] font-normal ml-1">/ мин</span>
            </div>
            <div className="font-mono text-xs text-[#8a8f98] mt-0.5">
              ≈ {Math.round(avgRatePerMinute * usdRate).toLocaleString('ru-RU')} ₴ / мин
            </div>
          </div>
          <p className="mt-3 text-[11px] text-[#6b6f78]">
            Средняя ставка за 1 минуту чистого хронометража
          </p>
        </Card>

        {/* Карточка 4: Всего проектов */}
        <Card className="border-white/[0.07] bg-[#0c0d12]/90 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">
              Всего проектов
            </span>
            <Briefcase size={16} className="text-[#06b6d4]" />
          </div>
          <div className="mt-2 font-mono text-3xl font-extrabold text-white">
            {projects.length}
          </div>
          <p className="mt-4 text-[11px] text-[#6b6f78]">
            {projects.filter((p) => p.stage === 'in_progress').length} активно монтируются
          </p>
        </Card>
      </div>

      {/* Канбан-доска */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {STAGES.map((col) => {
          const colProjects = projects.filter((p) => p.stage === col.key)
          const colSum = colProjects.reduce((s, p) => s + Number(p.amount_usd), 0)

          return (
            <div key={col.key} className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: col.color }}
                  />
                  <h3 className="text-xs font-semibold text-white">{col.label}</h3>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs text-white font-semibold">${colSum}</div>
                  <div className="font-mono text-[10px] text-[#6b6f78]">
                    ≈ {Math.round(colSum * usdRate).toLocaleString('ru-RU')} ₴
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {colProjects.length === 0 && (
                  <div className="rounded-lg border border-dashed border-white/[0.05] p-4 text-center text-[11px] text-[#5b5f66]">
                    Пусто
                  </div>
                )}
                {colProjects.map((p) => {
                  const duration = Number(p.video_minutes) || 0
                  const spentMins = Number(p.spent_minutes) || 0
                  const spentHours = spentMins / 60
                  const ratePerMinute =
                    duration > 0 ? Math.round(Number(p.amount_usd) / duration) : null
                  const realHourlyRate =
                    spentHours > 0 ? Math.round(Number(p.amount_usd) / spentHours) : null

                  const marketMeta = MARKETS.find((m) => m.key === p.market) ?? MARKETS[0]
                  const uahAmount = Math.round(Number(p.amount_usd) * usdRate)

                  return (
                    <Card
                      key={p.id}
                      className="group border-white/[0.07] bg-[#0c0d12]/90 p-4 backdrop-blur-xl space-y-3 hover:border-white/15 transition-all"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="inline-flex items-center gap-1 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-white border border-white/[0.08]"
                            title={`Рынок: ${marketMeta.label}`}
                          >
                            <span>{marketMeta.flag}</span>
                            <span>{marketMeta.label}</span>
                          </span>

                          <span className="truncate text-[11px] font-medium text-[#c9cacd]">
                            {p.client_name}
                          </span>
                        </div>

                        <button
                          onClick={() => handleDeleteProject(p.id)}
                          className="opacity-0 group-hover:opacity-100 text-[#5b5f66] hover:text-red-400 transition-opacity p-0.5"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-white">{p.title}</h4>
                        <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-1">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-mono text-sm font-bold text-emerald-400">
                              ${Number(p.amount_usd).toLocaleString()}
                            </span>
                            <span className="font-mono text-[10px] text-[#8a8f98]">
                              ≈ {uahAmount.toLocaleString('ru-RU')} ₴
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Рейт за минуту видео */}
                            {ratePerMinute !== null && (
                              <span
                                title="Стоимость минуты готового видео"
                                className="font-mono text-[10px] font-semibold text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded"
                              >
                                ${ratePerMinute}/мин
                              </span>
                            )}

                            {/* Фактическая ставка $/час */}
                            {realHourlyRate !== null && (
                              <span
                                title="Фактическая ставка в час чистой работы"
                                className="font-mono text-[10px] font-semibold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.5 rounded"
                              >
                                ${realHourlyRate}/ч
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-[#6b6f78] pt-1">
                        <div className="flex items-center gap-2">
                          {p.source && (
                            <span className="inline-flex items-center gap-1 text-[#8a8f98]">
                              <Share2 size={9} /> {p.source}
                            </span>
                          )}
                          {duration > 0 && (
                            <span className="flex items-center gap-1 text-[#8a8f98]">
                              <Clock size={9} /> {duration}м
                            </span>
                          )}
                          {spentMins > 0 && (
                            <span
                              title={`Потрачено времени: ${spentMins} минут`}
                              className="flex items-center gap-1 text-indigo-300 font-mono"
                            >
                              <Hourglass size={9} /> {spentMins}м
                            </span>
                          )}
                        </div>

                        {p.deadline && (
                          <div className="flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(p.deadline).toLocaleDateString('ru-RU')}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-white/[0.04] flex justify-end">
                        {col.key !== 'paid' && (
                          <button
                            onClick={() => {
                              const nextIndex = STAGES.findIndex((s) => s.key === col.key) + 1
                              handleUpdateStage(p.id, STAGES[nextIndex].key)
                            }}
                            className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                          >
                            Далее <ChevronRight size={11} />
                          </button>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Модалка добавления проекта */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0c0d12] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Film size={18} className="text-indigo-400" />
                <h3 className="text-base font-bold text-white">Новый коммерческий проект</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#6b6f78] hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#8a8f98] mb-1.5 block">
                  Рынок клиента
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {MARKETS.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setMarket(m.key)}
                      className={cx(
                        'flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-all',
                        market === m.key
                          ? 'border-indigo-500/60 bg-indigo-500/15 text-white shadow-sm'
                          : 'border-white/[0.06] bg-white/[0.02] text-[#8a8f98] hover:text-white',
                      )}
                    >
                      <span className="text-sm">{m.flag}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#8a8f98] mb-1.5 block">
                  Клиент / Бренд
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Стоматология / Тренер / US YouTuber..."
                  className={inputCls}
                />
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#8a8f98] mb-1.5 block">
                  Название задачи
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="3x Reels с моушн-графикой / YouTube-монтаж..."
                  className={inputCls}
                />
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#8a8f98] mb-1.5 block">
                  Источник лида
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COMMON_SOURCES.map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setSource(src)}
                      className={cx(
                        'rounded-md px-2 py-0.5 text-[11px] transition-colors',
                        source === src
                          ? 'bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/40'
                          : 'bg-white/[0.03] text-[#8a8f98] hover:text-white border border-white/[0.05]',
                      )}
                    >
                      {src}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Или введи свой источник..."
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-[#8a8f98] mb-1.5 block">
                    Бюджет ($ USD)
                  </label>
                  <input
                    type="number"
                    required
                    value={amountUsd}
                    onChange={(e) => setAmountUsd(e.target.value)}
                    placeholder="250"
                    className={inputCls}
                  />
                  {Number(amountUsd) > 0 && (
                    <div className="font-mono text-[10px] text-[#8a8f98] mt-1">
                      ≈ {Math.round(Number(amountUsd) * usdRate).toLocaleString('ru-RU')} ₴
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-[#8a8f98] mb-1.5 block">
                    Хронометраж (мин)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={videoMinutes}
                    onChange={(e) => setVideoMinutes(e.target.value)}
                    placeholder="1.5"
                    className={inputCls}
                  />
                </div>
              </div>

              {formCalculatedRate && (
                <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs">
                  <span className="text-[#8a8f98] flex items-center gap-1.5">
                    <Gauge size={13} className="text-amber-400" /> Расчетный рейт:
                  </span>
                  <div className="text-right">
                    <span className="font-mono font-bold text-amber-400">
                      ${formCalculatedRate} / мин
                    </span>
                    <span className="font-mono text-[10px] text-[#8a8f98] ml-1.5">
                      (≈ {Math.round(Number(formCalculatedRate) * usdRate)} ₴)
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-[#8a8f98] mb-1.5 block">
                    Стадия
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as ProjectStage)}
                    className={inputCls}
                  >
                    {STAGES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-[#8a8f98] mb-1.5 block">
                    Дедлайн
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1"
                >
                  Отмена
                </Button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 inline-flex items-center justify-center rounded-md font-medium text-xs h-8 px-3 text-white bg-gradient-to-r from-[#6366f1] to-[#06b6d4] hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSubmitting ? 'Создание...' : 'Добавить проект'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}