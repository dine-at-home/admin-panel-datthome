'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/lib/auth'
import { apiGet, apiGetPaginated, apiSend, fmtMoney, fmtDateTime } from '@/lib/api'
import { getApiUrl } from '@/lib/api-config'
import { StatusPill } from '@/components/StatusPill'
import {
  Banknote,
  ChevronRight,
  AlertTriangle,
  PauseCircle,
  RefreshCw,
  Download,
  CheckCircle2,
  Landmark,
} from 'lucide-react'

// A pending manual payout, grouped per host (from GET /admin/payouts/pending).
interface PendingPayout {
  hostId: string
  name: string | null
  email: string
  kycStatus: string
  bankAccountHolder: string | null
  iban: string | null
  bankSwiftBic: string | null
  bankName: string | null
  missingBankDetails: boolean
  bankFileReady: boolean
  currency: string
  commissionRate: number
  gross: number
  commission: number
  net: number
  debtApplied: number
  netPayable: number
  bookingIds: string[]
  bookingCount: number
}

interface PendingResponse {
  payouts: PendingPayout[]
  hostCount: number
  totalPayable: number
  payableHostCount: number
  exportableHostCount: number
}

// A historical Payout record (from GET /admin/payouts).
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
    kycStatus?: string
    payoutDebt?: number
  }
  bookingIds: string[]
  heldReason?: string | null
  failureMessage?: string | null
  arrivalDate?: string | null
  transferRetryCount: number
  createdAt: string
}

export default function PayoutsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status') || ''

  // Pending (manual) payouts.
  const [pending, setPending] = useState<PendingResponse | null>(null)
  const [pendingLoading, setPendingLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [exporting, setExporting] = useState(false)
  const [markingHostId, setMarkingHostId] = useState<string | null>(null)

  // Historical payout records.
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [err, setErr] = useState('')

  const dateQuery = useCallback(() => {
    const p = new URLSearchParams()
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    return p.toString()
  }, [from, to])

  const reloadPending = useCallback(async () => {
    try {
      setPendingLoading(true)
      const q = dateQuery()
      const res = await apiGet<PendingResponse>(`/admin/payouts/pending${q ? `?${q}` : ''}`)
      setPending(res)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load pending payouts')
    } finally {
      setPendingLoading(false)
    }
  }, [dateQuery])

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
    reloadPending()
  }, [router, reload, reloadPending])

  // Download the bank-ready payout file. The export endpoint returns CSV (not JSON), so we
  // fetch the blob directly with the auth header and trigger a browser download.
  const exportFile = async () => {
    try {
      setExporting(true)
      const q = dateQuery()
      const res = await fetch(
        getApiUrl(`/admin/payouts/export?format=txt${q ? `&${q}` : ''}`),
        { headers: authService.getAuthHeaders() }
      )
      if (!res.ok) throw new Error(`Export failed (${res.status})`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `datthome-payouts-${new Date().toISOString().slice(0, 10)}.txt`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const markPaid = async (host: PendingPayout) => {
    if (host.missingBankDetails) {
      alert('This host has no bank details on file — they cannot be paid yet.')
      return
    }
    const reference = prompt(
      `Mark ${fmtMoney(host.netPayable, host.currency)} to ${host.name || host.email} as PAID?\n\n` +
        `This records the manual bank transfer for ${host.bookingCount} booking(s).\n` +
        `Optionally enter a bank reference:`,
      ''
    )
    if (reference === null) return // cancelled
    try {
      setMarkingHostId(host.hostId)
      await apiSend('POST', '/admin/payouts/mark-paid', {
        hostId: host.hostId,
        bookingIds: host.bookingIds,
        reference: reference.trim() || undefined,
      })
      await Promise.all([reloadPending(), reload()])
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to mark paid')
    } finally {
      setMarkingHostId(null)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payouts</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manual bank transfers — export the file, pay via your bank, then mark as paid.
          </p>
        </div>
      </div>

      {err && (
        <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-lg">
          {err}
        </div>
      )}

      {/* Pending manual payouts */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-orange-500" />
            <div>
              <h2 className="font-semibold text-slate-900">Pending payouts</h2>
              <p className="text-xs text-slate-500">
                {pending
                  ? `${pending.exportableHostCount} of ${pending.payableHostCount} payable host(s) in bank file · ${fmtMoney(
                      pending.totalPayable,
                      'ISK'
                    )} total`
                  : '—'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col">
              <label className="text-xs text-slate-400 mb-0.5">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-slate-400 mb-0.5">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <button
              onClick={reloadPending}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
            >
              Apply
            </button>
            <button
              onClick={exportFile}
              disabled={exporting || !pending || pending.exportableHostCount === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting…' : 'Export bank file (.txt)'}
            </button>
          </div>
        </div>

        {pendingLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !pending || pending.payouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <Banknote className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No pending payouts</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Host</th>
                <th className="text-left px-4 py-3">Bank details</th>
                <th className="text-right px-4 py-3">Bookings</th>
                <th className="text-right px-4 py-3">Net payable</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pending.payouts.map((h) => (
                <tr key={h.hostId} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-700">{h.name || '—'}</p>
                    <p className="text-xs text-slate-400">{h.email}</p>
                    {h.kycStatus !== 'VERIFIED' && (
                      <p className="text-xs text-amber-600 mt-0.5">KYC {h.kycStatus}</p>
                    )}
                    {h.debtApplied > 0 && (
                      <p className="text-xs text-red-600 mt-0.5">
                        Debt applied: {fmtMoney(h.debtApplied, h.currency)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {h.missingBankDetails ? (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        No bank details
                      </span>
                    ) : (
                      <div className="text-slate-700">
                        <p className="font-medium">{h.bankAccountHolder}</p>
                        <p className="text-xs text-slate-500 tabular-nums">{h.iban}</p>
                        <p className="text-xs text-slate-400">
                          {[h.bankSwiftBic, h.bankName].filter(Boolean).join(' · ') || '—'}
                        </p>
                        {!h.bankFileReady && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 mt-0.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Not a valid Icelandic IBAN — excluded from bank file
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700 tabular-nums">
                    {h.bookingCount}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {fmtMoney(h.netPayable, h.currency)}
                    </span>
                    <p className="text-xs text-slate-400">
                      gross {fmtMoney(h.gross, h.currency)} · {h.commissionRate}% fee
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => markPaid(h)}
                      disabled={h.missingBankDetails || markingHostId === h.hostId}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 disabled:opacity-40"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {markingHostId === h.hostId ? 'Saving…' : 'Mark paid'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Payout history */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Payout history</h2>
        <p className="text-sm text-slate-500">{total} total</p>
      </div>

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
          <option value="PAID">Paid</option>
          <option value="PENDING_SETTLEMENT">Pending settlement</option>
          <option value="IN_TRANSIT">In transit</option>
          <option value="ON_HOLD">On hold</option>
          <option value="FAILED">Failed</option>
          <option value="CANCELED">Canceled</option>
        </select>
      </div>

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
                      <p className="text-xs text-amber-600 mt-1">retries: {p.transferRetryCount}</p>
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
                    <p className="text-xs text-slate-400 mt-0.5">
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
                    {p.description && (
                      <p className="text-xs text-slate-500 truncate">{p.description}</p>
                    )}
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
