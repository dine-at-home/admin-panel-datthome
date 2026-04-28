'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/lib/auth'
import { getApiUrl } from '@/lib/api-config'
import {
  Users,
  UtensilsCrossed,
  Ticket,
  CreditCard,
  Banknote,
  AlertCircle,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'

interface Stats {
  totalUsers: number
  totalHosts: number
  totalBookings: number
  completedBookings: number
  totalPaymentsCount: number
  totalRevenue: number
  pendingPayouts: number
  failedPayouts: number
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  href?: string
  accent?: string
}

function StatCard({ label, value, sub, icon, href, accent = 'bg-slate-100 text-slate-600' }: StatCardProps) {
  const inner = (
    <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>
          {icon}
        </div>
        {href && (
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-orange-400 transition-colors" />
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login')
      return
    }

    const fetchStats = async () => {
      try {
        const headers = authService.getAuthHeaders()
        const res = await fetch(getApiUrl('/admin/stats'), { headers })
        if (res.status === 401) {
          authService.removeToken()
          router.push('/login')
          return
        }
        const data = await res.json()
        if (data.success) setStats(data.data)
      } catch (err) {
        console.error('Failed to fetch stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const completionRate =
    stats && stats.totalBookings > 0
      ? Math.round((stats.completedBookings / stats.totalBookings) * 100)
      : 0

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
        <p className="text-sm text-slate-500 mt-1">Platform health at a glance</p>
      </div>

      {/* Revenue hero */}
      <div className="bg-[#0f1117] rounded-2xl p-6 mb-6 flex items-center justify-between">
        <div>
          <p className="text-white/40 text-sm font-medium uppercase tracking-wider mb-1">Total Revenue</p>
          <p className="text-4xl font-bold text-white tabular-nums">
            kr {stats ? stats.totalRevenue.toLocaleString('is-IS', { maximumFractionDigits: 0 }) : '—'}
          </p>
          <p className="text-white/30 text-sm mt-1">
            from {stats?.totalPaymentsCount ?? 0} successful payments
          </p>
        </div>
        <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center">
          <TrendingUp className="w-7 h-7 text-orange-400" />
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Guests"
          value={stats?.totalUsers ?? 0}
          icon={<Users className="w-4 h-4" />}
          href="/dashboard/users"
          accent="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Hosts"
          value={stats?.totalHosts ?? 0}
          icon={<UtensilsCrossed className="w-4 h-4" />}
          href="/dashboard/users"
          accent="bg-purple-50 text-purple-600"
        />
        <StatCard
          label="Bookings"
          value={stats?.totalBookings ?? 0}
          sub={`${completionRate}% completed`}
          icon={<Ticket className="w-4 h-4" />}
          href="/dashboard/bookings"
          accent="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Transactions"
          value={stats?.totalPaymentsCount ?? 0}
          icon={<CreditCard className="w-4 h-4" />}
          href="/dashboard/transactions"
          accent="bg-orange-50 text-orange-600"
        />
      </div>

      {/* Payout alerts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/dashboard/payouts?status=PENDING_SETTLEMENT">
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 group">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Banknote className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xl font-bold text-slate-900 tabular-nums">{stats?.pendingPayouts ?? 0}</p>
              <p className="text-sm text-slate-500">Payouts pending settlement</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-orange-400 transition-colors flex-shrink-0" />
          </div>
        </Link>

        {(stats?.failedPayouts ?? 0) > 0 ? (
          <Link href="/dashboard/payouts?status=FAILED">
            <div className="bg-white border border-red-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 group">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold text-red-600 tabular-nums">{stats?.failedPayouts}</p>
                <p className="text-sm text-slate-500">Failed payouts — action required</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-red-400 transition-colors flex-shrink-0" />
            </div>
          </Link>
        ) : (
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">0</p>
              <p className="text-sm text-slate-500">No failed payouts</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
