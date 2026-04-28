'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/auth'
import { getApiUrl } from '@/lib/api-config'
import { Search, X, CreditCard } from 'lucide-react'

interface Payment {
  id: string
  amount: number
  currency: string
  status: string
  platformFee: number
  hostAmount: number
  refundedAmount: number
  refundedAt: string | null
  createdAt: string
  booking: {
    id: string
    guests: number
    totalPrice: number
    status: string
    user: { id: string; email: string; name: string | null }
    dinner: {
      id: string
      title: string
      date: string
      host: { id: string; name: string | null; email: string }
    }
  }
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  SUCCEEDED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  FAILED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  REFUNDED: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  PARTIALLY_REFUNDED: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
  CAPTURED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
}

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status.replace(/_/g, ' ')}
    </span>
  )
}

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('is-IS', {
    style: 'currency',
    currency: currency.toUpperCase() || 'ISK',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function TransactionsPage() {
  const router = useRouter()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login')
      return
    }
    fetchPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, page, search, statusFilter])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      setError('')
      const headers = authService.getAuthHeaders()
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      })
      const res = await fetch(getApiUrl(`/admin/transactions?${params}`), { headers })
      if (res.status === 401) {
        authService.removeToken()
        router.push('/login')
        return
      }
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to fetch')
      setPayments(data.data || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotal(data.pagination?.total || 0)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} total payments</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search guest, host, dinner…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 bg-white"
        >
          <option value="">All statuses</option>
          <option value="SUCCEEDED">Succeeded</option>
          <option value="PENDING">Pending</option>
          <option value="CAPTURED">Captured</option>
          <option value="REFUNDED">Refunded</option>
          <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <CreditCard className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No transactions found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Guest</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Dinner / Host</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Fee (20%)</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Host net</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-400">
                      #{p.id.slice(-7).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{p.booking.user.name || '—'}</p>
                    <p className="text-xs text-slate-400">{p.booking.user.email}</p>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="font-medium text-slate-800 truncate">{p.booking.dinner.title}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {p.booking.dinner.host.name || p.booking.dinner.host.email}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={p.status} />
                    {p.refundedAmount > 0 && (
                      <p className="text-xs text-slate-400 mt-1">
                        Refunded {fmt(p.refundedAmount, p.currency)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {fmt(p.amount, p.currency)}
                    </span>
                    <p className="text-xs text-slate-400">{p.booking.guests} guest{p.booking.guests !== 1 ? 's' : ''}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-slate-600 tabular-nums">
                      {fmt(p.platformFee ?? p.amount * 0.2, p.currency)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-emerald-600 font-medium tabular-nums">
                      {fmt(p.hostAmount ?? p.amount * 0.8, p.currency)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700">{new Date(p.createdAt).toLocaleDateString()}</p>
                    <p className="text-xs text-slate-400">{new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
