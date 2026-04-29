interface Style {
  bg: string
  text: string
  dot: string
}

const STYLES: Record<string, Style> = {
  // Payment statuses
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  PROCESSING: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
  SUCCEEDED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  FAILED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  REFUNDED: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  PARTIALLY_REFUNDED: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },

  // Payout statuses
  PENDING_SETTLEMENT: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  IN_TRANSIT: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
  PAID: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  ON_HOLD: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  CANCELED: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },

  // Booking statuses
  CONFIRMED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  ONGOING: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  COMPLETED: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },

  // Log severity
  INFO: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  WARN: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  ERROR: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
}

const FALLBACK: Style = { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' }

export function StatusPill({ status }: { status: string }) {
  const s = STYLES[status] ?? FALLBACK
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status.replace(/_/g, ' ')}
    </span>
  )
}
