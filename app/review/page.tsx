'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Sparkles,
  CheckCircle2,
  Moon,
  Utensils,
  ShieldAlert,
  Flame,
  Brain,
  Save,
  Copy,
  Gauge,
  AlertTriangle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Button, Card, ProgressBar, inputCls } from '@/components/ui'
import { toISODate } from '@/lib/constants'
import { cx } from '@/lib/utils'

interface DaySummary {
  sleepHours: number | null
  proteinG: number
  calories: number
  creatine: boolean
  workoutType: string | null
  tasksCompleted: number
  tasksTotal: number
  instagramMinutes: number
}

interface AIAnalysisResult {
  score: number
  verdict: string
  breakdown: string[]
  analysis: string
}

export default function ReviewPage() {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(() => toISODate(new Date()))

  // Оценка от AI
  const [score, setScore] = useState<number | null>(null)
  const [aiVerdict, setAiVerdict] = useState<string>('')
  const [aiBreakdown, setAiBreakdown] = useState<string[]>([])
  const [aiAnalysisText, setAiAnalysisText] = useState<string>('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Текстовые поля
  const [whatWentWell, setWhatWentWell] = useState('')
  const [whatHindered, setWhatHindered] = useState('')
  const [reflection, setReflection] = useState('')
  const [nextDayPriorities, setNextDayPriorities] = useState('')

  // Сохранение
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  // Метрики из логов
  const [summary, setSummary] = useState<DaySummary | null>(null)

  // Безопасное получение user_id без конфликтов типов
  const getUserId = async (): Promise<string | null> => {
    if (user?.id) return user.id
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  }

  // Загрузка фактов за день
  const loadDaySummary = useCallback(async (dateStr: string) => {
    const [bodyRes, habitRes, tasksRes] = await Promise.all([
      supabase.from('body_logs').select('*').eq('log_date', dateStr).maybeSingle(),
      supabase.from('habit_logs').select('*').eq('log_date', dateStr).maybeSingle(),
      supabase.from('tasks').select('status, bucket'),
    ])

    const completed = tasksRes.data?.filter((t: any) => t.status === 'completed') || []

    setSummary({
      sleepHours: bodyRes.data?.sleep_hours ?? 8.0,
      proteinG: bodyRes.data?.protein_g ?? 0,
      calories: bodyRes.data?.calories ?? 0,
      creatine: bodyRes.data?.creatine ?? false,
      workoutType: bodyRes.data?.workout_type ?? null,
      tasksCompleted: completed.length,
      tasksTotal: tasksRes.data?.length || 0,
      instagramMinutes: habitRes.data?.instagram_minutes ?? 0,
    })
  }, [])

  // Загрузка существующего отчета
  const loadExistingReview = useCallback(async (dateStr: string) => {
    const { data } = await supabase
      .from('daily_reviews')
      .select('*')
      .eq('review_date', dateStr)
      .maybeSingle()

    if (data) {
      setScore(data.score ?? null)
      setWhatWentWell(data.what_went_well ?? '')
      setWhatHindered(data.what_hindered ?? '')
      setReflection(data.reflection ?? '')
      setNextDayPriorities(data.next_day_priorities ?? '')
      if (data.ai_analysis) {
        setAiAnalysisText(data.ai_analysis)
        setAiVerdict('Сохраненный анализ дня')
      }
    } else {
      setScore(null)
      setAiVerdict('')
      setAiBreakdown([])
      setAiAnalysisText('')
      setWhatWentWell('')
      setWhatHindered('')
      setReflection('')
      setNextDayPriorities('')
    }
  }, [])

  useEffect(() => {
    loadDaySummary(selectedDate)
    loadExistingReview(selectedDate)
  }, [selectedDate, loadDaySummary, loadExistingReview])

  // Вставка метрик в текст отчета
  const handleInsertSummary = () => {
    if (!summary) return
    const text = `Сон: ${summary.sleepHours ?? 8}ч. Питание: ${summary.proteinG}г белка (${summary.creatine ? 'креатин принят' : 'без креатина'}). Нагрузка: ${summary.workoutType ? summary.workoutType.replace('_', ' ') : 'отдых'}. Задачи: закрыто ${summary.tasksCompleted} из ${summary.tasksTotal}. Инстаграм: ${summary.instagramMinutes} мин.`
    setWhatWentWell((prev) => (prev ? `${prev}\n${text}` : text))
  }

  // Запуск AI-анализа через Gemini
  const handleRunAiAnalysis = async () => {
    setIsAnalyzing(true)
    setSaveStatus(null)

    try {
      const currentUserId = await getUserId()

      if (!currentUserId) {
        alert('Пожалуйста, обновите страницу для повторной авторизации')
        return
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          date: selectedDate,
          whatWentWell,
          whatHindered,
          reflection,
          nextDayPriorities,
        }),
      })

      if (!res.ok) throw new Error('Ошибка связи с AI роутом')

      const result: AIAnalysisResult = await res.json()

      setScore(result.score)
      setAiVerdict(result.verdict)
      setAiBreakdown(result.breakdown || [])
      setAiAnalysisText(result.analysis)
    } catch (err: any) {
      alert(`Ошибка AI: ${err.message}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Сохранение рефлексии
  const handleSaveReview = async () => {
    if (isSaving) return
    setIsSaving(true)
    setSaveStatus(null)

    try {
      const currentUserId = await getUserId()

      if (!currentUserId) {
        setSaveStatus('Ошибка авторизации')
        return
      }

      const payload = {
        user_id: currentUserId,
        review_date: selectedDate,
        score: score ?? 8,
        what_went_well: whatWentWell.trim(),
        what_hindered: whatHindered.trim(),
        reflection: reflection.trim(),
        next_day_priorities: nextDayPriorities.trim(),
        ai_analysis: aiAnalysisText.trim() || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('daily_reviews')
        .upsert(payload, { onConflict: 'user_id,review_date' })

      if (error) {
        setSaveStatus(`Ошибка: ${error.message}`)
      } else {
        setSaveStatus('Отчет сохранен')
        setTimeout(() => setSaveStatus(null), 3000)
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Шапка */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
              <Brain size={11} /> Gemini 1.5 Cognitive Audit
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Вечерняя рефлексия</h1>
          <p className="mt-1 text-xs text-[#8a8f98]">
            Автоматический расчет оценки дня нейросетью и глубокий аудит фокуса
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-[#0c0d12] px-3 py-1.5 text-xs text-[#e6e6e8] outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* ЛЕВАЯ КОЛОНКА: ФОРМА РЕФЛЕКСИИ */}
        <div className="space-y-6 lg:col-span-7">
          <Card className="border-white/[0.08] bg-[#0c0d12]/90 p-6 backdrop-blur-xl space-y-5">
            {/* Что получилось / Что помешало */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> Что получилось
                </label>
                <textarea
                  rows={4}
                  value={whatWentWell}
                  onChange={(e) => setWhatWentWell(e.target.value)}
                  placeholder="3 часа чистого монтажа в PR, закрыл тяжелые ноги, добрал норму белка..."
                  className="w-full rounded-xl border border-white/[0.08] bg-black/40 p-3.5 text-xs text-[#e6e6e8] placeholder-[#5b5f66] outline-none focus:border-emerald-500/60 focus:bg-black/60 transition-all resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-rose-400 mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={13} /> Что помешало / Триггеры
                </label>
                <textarea
                  rows={4}
                  value={whatHindered}
                  onChange={(e) => setWhatHindered(e.target.value)}
                  placeholder="Залип в Instagram после обеда, откладывал рендер, спад концентрации..."
                  className="w-full rounded-xl border border-white/[0.08] bg-black/40 p-3.5 text-xs text-[#e6e6e8] placeholder-[#5b5f66] outline-none focus:border-rose-500/60 focus:bg-black/60 transition-all resize-none"
                />
              </div>
            </div>

            {/* Главная рефлексия */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">
                  Рефлексия дня (Инсайты и психологические триггеры)
                </label>
                <span className="text-[10px] text-[#5b5f66] font-mono">{reflection.length} знаков</span>
              </div>
              <textarea
                rows={4}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="В какой момент произошел провал внимания? Что помогло войти в поток? Честные выводы без иллюзий."
                className="w-full rounded-xl border border-white/[0.08] bg-black/40 p-3.5 text-xs text-[#e6e6e8] placeholder-[#5b5f66] outline-none focus:border-indigo-500 focus:bg-black/60 transition-all resize-none"
              />
            </div>

            {/* Главное на завтра */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                <Flame size={13} /> Главное на завтра (Top-3 фокуса)
              </label>
              <input
                type="text"
                value={nextDayPriorities}
                onChange={(e) => setNextDayPriorities(e.target.value)}
                placeholder="1. Черновой монтаж рилса 2. Тренировка верха 3. Учебный кейс АЮК"
                className={inputCls}
              />
            </div>

            {/* Подвал формы */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.05]">
              <button
                type="button"
                onClick={handleInsertSummary}
                className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <Copy size={13} /> Вставить метрики в отчет
              </button>

              <div className="flex items-center gap-3">
                {saveStatus && (
                  <span className="text-xs text-emerald-400 font-medium">{saveStatus}</span>
                )}
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSaveReview}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-[#6366f1] to-[#06b6d4] text-xs font-semibold shadow-lg shadow-indigo-500/20"
                >
                  <Save size={14} className="mr-1.5" />
                  {isSaving ? 'Сохранение...' : 'Сохранить отчет'}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* ПРАВАЯ КОЛОНКА: ОЦЕНКА AI И АНАЛИТИКА */}
        <div className="space-y-6 lg:col-span-5">
          {/* ОЦЕНКА ДНЯ ОТ AI */}
          <Card className="relative overflow-hidden border-white/[0.08] bg-[#0c0d12]/95 p-6 backdrop-blur-xl">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />

            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98] flex items-center gap-1.5">
                <Gauge size={14} className="text-indigo-400" /> Объективная оценка AI
              </span>
              <span className="text-[10px] font-mono text-[#5b5f66]">{selectedDate}</span>
            </div>

            <div className="flex items-baseline gap-4 my-2">
              <div className="font-mono text-6xl font-black tracking-tight text-white tabular-nums">
                {score !== null ? (
                  <>
                    {score}
                    <span className="text-xl font-normal text-[#6b6f78]">/10</span>
                  </>
                ) : (
                  <span className="text-3xl font-bold text-[#5b5f66]">—</span>
                )}
              </div>

              {aiVerdict && (
                <div className="text-xs font-medium text-indigo-300 leading-snug">
                  «{aiVerdict}»
                </div>
              )}
            </div>

            {score !== null && (
              <ProgressBar
                value={score * 10}
                from="#6366f1"
                to="#06b6d4"
                className="my-4 h-2"
              />
            )}

            {aiBreakdown.length > 0 && (
              <div className="space-y-1.5 my-4 pt-3 border-t border-white/[0.05]">
                {aiBreakdown.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[11px] text-[#c9cacd]">
                    <span className="text-indigo-400 mt-0.5">•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="primary"
              size="md"
              onClick={handleRunAiAnalysis}
              disabled={isAnalyzing}
              className="w-full mt-2 bg-gradient-to-r from-[#6366f1] to-[#06b6d4] text-xs font-semibold shadow-lg shadow-indigo-500/20"
            >
              <Sparkles size={14} className={cx('mr-1.5', isAnalyzing && 'animate-spin')} />
              {isAnalyzing ? 'Gemini анализирует логи...' : 'Рассчитать оценку и аудит через AI'}
            </Button>
          </Card>

          {/* СВОДКА ФАКТОВ ИЗ БАЗЫ */}
          <Card className="border-white/[0.08] bg-[#0c0d12]/90 p-5 backdrop-blur-xl space-y-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98] block mb-2">
              Сводка фактов из логов
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 text-xs">
                <div className="flex items-center gap-1.5 text-[#8a8f98] mb-1">
                  <Moon size={13} className="text-[#3b82f6]" /> Сон
                </div>
                <div className="font-mono text-base font-bold text-white">
                  {summary?.sleepHours ?? 8} ч
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 text-xs">
                <div className="flex items-center gap-1.5 text-[#8a8f98] mb-1">
                  <Utensils size={13} className="text-amber-400" /> Белок
                </div>
                <div className="font-mono text-base font-bold text-white">
                  {summary?.proteinG ?? 0} г
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 text-xs">
                <div className="flex items-center gap-1.5 text-[#8a8f98] mb-1">
                  <Flame size={13} className="text-emerald-400" /> Задачи
                </div>
                <div className="font-mono text-base font-bold text-white">
                  {summary?.tasksCompleted ?? 0} закрыто
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 text-xs">
                <div className="flex items-center gap-1.5 text-[#8a8f98] mb-1">
                  <ShieldAlert size={13} className="text-cyan-400" /> Instagram
                </div>
                <div className="font-mono text-base font-bold text-white">
                  {summary?.instagramMinutes ?? 0} мин
                </div>
              </div>
            </div>
          </Card>

          {/* НЕЙРО-АУДИТ GEMINI */}
          {aiAnalysisText && (
            <Card className="border-indigo-500/20 bg-indigo-950/10 p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-indigo-400 mb-2">
                <Brain size={15} />
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  Нейро-аудит дня
                </span>
              </div>
              <p className="text-xs text-[#e6e6e8] leading-relaxed whitespace-pre-line font-normal">
                {aiAnalysisText}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}