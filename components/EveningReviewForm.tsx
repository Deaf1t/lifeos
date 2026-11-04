'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toISODate } from '@/lib/constants'

const MIN_LEN = 80

export default function EveningReviewForm() {
  const router = useRouter()
  const [date, setDate] = useState('')
  const [maxDate, setMaxDate] = useState('')

useEffect(() => {
  setDate(toISODate(new Date()))
  setMaxDate(toISODate(new Date()))
}, [])
  const [score, setScore] = useState(7)
  const [wins, setWins] = useState('')
  const [blockers, setBlockers] = useState('')
  const [reflection, setReflection] = useState('')
  const [tomorrow, setTomorrow] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Подтягиваем уже существующий отчет за выбранную дату
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('daily_reviews').select('*').eq('review_date', date).maybeSingle()
      setScore(data?.day_score ?? 7)
      setWins(data?.wins ?? '')
      setBlockers(data?.blockers ?? '')
      setReflection(data?.reflection ?? '')
      setTomorrow(data?.tomorrow ?? '')
      setSaved(false)
    })()
  }, [date])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (reflection.trim().length < MIN_LEN) {
      return setError(`Напиши хотя бы ${MIN_LEN} символов рефлексии — это основа для AI-анализа.`)
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return router.push('/login') }

    const { error } = await supabase.from('daily_reviews').upsert(
      {
        user_id: user.id, review_date: date, day_score: score,
        wins: wins.trim() || null, blockers: blockers.trim() || null,
        reflection: reflection.trim(), tomorrow: tomorrow.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,review_date' },
    )
    setSaving(false)
    if (error) return setError(error.message)
    setSaved(true)
  }

  const field = 'w-full rounded-md bg-[#0d0e10] border border-[#23252a] px-3 py-2 text-sm text-[#e6e6e8] placeholder:text-[#4a4d55] outline-none focus:border-[#5e6ad2] transition-colors resize-none'

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <input type="date" value={date} max={maxDate} onChange={e => setDate(e.target.value)}
          className="h-8 rounded-md bg-[#0d0e10] border border-[#23252a] px-2.5 text-sm text-[#c9cacd] outline-none focus:border-[#5e6ad2] [color-scheme:dark]" />
        <div className="flex items-center gap-3">
          <label htmlFor="score" className="text-xs text-[#8a8f98]">Оценка дня</label>
          <input id="score" type="range" min={1} max={10} value={score} onChange={e => setScore(+e.target.value)}
            className="w-40 accent-[#5e6ad2]" />
          <span className="w-8 text-right text-lg font-semibold tabular-nums">{score}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-[#8a8f98] mb-1.5">Что получилось</label>
          <textarea rows={3} className={field} value={wins} onChange={e => setWins(e.target.value)}
            placeholder="Тренировка, 2 часа в After Effects…" />
        </div>
        <div>
          <label className="block text-xs text-[#8a8f98] mb-1.5">Что помешало</label>
          <textarea rows={3} className={field} value={blockers} onChange={e => setBlockers(e.target.value)}
            placeholder="Залип в ленте после обеда…" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-[#8a8f98]">Рефлексия дня</label>
          <span className={`text-xs tabular-nums ${reflection.trim().length >= MIN_LEN ? 'text-[#6fcf97]' : 'text-[#5b5f66]'}`}>
            {reflection.trim().length} / {MIN_LEN}
          </span>
        </div>
        <textarea rows={10} className={`${field} leading-relaxed`} value={reflection} onChange={e => setReflection(e.target.value)}
          placeholder="Когда я откладывал дела и что чувствовал перед этим? Что я реально хотел сделать, а что сделал? Какой момент дня был поворотным?" />
      </div>

      <div>
        <label className="block text-xs text-[#8a8f98] mb-1.5">Главное на завтра</label>
        <textarea rows={2} className={field} value={tomorrow} onChange={e => setTomorrow(e.target.value)}
          placeholder="Три конкретных действия" />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-[#5e6ad2] hover:bg-[#6b77e0] disabled:opacity-60 text-sm font-medium text-white transition-colors">
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
          {saved ? 'Сохранено' : 'Сохранить отчет'}
        </button>
        {saved && (
          <button type="button" onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-[#23252a] text-sm text-[#c9cacd] hover:bg-[#15161a] transition-colors">
            <Sparkles size={14} /> К дашборду и анализу
          </button>
        )}
      </div>
    </form>
  )
}
