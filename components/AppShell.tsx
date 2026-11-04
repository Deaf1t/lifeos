'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CheckSquare,
  Target,
  Briefcase,
  GraduationCap,
  Activity,
  Sparkles,
  LogOut,
} from 'lucide-react'
import { AuthProvider, useAuth } from '@/lib/auth'
import { cx } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/tasks', label: 'Задачи и фокус', icon: CheckSquare },
  { href: '/goals', label: 'Цели', icon: Target },
  { href: '/projects', label: 'Проекты', icon: Briefcase },
  { href: '/auk', label: 'Академ. хаб АЮК', icon: GraduationCap },
  { href: '/body', label: 'Тело и восстановление', icon: Activity },
  { href: '/review', label: 'Рефлексия и AI', icon: Sparkles },
]

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { signOut } = useAuth()

  // Для страницы входа не рендерим боковую панель
  if (pathname === '/login') {
    return <main className="min-h-screen bg-[#07080b] text-[#e6e6e8]">{children}</main>
  }

  return (
    <div className="flex min-h-screen bg-[#07080b] text-[#e6e6e8]">
      {/* Левый сайдбар */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/[0.06] bg-[#0c0d12]/95 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-6">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 font-mono text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
            L
          </div>
          <div>
            <span className="font-bold tracking-tight text-white">LifeOS</span>
            <span className="ml-1.5 rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-mono text-indigo-400 border border-indigo-500/20">
              v2.4
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all duration-150',
                  isActive
                    ? 'border border-indigo-500/30 bg-indigo-500/10 text-white shadow-sm'
                    : 'text-[#8a8f98] hover:bg-white/[0.03] hover:text-white',
                )}
              >
                <Icon
                  size={16}
                  className={cx(
                    'transition-colors',
                    isActive ? 'text-indigo-400' : 'text-[#6b6f78] group-hover:text-white',
                  )}
                />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/[0.06] p-3">
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-[#8a8f98] hover:bg-white/[0.04] hover:text-rose-400 transition-colors"
          >
            <LogOut size={16} />
            <span>Выйти</span>
          </button>
        </div>
      </aside>

      {/* Основной контент */}
      <main className="flex-1 pl-64">
        <div className="mx-auto max-w-7xl p-8">{children}</div>
      </main>
    </div>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShellContent>{children}</AppShellContent>
    </AuthProvider>
  )
}