'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/auth'
import { getApiUrl } from '@/lib/api-config'
import { Search, X, Ticket, Ban } from 'lucide-react'

interface Booking {
  id: string
  user: { id: string; email: string; name: string | null }
  dinner: { id: string; title: string; date: string; price: number; currency: string }
  guests: number
  totalPrice: number
  currency: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  paymentStatus: string
  createdAt: string
}

const BOOKING_STATUS: Record<string, { bg: string; text: string; dot: string }> = {
  CONFIRMED:  { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  COMPLETED:  { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
  PENDING:    { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400'   },
  CANCELLED:  { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500'     },
}

const PAYMENT_BADGE: Record<string, string> = {
  SUCCEEDED: 'bg-emerald-100 text-emerald-700',
  REFUNDED:  'bg-slate-100 text-slate-600',
  PENDING:   'bg-amber-100 text-amber-700',
  FAILED:    'bg-red-100 text-red-700',
}

function StatusPill({ status }: { status: string }) {
  const s = BOOKING_STATUS[status] ?? { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}

export default function BookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authService.isAuthenticated()) { router.push('/login'); return }
    fetchBookings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, page, search, statusFilter])

  const fetchBookings = async () => {
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
      const res = await fetch(getApiUrl(`/admin/bookings?${params}`), { headers })
      if (res.status === 401) { authService.removeToken(); router.push('/login'); return }
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to fetch')
      setBookings(data.data || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotal(data.pagination?.total || 0)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this booking? This cannot be undone.')) return
    try {
      const headers = authService.getAuthHeaders()
      const res = await fetch(getApiUrl(`/admin/bookings/${id}/cancel`), { method: 'PUT', headers })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed')
      fetchBookings()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to cancel')
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
        <p className="text-sm text-slate-500 mt-0.5">{total} total</p>
      </div>

      <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search user, dinner, ID…"
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
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Ticket className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No bookings found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Guest</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Dinner</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Payment</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-400">#{b.id.slice(-7).toUpperCase()}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{b.user.name || '—'}</p>
                    <p className="text-xs text-slate-400">{b.user.email}</p>
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    <p className="font-medium text-slate-800 truncate">{b.dinner.title}</p>
                    <p className="text-xs text-slate-400">{new Date(b.dinner.date).toLocaleDateString()}</p>
                  </td>
                  <td className="px-4 py-3"><StatusPill status={b.status} /></td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${PAYMENT_BADGE[b.paymentStatus] ?? 'bg-slate-100 text-slate-600'}`}>
                      {b.paymentStatus || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {b.totalPrice} {b.currency}
                    </span>
                    <p className="text-xs text-slate-400">{b.guests} guest{b.guests !== 1 ? 's' : ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700">{new Date(b.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {b.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleCancel(b.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Ban className="w-3 h-3" /> Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors">
              Previous
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
