'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Lightbulb, Repeat, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toISODate } from '@/lib/constants'
import { addDays } from '@/lib/utils'
import { Button, Card, CardBody, CardHeader, ErrorBanner } from '@/components/ui'

type Pattern = string | { pattern: string; evidence?: string }
type Insight = {
  summary: string
  procrastination_patterns: Pattern[]
  weaknesses: string[]
  recommendations: string[]
  model: string | null
  created_at: string
}

const norm = (p: Pattern) => (typeof p === 'string' ? { pattern: p, evidence: undefined } : p)

export default function AiInsightCard({ refreshKey = 0 }: { refreshKey?: number }) {
  const [insight, setInsight] = useState<Insight | null>(null)
  const [reviewCount, setReviewCount] = useState(0)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [i, c] = await Promise.all([
      supabase.from('ai_insights').select('summary,procrastination_patterns,weaknesses,recommendations,model,created_at')
        .order('created_at', { ascending: false }).limit(1),
      supabase.from('daily_reviews').select('id', { count: 'exact', head: true }).gte('review_date', toISODate(addDays(new Date(), -14))),
    ])
    setInsight((i.data?.[0] as Insight) ?? null)
    setReviewCount(c.count ?? 0)
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  async function run() {
    setRunning(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/analyze', { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token}` } })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Ошибка анализа')
      setInsight(json.insight)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка анализа')
    } finally {
      setRunning(false)
    }
  }

  const enough = reviewCount >= 3

  return (
    <Card>
      <CardHeader
        title="AI Аналитика"
        icon={Sparkles}
        hint={insight ? `от ${new Date(insight.created_at).toLocaleDateString('ru-RU')}` : `отчетов за 14 дней: ${reviewCount}`}
      />
      <CardBody className="space-y-5">
        <Button variant="primary" size="lg" icon={Sparkles} loading={running} disabled={!enough} onClick={run} className="w-full">
          {running ? 'Анализирую…' : 'Запустить AI-анализ'}
        </Button>
        {!enough && <p className="-mt-2 text-xs text-[#5b5f66]">Нужно минимум 3 отчета за последние 14 дней.</p>}
        <ErrorBanner message={error} />

        {insight && !running && (
          <div className="space-y-5 text-[13px] leading-relaxed">
            <p className="text-[#c9cacd]">{insight.summary}</p>

            {insight.procrastination_patterns?.length > 0 && (
              <Section icon={Repeat} title="Триггеры прокрастинации" tone="text-amber-400">
                <ul className="space-y-2.5">
                  {insight.procrastination_patterns.map(norm).map((p, i) => (
                    <li key={i}>
                      <div className="text-[#e6e6e8]">{p.pattern}</div>
                      {p.evidence && <div className="mt-0.5 text-xs text-[#6b6f78]">{p.evidence}</div>}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {insight.weaknesses?.length > 0 && (
              <Section icon={AlertTriangle} title="Слабые места" tone="text-[#e5676b]">
                <ul className="list-disc space-y-1.5 pl-4 text-[#c9cacd] marker:text-[#3a3d45]">
                  {insight.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </Section>
            )}

            {insight.recommendations?.length > 0 && (
              <Section icon={Lightbulb} title="Рекомендации" tone="text-[#6fcf97]">
                <ul className="list-disc space-y-1.5 pl-4 text-[#c9cacd] marker:text-[#3a3d45]">
                  {insight.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </Section>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function Section({ icon: Icon, title, tone, children }: { icon: typeof Repeat; title: string; tone: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#8a8f98]">
        <Icon size={13} className={tone} />{title}
      </div>
      {children}
    </div>
  )
}
