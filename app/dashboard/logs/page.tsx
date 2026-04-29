'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/auth'
import { apiGetPaginated } from '@/lib/api'
import { LogTimeline, type TransactionLog } from '@/components/LogTimeline'
import { ScrollText, RefreshCw } from 'lucide-react'

const CATEGORIES = ['', 'PAYMENT', 'PAYOUT', 'BOOKING', 'REFUND', 'CARD', 'KYC', 'ADMIN', 'WEBHOOK', 'SYSTEM']
const SEVERITIES = ['', 'INFO', 'WARN', 'ERROR']
const ACTORS = ['', 'SYSTEM', 'USER', 'ADMIN', 'WEBHOOK']

export default function LogsPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<TransactionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [category, setCategory] = useState('')
  const [severity, setSeverity] = useState('')
  const [actorType, setActorType] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const reload = useCallback(async () => {
    try {
      setLoading(true)
      setErr('')
      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
        ...(category ? { category } : {}),
        ...(severity ? { severity } : {}),
        ...(actorType ? { actorType } : {}),
      })
      const res = await apiGetPaginated<TransactionLog>(`/admin/logs?${params}`)
      setLogs(res.items)
      setTotalPages(res.totalPages)
      setTotal(res.total)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load logs')
    } finally {
      setLoading(false)
    }
  }, [page, category, severity, actorType])

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login')
      return
    }
    reload()
  }, [router, reload])

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit log</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total} entries — every payment, payout, refund, and admin action
          </p>
        </div>
        <button
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3">
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value)
            setPage(1)
          }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c || 'All categories'}
            </option>
          ))}
        </select>
        <select
          value={severity}
          onChange={(e) => {
            setSeverity(e.target.value)
            setPage(1)
          }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
        >
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s || 'All severities'}
            </option>
          ))}
        </select>
        <select
          value={actorType}
          onChange={(e) => {
            setActorType(e.target.value)
            setPage(1)
          }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
        >
          {ACTORS.map((a) => (
            <option key={a} value={a}>
              {a || 'All actors'}
            </option>
          ))}
        </select>
      </div>

      {err && (
        <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-lg">{err}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <ScrollText className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No log entries</p>
        </div>
      ) : (
        <LogTimeline logs={logs} />
      )}

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
