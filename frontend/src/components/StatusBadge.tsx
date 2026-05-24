import type { RelocationStatus } from '../types'

const CONFIG: Record<RelocationStatus, { dot: string; text: string; label: string }> = {
  new:       { dot: 'bg-slate-400',   text: 'text-slate-500',   label: 'New'       },
  active:    { dot: 'bg-accent',      text: 'text-accent',      label: 'Active'    },
  contacted: { dot: 'bg-emerald-500', text: 'text-emerald-600', label: 'Contacted' },
  resolved:  { dot: 'bg-gray-300',    text: 'text-gray-400',    label: 'Resolved'  },
}

interface Props {
  status: RelocationStatus
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  const c = CONFIG[status]
  const cls = size === 'sm' ? 'text-xs gap-1.5' : 'text-sm gap-2'
  return (
    <span className={`inline-flex items-center ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      <span className={`font-medium ${c.text}`}>{c.label}</span>
    </span>
  )
}
