'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/lib/auth'
import { apiGetPaginated, apiSend, fmtMoney, fmtDateTime } from '@/lib/api'
import { StatusPill } from '@/components/StatusPill'
import {
  Banknote,
  Play,
  ChevronRight,
  AlertTriangle,
  PauseCircle,
  RefreshCw,
} from 'lucide-react'

interface Payout {
  id: string
  amount: number
  currency: string
  status: string
  description: string | null
  hostId: string
  host: {
    id: string
    name: string | null
    email: string
    payoutCardBrand: string | null
    payoutCardLast4: string | null
    kycStatus?: string
    payoutDebt?: number
  }
  bookingIds: string[]
  heldReason?: string | null
  failureMessage?: string | null
  paystraxPayoutPaymentId?: string | null
  arrivalDate?: string | null
  transferRetryCount: number
  createdAt: string
}

interface Limits {
  currency: 'EUR'
  daily: { used: number; limit: number }
  monthly: { used: number; limit: number }
  payoutCurrency: string
  minimumPayout: number
}

export default function PayoutsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status') || ''

  const [payouts, setPayouts] = useState<Payout[]>([])
  const [limits, setLimits] = useState<Limits | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [err, setErr] = useState('')
  const [running, setRunning] = useState(false)

  const reload = useCallback(async () => {
    try {
      setLoading(true)
      setErr('')
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(statusFilter ? { status: statusFilter } : {}),
      })
      const result = await apiGetPaginated<Payout>(`/admin/payouts?${params}`)
      setPayouts(result.items)
      setTotalPages(result.totalPages)
      setTotal(result.total)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load payouts')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login')
      return
    }
    reload()
    apiGetPaginated<unknown>('/admin/payouts/limits').catch(() => null)
    // limits is a non-paginated /limits endpoint; fetch via apiGet
    import('@/lib/api').then(({ apiGet }) =>
      apiGet<Limits>('/admin/payouts/limits').then(setLimits).catch(() => null)
    )
  }, [router, reload])

  const runBatch = async () => {
    if (!confirm('Run the payout batch now? This will process all eligible bookings.')) return
    try {
      setRunning(true)
      const summary = await apiSend<Record<string, unknown>>(
        'POST',
        '/admin/payouts/run-batch'
      )
      alert(
        `Batch complete — created: ${summary.payoutsCreated ?? 0}, succeeded: ${
          summary.disbursementsSucceeded ?? 0
        }, failed: ${summary.disbursementsFailed ?? 0}`
      )
      reload()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Batch run failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payouts</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} total</p>
        </div>
        <button
          onClick={runBatch}
          disabled={running}
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium disabled:opacity-50"
        >
          <Play className="w-4 h-4" />
          {running ? 'Running…' : 'Run payout batch now'}
        </button>
      </div>

      {limits && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <LimitCard
            title="Daily OCT used"
            used={limits.daily.used}
            limit={limits.daily.limit}
            currency={limits.currency}
          />
          <LimitCard
            title="Monthly OCT used"
            used={limits.monthly.used}
            limit={limits.monthly.limit}
            currency={limits.currency}
          />
          <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Min payout</p>
            <p className="text-xl font-bold text-slate-900 tabular-nums">
              {fmtMoney(limits.minimumPayout, limits.payoutCurrency)}
            </p>
            <p className="text-xs text-slate-400 mt-1">Settlement currency: {limits.payoutCurrency}</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-slate-600">Status</label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
        >
          <option value="">All</option>
          <option value="PENDING_SETTLEMENT">Pending settlement</option>
          <option value="IN_TRANSIT">In transit</option>
          <option value="ON_HOLD">On hold</option>
          <option value="PAID">Paid</option>
          <option value="FAILED">Failed</option>
          <option value="CANCELED">Canceled</option>
        </select>
      </div>

      {err && (
        <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-lg">{err}</div>
      )}

      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : payouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Banknote className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No payouts found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Host</th>
                <th className="text-left px-4 py-3">Card</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="text-left px-4 py-3">Note</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payouts.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-slate-50/50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/payouts/${p.id}`)}
                >
                  <td className="px-4 py-3">
                    <StatusPill status={p.status} />
                    {p.transferRetryCount > 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        retries: {p.transferRetryCount}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-700">{p.host.name || '—'}</p>
                    <p className="text-xs text-slate-400">{p.host.email}</p>
                    {p.host.kycStatus && p.host.kycStatus !== 'VERIFIED' && (
                      <p className="text-xs text-amber-600 mt-0.5">KYC {p.host.kycStatus}</p>
                    )}
                    {(p.host.payoutDebt || 0) > 0 && (
                      <p className="text-xs text-red-600 mt-0.5">
                        Debt: {fmtMoney(p.host.payoutDebt!, p.currency)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700">
                      {p.host.payoutCardBrand || '—'} •••• {p.host.payoutCardLast4 || '????'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {p.bookingIds.length} booking{p.bookingIds.length === 1 ? '' : 's'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {fmtMoney(p.amount, p.currency)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-slate-700">{fmtDateTime(p.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3 max-w-[260px]">
                    {p.heldReason && (
                      <p className="text-xs text-amber-700 flex items-start gap-1">
                        <PauseCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        {p.heldReason}
                      </p>
                    )}
                    {p.failureMessage && (
                      <p className="text-xs text-red-700 flex items-start gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span className="truncate">{p.failureMessage}</span>
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Link
          href="/dashboard/logs"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          View full audit log
        </Link>
      </div>
    </div>
  )
}

function LimitCard({
  title,
  used,
  limit,
  currency,
}: {
  title: string
  used: number
  limit: number
  currency: string
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const danger = pct >= 80
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-xl font-bold text-slate-900 tabular-nums">
        €{used.toFixed(0)} <span className="text-sm font-normal text-slate-400">/ €{limit.toFixed(0)}</span>
      </p>
      <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
        <div
          className={`h-full ${danger ? 'bg-red-500' : 'bg-emerald-500'} rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-400 mt-1">
        {pct}% used ({currency})
      </p>
    </div>
  )
}
