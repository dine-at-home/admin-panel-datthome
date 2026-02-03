'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/auth'
import { getApiUrl } from '@/lib/api-config'
import { CheckCircle, Clock, Banknote, Search, X, MapPin, User, Building } from 'lucide-react'

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
        bankName: string | null
        accountHolderName: string | null
        iban: string | null
        swiftBic: string | null
        payoutAddress: string | null
    }
    bookingIds: string[]
    createdAt: string
    updatedAt: string
}

export default function PayoutsPage() {
    const router = useRouter()
    const [payouts, setPayouts] = useState<Payout[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState<string>('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!authService.isAuthenticated()) {
            router.push('/login')
            return
        }
        fetchPayouts()
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

    const handleCompletePayout = async (payoutId: string) => {
        if (!confirm('Have you transferred the funds externally? This will mark the payout as completed.')) {
            return
        }

        try {
            const headers = authService.getAuthHeaders()
            const response = await fetch(getApiUrl(`/admin/payouts/${payoutId}/complete`), {
                method: 'PUT',
                headers,
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to complete payout')
            }

            fetchPayouts()
        } catch (err: any) {
            alert(err.message || 'Failed to complete payout')
        }
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Payout Management</h1>
            </div>

            {/* Filters */}
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
                        <option value="PENDING_SETTLEMENT">Pending Approval</option>
                        <option value="PAID">Completed (Paid)</option>
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
                        {payouts.map((payout) => (
                            <div key={payout.id} className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${payout.status === 'PAID'
                                                ? 'bg-green-100 text-green-800'
                                                : payout.status === 'PENDING_SETTLEMENT'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                            {payout.status.replace('_', ' ')}
                                        </span>
                                        <span className="text-sm text-gray-500">Requested: {new Date(payout.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="text-lg font-bold text-primary-600">
                                        {(payout.amount / 100).toFixed(2)} {payout.currency.toUpperCase()}
                                    </div>
                                </div>

                                <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* Host Info */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                            <User className="w-4 h-4" />
                                            Host Information
                                        </div>
                                        <p className="text-sm font-medium">{payout.host.name || 'No Name'}</p>
                                        <p className="text-sm text-gray-500">{payout.host.email}</p>
                                    </div>

                                    {/* Bank Details */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                            <Building className="w-4 h-4" />
                                            Bank Details (Iceland)
                                        </div>
                                        <div className="text-sm space-y-1">
                                            <p><span className="text-gray-500">Bank:</span> {payout.host.bankName || 'N/A'}</p>
                                            <p><span className="text-gray-500">IBAN:</span> {payout.host.iban || 'N/A'}</p>
                                            <p><span className="text-gray-500">SWIFT:</span> {payout.host.swiftBic || 'N/A'}</p>
                                            <p><span className="text-gray-500">Holder:</span> {payout.host.accountHolderName || 'N/A'}</p>
                                        </div>
                                    </div>

                                    {/* Address & Actions */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                                <MapPin className="w-4 h-4" />
                                                Payout Address
                                            </div>
                                            <p className="text-sm text-gray-600 truncate">{payout.host.payoutAddress || 'N/A'}</p>
                                        </div>

                                        {payout.status !== 'PAID' && (
                                            <button
                                                onClick={() => handleCompletePayout(payout.id)}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors font-medium shadow-sm"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                                Mark as Paid
                                            </button>
                                        )}
                                        {payout.status === 'PAID' && (
                                            <div className="flex items-center justify-center gap-2 py-2 text-green-600 font-medium">
                                                <CheckCircle className="w-4 h-4" />
                                                Successfully Paid
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="px-6 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
                                    Payout ID: {payout.id} • Bookings: {payout.bookingIds.join(', ')}
                                </div>
                            </div>
                        ))}

                        {payouts.length === 0 && (
                            <div className="text-center py-12 bg-white rounded-lg shadow">
                                <Banknote className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">No payout requests found</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
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
