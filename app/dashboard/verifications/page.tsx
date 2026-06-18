'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/lib/auth'
import { apiGetPaginated, apiSend, fmtDate } from '@/lib/api'
import { ShieldCheck, ShieldAlert, Check, X, Landmark, BadgeCheck } from 'lucide-react'

interface PendingHost {
  id: string
  email: string
  name: string | null
  createdAt: string
  rafraenSkilrikiVerifiedAt: string | null
  bankAccountHolder: string | null
  iban: string | null
  bankName: string | null
  bankSwiftBic: string | null
  taxId: string | null
  hasEid: boolean
  hasIcelandicIban: boolean
  readyToVerify: boolean
}

function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
        met ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
      }`}
    >
      {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}
    </span>
  )
}

export default function VerificationsPage() {
  const router = useRouter()
  const [hosts, setHosts] = useState<PendingHost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const { items } = await apiGetPaginated<PendingHost>('/admin/kyc/pending?limit=100')
      setHosts(items)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load verifications')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login')
      return
    }
    fetchPending()
  }, [router, fetchPending])

  const handleVerify = async (host: PendingHost) => {
    if (!confirm(`Verify ${host.name || host.email}? They'll be able to publish dinners and receive payouts.`)) return
    try {
      setBusyId(host.id)
      await apiSend('POST', `/admin/users/${host.id}/verify-kyc`)
      setHosts((prev) => prev.filter((h) => h.id !== host.id))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to verify')
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async (host: PendingHost) => {
    const reason = prompt(`Reject ${host.name || host.email}? Optionally add a reason:`)
    if (reason === null) return
    try {
      setBusyId(host.id)
      await apiSend('POST', `/admin/users/${host.id}/reject-kyc`, { reason: reason || undefined })
      setHosts((prev) => prev.filter((h) => h.id !== host.id))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to reject')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Host verifications</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {hosts.length} {hosts.length === 1 ? 'host' : 'hosts'} awaiting review
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white border border-slate-100 rounded-xl shadow-sm">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : hosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white border border-slate-100 rounded-xl shadow-sm text-slate-400">
          <BadgeCheck className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No hosts awaiting verification</p>
          <p className="text-xs mt-1">New submissions will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {hosts.map((host) => (
            <div
              key={host.id}
              className="bg-white border border-slate-100 rounded-xl shadow-sm p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                {/* Identity */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/users/${host.id}`}
                      className="font-semibold text-slate-800 hover:text-orange-500 transition-colors truncate"
                    >
                      {host.name || '—'}
                    </Link>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                      In review
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{host.email}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Requirement met={host.hasEid} label="Identity (Auðkenni)" />
                    <Requirement met={host.hasIcelandicIban} label="Icelandic IBAN" />
                  </div>

                  {/* Bank details */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <Detail label="Account holder" value={host.bankAccountHolder} />
                    <Detail label="IBAN" value={host.iban} mono />
                    <Detail label="Kennitala" value={host.taxId} mono />
                    <Detail label="Bank" value={host.bankName} />
                    <Detail label="SWIFT / BIC" value={host.bankSwiftBic} mono />
                    <Detail
                      label="Identity verified"
                      value={host.rafraenSkilrikiVerifiedAt ? fmtDate(host.rafraenSkilrikiVerifiedAt) : null}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2 lg:flex-col lg:items-stretch lg:w-44">
                  <button
                    onClick={() => handleVerify(host)}
                    disabled={!host.readyToVerify || busyId === host.id}
                    title={
                      host.readyToVerify
                        ? 'Verify this host'
                        : 'Host must complete identity and a valid Icelandic IBAN first'
                    }
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Verify
                  </button>
                  <button
                    onClick={() => handleReject(host)}
                    disabled={busyId === host.id}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>

              {!host.readyToVerify && (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50/70 border border-amber-100 px-3 py-2 text-xs text-amber-700">
                  <Landmark className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    This host can&apos;t be verified yet — they still need to complete
                    {!host.hasEid && ' identity verification'}
                    {!host.hasEid && !host.hasIcelandicIban && ' and'}
                    {!host.hasIcelandicIban && ' a valid Icelandic bank account'}.
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Detail({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-slate-700 truncate ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</p>
    </div>
  )
}
