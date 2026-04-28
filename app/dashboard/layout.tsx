'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/lib/auth'
import {
  LayoutDashboard,
  Users,
  UtensilsCrossed,
  Megaphone,
  LogOut,
  Banknote,
  Ticket,
  CreditCard,
  ChevronRight,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'Transactions', icon: CreditCard },
  { href: '/dashboard/bookings', label: 'Bookings', icon: Ticket },
  { href: '/dashboard/payouts', label: 'Payouts', icon: Banknote },
  { href: '/dashboard/users', label: 'Users', icon: Users },
  { href: '/dashboard/dinners', label: 'Dinners', icon: UtensilsCrossed },
  { href: '/dashboard/ads', label: 'Ads', icon: Megaphone },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    setIsMounted(true)
    if (!authService.isAuthenticated()) router.push('/login')
  }, [router])

  if (!isMounted || !authService.isAuthenticated()) return null

  const handleLogout = () => {
    authService.removeToken()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-56 bg-[#0f1117] flex flex-col z-20">
        {/* Brand */}
        <div className="h-14 flex items-center px-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <UtensilsCrossed className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-white text-sm tracking-tight">DatHome</span>
            <span className="text-[10px] bg-white/10 text-white/40 px-1.5 py-0.5 rounded font-mono">
              admin
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-orange-500/10 text-orange-400'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-white/5 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="pl-56 flex-1 min-h-screen">
        <main className="p-8 max-w-7xl">{children}</main>
      </div>
    </div>
  )
}
