'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/auth'
import { getApiUrl } from '@/lib/api-config'
import {
  CheckCircle,
  Banknote,
  User,
  Building,
  MapPin,
  PauseCircle,
  PlayCircle,
  RotateCw,
  Play,
  AlertTriangle,
} from 'lucide-react'

interface Payout {
  id: string
  amount: number
  currency: string
  status: string
  description: string
  hostId: string
  host: {
    id: string
    name: string | null
    email: string
    accountHolderName: string | null
    payoutAddress: string | null
    payoutCardBrand: string | null
    payoutCardLast4: string | null
    paystraxCardRegistrationId: string | null
    kycStatus?: string
    payoutDebt?: number
  }
  bookingIds: string[]
  heldReason?: string | null
  failureMessage?: string | null
  paystraxPayoutPaymentId?: string | null
  scheduledFor?: string | null
  arrivalDate?: string | null
  createdAt: string
  updatedAt: string
}

const STATUS_BADGE: Record<string, string> = {
  PENDING_SETTLEMENT: 'bg-yellow-100 text-yellow-800',
  IN_TRANSIT: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  ON_HOLD: 'bg-amber-100 text-amber-800',
}

export default function PayoutsPage() {
  const router = useRouter()
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState('')
  const [actionInFlight, setActionInFlight] = useState<string | null>(null)
  const [runningBatch, setRunningBatch] = useState(false)

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login')
      return
    }
    fetchPayouts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, page, statusFilter])

  const fetchPayouts = async () => {
    try {
      setLoading(true)
      setError('')
      const headers = authService.getAuthHeaders()
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter && { status: statusFilter }),
      })

      const response = await fetch(getApiUrl(`/admin/payouts?${params}`), { headers })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch payouts')
      }

      setPayouts(data.data || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (err: any) {
      setError(err.message || 'Failed to load payouts')
      console.error('Error fetching payouts:', err)
    } finally {
      setLoading(false)
    }
  }

  const callAction = async (
    method: 'PUT' | 'POST',
    path: string,
    body?: unknown,
    confirmMessage?: string
  ): Promise<boolean> => {
    if (confirmMessage && !confirm(confirmMessage)) return false
    try {
      setActionInFlight(path)
      const headers = { ...authService.getAuthHeaders(), 'Content-Type': 'application/json' }
      const response = await fetch(getApiUrl(path), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Action failed')
      }
      return true
    } catch (err: any) {
      alert(err.message || 'Action failed')
      return false
    } finally {
      setActionInFlight(null)
    }
  }

  const handleComplete = async (id: string) => {
    const ok = await callAction(
      'PUT',
      `/admin/payouts/${id}/complete`,
      undefined,
      'Have you transferred the funds externally? This will mark the payout as PAID.'
    )
    if (ok) fetchPayouts()
  }

  const handleHold = async (id: string) => {
    const reason = prompt('Reason for hold (visible to admins only, min 3 chars):')?.trim()
    if (!reason || reason.length < 3) return
    const ok = await callAction('POST', `/admin/payouts/${id}/hold`, { reason })
    if (ok) fetchPayouts()
  }

  const handleRelease = async (id: string) => {
    const ok = await callAction(
      'POST',
      `/admin/payouts/${id}/release`,
      undefined,
      'Release this payout? It will be picked up on the next batch.'
    )
    if (ok) fetchPayouts()
  }

  const handleRetry = async (id: string) => {
    const ok = await callAction(
      'POST',
      `/admin/payouts/${id}/retry`,
      undefined,
      'Retry this failed payout? A new disbursement will be sent to Paystrax.'
    )
    if (ok) fetchPayouts()
  }

  const handleRunBatch = async () => {
    if (!confirm('Run the payout batch now? This will process all eligible bookings.')) return
    try {
      setRunningBatch(true)
      const headers = { ...authService.getAuthHeaders(), 'Content-Type': 'application/json' }
      const response = await fetch(getApiUrl('/admin/payouts/run-batch'), {
        method: 'POST',
        headers,
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Batch run failed')
      const summary = data.data || {}
      alert(
        `Batch complete — created: ${summary.payoutsCreated ?? 0}, disbursed: ${summary.disbursed ?? 0}, failed: ${summary.failed ?? 0}, skipped: ${summary.skipped ?? 0}`
      )
      fetchPayouts()
    } catch (err: any) {
      alert(err.message || 'Batch run failed')
    } finally {
      setRunningBatch(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Payout Management</h1>
        <button
          onClick={handleRunBatch}
          disabled={runningBatch}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors font-medium shadow-sm disabled:opacity-60"
        >
          <Play className="w-4 h-4" />
          {runningBatch ? 'Running…' : 'Run payout batch now'}
        </button>
      </div>

      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING_SETTLEMENT">Pending Settlement</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="PAID">Paid</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {payouts.map((payout) => {
              const badgeClass = STATUS_BADGE[payout.status] || 'bg-gray-100 text-gray-800'
              const busy = actionInFlight?.includes(payout.id)
              return (
                <div
                  key={payout.id}
                  className="bg-white shadow rounded-lg overflow-hidden border border-gray-200"
                >
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}
                      >
                        {payout.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm text-gray-500">
                        Created: {new Date(payout.createdAt).toLocaleString()}
                      </span>
                      {payout.arrivalDate && (
                        <span className="text-sm text-gray-500">
                          Arrived: {new Date(payout.arrivalDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="text-lg font-bold text-primary-600">
                      {payout.amount.toFixed(2)} {payout.currency.toUpperCase()}
                    </div>
                  </div>

                  {payout.heldReason && (
                    <div className="px-6 py-2 bg-amber-50 border-b border-amber-100 text-sm text-amber-800 flex items-center gap-2">
                      <PauseCircle className="w-4 h-4" /> On hold: {payout.heldReason}
                    </div>
                  )}
                  {payout.failureMessage && (
                    <div className="px-6 py-2 bg-red-50 border-b border-red-100 text-sm text-red-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> {payout.failureMessage}
                    </div>
                  )}

                  <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <User className="w-4 h-4" />
                        Host Information
                      </div>
                      <p className="text-sm font-medium">{payout.host.name || 'No Name'}</p>
                      <p className="text-sm text-gray-500">{payout.host.email}</p>
                      {payout.host.kycStatus && (
                        <p className="text-xs text-gray-500">
                          KYC: <strong>{payout.host.kycStatus}</strong>
                          {payout.host.payoutDebt ? (
                            <>
                              {' '}
                              • Debt: kr {payout.host.payoutDebt.toFixed(0)}
                            </>
                          ) : null}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <Building className="w-4 h-4" />
                        Payout Card
                      </div>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="text-gray-500">Card:</span>{' '}
                          {payout.host.payoutCardBrand || 'N/A'} ••••{' '}
                          {payout.host.payoutCardLast4 || '????'}
                        </p>
                        <p>
                          <span className="text-gray-500">Holder:</span>{' '}
                          {payout.host.accountHolderName || 'N/A'}
                        </p>
                        <p className="font-mono text-xs text-gray-400 truncate">
                          <span className="text-gray-500 font-sans">Token:</span>{' '}
                          {payout.host.paystraxCardRegistrationId || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                          <MapPin className="w-4 h-4" />
                          Payout Address
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {payout.host.payoutAddress || 'N/A'}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        {payout.status === 'PENDING_SETTLEMENT' && (
                          <button
                            onClick={() => handleHold(payout.id)}
                            disabled={busy}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 font-medium disabled:opacity-60"
                          >
                            <PauseCircle className="w-4 h-4" /> Hold
                          </button>
                        )}
                        {payout.status === 'ON_HOLD' && (
                          <button
                            onClick={() => handleRelease(payout.id)}
                            disabled={busy}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-60"
                          >
                            <PlayCircle className="w-4 h-4" /> Release
                          </button>
                        )}
                        {payout.status === 'FAILED' && (
                          <button
                            onClick={() => handleRetry(payout.id)}
                            disabled={busy}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 font-medium disabled:opacity-60"
                          >
                            <RotateCw className="w-4 h-4" /> Retry
                          </button>
                        )}
                        {payout.status !== 'PAID' && (
                          <button
                            onClick={() => handleComplete(payout.id)}
                            disabled={busy}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium shadow-sm disabled:opacity-60"
                          >
                            <CheckCircle className="w-4 h-4" /> Mark as Paid
                          </button>
                        )}
                        {payout.status === 'PAID' && (
                          <div className="flex items-center justify-center gap-2 py-2 text-green-600 font-medium">
                            <CheckCircle className="w-4 h-4" /> Successfully Paid
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
                    Payout ID: {payout.id}
                    {payout.paystraxPayoutPaymentId && (
                      <> • Paystrax: {payout.paystraxPayoutPaymentId}</>
                    )}
                    {payout.bookingIds?.length ? <> • Bookings: {payout.bookingIds.join(', ')}</> : null}
                  </div>
                </div>
              )
            })}

            {payouts.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <Banknote className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No payouts found</p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-blue-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
