'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/lib/auth'
import { apiGet, apiSend, fmtMoney, fmtDateTime } from '@/lib/api'
import { StatusPill } from '@/components/StatusPill'
import { LogTimeline, type TransactionLog } from '@/components/LogTimeline'
import { ArrowLeft, RefreshCw, CreditCard, Banknote, Ticket, Send } from 'lucide-react'

interface UserActivity {
  user: {
    id: string
    email: string
    name: string | null
    role: string
    blocked: boolean
    kycStatus: string
    accountHolderName: string | null
    payoutCardBrand: string | null
    payoutCardLast4: string | null
    payoutDebt: number
    createdAt: string
  }
  summary: {
    bookingsAsGuest: number
    bookingsAsHost: number
    payouts: number
    totalEarned: number
    payoutInFlight: number
    currency: string
  }
  bookingsAsGuest: Array<{
    id: string
    status: string
    totalPrice: number
    currency: string | null
    createdAt: string
    dinner: { id: string; title: string; date: string }
    payment: { id: string; status: string; amount: number; currency: string } | null
  }>
  bookingsAsHost: Array<{
    id: string
    status: string
    totalPrice: number
    currency: string | null
    createdAt: string
    user: { id: string; name: string | null; email: string }
    dinner: { id: string; title: string; date: string }
    payment: { id: string; status: string; amount: number; currency: string } | null
    payout: { id: string; status: string; amount: number } | null
  }>
  payouts: Array<{
    id: string
    status: string
    amount: number
    currency: string
    createdAt: string
    arrivalDate: string | null
    failureMessage: string | null
  }>
  logs: TransactionLog[]
}

export default function UserActivityPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [data, setData] = useState<UserActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const reload = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setErr('')
      const result = await apiGet<UserActivity>(`/admin/users/${id}/activity`)
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

  const handlePayoutHost = async () => {
    if (!data) return
    const eligibleCount = data.bookingsAsHost.filter(
      (b) => b.status === 'COMPLETED' && b.payment?.status === 'SUCCEEDED' && !b.payout
    ).length
    if (eligibleCount === 0) {
      alert(
        'No eligible bookings: a booking must be COMPLETED with a SUCCEEDED payment and no existing payout. Use the seed script to fast-forward a booking for testing.'
      )
      return
    }
    const skipMin = confirm(
      `Create payout for this host across ${eligibleCount} booking(s)?\n\nClick OK to bypass the minimum-payout threshold (recommended for testing).\nClick Cancel to require the threshold.`
    )
    try {
      await apiSend('POST', '/admin/payouts/create-for-host', {
        hostId: data.user.id,
        skipMinimum: skipMin,
      })
      await reload()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create payout')
    }
  }

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
          href={id ? `/dashboard/users/${id}` : '/dashboard/users'}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-lg">
          {err || 'User not found'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/users/${data.user.id}`}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" /> {data.user.name || data.user.email}
        </Link>
        <button
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activity</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {data.user.name || '—'} • {data.user.role}
            {data.user.blocked && <span className="ml-2 text-red-600 font-medium">BLOCKED</span>}
          </p>
        </div>
        {data.user.role === 'host' && data.bookingsAsHost.length > 0 && (
          <button
            onClick={handlePayoutHost}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            <Send className="w-4 h-4" /> Pay out host now
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="As guest" value={data.summary.bookingsAsGuest} icon={<Ticket />} />
        <SummaryCard label="As host" value={data.summary.bookingsAsHost} icon={<Ticket />} />
        <SummaryCard
          label="Total earned"
          value={fmtMoney(data.summary.totalEarned, data.summary.currency)}
          icon={<Banknote />}
        />
        <SummaryCard
          label="Payouts in flight"
          value={fmtMoney(data.summary.payoutInFlight, data.summary.currency)}
          icon={<CreditCard />}
        />
      </div>

      {data.user.payoutDebt > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg">
          Outstanding host debt: <strong>{fmtMoney(data.user.payoutDebt, data.summary.currency)}</strong>
          {' '}— will be deducted from next payout
        </div>
      )}

      {data.bookingsAsHost.length > 0 && (
        <Section title="Bookings as host">
          <BookingTable
            rows={data.bookingsAsHost.map((b) => ({
              id: b.id,
              status: b.status,
              counterpartyName: b.user.name || b.user.email,
              dinnerTitle: b.dinner.title,
              dinnerDate: b.dinner.date,
              totalPrice: b.totalPrice,
              currency: b.currency,
              createdAt: b.createdAt,
              paymentStatus: b.payment?.status,
              paymentId: b.payment?.id,
              payoutStatus: b.payout?.status,
              payoutId: b.payout?.id,
            }))}
          />
        </Section>
      )}

      {data.bookingsAsGuest.length > 0 && (
        <Section title="Bookings as guest">
          <BookingTable
            rows={data.bookingsAsGuest.map((b) => ({
              id: b.id,
              status: b.status,
              counterpartyName: '',
              dinnerTitle: b.dinner.title,
              dinnerDate: b.dinner.date,
              totalPrice: b.totalPrice,
              currency: b.currency,
              createdAt: b.createdAt,
              paymentStatus: b.payment?.status,
              paymentId: b.payment?.id,
            }))}
            hideCounterparty
          />
        </Section>
      )}

      {data.payouts.length > 0 && (
        <Section title="Payouts">
          <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-right px-4 py-2">Amount</th>
                  <th className="text-left px-4 py-2">Created</th>
                  <th className="text-left px-4 py-2">Arrival</th>
                  <th className="text-left px-4 py-2">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.payouts.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/dashboard/payouts/${p.id}`)}
                    className="hover:bg-slate-50/50 cursor-pointer"
                  >
                    <td className="px-4 py-2">
                      <StatusPill status={p.status} />
                    </td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums">
                      {fmtMoney(p.amount, p.currency)}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500">{fmtDateTime(p.createdAt)}</td>
                    <td className="px-4 py-2 text-xs text-slate-500">{fmtDateTime(p.arrivalDate)}</td>
                    <td className="px-4 py-2 text-xs text-red-600 truncate max-w-[260px]">
                      {p.failureMessage || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Section title="Activity log">
        <LogTimeline logs={data.logs} />
      </Section>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string
  value: React.ReactNode
  icon: React.ReactNode
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4">
      <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center mb-2">
        <span className="w-4 h-4">{icon}</span>
      </div>
      <p className="text-xl font-bold text-slate-900 tabular-nums">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-700 mb-3">{title}</h2>
      {children}
    </section>
  )
}

interface BookingRow {
  id: string
  status: string
  counterpartyName: string
  dinnerTitle: string
  dinnerDate: string
  totalPrice: number
  currency: string | null
  createdAt: string
  paymentStatus?: string
  paymentId?: string
  payoutStatus?: string
  payoutId?: string
}

function BookingTable({
  rows,
  hideCounterparty,
}: {
  rows: BookingRow[]
  hideCounterparty?: boolean
}) {
  const router = useRouter()
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <tr>
            <th className="text-left px-4 py-2">Status</th>
            {!hideCounterparty && <th className="text-left px-4 py-2">Guest</th>}
            <th className="text-left px-4 py-2">Dinner</th>
            <th className="text-right px-4 py-2">Total</th>
            <th className="text-left px-4 py-2">Payment</th>
            {!hideCounterparty && <th className="text-left px-4 py-2">Payout</th>}
            <th className="text-left px-4 py-2">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((r) => (
            <tr
              key={r.id}
              onClick={() => router.push(`/dashboard/bookings/${r.id}`)}
              className="hover:bg-slate-50/50 cursor-pointer"
            >
              <td className="px-4 py-2">
                <StatusPill status={r.status} />
              </td>
              {!hideCounterparty && (
                <td className="px-4 py-2 text-slate-700 truncate max-w-[160px]">
                  {r.counterpartyName}
                </td>
              )}
              <td className="px-4 py-2 max-w-[200px]">
                <p className="text-slate-700 truncate">{r.dinnerTitle}</p>
                <p className="text-xs text-slate-400">{fmtDateTime(r.dinnerDate)}</p>
              </td>
              <td className="px-4 py-2 text-right font-medium tabular-nums">
                {fmtMoney(r.totalPrice, r.currency || 'ISK')}
              </td>
              <td className="px-4 py-2">
                {r.paymentStatus ? <StatusPill status={r.paymentStatus} /> : '—'}
              </td>
              {!hideCounterparty && (
                <td className="px-4 py-2">
                  {r.payoutStatus ? <StatusPill status={r.payoutStatus} /> : '—'}
                </td>
              )}
              <td className="px-4 py-2 text-xs text-slate-500">{fmtDateTime(r.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
