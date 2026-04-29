'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/lib/auth'
import { apiGetPaginated, fmtMoney, fmtDateTime } from '@/lib/api'
import { StatusPill } from '@/components/StatusPill'
import { Search, X, CreditCard, Banknote, ChevronRight } from 'lucide-react'

interface UnifiedTxn {
  kind: 'payment' | 'payout'
  id: string
  createdAt: string
  status: string
  amount: number
  currency: string
  paystraxId: string | null
  bookingId?: string
  guest?: { id: string; name: string | null; email: string }
  dinnerTitle?: string
  hostId?: string | null
  refundedAmount?: number
  host?: { id: string; name: string | null; email: string; payoutCardLast4: string | null; payoutCardBrand: string | null }
  bookingIds?: string[]
  failureMessage?: string | null
}

export default function TransactionsPage() {
  const router = useRouter()
  const [items, setItems] = useState<UnifiedTxn[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [kindFilter, setKindFilter] = useState<'all' | 'payment' | 'payout'>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [err, setErr] = useState('')

  const reload = useCallback(async () => {
    try {
      setLoading(true)
      setErr('')
      const params = new URLSearchParams({
        page: String(page),
        limit: '25',
        kind: kindFilter,
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      })
      const res = await apiGetPaginated<UnifiedTxn>(`/admin/transactions/all?${params}`)
      setItems(res.items)
      setTotalPages(res.totalPages)
      setTotal(res.total)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, kindFilter])

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login')
      return
    }
    reload()
  }, [router, reload])

  const handleRowClick = (t: UnifiedTxn) => {
    if (t.kind === 'payment') router.push(`/dashboard/transactions/${t.id}`)
    else router.push(`/dashboard/payouts/${t.id}`)
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} payments + payouts</p>
        </div>
        <Link href="/dashboard/logs" className="text-sm text-orange-600 hover:underline">
          Audit log →
        </Link>
      </div>

      <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Paystrax id, guest, host…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>
        <select
          value={kindFilter}
          onChange={(e) => {
            setKindFilter(e.target.value as 'all' | 'payment' | 'payout')
            setPage(1)
          }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
        >
          <option value="all">All transactions</option>
          <option value="payment">Payments only</option>
          <option value="payout">Payouts only</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
        >
          <option value="">All statuses</option>
          <option value="SUCCEEDED">Succeeded</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
          <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
          <option value="PENDING_SETTLEMENT">Pending settlement</option>
          <option value="IN_TRANSIT">In transit</option>
          <option value="PAID">Paid</option>
          <option value="ON_HOLD">On hold</option>
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
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <CreditCard className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No transactions</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Counterparty</th>
                <th className="text-left px-4 py-3">Reference</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((t) => (
                <tr
                  key={`${t.kind}-${t.id}`}
                  onClick={() => handleRowClick(t)}
                  className="hover:bg-slate-50/50 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    {t.kind === 'payment' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                        <CreditCard className="w-3 h-3" /> Payment
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full">
                        <Banknote className="w-3 h-3" /> Payout
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={t.status} />
                    {t.refundedAmount && t.refundedAmount > 0 ? (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Refunded {fmtMoney(t.refundedAmount, t.currency)}
                      </p>
                    ) : null}
                    {t.failureMessage && (
                      <p className="text-xs text-red-600 mt-0.5 truncate max-w-[180px]" title={t.failureMessage}>
                        {t.failureMessage}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {t.kind === 'payment' && t.guest ? (
                      <>
                        <p className="font-medium text-slate-700">{t.guest.name || '—'}</p>
                        <p className="text-xs text-slate-400">{t.guest.email}</p>
                      </>
                    ) : t.host ? (
                      <>
                        <p className="font-medium text-slate-700">{t.host.name || '—'}</p>
                        <p className="text-xs text-slate-400">{t.host.email}</p>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    {t.dinnerTitle ? (
                      <>
                        <p className="text-slate-700 truncate">{t.dinnerTitle}</p>
                        <p className="text-xs text-slate-400 truncate font-mono">{t.paystraxId || '—'}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-slate-700">
                          {t.bookingIds?.length || 0} booking{t.bookingIds?.length === 1 ? '' : 's'}
                        </p>
                        <p className="text-xs text-slate-400 truncate font-mono">{t.paystraxId || '—'}</p>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {fmtMoney(t.amount, t.currency)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-slate-700 text-xs">{fmtDateTime(t.createdAt)}</span>
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
    </div>
  )
}
