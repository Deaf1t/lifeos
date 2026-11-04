'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  CheckCircle2,
  Trash2,
  Clock,
  Gauge,
  Flame,
  Layers,
  Inbox,
  Hourglass,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Card, Button, SphereTag, inputCls } from '@/components/ui'
import { SPHERES, SPHERE_KEYS, type Sphere } from '@/lib/constants'
import { cx } from '@/lib/utils'

export interface TaskItem {
  id: string
  user_id: string
  title: string
  sphere: Sphere
  project: string | null
  bucket: 'top3' | 'sprint' | 'inbox'
  status: 'pending' | 'completed'
  score: number | null
  created_at: string
}

interface ProjectOption {
  id: string
  title: string
  client_name: string
  amount_usd: number
  spent_minutes: number
}

export default function TasksPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [selectedSphere, setSelectedSphere] = useState<string>('all')

  // Поля создания задачи
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskProject, setNewTaskProject] = useState('')
  const [newTaskSphere, setNewTaskSphere] = useState<Sphere>('motion')
  const [newTaskBucket, setNewTaskBucket] = useState<'top3' | 'sprint' | 'inbox'>('top3')
  const [isSubmittingTask, setIsSubmittingTask] = useState(false)

  // Таймер фокуса
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [modeMinutes, setModeMinutes] = useState<number>(50)
  const [timeLeft, setTimeLeft] = useState<number>(50 * 60)
  const [isActive, setIsActive] = useState<boolean>(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const getUserId = async (): Promise<string | null> => {
    if (user?.id) return user.id
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  }

  const loadData = useCallback(async () => {
    const [tasksRes, projectsRes] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('projects').select('id, title, client_name, amount_usd, spent_minutes'),
    ])

    if (tasksRes.data) {
      setTasks(tasksRes.data as TaskItem[])
    }
    if (projectsRes.data) {
      setProjects(projectsRes.data as ProjectOption[])
      if (!selectedProjectId && projectsRes.data.length > 0) {
        setSelectedProjectId(projectsRes.data[0].id)
      }
    }
  }, [selectedProjectId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Логика таймера
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false)
      if (timerRef.current) clearInterval(timerRef.current)
      handleLogTime(modeMinutes)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isActive, timeLeft, modeMinutes])

  const handleSetPreset = (mins: number) => {
    setIsActive(false)
    setModeMinutes(mins)
    setTimeLeft(mins * 60)
  }

  const handleResetTimer = () => {
    setIsActive(false)
    setTimeLeft(modeMinutes * 60)
  }

  // Запись потраченного времени в проект
  const handleLogTime = async (mins: number) => {
    if (!selectedProjectId) return
    const targetProj = projects.find((p) => p.id === selectedProjectId)
    const updated = (targetProj?.spent_minutes || 0) + mins

    const { error } = await supabase
      .from('projects')
      .update({ spent_minutes: updated })
      .eq('id', selectedProjectId)

    if (!error) {
      setProjects((prev) =>
        prev.map((p) => (p.id === selectedProjectId ? { ...p, spent_minutes: updated } : p)),
      )
    }
  }

  // Создание задачи
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim() || isSubmittingTask) return

    setIsSubmittingTask(true)
    try {
      const userId = await getUserId()
      if (!userId) return

      const payload = {
        user_id: userId,
        title: newTaskTitle.trim(),
        sphere: newTaskSphere,
        project: newTaskProject.trim() || null,
        bucket: newTaskBucket,
        status: 'pending',
      }

      const { data, error } = await supabase.from('tasks').insert(payload).select().single()

      if (data && !error) {
        setTasks((prev) => [data as TaskItem, ...prev])
        setNewTaskTitle('')
        setNewTaskProject('')
      }
    } finally {
      setIsSubmittingTask(false)
    }
  }

  const handleToggleTask = async (task: TaskItem) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed'
    const { error } = await supabase
      .from('tasks')
      .update({ status: nextStatus })
      .eq('id', task.id)

    if (!error) {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)),
      )
    }
  }

  const handleDeleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error) {
      setTasks((prev) => prev.filter((t) => t.id !== id))
    }
  }

  const activeProject = projects.find((p) => p.id === selectedProjectId)
  const spentHours = activeProject ? (activeProject.spent_minutes || 0) / 60 : 0
  const realHourlyRate =
    activeProject && spentHours > 0
      ? Math.round(activeProject.amount_usd / spentHours)
      : activeProject
      ? activeProject.amount_usd
      : 0

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const filteredTasks = tasks.filter(
    (t) => selectedSphere === 'all' || t.sphere === selectedSphere,
  )

  const top3List = filteredTasks.filter((t) => t.bucket === 'top3')
  const sprintList = filteredTasks.filter((t) => t.bucket === 'sprint')
  const inboxList = filteredTasks.filter((t) => t.bucket === 'inbox')

  return (
    <div className="space-y-8">
      {/* Шапка */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Задачи и Глубокий фокус
          </h1>
          <p className="mt-1 text-xs text-[#8a8f98]">
            Таймер ультрадианных циклов, привязка к проектам, расчет $/час и ранжирование
          </p>
        </div>

        {/* Фильтр по сферам */}
        <select
          value={selectedSphere}
          onChange={(e) => setSelectedSphere(e.target.value)}
          className="rounded-lg border border-white/[0.08] bg-[#0c0d12] px-3 py-1.5 text-xs text-[#e6e6e8] outline-none"
        >
          <option value="all">Все сферы</option>
          {SPHERE_KEYS.map((k) => (
            <option key={k} value={k}>
              {SPHERES[k]?.label || k}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* ЛЕВАЯ КОЛОНКА: Рабочий Pomodoro / Deep Work таймер (5 колонок) */}
        <div className="space-y-6 lg:col-span-5">
          <Card className="border-white/[0.07] bg-[#0c0d12]/90 p-6 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white">
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                Deep Work Таймер
              </span>

              <div className="flex gap-1">
                {[25, 50, 90].map((m) => (
                  <button
                    key={m}
                    onClick={() => handleSetPreset(m)}
                    className={cx(
                      'rounded px-2 py-0.5 text-[10px] font-mono transition-all',
                      modeMinutes === m
                        ? 'border border-indigo-500/50 bg-indigo-500/20 text-white'
                        : 'border border-white/[0.05] bg-white/[0.02] text-[#8a8f98] hover:text-white',
                    )}
                  >
                    {m}м
                  </button>
                ))}
              </div>
            </div>

            {/* Выбор проекта для привязки времени */}
            <div>
              <label className="text-[10px] uppercase font-semibold text-[#8a8f98] mb-1.5 block">
                Привязка к коммерческому проекту
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-xs text-[#e6e6e8] outline-none focus:border-indigo-500"
              >
                {projects.length === 0 ? (
                  <option value="">Нет проектов в базе</option>
                ) : (
                  projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.client_name} — {p.title} (${p.amount_usd})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Циферблат */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-black/40 py-8">
              <div className="font-mono text-5xl font-black tracking-tight text-white tabular-nums">
                {formatTimer(timeLeft)}
              </div>
              <span className="text-[11px] text-[#8a8f98] mt-1 font-mono">
                {activeProject
                  ? `${activeProject.client_name} (${activeProject.title})`
                  : 'Без привязки к проекту'}
              </span>

              <div className="flex items-center gap-3 mt-6">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setIsActive(!isActive)}
                  className="bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 font-semibold shadow-lg shadow-indigo-500/20"
                >
                  {isActive ? <Pause size={15} className="mr-1.5" /> : <Play size={15} className="mr-1.5" />}
                  {isActive ? 'Пауза' : 'Старт'}
                </Button>
                <button
                  onClick={handleResetTimer}
                  className="rounded-lg border border-white/[0.08] p-2.5 text-[#8a8f98] hover:text-white transition-colors"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>

            {/* Расчет $/час */}
            {activeProject && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.05]">
                <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5">
                  <span className="text-[10px] text-[#8a8f98] block">На таймлайне:</span>
                  <span className="font-mono text-xs font-bold text-white">
                    {activeProject.spent_minutes || 0} мин{' '}
                    <span className="text-[10px] font-normal text-[#6b6f78]">
                      ({spentHours.toFixed(1)}ч)
                    </span>
                  </span>
                </div>

                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
                  <span className="text-[10px] text-[#8a8f98] block flex items-center gap-1">
                    <Gauge size={11} className="text-amber-400" /> Ставка $/час:
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-400">
                    ${realHourlyRate}
                    <span className="text-[10px] font-normal text-[#8a8f98]"> / час</span>
                  </span>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ПРАВАЯ КОЛОНКА: Списки задач и форма создания (7 колонок) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Форма создания */}
          <Card className="border-white/[0.07] bg-[#0c0d12]/90 p-5 backdrop-blur-xl">
            <form onSubmit={handleCreateTask} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Новая задача..."
                  className={inputCls}
                />
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  disabled={isSubmittingTask}
                  className="bg-indigo-600 px-4"
                >
                  <Plus size={16} />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newTaskProject}
                  onChange={(e) => setNewTaskProject(e.target.value)}
                  placeholder="Клиент / проект (опционально)"
                  className={inputCls}
                />

                <select
                  value={newTaskBucket}
                  onChange={(e) => setNewTaskBucket(e.target.value as any)}
                  className={inputCls}
                >
                  <option value="top3">🔥 Top-3 на сегодня</option>
                  <option value="sprint">📁 Спринт недели</option>
                  <option value="inbox">📥 Бэклог / Inbox</option>
                </select>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {SPHERE_KEYS.map((sKey) => {
                  const s = SPHERES[sKey]
                  if (!s) return null
                  const active = newTaskSphere === sKey
                  return (
                    <button
                      key={sKey}
                      type="button"
                      onClick={() => setNewTaskSphere(sKey)}
                      className={cx(
                        'rounded-md border px-2.5 py-1 text-[11px] font-medium transition-all',
                        active
                          ? 'border-indigo-500/50 bg-indigo-500/15 text-white'
                          : 'border-white/[0.06] bg-white/[0.02] text-[#8a8f98] hover:text-white',
                      )}
                    >
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </form>
          </Card>

          {/* Top-3 Задачи */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Flame size={15} className="text-amber-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                Top-3 приоритета дня ({top3List.filter((t) => t.status === 'completed').length}/{top3List.length})
              </h2>
            </div>

            <div className="space-y-2">
              {top3List.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/[0.05] p-4 text-center text-xs text-[#5b5f66]">
                  Нет задач в Top-3
                </div>
              ) : (
                top3List.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={handleToggleTask}
                    onDelete={handleDeleteTask}
                  />
                ))
              )}
            </div>
          </div>

          {/* Спринт недели */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Layers size={15} className="text-indigo-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                Спринт недели ({sprintList.length})
              </h2>
            </div>

            <div className="space-y-2">
              {sprintList.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/[0.05] p-4 text-center text-xs text-[#5b5f66]">
                  Спринт пуст
                </div>
              ) : (
                sprintList.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={handleToggleTask}
                    onDelete={handleDeleteTask}
                  />
                ))
              )}
            </div>
          </div>

          {/* Бэклог / Inbox */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Inbox size={15} className="text-[#6b6f78]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                Бэклог / Inbox ({inboxList.length})
              </h2>
            </div>

            <div className="space-y-2">
              {inboxList.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/[0.05] p-4 text-center text-xs text-[#5b5f66]">
                  Бэклог чист
                </div>
              ) : (
                inboxList.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={handleToggleTask}
                    onDelete={handleDeleteTask}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TaskCard({
  task,
  onToggle,
  onDelete,
}: {
  task: TaskItem
  onToggle: (task: TaskItem) => void
  onDelete: (id: string) => void
}) {
  const isDone = task.status === 'completed'

  return (
    <div
      className={cx(
        'group flex items-center justify-between gap-3 rounded-lg border px-3.5 py-3 transition-all',
        isDone
          ? 'border-white/[0.03] bg-white/[0.01]'
          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15',
      )}
    >
      <div
        onClick={() => onToggle(task)}
        className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
      >
        <div
          className={cx(
            'grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors',
            isDone
              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
              : 'border-[#32353e] group-hover:border-white/60',
          )}
        >
          {isDone && <CheckCircle2 size={12} />}
        </div>
        <span
          className={cx(
            'text-xs font-medium truncate',
            isDone ? 'line-through text-[#5b5f66]' : 'text-[#e6e6e8]',
          )}
        >
          {task.title}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <SphereTag sphere={task.sphere} />
        {task.project && (
          <span className="text-[11px] text-[#6b6f78] max-w-[120px] truncate">
            {task.project}
          </span>
        )}
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 text-[#5b5f66] hover:text-red-400 transition-opacity p-0.5"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}