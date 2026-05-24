import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import type { CustomerSummary, RelocationStatus } from '../types'
import StatusBadge from '../components/StatusBadge'
import MiniBar from '../components/MiniBar'

type SortKey = 'confidence' | 'churn_risk' | 'days' | 'name'
type SortDir = 'asc' | 'desc'

const STATUS_FILTERS: { value: RelocationStatus | 'all'; label: string }[] = [
  { value: 'all',       label: 'All'       },
  { value: 'new',       label: 'New'       },
  { value: 'active',    label: 'Active'    },
  { value: 'contacted', label: 'Contacted' },
  { value: 'resolved',  label: 'Resolved'  },
]

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2)
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<RelocationStatus | 'all'>('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'confidence', dir: 'desc' })

  useEffect(() => {
    api.listCustomers()
      .then(setCustomers)
      .catch(() => setError('Cannot reach the backend. Start it with: uvicorn main:app --reload'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const base = filter === 'all' ? customers : customers.filter(c => c.relocation.status === filter)
    return [...base].sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      switch (sort.key) {
        case 'confidence': return dir * (a.relocation.confidence - b.relocation.confidence)
        case 'churn_risk': return dir * (a.relocation.churn_risk - b.relocation.churn_risk)
        case 'days':       return dir * (a.relocation.days_since_first_signal - b.relocation.days_since_first_signal)
        case 'name':       return dir * a.name.localeCompare(b.name)
        default: return 0
      }
    })
  }, [customers, filter, sort])

  const stats = useMemo(() => {
    const flagged = customers.filter(c => c.relocation.status !== 'resolved')
    const needAction = customers.filter(c => ['new', 'active'].includes(c.relocation.status))
    const avgConf = customers.length
      ? customers.reduce((s, c) => s + c.relocation.confidence, 0) / customers.length
      : 0
    const avgRisk = customers.length
      ? customers.reduce((s, c) => s + c.relocation.churn_risk, 0) / customers.length
      : 0
    return { total: customers.length, flagged: flagged.length, needAction: needAction.length, avgConf, avgRisk }
  }, [customers])

  const toggleSort = (key: SortKey) =>
    setSort(prev => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'desc' })

  const SortChevron = ({ k }: { k: SortKey }) => (
    <span className="ml-1 opacity-40 select-none">
      {sort.key === k ? (sort.dir === 'desc' ? '↓' : '↑') : '↕'}
    </span>
  )

  return (
    <div className="px-8 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Relocation Intelligence</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Customers with detected relocation signals — sorted by priority
        </p>
      </div>

      {/* Stats strip */}
      {!loading && !error && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Monitored', value: stats.total, sub: 'total customers' },
            { label: 'Needs Outreach', value: stats.needAction, sub: 'new or active', accent: true },
            { label: 'Avg. Confidence', value: `${Math.round(stats.avgConf * 100)}%`, sub: 'detection accuracy' },
            { label: 'Avg. Churn Risk', value: `${Math.round(stats.avgRisk * 100)}%`, sub: 'retention priority', warn: stats.avgRisk > 0.55 },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 px-5 py-4">
              <p className={`text-2xl font-bold ${s.accent ? 'text-accent' : s.warn ? 'text-amber-500' : 'text-gray-900'}`}>
                {s.value}
              </p>
              <p className="text-xs font-semibold text-gray-700 mt-1">{s.label}</p>
              <p className="text-xs text-gray-400">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter + count bar */}
      {!loading && !error && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  filter === f.value
                    ? 'bg-accent text-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400">
            {filtered.length} customer{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-sm">Loading customers…</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl px-6 py-5 text-sm">
          <p className="font-semibold mb-1">Connection error</p>
          <p className="text-red-500 text-xs">{error}</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th
                  className="px-5 py-3 text-left text-xs font-semibold text-gray-400 cursor-pointer hover:text-gray-600 select-none"
                  onClick={() => toggleSort('name')}
                >
                  Customer <SortChevron k="name" />
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400">
                  Route
                </th>
                <th
                  className="px-5 py-3 text-left text-xs font-semibold text-gray-400 cursor-pointer hover:text-gray-600 select-none"
                  onClick={() => toggleSort('confidence')}
                >
                  Confidence <SortChevron k="confidence" />
                </th>
                <th
                  className="px-5 py-3 text-left text-xs font-semibold text-gray-400 cursor-pointer hover:text-gray-600 select-none"
                  onClick={() => toggleSort('churn_risk')}
                >
                  Churn Risk <SortChevron k="churn_risk" />
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400">
                  Signals
                </th>
                <th
                  className="px-5 py-3 text-left text-xs font-semibold text-gray-400 cursor-pointer hover:text-gray-600 select-none"
                  onClick={() => toggleSort('days')}
                >
                  Since First <SortChevron k="days" />
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => {
                const rel = c.relocation
                const ini = initials(c.name)
                return (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50/60 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/customers/${c.id}`)}
                  >
                    {/* Customer */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                          {ini}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-400">
                            {c.account_number} · {c.account_tenure_years}yr
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Route */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <span className="text-gray-500 text-xs">{rel.origin_city.split(',')[0]}</span>
                        <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                        <span className="text-gray-800 text-xs font-medium">{rel.destination_city.split(',')[0]}</span>
                      </div>
                    </td>

                    {/* Confidence */}
                    <td className="px-5 py-3.5">
                      <MiniBar value={rel.confidence} variant="confidence" />
                    </td>

                    {/* Churn risk */}
                    <td className="px-5 py-3.5">
                      <MiniBar value={rel.churn_risk} variant="risk" />
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <StatusBadge status={rel.status} size="sm" />
                    </td>

                    {/* Signals */}
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-medium text-gray-600">
                        {rel.signals.length} detected
                      </span>
                    </td>

                    {/* Days */}
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-gray-500 tabular-nums">
                        {rel.days_since_first_signal}d ago
                      </span>
                    </td>

                    {/* Arrow */}
                    <td className="px-4 py-3.5">
                      <svg
                        className="w-4 h-4 text-gray-300 group-hover:text-accent transition-colors"
                        fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">
              No customers match this filter.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
