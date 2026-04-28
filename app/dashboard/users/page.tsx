'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/lib/auth'
import { getApiUrl } from '@/lib/api-config'
import { Trash2, Ban, CheckCircle, Search, X, Users } from 'lucide-react'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  emailVerified: boolean
  blocked: boolean
  dinnerCount: number
  bookingCount: number
  createdAt: string
}

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-purple-50 text-purple-700',
  host:  'bg-blue-50 text-blue-700',
  guest: 'bg-slate-100 text-slate-600',
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [blockedOnly, setBlockedOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authService.isAuthenticated()) { router.push('/login'); return }
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, page, search, roleFilter, blockedOnly])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError('')
      const headers = authService.getAuthHeaders()
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
        ...(blockedOnly && { blocked: 'true' }),
      })
      const res = await fetch(getApiUrl(`/admin/users?${params}`), { headers })
      if (res.status === 401) { authService.removeToken(); router.push('/login'); return }
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to fetch')
      setUsers(data.data || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotal(data.pagination?.total || 0)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleBlock = async (userId: string, blocked: boolean) => {
    if (!confirm(`${blocked ? 'Block' : 'Unblock'} this user?`)) return
    try {
      const headers = { ...authService.getAuthHeaders(), 'Content-Type': 'application/json' }
      const res = await fetch(getApiUrl(`/admin/users/${userId}/block`), {
        method: 'PUT', headers, body: JSON.stringify({ blocked }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed')
      fetchUsers()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed')
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return
    try {
      const headers = authService.getAuthHeaders()
      const res = await fetch(getApiUrl(`/admin/users/${userId}`), { method: 'DELETE', headers })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed')
      fetchUsers()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed')
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-sm text-slate-500 mt-0.5">{total} total</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search name or email…"
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
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 bg-white"
        >
          <option value="">All roles</option>
          <option value="guest">Guest</option>
          <option value="host">Host</option>
          <option value="admin">Admin</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={blockedOnly}
            onChange={(e) => { setBlockedOnly(e.target.checked); setPage(1) }}
            className="w-4 h-4 accent-orange-500 rounded"
          />
          Blocked only
        </label>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Users className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No users found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Dinners</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Bookings</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Joined</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/users/${u.id}`} className="group">
                      <p className="font-medium text-slate-800 group-hover:text-orange-500 transition-colors">
                        {u.name || '—'}
                      </p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_STYLES[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700 tabular-nums">{u.dinnerCount}</td>
                  <td className="px-4 py-3 text-right text-slate-700 tabular-nums">{u.bookingCount}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {u.blocked ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Blocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleBlock(u.id, !u.blocked)}
                        title={u.blocked ? 'Unblock' : 'Block'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          u.blocked
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : 'text-amber-500 hover:bg-amber-50'
                        }`}
                      >
                        {u.blocked ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      </button>
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleDelete(u.id)}
                          title="Delete"
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
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
