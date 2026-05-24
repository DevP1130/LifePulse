import { useState } from 'react'
import type { CustomerSummary, EventType, Severity } from '../types'
import EventBadge from './EventBadge'
import SeverityBadge from './SeverityBadge'
import ConfidenceBar from './ConfidenceBar'

type SortKey = 'name' | 'confidence' | 'severity' | 'days_ago'

const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 }

interface Props {
  customers: CustomerSummary[]
  onViewBrief: (id: string) => void
  loadingId: string | null
  filterEvent: EventType | 'all'
}

export default function CustomerTable({ customers, onViewBrief, loadingId, filterEvent }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'severity',
    dir: 'asc',
  })

  const filtered = customers.filter(c => {
    if (filterEvent === 'all') return true
    return c.life_event?.event_type === filterEvent
  })

  const sorted = [...filtered].sort((a, b) => {
    const dir = sort.dir === 'asc' ? 1 : -1
    if (sort.key === 'name') return dir * a.name.localeCompare(b.name)
    if (sort.key === 'confidence') {
      return dir * ((a.life_event?.confidence ?? 0) - (b.life_event?.confidence ?? 0))
    }
    if (sort.key === 'severity') {
      const sa = SEVERITY_ORDER[a.life_event?.severity ?? 'low']
      const sb = SEVERITY_ORDER[b.life_event?.severity ?? 'low']
      return dir * (sa - sb)
    }
    if (sort.key === 'days_ago') {
      return dir * ((a.life_event?.days_ago ?? 999) - (b.life_event?.days_ago ?? 999))
    }
    return 0
  })

  const toggle = (key: SortKey) => {
    setSort(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    )
  }

  const SortIcon = ({ k }: { k: SortKey }) => (
    <span className="ml-1 text-slate-400 select-none">
      {sort.key === k ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th
              className="px-5 py-3 text-left font-semibold text-slate-500 cursor-pointer hover:text-slate-700 select-none"
              onClick={() => toggle('name')}
            >
              Customer <SortIcon k="name" />
            </th>
            <th className="px-5 py-3 text-left font-semibold text-slate-500">Life Event</th>
            <th
              className="px-5 py-3 text-left font-semibold text-slate-500 cursor-pointer hover:text-slate-700 select-none"
              onClick={() => toggle('confidence')}
            >
              Confidence <SortIcon k="confidence" />
            </th>
            <th
              className="px-5 py-3 text-left font-semibold text-slate-500 cursor-pointer hover:text-slate-700 select-none"
              onClick={() => toggle('severity')}
            >
              Severity <SortIcon k="severity" />
            </th>
            <th
              className="px-5 py-3 text-left font-semibold text-slate-500 cursor-pointer hover:text-slate-700 select-none"
              onClick={() => toggle('days_ago')}
            >
              Detected <SortIcon k="days_ago" />
            </th>
            <th className="px-5 py-3 text-left font-semibold text-slate-500">RM</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map(customer => {
            const ev = customer.life_event
            const isLoading = loadingId === customer.id

            return (
              <tr
                key={customer.id}
                className="hover:bg-slate-50/70 transition-colors group"
              >
                {/* Customer */}
                <td className="px-5 py-4">
                  <div className="font-semibold text-slate-800">{customer.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {customer.account_number} · {customer.location}
                  </div>
                </td>

                {/* Event badge */}
                <td className="px-5 py-4">
                  {ev ? (
                    <EventBadge eventType={ev.event_type} />
                  ) : (
                    <span className="text-slate-400 text-xs">None</span>
                  )}
                </td>

                {/* Confidence */}
                <td className="px-5 py-4">
                  {ev ? (
                    <ConfidenceBar confidence={ev.confidence} />
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>

                {/* Severity */}
                <td className="px-5 py-4">
                  {ev ? (
                    <SeverityBadge severity={ev.severity} />
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>

                {/* Detected */}
                <td className="px-5 py-4 text-slate-500">
                  {ev ? (
                    <span>{ev.days_ago}d ago</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>

                {/* RM */}
                <td className="px-5 py-4 text-slate-500 text-xs">
                  {customer.relationship_manager}
                </td>

                {/* Action */}
                <td className="px-5 py-4">
                  {ev && (
                    <button
                      onClick={() => onViewBrief(customer.id)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a2a6c] text-white text-xs font-medium rounded-lg hover:bg-[#243580] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Loading
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          View Brief
                        </>
                      )}
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {sorted.length === 0 && (
        <div className="py-16 text-center text-slate-400 text-sm">
          No customers match the current filter.
        </div>
      )}
    </div>
  )
}
