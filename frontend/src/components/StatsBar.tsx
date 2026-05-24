import type { CustomerSummary } from '../types'

interface Props {
  customers: CustomerSummary[]
}

export default function StatsBar({ customers }: Props) {
  const flagged = customers.filter(c => c.life_event).length
  const high    = customers.filter(c => c.life_event?.severity === 'high').length
  const critical = customers.filter(c =>
    c.life_event?.event_type === 'financial_stress' ||
    c.life_event?.event_type === 'home_purchase'
  ).length
  const avgConfidence = customers
    .filter(c => c.life_event)
    .reduce((sum, c) => sum + (c.life_event?.confidence ?? 0), 0) / (flagged || 1)

  const stats = [
    { label: 'Customers Monitored', value: customers.length, color: 'text-slate-700' },
    { label: 'Life Events Detected', value: flagged, color: 'text-blue-700' },
    { label: 'High Severity', value: high, color: 'text-amber-600' },
    { label: 'Requires Immediate Action', value: critical, color: 'text-red-600' },
    { label: 'Avg. Confidence', value: `${Math.round(avgConfidence * 100)}%`, color: 'text-emerald-600' },
  ]

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-screen-xl mx-auto px-6 py-4">
        <div className="flex gap-8">
          {stats.map(s => (
            <div key={s.label} className="flex flex-col">
              <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
              <span className="text-xs text-slate-500 mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
