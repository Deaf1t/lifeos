'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  GraduationCap,
  Plus,
  CheckCircle2,
  Trash2,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Card, Button, inputCls } from '@/components/ui'
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

export default function AukDeadlinesCard() {
  const { user } = useAuth()
  const [deadlines, setDeadlines] = useState<AcademicDeadline[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Поля формы
  const [courseName, setCourseName] = useState(COMMON_AUK_COURSES[0])
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [weightPercent, setWeightPercent] = useState('15')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Безопасное получение user_id с четким типом
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
      if (!userId) {
        alert('Пожалуйста, обновите страницу для авторизации')
        return
      }

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

  // Расчет обратного отсчета дней (T-minus)
  const getDaysRemaining = (dateStr: string) => {
    const target = new Date(dateStr)
    const today = new Date()
    target.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  return (
    <Card className="border-white/[0.08] bg-[#0c0d12]/90 p-6 backdrop-blur-xl space-y-4">
      <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
        <div className="flex items-center gap-2">
          <GraduationCap size={16} className="text-[#e0b25c]" />
          <h2 className="text-sm font-semibold tracking-tight text-white">
            Академический хаб АЮК
          </h2>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="border-white/[0.08] bg-white/[0.02] text-xs hover:text-white"
        >
          <Plus size={12} className="mr-1" /> Добавить
        </Button>
      </div>

      <div className="space-y-2.5">
        {deadlines.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.06] p-4 text-center text-xs text-[#6b6f78]">
            Все учебные задания сданы. Долгов нет.
          </div>
        ) : (
          deadlines.map((item) => {
            const isDone = item.status === 'submitted'
            const daysLeft = getDaysRemaining(item.due_date)

            return (
              <div
                key={item.id}
                className={cx(
                  'group flex items-center justify-between gap-3 rounded-lg border p-3 transition-all',
                  isDone
                    ? 'border-white/[0.03] bg-white/[0.01]'
                    : daysLeft <= 2
                    ? 'border-rose-500/30 bg-rose-950/10'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15',
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={() => handleToggleStatus(item)}
                    className={cx(
                      'grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors',
                      isDone
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                        : 'border-[#32353e] hover:border-white/60',
                    )}
                  >
                    {isDone && <CheckCircle2 size={12} />}
                  </button>

                  <div className="min-w-0">
                    <span className="text-[10px] text-[#8a8f98] font-medium block truncate">
                      {item.course_name}
                    </span>
                    <h4
                      className={cx(
                        'text-xs font-semibold truncate',
                        isDone ? 'line-through text-[#5b5f66]' : 'text-white',
                      )}
                    >
                      {item.title}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isDone && (
                    <span
                      className={cx(
                        'font-mono text-[10px] font-bold px-2 py-0.5 rounded',
                        daysLeft < 0
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : daysLeft <= 2
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                          : 'bg-white/[0.04] text-[#8a8f98]',
                      )}
                    >
                      {daysLeft < 0 ? 'Просрочено' : daysLeft === 0 ? 'Сегодня!' : `T-${daysLeft} дн`}
                    </span>
                  )}

                  <span className="font-mono text-[10px] text-[#6b6f78]">
                    {item.weight_percent}%
                  </span>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-[#5b5f66] hover:text-red-400 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Модальное окно создания дедлайна */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0c0d12] p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <GraduationCap size={15} className="text-[#e0b25c]" /> Новый дедлайн АЮК
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#6b6f78] hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateDeadline} className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-semibold text-[#8a8f98] mb-1 block">
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
                <label className="text-[10px] uppercase font-semibold text-[#8a8f98] mb-1 block">
                  Название работы / Задание
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Midterm Case / Quiz 3 / Research Draft..."
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-semibold text-[#8a8f98] mb-1 block">
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
                  <label className="text-[10px] uppercase font-semibold text-[#8a8f98] mb-1 block">
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
                  className="flex-1 text-xs"
                >
                  Отмена
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 text-xs bg-gradient-to-r from-[#6366f1] to-[#06b6d4]"
                >
                  {isSubmitting ? 'Сохранение...' : 'Добавить'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  )
}