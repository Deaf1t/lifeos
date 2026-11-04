'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { Loader2 } from 'lucide-react'
import { supabase } from './supabase'

type Ctx = { user: User | null; userId: string; signOut: () => Promise<void> }
const AuthCtx = createContext<Ctx | null>(null)

export function useAuth() {
  const c = useContext(AuthCtx)
  if (!c) throw new Error('useAuth must be used inside <AuthProvider>')
  return c
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setReady(true)
    }).catch(() => {
      setReady(true)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      setReady(true)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  // Контроль маршрутов
  useEffect(() => {
    if (!ready) return

    const isLoginPage = pathname === '/login'

    if (!user && !isLoginPage) {
      router.replace('/login')
    } else if (user && isLoginPage) {
      router.replace('/')
    }
  }, [user, ready, pathname, router])

  // Показываем спиннер только во время первичной инициализации Supabase
  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#08090a] text-[#5b5f66]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    )
  }

  // Если не авторизован и идет на закрытую страницу — ждем редиректа на /login
  if (!user && pathname !== '/login') {
    return (
      <div className="min-h-screen grid place-items-center bg-[#08090a] text-[#5b5f66]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    )
  }

  // Если уже авторизован и открыл /login — ждем редиректа в дашборд
  if (user && pathname === '/login') {
    return (
      <div className="min-h-screen grid place-items-center bg-[#08090a] text-[#5b5f66]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    )
  }

  return (
    <AuthCtx.Provider
      value={{
        user,
        userId: user?.id ?? '',
        signOut: async () => {
          await supabase.auth.signOut()
        },
      }}
    >
      {children}
    </AuthCtx.Provider>
  )
}