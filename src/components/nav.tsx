'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardList, PenLine, Settings, BarChart3, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: '日报', icon: ClipboardList },
  { href: '/report', label: '填写', icon: PenLine },
  { href: '/items', label: '工项', icon: Settings },
  { href: '/summary', label: '汇总', icon: BarChart3 },
]

const settingsItem = { href: '/settings', label: '通知', icon: Bell }

export function TopNav() {
  const pathname = usePathname()

  return (
    <nav className="hidden md:flex border-b bg-background">
      <div className="container max-w-4xl mx-auto flex">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 px-5 py-3.5 text-sm border-b-2 transition-colors',
                isActive
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
        <Link
          href={settingsItem.href}
          className={cn(
            'flex items-center gap-2 px-5 py-3.5 text-sm border-b-2 transition-colors ml-auto',
            pathname === settingsItem.href
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <settingsItem.icon className="h-4 w-4" />
          {settingsItem.label}
        </Link>
      </div>
    </nav>
  )
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t bg-background md:hidden">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-1 flex-col items-center py-2 text-xs transition-colors',
              isActive
                ? 'text-primary font-semibold'
                : 'text-muted-foreground'
            )}
          >
            <Icon className="h-5 w-5 mb-0.5" />
            {item.label}
          </Link>
        )
      })}
      <Link
        href={settingsItem.href}
        className={cn(
          'flex flex-1 flex-col items-center py-2 text-xs transition-colors',
          pathname === settingsItem.href
            ? 'text-primary font-semibold'
            : 'text-muted-foreground'
        )}
      >
        <settingsItem.icon className="h-5 w-5 mb-0.5" />
        {settingsItem.label}
      </Link>
    </nav>
  )
}
