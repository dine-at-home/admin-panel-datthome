'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, User, Bot, Webhook, Shield } from 'lucide-react'
import { fmtDateTime } from '@/lib/api'

export interface TransactionLog {
  id: string
  category: string
  action: string
  severity: 'INFO' | 'WARN' | 'ERROR'
  message: string
  actorType: 'SYSTEM' | 'USER' | 'ADMIN' | 'WEBHOOK'
  actorId?: string | null
  actorIp?: string | null
  amount?: number | null
  currency?: string | null
  paystraxId?: string | null
  paystraxCode?: string | null
  paystraxPayload?: unknown
  metadata?: Record<string, unknown> | null
  createdAt: string
}

const SEVERITY_BAR: Record<string, string> = {
  INFO: 'bg-slate-300',
  WARN: 'bg-amber-400',
  ERROR: 'bg-red-500',
}

const ACTOR_ICON = {
  SYSTEM: Bot,
  USER: User,
  ADMIN: Shield,
  WEBHOOK: Webhook,
}

export function LogTimeline({ logs }: { logs: TransactionLog[] }) {
  if (!logs.length) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
        No log entries yet
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <LogEntry key={log.id} log={log} />
      ))}
    </div>
  )
}

function LogEntry({ log }: { log: TransactionLog }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = ACTOR_ICON[log.actorType] || Bot
  const hasPayload =
    Boolean(log.paystraxPayload) ||
    Boolean(log.metadata && Object.keys(log.metadata).length > 0)

  return (
    <div className="bg-white border border-slate-100 rounded-lg overflow-hidden">
      <button
        onClick={() => hasPayload && setExpanded((x) => !x)}
        className={`w-full flex items-start gap-3 p-3 text-left ${
          hasPayload ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'
        }`}
      >
        <div className={`w-1 self-stretch rounded-full ${SEVERITY_BAR[log.severity] || SEVERITY_BAR.INFO}`} />
        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-mono text-slate-400">{log.category}</span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs font-medium text-slate-600">{log.action}</span>
            {log.paystraxCode && (
              <>
                <span className="text-xs text-slate-300">·</span>
                <span className="text-xs font-mono text-slate-400">{log.paystraxCode}</span>
              </>
            )}
          </div>
          <p className="text-sm text-slate-800 leading-snug">{log.message}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-400">{fmtDateTime(log.createdAt)}</span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs text-slate-400">{log.actorType.toLowerCase()}</span>
            {log.actorIp && <span className="text-xs text-slate-400">{log.actorIp}</span>}
            {log.amount != null && (
              <>
                <span className="text-xs text-slate-300">·</span>
                <span className="text-xs font-medium text-slate-600 tabular-nums">
                  {log.amount.toLocaleString()} {log.currency}
                </span>
              </>
            )}
          </div>
        </div>
        {hasPayload &&
          (expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400 mt-1" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400 mt-1" />
          ))}
      </button>
      {expanded && hasPayload && (
        <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 space-y-2">
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Metadata</p>
              <pre className="text-xs font-mono text-slate-700 bg-white rounded p-2 overflow-x-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
          {log.paystraxPayload != null && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Paystrax response</p>
              <pre className="text-xs font-mono text-slate-700 bg-white rounded p-2 overflow-x-auto max-h-64">
                {JSON.stringify(log.paystraxPayload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
