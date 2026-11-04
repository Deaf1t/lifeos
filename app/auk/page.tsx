'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  GraduationCap,
  Plus,
  CheckCircle2,
  Trash2,
  Calendar,
  AlertCircle,
  X,
  BookOpen,
  Award,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Card, Button, ProgressBar, inputCls } from '@/components/ui'
import { cx } from '@/lib/utils'

export interface AcademicDeadline {
  id: string
  user_id: string
  course_name: string
  title: string
  due_date: string
  weight_percent: number
  status: 'pending' | 'submitted'
}

const COMMON_AUK_COURSES = [
  'Calculus & Quant Methods',
  'Intercultural Communication',
  'Academic Writing & Research',
  'Introduction to Business',
  'Sociology & Society',
]

export default function AukAcademicPage() {
  const { user } = useAuth()
  const [deadlines, setDeadlines] = useState<AcademicDeadline[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Поля модального окна
  const [courseName, setCourseName] = useState(COMMON_AUK_COURSES[0])
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [weightPercent, setWeightPercent] = useState('15')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getUserId = async (): Promise<string | null> => {
    if (user?.id) return user.id
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  }

  const loadDeadlines = useCallback(async () => {
    const { data } = await supabase
      .from('academic_deadlines')
      .select('*')
      .order('due_date', { ascending: true })

    if (data) {
      setDeadlines(data as AcademicDeadline[])
    }
  }, [])

  useEffect(() => {
    loadDeadlines()
  }, [loadDeadlines])

  const handleToggleStatus = async (item: AcademicDeadline) => {
    const nextStatus = item.status === 'submitted' ? 'pending' : 'submitted'
    const { error } = await supabase
      .from('academic_deadlines')
      .update({ status: nextStatus })
      .eq('id', item.id)

    if (!error) {
      setDeadlines((prev) =>
        prev.map((d) => (d.id === item.id ? { ...d, status: nextStatus } : d)),
      )
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('academic_deadlines').delete().eq('id', id)
    if (!error) {
      setDeadlines((prev) => prev.filter((d) => d.id !== id))
    }
  }

  const handleCreateDeadline = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !dueDate || isSubmitting) return

    setIsSubmitting(true)
    try {
      const userId = await getUserId()
      if (!userId) return

      const newDeadline = {
        user_id: userId,
        course_name: courseName.trim(),
        title: title.trim(),
        due_date: dueDate,
        weight_percent: Number(weightPercent) || 10,
        status: 'pending',
      }

      const { data, error } = await supabase
        .from('academic_deadlines')
        .insert(newDeadline)
        .select()
        .single()

      if (data && !error) {
        setDeadlines((prev) =>
          [...prev, data as AcademicDeadline].sort((a, b) =>
            a.due_date.localeCompare(b.due_date),
          ),
        )
        setIsModalOpen(false)
        setTitle('')
        setDueDate('')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const getDaysRemaining = (dateStr: string) => {
    const target = new Date(dateStr)
    const today = new Date()
    target.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  const filteredDeadlines = useMemo(() => {
    if (selectedCourse === 'all') return deadlines
    return deadlines.filter((d) => d.course_name === selectedCourse)
  }, [deadlines, selectedCourse])

  const pendingCount = deadlines.filter((d) => d.status === 'pending').length
  const submittedCount = deadlines.filter((d) => d.status === 'submitted').length
  const totalWeight = deadlines.reduce((acc, d) => acc + (d.weight_percent || 0), 0)

  return (
    <div className="space-y-8">
      {/* Шапка */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
              American University Kyiv
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            Академический хаб АЮК
          </h1>
          <p className="text-xs text-[#8a8f98]">
            Контроль дедлайнов, расчет веса оценок (%) и защита от завалов по предметам
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-amber-500 to-indigo-600 text-xs font-semibold shadow-lg shadow-amber-500/20"
        >
          <Plus size={14} className="mr-1.5" /> Добавить дедлайн
        </Button>
      </div>

      {/* Метрики */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-white/[0.07] bg-[#0c0d12]/90 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">
              Активные дедлайны
            </span>
            <AlertCircle size={16} className="text-amber-400" />
          </div>
          <div className="mt-2 font-mono text-3xl font-extrabold text-white">
            {pendingCount}
          </div>
          <p className="mt-2 text-[11px] text-[#6b6f78]">
            {submittedCount} работ успешно сдано
          </p>
        </Card>

        <Card className="border-white/[0.07] bg-[#0c0d12]/90 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">
              Сдано заданий
            </span>
            <Award size={16} className="text-emerald-400" />
          </div>
          <div className="mt-2 font-mono text-3xl font-extrabold text-emerald-400">
            {submittedCount}
          </div>
          <div className="mt-3">
            <ProgressBar
              value={
                deadlines.length > 0
                  ? Math.round((submittedCount / deadlines.length) * 100)
                  : 100
              }
              from="#10b981"
              to="#06b6d4"
              className="h-1.5"
            />
          </div>
        </Card>

        <Card className="border-white/[0.07] bg-[#0c0d12]/90 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">
              Охваченный вес (%)
            </span>
            <BookOpen size={16} className="text-indigo-400" />
          </div>
          <div className="mt-2 font-mono text-3xl font-extrabold text-indigo-400">
            {totalWeight}%
          </div>
          <p className="mt-2 text-[11px] text-[#6b6f78]">
            Суммарная доля текущих заданий в итоговых баллах
          </p>
        </Card>
      </div>

      {/* Фильтр по предметам */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCourse('all')}
          className={cx(
            'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border',
            selectedCourse === 'all'
              ? 'border-indigo-500/50 bg-indigo-500/15 text-white'
              : 'border-white/[0.06] bg-white/[0.02] text-[#8a8f98] hover:text-white',
          )}
        >
          Все предметы ({deadlines.length})
        </button>
        {COMMON_AUK_COURSES.map((c) => {
          const count = deadlines.filter((d) => d.course_name === c).length
          return (
            <button
              key={c}
              onClick={() => setSelectedCourse(c)}
              className={cx(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border',
                selectedCourse === c
                  ? 'border-indigo-500/50 bg-indigo-500/15 text-white'
                  : 'border-white/[0.06] bg-white/[0.02] text-[#8a8f98] hover:text-white',
              )}
            >
              {c} ({count})
            </button>
          )
        })}
      </div>

      {/* Список заданий */}
      <Card className="border-white/[0.07] bg-[#0c0d12]/90 p-6 backdrop-blur-xl">
        <div className="space-y-3">
          {filteredDeadlines.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/[0.06] p-8 text-center text-xs text-[#6b6f78]">
              Заданий по выбранному предмету нет. Добавь ближайший дедлайн по кнопке выше.
            </div>
          ) : (
            filteredDeadlines.map((item) => {
              const isDone = item.status === 'submitted'
              const daysLeft = getDaysRemaining(item.due_date)

              return (
                <div
                  key={item.id}
                  className={cx(
                    'group flex items-center justify-between gap-4 rounded-xl border p-4 transition-all',
                    isDone
                      ? 'border-white/[0.03] bg-white/[0.01]'
                      : daysLeft <= 2
                      ? 'border-rose-500/30 bg-rose-950/15'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15',
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <button
                      onClick={() => handleToggleStatus(item)}
                      className={cx(
                        'grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors',
                        isDone
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                          : 'border-[#32353e] hover:border-white/60',
                      )}
                    >
                      {isDone && <CheckCircle2 size={13} />}
                    </button>

                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold text-amber-400/90 block">
                        {item.course_name}
                      </span>
                      <h3
                        className={cx(
                          'text-sm font-semibold truncate mt-0.5',
                          isDone ? 'line-through text-[#5b5f66]' : 'text-white',
                        )}
                      >
                        {item.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-[#8a8f98]">
                      <Calendar size={13} />
                      <span>{new Date(item.due_date).toLocaleDateString('ru-RU')}</span>
                    </div>

                    {!isDone && (
                      <span
                        className={cx(
                          'font-mono text-xs font-bold px-2.5 py-1 rounded-md border',
                          daysLeft < 0
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                            : daysLeft <= 2
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                            : 'bg-white/[0.04] text-[#8a8f98] border-white/[0.08]',
                        )}
                      >
                        {daysLeft < 0
                          ? 'Просрочено'
                          : daysLeft === 0
                          ? 'Сегодня!'
                          : `T-${daysLeft} дн`}
                      </span>
                    )}

                    <span className="font-mono text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                      {item.weight_percent}%
                    </span>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#5b5f66] hover:text-red-400 transition-opacity p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>

      {/* Модальное окно */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0c0d12] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <GraduationCap size={18} className="text-amber-400" /> Новый дедлайн АЮК
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#6b6f78] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateDeadline} className="space-y-4">
              <div>
                <label className="text-[11px] uppercase font-semibold text-[#8a8f98] mb-1.5 block">
                  Предмет
                </label>
                <select
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className={inputCls}
                >
                  {COMMON_AUK_COURSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] uppercase font-semibold text-[#8a8f98] mb-1.5 block">
                  Название задания
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Calculus Quiz 3 / Business Essay Draft..."
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] uppercase font-semibold text-[#8a8f98] mb-1.5 block">
                    Дата сдачи
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase font-semibold text-[#8a8f98] mb-1.5 block">
                    Вес в оценке (%)
                  </label>
                  <input
                    type="number"
                    value={weightPercent}
                    onChange={(e) => setWeightPercent(e.target.value)}
                    placeholder="15"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1"
                >
                  Отмена
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-indigo-600"
                >
                  {isSubmitting ? 'Сохранение...' : 'Создать'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}