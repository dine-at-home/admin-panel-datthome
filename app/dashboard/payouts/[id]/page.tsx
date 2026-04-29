'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/lib/auth'
import { apiGet, apiSend, fmtMoney, fmtDateTime, fmtDate } from '@/lib/api'
import { StatusPill } from '@/components/StatusPill'
import { LogTimeline, type TransactionLog } from '@/components/LogTimeline'
import {
  ArrowLeft,
  PauseCircle,
  PlayCircle,
  RotateCw,
  Send,
  XCircle,
  RefreshCw,
  CheckCircle,
  CreditCard,
  Receipt,
  AlertTriangle,
} from 'lucide-react'

interface BookingInPayout {
  id: string
  guests: number
  totalPrice: number
  hostAmount: number | null
  platformFee: number | null
  currency: string | null
  status: string
  createdAt: string
  dinner: { id: string; title: string; date: string }
  user: { id: string; name: string | null; email: string }
  payment: {
    id: string
    amount: number
    refundedAmount: number
    status: string
    paystraxPaymentId: string | null
  } | null
}

interface PayoutDetail {
  payout: {
    id: string
    amount: number
    currency: string
    status: string
    description: string | null
    bookingIds: string[]
    paystraxPayoutPaymentId: string | null
    paystraxCardRegistrationId: string | null
    failureMessage: string | null
    failureCode: string | null
    heldReason: string | null
    heldByAdminId: string | null
    transferRetryCount: number
    arrivalDate: string | null
    scheduledFor: string | null
    releasedAt: string | null
    createdAt: string
    updatedAt: string
    host: {
      id: string
      name: string | null
      email: string
      accountHolderName: string | null
      payoutAddress: string | null
      payoutCardBrand: string | null
      payoutCardLast4: string | null
      paystraxCardRegistrationId: string | null
      kycStatus: string
      payoutDebt: number
    }
    bookings: BookingInPayout[]
  }
  logs: TransactionLog[]
}

export default function PayoutDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const payoutId = params?.id
  const [data, setData] = useState<PayoutDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!payoutId) return
    try {
      setLoading(true)
      setErr('')
      const result = await apiGet<PayoutDetail>(`/admin/payouts/${payoutId}`)
      setData(result)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load payout')
    } finally {
      setLoading(false)
    }
  }, [payoutId])

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login')
      return
    }
    reload()
  }, [router, reload])

  const action = async (
    method: 'POST' | 'PUT',
    path: string,
    body?: unknown,
    confirmMsg?: string
  ) => {
    if (confirmMsg && !confirm(confirmMsg)) return
    try {
      setBusy(path)
      await apiSend(method, path, body)
      await reload()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy(null)
    }
  }

  const promptReason = (label: string): string | null => {
    const r = prompt(`${label} (min 3 chars):`)?.trim() || ''
    if (r.length < 3) return null
    return r
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
        <Link href="/dashboard/payouts" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to payouts
        </Link>
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-lg">
          {err || 'Payout not found'}
        </div>
      </div>
    )
  }

  const p = data.payout
  const canHold = p.status === 'PENDING_SETTLEMENT'
  const canRelease = p.status === 'ON_HOLD'
  const canRetry = p.status === 'FAILED'
  const canDisburse = p.status === 'PENDING_SETTLEMENT'
  const canCancel = p.status === 'PENDING_SETTLEMENT' || p.status === 'ON_HOLD' || p.status === 'FAILED'
  const canRefresh = Boolean(p.paystraxPayoutPaymentId) && (p.status === 'IN_TRANSIT' || p.status === 'PENDING_SETTLEMENT')
  const canMarkPaid = p.status !== 'PAID' && p.status !== 'CANCELED'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/payouts" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> Back to payouts
        </Link>
        <button
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {err && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-lg">{err}</div>
      )}

      {/* Hero */}
      <div className="bg-[#0f1117] rounded-2xl p-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <StatusPill status={p.status} />
            {p.transferRetryCount > 0 && (
              <span className="text-xs text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full">
                {p.transferRetryCount} retr{p.transferRetryCount === 1 ? 'y' : 'ies'}
              </span>
            )}
          </div>
          <p className="text-4xl font-bold text-white tabular-nums">{fmtMoney(p.amount, p.currency)}</p>
          <p className="text-white/40 text-sm mt-1">
            {p.bookings.length} booking{p.bookings.length === 1 ? '' : 's'} • {p.description || 'DatHome payout'}
          </p>
        </div>
        <div className="text-right text-white/40 text-xs space-y-1">
          <p>Payout ID</p>
          <p className="font-mono text-white/70">{p.id}</p>
          {p.paystraxPayoutPaymentId && (
            <>
              <p className="mt-2">Paystrax</p>
              <p className="font-mono text-white/70 break-all max-w-xs">{p.paystraxPayoutPaymentId}</p>
            </>
          )}
        </div>
      </div>

      {/* Alerts */}
      {p.heldReason && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-lg flex items-start gap-2">
          <PauseCircle className="w-5 h-5 mt-0.5" />
          <div>
            <p className="font-semibold">On hold</p>
            <p className="text-xs mt-0.5">{p.heldReason}</p>
          </div>
        </div>
      )}
      {p.failureMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 mt-0.5" />
          <div>
            <p className="font-semibold">Disbursement failed</p>
            <p className="text-xs mt-0.5">
              {p.failureCode ? `[${p.failureCode}] ` : ''}
              {p.failureMessage}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 flex flex-wrap gap-2">
        {canDisburse && (
          <button
            onClick={() =>
              action(
                'POST',
                `/admin/payouts/${p.id}/disburse`,
                undefined,
                `Send ${fmtMoney(p.amount, p.currency)} to host card now?`
              )
            }
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            <Send className="w-4 h-4" /> Disburse now
          </button>
        )}
        {canHold && (
          <button
            onClick={() => {
              const reason = promptReason('Reason for hold')
              if (!reason) return
              action('POST', `/admin/payouts/${p.id}/hold`, { reason })
            }}
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
          >
            <PauseCircle className="w-4 h-4" /> Hold
          </button>
        )}
        {canRelease && (
          <button
            onClick={() =>
              action(
                'POST',
                `/admin/payouts/${p.id}/release`,
                undefined,
                'Release this payout from hold?'
              )
            }
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            <PlayCircle className="w-4 h-4" /> Release
          </button>
        )}
        {canRetry && (
          <button
            onClick={() =>
              action(
                'POST',
                `/admin/payouts/${p.id}/retry`,
                undefined,
                'Retry sending this failed payout to Paystrax?'
              )
            }
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            <RotateCw className="w-4 h-4" /> Retry
          </button>
        )}
        {canRefresh && (
          <button
            onClick={() =>
              action('POST', `/admin/payouts/${p.id}/refresh`, undefined)
            }
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" /> Pull live status
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => {
              const reason = promptReason('Reason for cancellation')
              if (!reason) return
              action('POST', `/admin/payouts/${p.id}/cancel`, { reason })
            }}
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" /> Cancel
          </button>
        )}
        {canMarkPaid && (
          <button
            onClick={() =>
              action(
                'PUT',
                `/admin/payouts/${p.id}/complete`,
                undefined,
                'Mark this payout as PAID? Use this only if funds were transferred outside Paystrax.'
              )
            }
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" /> Mark as paid (manual)
          </button>
        )}
      </div>

      {/* Host card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href={`/dashboard/users/${p.host.id}`}
          className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow"
        >
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Host</p>
          <p className="font-semibold text-slate-900">{p.host.name || '—'}</p>
          <p className="text-sm text-slate-500">{p.host.email}</p>
          <p className="text-xs text-slate-400 mt-2">KYC: <span className="font-medium text-slate-600">{p.host.kycStatus}</span></p>
          {p.host.payoutDebt > 0 && (
            <p className="text-xs text-red-600 mt-1">Debt: {fmtMoney(p.host.payoutDebt, p.currency)}</p>
          )}
        </Link>

        <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Payout card</p>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-slate-900">
              {p.host.payoutCardBrand || '—'} •••• {p.host.payoutCardLast4 || '????'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{p.host.accountHolderName || '—'}</p>
          <p className="text-xs text-slate-400 mt-2 font-mono break-all">
            {p.host.paystraxCardRegistrationId || 'no token'}
          </p>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Timeline</p>
          <dl className="text-sm space-y-1">
            <div className="flex justify-between">
              <dt className="text-slate-500">Created</dt>
              <dd className="text-slate-700">{fmtDateTime(p.createdAt)}</dd>
            </div>
            {p.scheduledFor && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Scheduled</dt>
                <dd className="text-slate-700">{fmtDateTime(p.scheduledFor)}</dd>
              </div>
            )}
            {p.releasedAt && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Released</dt>
                <dd className="text-slate-700">{fmtDateTime(p.releasedAt)}</dd>
              </div>
            )}
            {p.arrivalDate && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Arrival</dt>
                <dd className="text-slate-700">{fmtDateTime(p.arrivalDate)}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Bookings */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-slate-900">Included bookings ({p.bookings.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2">Booking</th>
              <th className="text-left px-4 py-2">Guest</th>
              <th className="text-left px-4 py-2">Dinner</th>
              <th className="text-right px-4 py-2">Total</th>
              <th className="text-right px-4 py-2">Host net</th>
              <th className="text-left px-4 py-2">Payment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {p.bookings.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/bookings/${b.id}`} className="font-mono text-xs text-orange-600 hover:underline">
                    #{b.id.slice(-7).toUpperCase()}
                  </Link>
                  <p className="text-xs text-slate-400 mt-0.5">{fmtDate(b.createdAt)}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-700">{b.user.name || '—'}</p>
                  <p className="text-xs text-slate-400">{b.user.email}</p>
                </td>
                <td className="px-4 py-3 max-w-[200px]">
                  <p className="font-medium text-slate-700 truncate">{b.dinner.title}</p>
                  <p className="text-xs text-slate-400">{fmtDate(b.dinner.date)}</p>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                  {fmtMoney(b.totalPrice, b.currency || p.currency)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-emerald-600 font-medium">
                  {fmtMoney(b.hostAmount ?? b.totalPrice * 0.8, b.currency || p.currency)}
                </td>
                <td className="px-4 py-3">
                  {b.payment ? (
                    <Link href={`/dashboard/transactions/${b.payment.id}`}>
                      <StatusPill status={b.payment.status} />
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Logs */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Activity timeline</h2>
        <LogTimeline logs={data.logs} />
      </div>
    </div>
  )
}
