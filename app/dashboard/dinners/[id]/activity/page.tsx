'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/lib/auth'
import { apiGet, fmtMoney, fmtDateTime } from '@/lib/api'
import { StatusPill } from '@/components/StatusPill'
import { LogTimeline, type TransactionLog } from '@/components/LogTimeline'
import { ArrowLeft, RefreshCw } from 'lucide-react'

interface DinnerActivity {
  dinner: {
    id: string
    title: string
    date: string
    price: number
    currency: string
    capacity: number
    available: number
    host: { id: string; name: string | null; email: string }
    bookings: Array<{
      id: string
      status: string
      totalPrice: number
      currency: string | null
      guests: number
      createdAt: string
      user: { id: string; name: string | null; email: string }
      payment: { id: string; status: string; amount: number; currency: string; refundedAmount: number } | null
      payout: { id: string; status: string; amount: number } | null
    }>
  }
  summary: {
    bookings: number
    grossRevenue: number
    refunded: number
    netRevenue: number
  }
  logs: TransactionLog[]
}

export default function DinnerActivityPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [data, setData] = useState<DinnerActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const reload = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setErr('')
      const result = await apiGet<DinnerActivity>(`/admin/dinners/${id}/activity`)
      setData(result)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load activity')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login')
      return
    }
    reload()
  }, [router, reload])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!data) {
    return (
      <div>
        <Link
          href={id ? `/dashboard/dinners/${id}` : '/dashboard/dinners'}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-lg">
          {err || 'Dinner not found'}
        </div>
      </div>
    )
  }

  const d = data.dinner

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/dinners/${d.id}`}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" /> {d.title}
        </Link>
        <button
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Activity</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Hosted by{' '}
          <Link href={`/dashboard/users/${d.host.id}`} className="text-orange-600 hover:underline">
            {d.host.name || d.host.email}
          </Link>{' '}
          • {fmtDateTime(d.date)}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Bookings" value={data.summary.bookings} />
        <Card label="Gross revenue" value={fmtMoney(data.summary.grossRevenue, d.currency)} />
        <Card label="Refunded" value={fmtMoney(data.summary.refunded, d.currency)} />
        <Card label="Net revenue" value={fmtMoney(data.summary.netRevenue, d.currency)} highlight />
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Bookings on this dinner</h2>
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Guest</th>
                <th className="text-right px-4 py-2">Total</th>
                <th className="text-left px-4 py-2">Payment</th>
                <th className="text-left px-4 py-2">Payout</th>
                <th className="text-left px-4 py-2">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {d.bookings.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => router.push(`/dashboard/bookings/${b.id}`)}
                  className="hover:bg-slate-50/50 cursor-pointer"
                >
                  <td className="px-4 py-2">
                    <StatusPill status={b.status} />
                  </td>
                  <td className="px-4 py-2">
                    <p className="text-slate-700">{b.user.name || '—'}</p>
                    <p className="text-xs text-slate-400">{b.user.email}</p>
                  </td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums">
                    {fmtMoney(b.totalPrice, b.currency || d.currency)}
                    <p className="text-xs text-slate-400">
                      {b.guests} guest{b.guests !== 1 ? 's' : ''}
                    </p>
                  </td>
                  <td className="px-4 py-2">
                    {b.payment ? <StatusPill status={b.payment.status} /> : '—'}
                  </td>
                  <td className="px-4 py-2">
                    {b.payout ? <StatusPill status={b.payout.status} /> : '—'}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">{fmtDateTime(b.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Activity log</h2>
        <LogTimeline logs={data.logs} />
      </section>
    </div>
  )
}

function Card({
  label,
  value,
  highlight,
}: {
  label: string
  value: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div
      className={`border rounded-xl shadow-sm p-4 ${
        highlight
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-white border-slate-100'
      }`}
    >
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${highlight ? 'text-emerald-700' : 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  )
}
