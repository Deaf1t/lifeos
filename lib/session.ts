import { supabase } from './supabase'
import { toISODate } from './constants'
import { elapsedSec, type TimerState } from './timer'

/**
 * Сохраняет завершенную фокус-сессию:
 *  - привязана к задаче  -> добавляет секунды в tasks.time_spent_seconds
 *  - без задачи          -> создает выполненную задачу
 *  - всегда              -> пишет запись в time_entries
 */
export async function saveSession(
  userId: string,
  t: TimerState,
  prevSeconds: number,
): Promise<{ seconds: number; error: string | null }> {
  const seconds = elapsedSec(t)
  if (seconds < 1) return { seconds: 0, error: null }

  let taskId = t.taskId
  if (taskId) {
    const { error } = await supabase.from('tasks').update({ time_spent_seconds: prevSeconds + seconds }).eq('id', taskId)
    if (error) return { seconds, error: error.message }
  } else {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId, sphere: t.sphere, title: t.title, project: t.project || null,
        status: 'done', task_date: toISODate(new Date()),
        time_spent_seconds: seconds, completed_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (error || !data) return { seconds, error: error?.message ?? 'Не удалось сохранить сессию' }
    taskId = data.id as string
  }

  const { error } = await supabase.from('time_entries').insert({
    user_id: userId,
    task_id: taskId,
    started_at: new Date(t.sessionStart).toISOString(),
    ended_at: new Date(t.sessionStart + seconds * 1000).toISOString(),
  })
  return { seconds, error: error?.message ?? null }
}