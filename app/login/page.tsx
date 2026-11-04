'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signUpError) throw signUpError
      }
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Ошибка авторизации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#08090a] px-4 text-[#e6e6e6]">
      <div className="w-full max-w-sm rounded-xl border border-[#1f2025] bg-[#0d0e10] p-6 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-2 grid h-10 w-10 place-items-center rounded-lg bg-[#5e6ad2] text-sm font-bold text-white">
            L
          </div>
          <h1 className="text-xl font-semibold">LifeOS</h1>
          <p className="text-xs text-[#8a8f98]">
            {mode === 'login' ? 'Вход в личный дашборд' : 'Регистрация аккаунта'}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-[#8a8f98]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@example.com"
              className="h-9 w-full rounded-md border border-[#23252a] bg-[#121316] px-3 text-sm text-[#e6e6e8] outline-none transition focus:border-[#5e6ad2]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#8a8f98]">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="h-9 w-full rounded-md border border-[#23252a] bg-[#121316] px-3 text-sm text-[#e6e6e8] outline-none transition focus:border-[#5e6ad2]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-9 w-full items-center justify-center rounded-md bg-[#5e6ad2] text-sm font-medium text-white transition hover:bg-[#4f5bc0] disabled:opacity-50"
          >
            {loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-[#8a8f98]">
          {mode === 'login' ? (
            <span>
              Нет аккаунта?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-[#7c8cf8] hover:underline"
              >
                Создать
              </button>
            </span>
          ) : (
            <span>
              Уже есть аккаунт?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-[#7c8cf8] hover:underline"
              >
                Войти
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}