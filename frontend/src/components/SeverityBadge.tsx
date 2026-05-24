import type { Severity } from '../types'

const CONFIG: Record<Severity, { label: string; cls: string }> = {
  high:   { label: 'High',   cls: 'bg-red-50 text-red-700 ring-1 ring-red-200'     },
  medium: { label: 'Medium', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  low:    { label: 'Low',    cls: 'bg-slate-50 text-slate-500 ring-1 ring-slate-200' },
}

interface Props { severity: Severity }

export default function SeverityBadge({ severity }: Props) {
  const c = CONFIG[severity]
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${c.cls}`}>
      {c.label}
    </span>
  )
}
