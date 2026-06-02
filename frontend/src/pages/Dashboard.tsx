import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import type { CustomerSummary, EventStatus, LifeEventType } from '../types'
import StatusBadge from '../components/StatusBadge'
import MiniBar from '../components/MiniBar'

type SortKey = 'confidence' | 'churn_risk' | 'days' | 'name'
type SortDir = 'asc' | 'desc'
type OutreachStatus = 'not_contacted' | 'contacted' | 'converted'

const STATUS_FILTERS: { value: EventStatus | 'all'; label: string }[] = [
  { value: 'all',       label: 'All'       },
  { value: 'new',       label: 'New'       },
  { value: 'active',    label: 'Active'    },
  { value: 'contacted', label: 'Contacted' },
  { value: 'resolved',  label: 'Resolved'  },
]

const EVENT_TYPE_CONFIG: Record<LifeEventType, { label: string; icon: string; color: string }> = {
  relocation:    { label: 'Relocation',    icon: '🗺️', color: 'text-violet-700 bg-violet-50'  },
  new_baby:      { label: 'New Baby',      icon: '👶', color: 'text-pink-700 bg-pink-50'      },
  marriage:      { label: 'Marriage',      icon: '💍', color: 'text-rose-700 bg-rose-50'      },
  home_purchase: { label: 'Home Purchase', icon: '🏠', color: 'text-amber-700 bg-amber-50'    },
  job_change:    { label: 'Job Change',    icon: '💼', color: 'text-blue-700 bg-blue-50'      },
  retirement:    { label: 'Retirement',    icon: '🌅', color: 'text-emerald-700 bg-emerald-50'},
}

const OUTREACH_STYLE: Record<OutreachStatus, string> = {
  not_contacted: 'bg-gray-50 text-gray-500 border-gray-200',
  contacted:     'bg-blue-50 text-blue-700 border-blue-200',
  converted:     'bg-green-50 text-green-700 border-green-200',
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2)
}

function loadOutreach(): Record<string, OutreachStatus> {
  try {
    const raw = localStorage.getItem('lp_outreach')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<EventStatus | 'all'>('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'days', dir: 'asc' })
  const [outreach, setOutreach] = useState<Record<string, OutreachStatus>>(loadOutreach)
  const [confThreshold, setConfThreshold] = useState(50)

  useEffect(() => {
    api.listCustomers()
      .then(setCustomers)
      .catch(() => setError('Cannot reach the backend. Start it with: uvicorn main:app --reload'))
      .finally(() => setLoading(false))
  }, [])

  // Persist outreach status to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('lp_outreach', JSON.stringify(outreach))
  }, [outreach])

  const updateOutreach = (id: string, status: OutreachStatus) =>
    setOutreach(prev => ({ ...prev, [id]: status }))

  const getOutreach = (id: string): OutreachStatus =>
    outreach[id] ?? 'not_contacted'

  const filtered = useMemo(() => {
    const statusFiltered = filter === 'all' ? customers : customers.filter(c => c.life_event.status === filter)
    const thresholded = statusFiltered.filter(c => c.life_event.confidence * 100 >= confThreshold)
    return [...thresholded].sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      switch (sort.key) {
        case 'confidence': return dir * (a.life_event.confidence - b.life_event.confidence)
        case 'churn_risk': return dir * (a.life_event.churn_risk - b.life_event.churn_risk)
        case 'days':       return dir * (a.life_event.days_since_first_signal - b.life_event.days_since_first_signal)
        case 'name':       return dir * a.name.localeCompare(b.name)
        default: return 0
      }
    })
  }, [customers, filter, sort, confThreshold])

  const stats = useMemo(() => {
    const needAction = customers.filter(c => ['new', 'active'].includes(c.life_event.status))
    const avgConf = customers.length
      ? customers.reduce((s, c) => s + c.life_event.confidence, 0) / customers.length : 0
    const avgRisk = customers.length
      ? customers.reduce((s, c) => s + c.life_event.churn_risk, 0) / customers.length : 0
    return { total: customers.length, needAction: needAction.length, avgConf, avgRisk }
  }, [customers])

  const pipeline = useMemo(() => {
    const counts = { not_contacted: 0, contacted: 0, converted: 0 }
    for (const c of customers) counts[getOutreach(c.id)]++
    return counts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, outreach])

  const toggleSort = (key: SortKey) =>
    setSort(prev => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'desc' })

  const SortChevron = ({ k }: { k: SortKey }) => (
    <span className="ml-1 opacity-40 select-none">
      {sort.key === k ? (sort.dir === 'desc' ? '↓' : '↑') : '↕'}
    </span>
  )

  // Denominator for "Showing X of Y" — customers passing status filter only
  const statusFiltered = filter === 'all' ? customers : customers.filter(c => c.life_event.status === filter)
  const afterStatusCount = statusFiltered.filter(c => c.life_event.confidence * 100 >= confThreshold).length

  return (
    <div className="px-8 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Life Event Intelligence</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Customers with detected life event signals — sorted by priority
        </p>
      </div>

      {/* Stats strip */}
      {!loading && !error && (
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Monitored',       value: stats.total,                           sub: 'total customers'                },
            { label: 'Needs Outreach',  value: stats.needAction,                      sub: 'new or active', accent: true    },
            { label: 'Avg. Confidence', value: `${Math.round(stats.avgConf * 100)}%`, sub: 'detection accuracy'             },
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

      {/* Pipeline + Confidence controls */}
      {!loading && !error && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Outreach pipeline summary */}
          <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Outreach Pipeline</p>
            <div className="flex items-center gap-3">
              {/* Progress bar */}
              <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-gray-100">
                {pipeline.not_contacted > 0 && (
                  <div
                    className="bg-gray-300 transition-all"
                    style={{ width: `${(pipeline.not_contacted / stats.total) * 100}%` }}
                  />
                )}
                {pipeline.contacted > 0 && (
                  <div
                    className="bg-blue-400 transition-all"
                    style={{ width: `${(pipeline.contacted / stats.total) * 100}%` }}
                  />
                )}
                {pipeline.converted > 0 && (
                  <div
                    className="bg-green-400 transition-all"
                    style={{ width: `${(pipeline.converted / stats.total) * 100}%` }}
                  />
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2.5 text-xs">
              <span className="flex items-center gap-1.5 text-gray-500">
                <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                {pipeline.not_contacted} not contacted
              </span>
              <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                {pipeline.contacted} contacted
              </span>
              <span className="flex items-center gap-1.5 text-green-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                {pipeline.converted} converted
              </span>
            </div>
          </div>

          {/* Confidence threshold slider */}
          <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Min. Confidence</p>
              <span className="text-xs font-bold text-gray-800 tabular-nums">{confThreshold}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={confThreshold}
              onChange={e => setConfThreshold(Number(e.target.value))}
              className="w-full h-1.5 rounded-full cursor-pointer appearance-none bg-gray-200"
              style={{ accentColor: '#5B5EA6' }}
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter + sort bar */}
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
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setSort({ key: 'days', dir: 'asc' })}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  sort.key === 'days' && sort.dir === 'asc'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Most Recent
              </button>
              <button
                onClick={() => setSort({ key: 'confidence', dir: 'desc' })}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  sort.key === 'confidence' && sort.dir === 'desc'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Highest Confidence
              </button>
            </div>
            <span className="text-xs text-gray-400">
              Showing {afterStatusCount} of {customers.length}
            </span>
          </div>
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
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400">Life Event</th>
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
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400">Event Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400">Outreach</th>
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
                const ev = c.life_event
                const ini = initials(c.name)
                const evConfig = EVENT_TYPE_CONFIG[ev.event_type]
                const os = getOutreach(c.id)
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

                    {/* Life Event */}
                    <td className="px-5 py-3.5">
                      <div>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${evConfig.color}`}>
                          {evConfig.icon} {evConfig.label}
                        </span>
                        <p className="text-xs text-gray-500 mt-1 max-w-[180px] truncate">
                          {ev.event_summary}
                        </p>
                      </div>
                    </td>

                    {/* Confidence */}
                    <td className="px-5 py-3.5">
                      <MiniBar value={ev.confidence} variant="confidence" />
                    </td>

                    {/* Churn risk */}
                    <td className="px-5 py-3.5">
                      <MiniBar value={ev.churn_risk} variant="risk" />
                    </td>

                    {/* Event Status */}
                    <td className="px-5 py-3.5">
                      <StatusBadge status={ev.status} size="sm" />
                    </td>

                    {/* Outreach status */}
                    <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                      <select
                        value={os}
                        onChange={e => updateOutreach(c.id, e.target.value as OutreachStatus)}
                        className={`text-[11px] font-semibold rounded-full px-2.5 py-1 border cursor-pointer outline-none focus:ring-1 focus:ring-accent/20 transition-colors ${OUTREACH_STYLE[os]}`}
                      >
                        <option value="not_contacted">Not Contacted</option>
                        <option value="contacted">Contacted</option>
                        <option value="converted">Converted</option>
                      </select>
                    </td>

                    {/* Days */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500 tabular-nums">
                          {ev.days_since_first_signal}d ago
                        </span>
                        {ev.days_since_first_signal <= 7 && ev.status !== 'resolved' && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-full leading-none">
                            Urgent
                          </span>
                        )}
                      </div>
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
              {confThreshold > 0
                ? `No customers above ${confThreshold}% confidence with this filter.`
                : 'No customers match this filter.'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
