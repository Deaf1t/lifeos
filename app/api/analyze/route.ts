import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Актуальный стек моделей из Google AI Studio
const FALLBACK_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.1-pro',
  'gemini-4-argon',
]

export async function POST(req: Request) {
  try {
    const { userId, date, whatWentWell, whatHindered, reflection, nextDayPriorities } =
      await req.json()

    if (!userId || !date) {
      return NextResponse.json({ error: 'User ID and date are required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Получаем объективные метрики дня
    const [bodyRes, habitRes, tasksRes] = await Promise.all([
      supabase.from('body_logs').select('*').eq('user_id', userId).eq('log_date', date).maybeSingle(),
      supabase.from('habit_logs').select('*').eq('user_id', userId).eq('log_date', date).maybeSingle(),
      supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    ])

    const completedTasks = tasksRes.data?.filter((t: any) => t.status === 'completed') || []
    const pendingTasks = tasksRes.data?.filter((t: any) => t.status === 'pending') || []

    const dayMetrics = {
      date,
      sleep_hours: bodyRes.data?.sleep_hours ?? 8,
      protein_g: bodyRes.data?.protein_g ?? 0,
      protein_target: 160,
      calories: bodyRes.data?.calories ?? 0,
      creatine: bodyRes.data?.creatine ?? false,
      workout: bodyRes.data?.workout_type ?? 'отдых',
      instagram_minutes: habitRes.data?.instagram_minutes ?? 0,
      instagram_limit: 30,
      tasks_completed: completedTasks.map((t: any) => t.title),
      tasks_pending: pendingTasks.map((t: any) => t.title),
      user_notes: {
        whatWentWell,
        whatHindered,
        reflection,
        nextDayPriorities,
      },
    }

    const prompt = `Ты — строгий, беспристрастный, но объективный аналитик эффективности LifeOS.
Оцени продуктивность и дисциплину пользователя за день.

Данные за ${date}:
${JSON.stringify(dayMetrics, null, 2)}

Критерии оценки дня (целое число от 1 до 10):
- Выполнение ключевых задач и фокус — вес 35%
- Дисциплина (лимит Instagram до 30 мин) — вес 20%
- Восстановление и тело (сон 8ч, белок 150-165г, креатин, тренировка) — вес 25%
- Осознанность в рефлексии — вес 20%

Верни ответ СТРОГО в формате чистого JSON объекта:
{
  "score": 8,
  "verdict": "Емкая фраза-вердикт дня (до 8 слов)",
  "breakdown": [
    "Плюс: главное достижение дня",
    "Минус: главная утечка фокуса или энергии"
  ],
  "analysis": "2-3 сжатых абзаца: связь сна/питания с концентрацией, разбор срывов внимания и четкая директива на завтра."
}`

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        score: 7,
        verdict: 'Ключ GEMINI_API_KEY не найден',
        breakdown: ['Проверь файл .env.local'],
        analysis: 'Добавь GEMINI_API_KEY в .env.local и перезапусти сервер через npm run dev.',
      })
    }

    let rawText = ''
    let lastError: string | null = null

    // 2. Перебор актуальных моделей
    for (const model of FALLBACK_MODELS) {
      try {
        const aiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
              },
            }),
          },
        )

        const aiData = await aiRes.json()

        if (aiRes.ok && !aiData.error) {
          rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
          if (rawText) break
        } else {
          lastError = aiData.error?.message || `HTTP ${aiRes.status}`
          console.warn(`Модель ${model} вернула ошибку (${lastError}), пробуем следующую...`)
        }
      } catch (err: any) {
        lastError = err.message
        console.warn(`Сбой сети для ${model}:`, err)
      }
    }

    if (!rawText) {
      return NextResponse.json({
        score: 7,
        verdict: 'Ошибка генерации ответа',
        breakdown: ['Не удалось подключиться к моделям'],
        analysis: `Google AI вернул: ${lastError}. Проверь подключение.`,
      })
    }

    // 3. Извлечение JSON
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Ответ не содержит структуры JSON: ' + rawText)
    }

    const parsed = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      score: Number(parsed.score) || 7,
      verdict: parsed.verdict || 'День проанализирован',
      breakdown: Array.isArray(parsed.breakdown) ? parsed.breakdown : [],
      analysis: parsed.analysis || rawText,
    })
  } catch (error: any) {
    console.error('AI Route Fatal Error:', error)
    return NextResponse.json(
      {
        score: 7,
        verdict: 'Сбой парсинга',
        breakdown: ['Ошибка структуры ответа'],
        analysis: `Системная ошибка: ${error.message}. Попробуй нажать кнопку еще раз.`,
      },
      { status: 200 },
    )
  }
}