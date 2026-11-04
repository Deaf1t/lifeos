'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Target,
  Flag,
  Calendar,
  Plus,
  Trash2,
  Send,
  Layers,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import {
  Button,
  Card,
  ProgressBar,
  SphereTag,
  SpherePicker,
  inputCls,
} from '@/components/ui'
import { SPHERES, type Sphere } from '@/lib/constants'
import { cx } from '@/lib/utils'

export type Horizon = 'global' | 'medium' | 'sprint'

export interface GoalItem {
  id: string
  user_id: string
  title: string
  sphere: Sphere
  horizon: Horizon
  progress: number
  target_date: string | null
  status: 'active' | 'completed'
  created_at: string
}

export default function GoalsPage() {
  const { user } = useAuth()
  const [goals, setGoals] = useState<GoalItem[]>([])
  const [activeTab, setActiveTab] = useState<Horizon>('global')
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Модалка создания цели
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [sphere, setSphere] = useState<Sphere>('motion')
  const [horizon, setHorizon] = useState<Horizon>('medium')
  const [targetDate, setTargetDate] = useState('')

  // Загрузка целей
  const loadGoals = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setGoals(data as GoalItem[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadGoals()
  }, [loadGoals])

  // Создание новой цели
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const currentUserId = user?.id || (await supabase.auth.getUser()).data.user?.id

      if (!currentUserId) {
        alert('Сессия пользователя не найдена. Попробуйте обновить страницу.')
        return
      }

      const deadline = targetDate || null

      const newGoal = {
        user_id: currentUserId as string,
        title: title.trim(),
        sphere,
        horizon,
        progress: 0,
        target_date: deadline,
        ends_on: deadline,
        status: 'active',
      }

      const { data, error } = await supabase
        .from('goals')
        .insert(newGoal)
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        alert(`Ошибка Supabase: ${error.message}\nУбедитесь, что таблица goals создана в SQL Editor.`)
        return
      }

      if (data) {
        setGoals((prev) => [data as GoalItem, ...prev])
        setIsModalOpen(false)
        setTitle('')
        setTargetDate('')
        setActiveTab(horizon)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Обновление прогресса
  const handleUpdateProgress = async (id: string, nextProgress: number) => {
    const isCompleted = nextProgress >= 100
    const status = isCompleted ? 'completed' : 'active'

    const { error } = await supabase
      .from('goals')
      .update({ progress: nextProgress, status })
      .eq('id', id)

    if (!error) {
      setGoals((prev) =>
        prev.map((g) => (g.id === id ? { ...g, progress: nextProgress, status } : g)),
      )
    }
  }

  // Удаление цели
  const handleDeleteGoal = async (id: string) => {
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (!error) {
      setGoals((prev) => prev.filter((g) => g.id !== id))
    }
  }

  // Проброс спринта в задачи (/tasks)
  const handlePushToTasks = async (goal: GoalItem) => {
    const currentUserId = user?.id || (await supabase.auth.getUser()).data.user?.id
    if (!currentUserId) return

    const { error } = await supabase.from('tasks').insert({
      user_id: currentUserId as string,
      title: goal.title,
      sphere: goal.sphere,
      project: 'Спринт: ' + (SPHERES[goal.sphere]?.label || 'Цель'),
      bucket: 'sprint',
      status: 'pending',
      score: null,
      duration_minutes: 0,
    })

    if (!error) {
      alert(`Спринт «${goal.title}» добавлен в задачи недели!`)
    }
  }

  const filteredGoals = goals.filter((g) => g.horizon === activeTab)
  const globalCount = goals.filter((g) => g.horizon === 'global').length
  const mediumCount = goals.filter((g) => g.horizon === 'medium').length
  const sprintCount = goals.filter((g) => g.horizon === 'sprint').length

  return (
    <div className="space-y-8">
      {/* Шапка */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Стратегические цели</h1>
          <p className="mt-1 text-xs text-[#8a8f98]">
            Глобальная цель на 6 месяцев → месячный этап → недельный спринт
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setHorizon(activeTab)
            setIsModalOpen(true)
          }}
          className="bg-gradient-to-r from-[#6366f1] to-[#06b6d4] text-xs font-semibold shadow-lg shadow-indigo-500/20"
        >
          <Plus size={14} className="mr-1.5" /> Новая цель
        </Button>
      </div>

      {/* Вкладки горизонтов */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-lg border border-white/[0.08] bg-[#0c0d12]/90 p-1">
          <button
            onClick={() => setActiveTab('global')}
            className={cx(
              'flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-all',
              activeTab === 'global'
                ? 'bg-white/[0.08] text-white shadow-sm'
                : 'text-[#8a8f98] hover:text-white',
            )}
          >
            <Flag size={13} className="text-[#06b6d4]" />
            Глобальные ({globalCount})
          </button>
          <button
            onClick={() => setActiveTab('medium')}
            className={cx(
              'flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-all',
              activeTab === 'medium'
                ? 'bg-white/[0.08] text-white shadow-sm'
                : 'text-[#8a8f98] hover:text-white',
            )}
          >
            <Layers size={13} className="text-[#6366f1]" />
            Этапы ({mediumCount})
          </button>
          <button
            onClick={() => setActiveTab('sprint')}
            className={cx(
              'flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-all',
              activeTab === 'sprint'
                ? 'bg-white/[0.08] text-white shadow-sm'
                : 'text-[#8a8f98] hover:text-white',
            )}
          >
            <Sparkles size={13} className="text-amber-400" />
            Спринты ({sprintCount})
          </button>
        </div>

        <span className="text-xs text-[#6b6f78]">
          {activeTab === 'global' && 'Горизонт: 6 месяцев'}
          {activeTab === 'medium' && 'Горизонт: 1–2 месяца'}
          {activeTab === 'sprint' && 'Горизонт: текущая неделя'}
        </span>
      </div>

      {/* Сетка целей */}
      {filteredGoals.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed border-white/[0.08] bg-[#0c0d12]/40 py-16 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.02] text-[#6b6f78] mb-3">
            <Target size={22} />
          </div>
          <h3 className="text-sm font-semibold text-white">Нет целей на этом горизонте</h3>
          <p className="mt-1 max-w-sm text-xs text-[#8a8f98]">
            {activeTab === 'global' && 'Начни с глобальной цели на 6 месяцев, задающей главное направление.'}
            {activeTab === 'medium' && 'Разбей ориентиры на конкретные этапы на 1–2 месяца.'}
            {activeTab === 'sprint' && 'Сформируй недельный спринт и отправь его в фокус-задачи.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setHorizon(activeTab)
              setIsModalOpen(true)
            }}
            className="mt-4 border-white/[0.08] hover:border-white/20"
          >
            Добавить цель
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredGoals.map((goal) => {
            const isDone = goal.progress >= 100
            return (
              <Card
                key={goal.id}
                className={cx(
                  'group flex flex-col justify-between border-white/[0.07] bg-[#0c0d12]/90 p-5 backdrop-blur-xl transition-all duration-200',
                  isDone ? 'border-emerald-500/20 bg-emerald-500/[0.02]' : 'hover:border-white/15',
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <SphereTag sphere={goal.sphere} />
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {goal.horizon === 'sprint' && (
                        <button
                          onClick={() => handlePushToTasks(goal)}
                          title="Отправить в задачи спринта (/tasks)"
                          className="rounded p-1 text-[#8a8f98] hover:bg-white/[0.05] hover:text-indigo-400 transition-colors"
                        >
                          <Send size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        title="Удалить цель"
                        className="rounded p-1 text-[#8a8f98] hover:bg-white/[0.05] hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <h3
                    className={cx(
                      'text-sm font-semibold leading-snug',
                      isDone ? 'line-through text-[#6b6f78]' : 'text-white',
                    )}
                  >
                    {goal.title}
                  </h3>

                  {goal.target_date && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#6b6f78]">
                      <Calendar size={12} />
                      Дедлайн: {new Date(goal.target_date).toLocaleDateString('ru-RU')}
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-3 pt-3 border-t border-white/[0.05]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8a8f98]">Прогресс</span>
                    <span className="font-mono font-semibold text-white">{goal.progress}%</span>
                  </div>

                  <ProgressBar
                    value={goal.progress}
                    from="#6366f1"
                    to="#06b6d4"
                    className="h-1.5"
                  />

                  {/* Быстрые кнопки прогресса */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex gap-1.5">
                      {[25, 50, 75, 100].map((step) => (
                        <button
                          key={step}
                          onClick={() => handleUpdateProgress(goal.id, step)}
                          className={cx(
                            'rounded px-2 py-0.5 text-[10px] font-mono transition-colors',
                            goal.progress === step
                              ? 'bg-indigo-500/20 text-indigo-300 font-semibold'
                              : 'bg-white/[0.03] text-[#6b6f78] hover:text-white',
                          )}
                        >
                          {step}%
                        </button>
                      ))}
                    </div>

                    {goal.horizon === 'sprint' && (
                      <button
                        onClick={() => handlePushToTasks(goal)}
                        className="flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        В задачи <ArrowUpRight size={11} />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Модальное окно создания цели */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0c0d12] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target size={18} className="text-indigo-400" />
                <h3 className="text-base font-bold text-white">Новая цель</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#6b6f78] hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#8a8f98] mb-1.5 block">
                  Формулировка цели
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Выход на 2000$ с монтажа..."
                  className={inputCls}
                />
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#8a8f98] mb-1.5 block">
                  Горизонт планирования
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'global', label: 'Глобальная (6 мес)' },
                    { key: 'medium', label: 'Этап (1–2 мес)' },
                    { key: 'sprint', label: 'Спринт (неделя)' },
                  ].map((h) => (
                    <button
                      key={h.key}
                      type="button"
                      onClick={() => setHorizon(h.key as Horizon)}
                      className={cx(
                        'rounded-lg border p-2 text-center text-xs font-medium transition-all',
                        horizon === h.key
                          ? 'border-indigo-500/60 bg-indigo-500/15 text-white'
                          : 'border-white/[0.06] bg-white/[0.02] text-[#8a8f98] hover:text-white',
                      )}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#8a8f98] mb-1.5 block">
                  Сфера жизни
                </label>
                <SpherePicker value={sphere} onChange={setSphere} />
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#8a8f98] mb-1.5 block">
                  Дедлайн (опционально)
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className={inputCls}
                />
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
                  disabled={isSubmitting || !title.trim()}
                  className="flex-1 inline-flex items-center justify-center rounded-md font-medium text-xs h-8 px-3 text-white bg-gradient-to-r from-[#6366f1] to-[#06b6d4] hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSubmitting ? 'Сохранение...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}