'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/lib/auth'
import { apiGet, apiSend, fmtMoney, fmtDateTime } from '@/lib/api'
import { StatusPill } from '@/components/StatusPill'
import { LogTimeline, type TransactionLog } from '@/components/LogTimeline'
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  XCircle,
  RotateCcw,
  CreditCard,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'

interface PaymentDetail {
  payment: {
    id: string
    bookingId: string
    paystraxCheckoutId: string
    paystraxPaymentId: string | null
    paystraxNdc: string | null
    amount: number
    currency: string
    platformFee: number
    hostAmount: number
    status: string
    paymentType: string | null
    paymentMethod: string | null
    failureReason: string | null
    authorizedAt: string | null
    capturedAt: string | null
    refundedAmount: number
    refundedAt: string | null
    createdAt: string
    updatedAt: string
    booking: {
      id: string
      guests: number
      totalPrice: number
      status: string
      message: string | null
      user: { id: string; name: string | null; email: string }
      dinner: {
        id: string
        title: string
        date: string
        host: {
          id: string
          name: string | null
          email: string
          accountHolderName: string | null
          payoutCardLast4: string | null
          payoutCardBrand: string | null
          kycStatus: string
          payoutDebt: number
        }
      }
      payout: {
        id: string
        status: string
        amount: number
        currency: string
      } | null
    }
  }
  logs: TransactionLog[]
}

export default function PaymentDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [data, setData] = useState<PaymentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setErr('')
      const result = await apiGet<PaymentDetail>(`/admin/transactions/${id}`)
      setData(result)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load payment')
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

  const action = async (
    method: 'POST',
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
          href="/dashboard/transactions"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-lg">
          {err || 'Payment not found'}
        </div>
      </div>
    )
  }

  const p = data.payment
  const remaining = Math.max(0, p.amount - (p.refundedAmount || 0))
  const isAuthOnly = p.paymentType === 'PA' && p.status === 'SUCCEEDED'
  const isCaptured = p.paymentType === 'CP' && p.status === 'SUCCEEDED'
  const canCapture = isAuthOnly && Boolean(p.paystraxPaymentId)
  const canVoid = isAuthOnly && Boolean(p.paystraxPaymentId)
  const canRefund =
    Boolean(p.paystraxPaymentId) &&
    (p.status === 'SUCCEEDED' || p.status === 'PARTIALLY_REFUNDED') &&
    remaining > 0
  const canRefresh = Boolean(p.paystraxPaymentId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/transactions"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <button
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
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
            {p.paymentType && (
              <span className="text-xs font-mono text-white/50 bg-white/5 px-2 py-0.5 rounded">
                {p.paymentType}
              </span>
            )}
            {p.paymentMethod && (
              <span className="text-xs text-white/50">{p.paymentMethod}</span>
            )}
          </div>
          <p className="text-4xl font-bold text-white tabular-nums">{fmtMoney(p.amount, p.currency)}</p>
          <p className="text-white/40 text-sm mt-1">
            Platform fee {fmtMoney(p.platformFee, p.currency)} • Host net {fmtMoney(p.hostAmount, p.currency)}
            {p.refundedAmount > 0 && ` • Refunded ${fmtMoney(p.refundedAmount, p.currency)}`}
          </p>
        </div>
        <div className="text-right text-white/40 text-xs space-y-1">
          <p>Payment ID</p>
          <p className="font-mono text-white/70">{p.id}</p>
          {p.paystraxPaymentId && (
            <>
              <p className="mt-2">Paystrax id</p>
              <p className="font-mono text-white/70 break-all max-w-xs">{p.paystraxPaymentId}</p>
            </>
          )}
          {p.paystraxCheckoutId && (
            <>
              <p className="mt-2">Checkout id</p>
              <p className="font-mono text-white/70 break-all max-w-xs">{p.paystraxCheckoutId}</p>
            </>
          )}
        </div>
      </div>

      {p.failureReason && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 mt-0.5" />
          <p>{p.failureReason}</p>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 flex flex-wrap gap-2">
        {canCapture && (
          <button
            onClick={() =>
              action(
                'POST',
                `/admin/transactions/${p.id}/capture`,
                {},
                `Capture full ${fmtMoney(p.amount, p.currency)}?`
              )
            }
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" /> Capture
          </button>
        )}
        {canVoid && (
          <button
            onClick={() => {
              const reason = prompt('Reason for voiding (optional):')?.trim() || undefined
              if (!confirm(`Void this authorization (${fmtMoney(p.amount, p.currency)})? Booking will be cancelled.`)) return
              action('POST', `/admin/transactions/${p.id}/void`, { reason })
            }}
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" /> Void auth
          </button>
        )}
        {canRefund && (
          <button
            onClick={() => {
              const amountStr = prompt(
                `Refund amount in ${p.currency} (max ${remaining.toFixed(2)}, leave blank for full):`
              )?.trim()
              const amount =
                amountStr === ''
                  ? undefined
                  : amountStr != null
                  ? Number(amountStr)
                  : undefined
              if (amount != null && (Number.isNaN(amount) || amount <= 0)) {
                alert('Invalid amount')
                return
              }
              const reason = prompt('Reason for refund (min 3 chars):')?.trim() || ''
              if (reason.length < 3) {
                alert('Reason required (min 3 chars)')
                return
              }
              action('POST', `/admin/transactions/${p.id}/refund`, { amount, reason })
            }}
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" /> Refund
          </button>
        )}
        {canRefresh && (
          <button
            onClick={() => action('POST', `/admin/transactions/${p.id}/refresh`)}
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" /> Pull live status
          </button>
        )}
      </div>

      {/* Parties */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href={`/dashboard/users/${p.booking.user.id}`}
          className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow"
        >
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Guest</p>
          <p className="font-semibold text-slate-900">{p.booking.user.name || '—'}</p>
          <p className="text-sm text-slate-500">{p.booking.user.email}</p>
          <p className="text-xs text-slate-400 mt-2">{p.booking.guests} guest{p.booking.guests !== 1 ? 's' : ''}</p>
        </Link>

        <Link
          href={`/dashboard/users/${p.booking.dinner.host.id}`}
          className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow"
        >
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Host</p>
          <p className="font-semibold text-slate-900">{p.booking.dinner.host.name || '—'}</p>
          <p className="text-sm text-slate-500">{p.booking.dinner.host.email}</p>
          <p className="text-xs text-slate-400 mt-2">
            KYC: <span className="font-medium text-slate-600">{p.booking.dinner.host.kycStatus}</span>
          </p>
          {p.booking.dinner.host.payoutCardLast4 && (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              {p.booking.dinner.host.payoutCardBrand} •••• {p.booking.dinner.host.payoutCardLast4}
            </p>
          )}
        </Link>

        <Link
          href={`/dashboard/bookings/${p.booking.id}`}
          className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow"
        >
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Booking</p>
          <div className="flex items-center gap-2 mb-1">
            <StatusPill status={p.booking.status} />
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="font-semibold text-slate-900 truncate">{p.booking.dinner.title}</p>
          <p className="text-xs text-slate-400 mt-1">{fmtDateTime(p.booking.dinner.date)}</p>
          {p.booking.payout && (
            <Link
              href={`/dashboard/payouts/${p.booking.payout.id}`}
              className="text-xs text-orange-600 hover:underline mt-2 inline-block"
            >
              Payout: {p.booking.payout.status} ({fmtMoney(p.booking.payout.amount, p.booking.payout.currency)})
            </Link>
          )}
        </Link>
      </div>

      {/* Timeline */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Lifecycle</p>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-slate-400 text-xs">Created</dt>
            <dd className="text-slate-700">{fmtDateTime(p.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-xs">Authorized</dt>
            <dd className="text-slate-700">{fmtDateTime(p.authorizedAt)}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-xs">Captured</dt>
            <dd className="text-slate-700">{fmtDateTime(p.capturedAt)}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-xs">Refunded</dt>
            <dd className="text-slate-700">{fmtDateTime(p.refundedAt)}</dd>
          </div>
        </dl>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Activity timeline</h2>
        <LogTimeline logs={data.logs} />
      </div>
    </div>
  )
}
