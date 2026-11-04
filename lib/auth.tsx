'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { Loader2 } from 'lucide-react'
import { supabase } from './supabase'

type Ctx = { user: User; userId: string; signOut: () => Promise<void> }
const AuthCtx = createContext<Ctx | null>(null)

export function useAuth() {
  const c = useContext(AuthCtx)
  if (!c) throw new Error('useAuth must be used inside <AuthProvider>')
  return c
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setReady(true)
      if (!data.session) router.replace('/login')
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (!session) router.replace('/login')
    })
    return () => sub.subscription.unsubscribe()
  }, [router])

  if (!ready || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#08090a] text-[#5b5f66]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    )
  }

  return (
    <AuthCtx.Provider value={{ user, userId: user.id, signOut: async () => { await supabase.auth.signOut() } }}>
      {children}
    </AuthCtx.Provider>
  )
}
