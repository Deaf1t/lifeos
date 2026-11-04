'use client'

import React, { useEffect, useState } from 'react'
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
  Menu,
  X,
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

// 5 ключевых вкладок для быстрого доступа с телефона
const MOBILE_BOTTOM_NAV = [
  { href: '/', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/tasks', label: 'Задачи', icon: CheckSquare },
  { href: '/projects', label: 'Проекты', icon: Briefcase },
  { href: '/body', label: 'Тело', icon: Activity },
  { href: '/review', label: 'AI', icon: Sparkles },
]

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Раскрываем Telegram Mini App на весь экран смартфона
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp
      tg.ready()
      tg.expand()
    }
  }, [])

  // Автоматически закрываем мобильное меню при переходе по ссылке
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  if (pathname === '/login') {
    return <main className="min-h-screen bg-[#07080b] text-[#e6e6e8]">{children}</main>
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#07080b] text-[#e6e6e8] md:flex-row">
      {/* Мобильная верхняя панель (только для телефонов) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#0c0d12]/95 px-4 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 font-mono text-xs font-bold text-white shadow-md shadow-indigo-500/20">
            L
          </div>
          <span className="font-bold tracking-tight text-white text-sm">LifeOS</span>
          <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-mono text-indigo-400 border border-indigo-500/20">
            v2.4
          </span>
        </div>

        <button
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-[#8a8f98] active:bg-white/[0.08] active:text-white"
          aria-label="Открыть меню"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {/* Полноэкранная шторка меню для мобильных устройств */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0c0d12]/98 backdrop-blur-2xl md:hidden">
          <div className="flex h-14 items-center justify-between border-b border-white/[0.06] px-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6b6f78]">
              Все разделы
            </span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-[#8a8f98]"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    'flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'border border-indigo-500/30 bg-indigo-500/10 text-white'
                      : 'text-[#8a8f98] hover:bg-white/[0.03] hover:text-white'
                  )}
                >
                  <Icon
                    size={18}
                    className={isActive ? 'text-indigo-400' : 'text-[#6b6f78]'}
                  />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-white/[0.06] p-4">
            <button
              onClick={() => signOut()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 py-3 text-sm font-medium text-rose-400 transition-colors active:bg-rose-500/20"
            >
              <LogOut size={16} />
              <span>Выйти из аккаунта</span>
            </button>
          </div>
        </div>
      )}

      {/* Левый сайдбар (только для ПК) */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-white/[0.06] bg-[#0c0d12]/95 backdrop-blur-xl">
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
                    : 'text-[#8a8f98] hover:bg-white/[0.03] hover:text-white'
                )}
              >
                <Icon
                  size={16}
                  className={cx(
                    'transition-colors',
                    isActive ? 'text-indigo-400' : 'text-[#6b6f78] group-hover:text-white'
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
      <main className="flex-1 pl-0 md:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-4 pb-24 md:p-8">{children}</div>
      </main>

      {/* Мобильная нижняя навигация (только для телефонов) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 flex h-16 items-center justify-around border-t border-white/[0.06] bg-[#0c0d12]/95 px-2 backdrop-blur-xl md:hidden">
        {MOBILE_BOTTOM_NAV.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                'flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors',
                isActive ? 'text-indigo-400' : 'text-[#6b6f78] hover:text-[#8a8f98]'
              )}
            >
              <Icon size={18} className={isActive ? 'text-indigo-400' : 'text-[#6b6f78]'} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
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