import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const ALLOWED_USER_ID = process.env.TELEGRAM_ALLOWED_USER_ID
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Серверный Supabase клиент с правами Service Role для записи без браузерной сессии
const supabaseAdmin = createClient(
  SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY || ''
)

async function sendTelegramMessage(chatId: number, text: string) {
  if (!BOT_TOKEN) return
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  })
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json()
    const message = update?.message

    if (!message || !message.text) {
      return NextResponse.json({ ok: true })
    }

    const chatId = message.chat.id
    const userId = String(message.from?.id)
    const text = message.text.trim()

    // Защита: отвечаем только владельцу
    if (ALLOWED_USER_ID && userId !== ALLOWED_USER_ID) {
      await sendTelegramMessage(chatId, '⛔ Доступ запрещен.')
      return NextResponse.json({ ok: true })
    }

    // Обработка базовых команд
    if (text === '/start') {
      await sendTelegramMessage(
        chatId,
        '⚡ <b>LifeOS Bot активен</b>\n\n' +
        '• Отправь текст задачи — добавлю в Top-3 дня\n' +
        '• Напиши <code>/stats</code> — проверю статус дня'
      )
      return NextResponse.json({ ok: true })
    }

    if (text === '/stats') {
      const today = new Date().toISOString().split('T')[0]
      const { data: habit } = await supabaseAdmin
        .from('habit_logs')
        .select('*')
        .eq('log_date', today)
        .maybeSingle()

      const ig = habit?.instagram_minutes ?? 0
      const pages = habit?.reading_pages ?? 0
      const focus = habit?.focus_mode_ok ? '✅ Выполнен' : '❌ Нет'

      await sendTelegramMessage(
        chatId,
        `📊 <b>Метрики за ${today}:</b>\n\n` +
        `• Instagram: <b>${ig} мин</b> (норма ≤ 30м)\n` +
        `• Чтение: <b>${pages} стр</b>\n` +
        `• Глубокий фокус: <b>${focus}</b>`
      )
      return NextResponse.json({ ok: true })
    }

    // Сохранение задачи в базу
    const { error } = await supabaseAdmin.from('tasks').insert({
      title: text,
      status: 'pending',
      created_at: new Date().toISOString(),
    })

    if (error) {
      await sendTelegramMessage(chatId, `⚠️ Ошибка сохранения: ${error.message}`)
    } else {
      await sendTelegramMessage(chatId, `🎯 Задача добавлена в LifeOS:\n<b>${text}</b>`)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}