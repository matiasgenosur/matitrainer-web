'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/activities', label: 'Actividades' },
  { href: '/analytics', label: 'Análisis' },
  { href: '/training', label: 'Plan' },
  { href: '/agenda', label: 'Agenda' },
  { href: '/predictor', label: 'Predictor' },
  { href: '/trainer', label: 'Entrenador' },
]

const trainerLinks = [
  { href: '/trainer', label: 'Atletas' },
  { href: '/trainer/calendar', label: 'Calendario' },
  { href: '/trainer/sessions/new', label: 'Nueva sesión' },
  { href: '/trainer/templates', label: 'Plantillas' },
  { href: '/trainer/exercises', label: 'Ejercicios' },
]

export default function Nav() {
  const pathname = usePathname()
  const inTrainer = pathname?.startsWith('/trainer') ?? false

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-sm font-bold">
              M
            </div>
            <span className="font-semibold text-white hidden sm:block">MatiTrainer</span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {links.map((link) => {
              const isActive =
                link.href === '/trainer'
                  ? inTrainer
                  : pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-3 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap',
                    isActive
                      ? 'text-violet-400 bg-violet-500/10'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Avatar */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">
              MG
            </div>
          </div>
        </div>

        {/* Trainer sub-nav */}
        {inTrainer && (
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-2 -mt-1">
            {trainerLinks.map((link) => {
              const isActive =
                link.href === '/trainer'
                  ? pathname === '/trainer'
                  : pathname?.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap',
                    isActive
                      ? 'text-violet-300 bg-violet-500/10'
                      : 'text-gray-500 hover:text-white hover:bg-white/5'
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </nav>
  )
}
