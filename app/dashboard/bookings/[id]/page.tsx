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
  XCircle,
  CreditCard,
  Banknote,
  User,
  ChefHat,
  Calendar,
  AlertTriangle,
} from 'lucide-react'

interface BookingDetail {
  booking: {
    id: string
    status: string
    guests: number
    totalPrice: number
    currency: string | null
    message: string | null
    platformFee: number | null
    hostAmount: number | null
    payoutStatus: string | null
    payoutArrivalDate: string | null
    payoutError: string | null
    eligibleForPayoutAt: string | null
    dinnerEndAt: string | null
    createdAt: string
    updatedAt: string
    user: { id: string; name: string | null; email: string; phone: string | null }
    dinner: {
      id: string
      title: string
      date: string
      time: string
      duration: number
      price: number
      host: {
        id: string
        name: string | null
        email: string
        accountHolderName: string | null
        payoutCardLast4: string | null
        payoutCardBrand: string | null
        kycStatus: string
      }
    }
    payment: {
      id: string
      amount: number
      currency: string
      status: string
      paymentType: string | null
      paystraxPaymentId: string | null
      refundedAmount: number
      refundedAt: string | null
      authorizedAt: string | null
      capturedAt: string | null
      failureReason: string | null
    } | null
    payout: {
      id: string
      status: string
      amount: number
      currency: string
      paystraxPayoutPaymentId: string | null
      arrivalDate: string | null
      failureMessage: string | null
    } | null
  }
  logs: TransactionLog[]
}

export default function BookingDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [data, setData] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setErr('')
      const result = await apiGet<BookingDetail>(`/admin/bookings/${id}`)
      setData(result)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load booking')
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

  const handleCancel = async () => {
    if (!data) return
    const reason = prompt('Cancellation reason (min 3 chars):')?.trim()
    if (!reason || reason.length < 3) return
    const refund = data.booking.payment ? confirm('Issue refund/void to guest?') : false
    const notify = confirm('Send cancellation email to guest?')

    const callCancel = async (cancelEvenIfRefundFails: boolean) => {
      await apiSend('POST', `/admin/bookings/${data.booking.id}/cancel`, {
        reason,
        refund,
        notifyGuest: notify,
        cancelEvenIfRefundFails,
      })
    }

    try {
      setBusy(true)
      try {
        await callCancel(false)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        // The backend returns this message when refund failed but cancellation was requested.
        if (refund && /Refund failed/i.test(msg)) {
          const force = confirm(
            `${msg}\n\nClick OK to cancel the booking anyway (guest will NOT be auto-refunded — handle the refund manually in Paystrax).`
          )
          if (force) {
            await callCancel(true)
          } else {
            return
          }
        } else {
          throw e
        }
      }
      await reload()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to cancel')
    } finally {
      setBusy(false)
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
          href="/dashboard/bookings"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-lg">
          {err || 'Booking not found'}
        </div>
      </div>
    )
  }

  const b = data.booking
  const canCancel = b.status !== 'CANCELLED' && b.status !== 'COMPLETED'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/bookings"
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

      <div className="bg-[#0f1117] rounded-2xl p-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <StatusPill status={b.status} />
            {b.payment && <StatusPill status={b.payment.status} />}
            {b.payout && <StatusPill status={b.payout.status} />}
          </div>
          <p className="text-3xl font-bold text-white tabular-nums">
            {fmtMoney(b.totalPrice, b.currency || 'ISK')}
          </p>
          <p className="text-white/40 text-sm mt-1">
            {b.guests} guest{b.guests !== 1 ? 's' : ''} • {b.dinner.title}
          </p>
        </div>
        <div className="text-right text-white/40 text-xs space-y-1">
          <p>Booking ID</p>
          <p className="font-mono text-white/70">{b.id}</p>
        </div>
      </div>

      {b.payoutError && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 mt-0.5" />
          <p>Payout error: {b.payoutError}</p>
        </div>
      )}

      {canCancel && (
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4">
          <button
            onClick={handleCancel}
            disabled={busy}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" /> Cancel booking
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href={`/dashboard/users/${b.user.id}`}
          className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow"
        >
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <User className="w-3.5 h-3.5" /> Guest
          </p>
          <p className="font-semibold text-slate-900">{b.user.name || '—'}</p>
          <p className="text-sm text-slate-500">{b.user.email}</p>
          {b.user.phone && <p className="text-xs text-slate-400 mt-1">{b.user.phone}</p>}
        </Link>

        <Link
          href={`/dashboard/users/${b.dinner.host.id}`}
          className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow"
        >
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <ChefHat className="w-3.5 h-3.5" /> Host
          </p>
          <p className="font-semibold text-slate-900">{b.dinner.host.name || '—'}</p>
          <p className="text-sm text-slate-500">{b.dinner.host.email}</p>
          <p className="text-xs text-slate-400 mt-1">KYC: {b.dinner.host.kycStatus}</p>
          {b.dinner.host.payoutCardLast4 && (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              {b.dinner.host.payoutCardBrand} •••• {b.dinner.host.payoutCardLast4}
            </p>
          )}
        </Link>

        <Link
          href={`/dashboard/dinners/${b.dinner.id}`}
          className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow"
        >
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Dinner
          </p>
          <p className="font-semibold text-slate-900 truncate">{b.dinner.title}</p>
          <p className="text-xs text-slate-500 mt-1">{fmtDateTime(b.dinner.date)} • {b.dinner.time}</p>
          <p className="text-xs text-slate-400 mt-1">
            {b.dinner.duration}min • {fmtMoney(b.dinner.price, b.currency || 'ISK')}/seat
          </p>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5" /> Payment
            </p>
            {b.payment && (
              <Link
                href={`/dashboard/transactions/${b.payment.id}`}
                className="text-xs text-orange-600 hover:underline"
              >
                Open →
              </Link>
            )}
          </div>
          {b.payment ? (
            <dl className="text-sm space-y-1.5">
              <Row label="Status" value={<StatusPill status={b.payment.status} />} />
              <Row label="Amount" value={fmtMoney(b.payment.amount, b.payment.currency)} />
              <Row label="Type" value={b.payment.paymentType || '—'} />
              <Row label="Paystrax id" value={b.payment.paystraxPaymentId || '—'} mono />
              {b.payment.refundedAmount > 0 && (
                <Row label="Refunded" value={fmtMoney(b.payment.refundedAmount, b.payment.currency)} />
              )}
              <Row label="Authorized" value={fmtDateTime(b.payment.authorizedAt)} />
              <Row label="Captured" value={fmtDateTime(b.payment.capturedAt)} />
              {b.payment.failureReason && <Row label="Failure" value={b.payment.failureReason} />}
            </dl>
          ) : (
            <p className="text-sm text-slate-400">No payment yet</p>
          )}
        </div>

        <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Banknote className="w-3.5 h-3.5" /> Host payout
            </p>
            {b.payout && (
              <Link
                href={`/dashboard/payouts/${b.payout.id}`}
                className="text-xs text-orange-600 hover:underline"
              >
                Open →
              </Link>
            )}
          </div>
          {b.payout ? (
            <dl className="text-sm space-y-1.5">
              <Row label="Status" value={<StatusPill status={b.payout.status} />} />
              <Row label="Amount" value={fmtMoney(b.payout.amount, b.payout.currency)} />
              <Row label="Paystrax id" value={b.payout.paystraxPayoutPaymentId || '—'} mono />
              <Row label="Arrival" value={fmtDateTime(b.payout.arrivalDate)} />
              {b.payout.failureMessage && <Row label="Failure" value={b.payout.failureMessage} />}
            </dl>
          ) : (
            <dl className="text-sm space-y-1.5">
              <Row label="Status" value={<StatusPill status={b.payoutStatus || 'PENDING'} />} />
              <Row label="Eligible at" value={fmtDateTime(b.eligibleForPayoutAt)} />
              <Row label="Host net" value={fmtMoney(b.hostAmount, b.currency || 'ISK')} />
              <Row label="Platform fee" value={fmtMoney(b.platformFee, b.currency || 'ISK')} />
            </dl>
          )}
        </div>
      </div>

      {b.message && (
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Guest message
          </p>
          <p className="text-sm text-slate-700">{b.message}</p>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Activity timeline</h2>
        <LogTimeline logs={data.logs} />
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <dt className="text-slate-400 text-xs">{label}</dt>
      <dd
        className={`text-slate-700 text-right ${mono ? 'font-mono text-xs break-all max-w-[200px]' : ''}`}
      >
        {value}
      </dd>
    </div>
  )
}
