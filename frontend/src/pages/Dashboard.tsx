import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useToast } from '../context/ToastContext'
import type { CustomerSummary, EventStatus, LifeEventType, ActivityEntry } from '../types'
import StatusBadge from '../components/StatusBadge'
import MiniBar from '../components/MiniBar'

// ── Live signal feed simulation ───────────────────────────────────────────────

interface LiveSignal {
  id: number
  initials: string
  icon: string
  label: string
  detail: string
  ts: number
  isNew?: boolean
}

const SIGNAL_POOL: Omit<LiveSignal, 'id' | 'ts' | 'isNew'>[] = [
  { initials: 'JR', icon: '🚚', label: 'Moving Truck Rental',   detail: 'U-Haul · $890'           },
  { initials: 'SM', icon: '🍼', label: 'Baby Registry',         detail: 'buybuy BABY · $234'       },
  { initials: 'ET', icon: '💍', label: 'Engagement Ring',       detail: 'Tiffany & Co. · $4,200'   },
  { initials: 'KL', icon: '🔍', label: 'Home Inspection Fee',   detail: 'Pillar To Post · $450'    },
  { initials: 'AP', icon: '📦', label: 'Storage Unit',          detail: 'CubeSmart · $149/mo'      },
  { initials: 'MN', icon: '🏥', label: 'Hospital Delivery',     detail: 'Johns Hopkins · $3,100'   },
  { initials: 'BW', icon: '🏛️', label: 'Wedding Venue Deposit', detail: 'Grand Ballroom · $5,500'  },
  { initials: 'CR', icon: '📬', label: 'Address Change',        detail: 'USPS Forward · $1.10'     },
  { initials: 'TH', icon: '🏠', label: 'Down Payment / Escrow', detail: 'First American · $42,000' },
  { initials: 'DV', icon: '✈️', label: 'Honeymoon Booking',    detail: 'Sandals Resorts · $6,800' },
  { initials: 'PG', icon: '🧸', label: 'Baby Gear Purchase',    detail: 'Target Baby · $312'       },
  { initials: 'LF', icon: '⚡', label: 'New Utility Setup',     detail: 'Xcel Energy · $95'        },
  { initials: 'OC', icon: '🛋️', label: 'Furniture Purchase',   detail: 'IKEA · $1,840'            },
  { initials: 'RB', icon: '📊', label: 'Property Appraisal',   detail: 'National Appraisers · $650'},
  { initials: 'YK', icon: '🌅', label: 'IRA Rollover',         detail: 'Wealth Mgmt · $180,000'   },
]

// ── Demo tour steps ───────────────────────────────────────────────────────────

const DEMO_STEPS = [
  {
    icon: '👋',
    title: 'Welcome to LifePulse',
    desc: 'LifePulse monitors Capital One customer transactions in real time, detecting life events before customers reach out — giving relationship managers a first-mover advantage.',
  },
  {
    icon: '⚡',
    title: 'Live Signal Feed',
    desc: 'The live ticker at the top simulates transactions being flagged in real time — moving trucks, wedding venues, hospital visits, home inspections. Each one is a potential conversation.',
  },
  {
    icon: '📊',
    title: 'Outreach Pipeline',
    desc: 'Use the Outreach column to track where each customer is in your pipeline. Customers move from Not Contacted → Contacted → Converted. All changes are logged in the audit log below.',
  },
  {
    icon: '🤖',
    title: 'Customer Brief',
    desc: 'Click any row to open a full AI-generated brief with signal timeline, conversation starters, and a draft outreach email — tailored to the customer\'s specific life event and your preferred tone.',
  },
  {
    icon: '🔒',
    title: 'Compliance Audit Log',
    desc: 'Every status change is recorded in the append-only log at the bottom — FCRA-compliant, exportable, and timestamped. All RM actions are attributed and immutable.',
  },
]

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

const EVENT_TYPE_CONFIG: Record<LifeEventType, { label: string; icon: string }> = {
  relocation:    { label: 'Relocation',    icon: '🗺️' },
  new_baby:      { label: 'New Baby',      icon: '👶' },
  marriage:      { label: 'Marriage',      icon: '💍' },
  home_purchase: { label: 'Home Purchase', icon: '🏠' },
  job_change:    { label: 'Job Change',    icon: '💼' },
  retirement:    { label: 'Retirement',    icon: '🌅' },
}

const OUTREACH_STYLE: Record<OutreachStatus, string> = {
  not_contacted: 'bg-gray-50 text-gray-400 border-gray-200',
  contacted:     'bg-accent/10 text-accent border-accent/20',
  converted:     'bg-gray-900 text-white border-gray-900',
}

const STATUS_COLOR: Record<EventStatus, string> = {
  new:       'text-gray-500 bg-gray-100',
  active:    'text-accent bg-accent/10',
  contacted: 'text-gray-600 bg-gray-100',
  resolved:  'text-gray-400 bg-gray-50',
}

const BOARD_COLUMNS: { key: OutreachStatus; label: string; headerDot: string; dropRing: string }[] = [
  { key: 'not_contacted', label: 'Not Contacted', headerDot: 'bg-gray-300',   dropRing: 'ring-gray-300'   },
  { key: 'contacted',     label: 'Contacted',     headerDot: 'bg-accent/60',  dropRing: 'ring-accent/40'  },
  { key: 'converted',     label: 'Converted',     headerDot: 'bg-gray-700',   dropRing: 'ring-gray-400'   },
]

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2)
}

function BoardCard({
  c,
  hasNote,
  followUpDate,
  onDragStart,
  onClick,
}: {
  c: CustomerSummary
  hasNote: boolean
  followUpDate: string | undefined
  onDragStart: () => void
  onClick: () => void
}) {
  const ev = c.life_event
  const evConfig = EVENT_TYPE_CONFIG[ev.event_type]
  const ini = initials(c.name)
  const followUpDays = followUpDate
    ? Math.ceil((new Date(followUpDate).getTime() - Date.now()) / 86400000)
    : null

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 p-3.5 cursor-pointer hover:shadow-sm hover:border-gray-200 transition-all group active:opacity-60 select-none"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-shrink-0">
          <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-[10px] font-bold text-accent">
            {ini}
          </div>
          {hasNote && (
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent border border-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 truncate">{c.name}</p>
          <p className="text-[10px] text-gray-400 truncate">{c.account_number}</p>
        </div>
        <svg className="w-3 h-3 text-gray-200 group-hover:text-accent transition-colors flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>

      {/* Event badge */}
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 mb-3">
        {evConfig.icon} {evConfig.label}
      </span>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <p className="text-[9px] text-gray-400 mb-1">Confidence</p>
          <MiniBar value={ev.confidence} variant="confidence" />
        </div>
        <div>
          <p className="text-[9px] text-gray-400 mb-1">Churn Risk</p>
          <MiniBar value={ev.churn_risk} variant="risk" />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400">{ev.days_since_first_signal}d ago</span>
        <div className="flex items-center gap-1">
          {ev.days_since_first_signal <= 7 && ev.status !== 'resolved' && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-gray-900 text-white rounded-full leading-none">
              Urgent
            </span>
          )}
          {followUpDays !== null && (
            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full leading-none ${
              followUpDays < 0 ? 'bg-red-50 text-red-400' :
              followUpDays === 0 ? 'bg-amber-50 text-amber-500' :
              followUpDays <= 3 ? 'bg-amber-50 text-amber-500' :
              'bg-accent/10 text-accent'
            }`}>
              {followUpDays < 0 ? `${Math.abs(followUpDays)}d late` :
               followUpDays === 0 ? 'Today' :
               `${followUpDays}d`}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function loadOutreach(): Record<string, OutreachStatus> {
  try {
    const raw = localStorage.getItem('lp_outreach')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function loadActivityLog(): ActivityEntry[] {
  try {
    return JSON.parse(localStorage.getItem('lp_activity') ?? '[]')
  } catch {
    return []
  }
}

function relativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const searchRef = useRef<HTMLInputElement>(null)

  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<EventStatus | 'all'>('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'days', dir: 'asc' })
  const [outreach, setOutreach] = useState<Record<string, OutreachStatus>>(loadOutreach)
  const [confThreshold, setConfThreshold] = useState(50)
  const [search, setSearch] = useState('')
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>(loadActivityLog)
  const [activityOpen, setActivityOpen] = useState(true)
  const [liveFeed, setLiveFeed] = useState<LiveSignal[]>(() =>
    SIGNAL_POOL.slice(0, 4).map((s, i) => ({ ...s, id: i, ts: Date.now() - i * 55_000 }))
  )
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const [demoOpen, setDemoOpen] = useState(false)
  const [demoStep, setDemoStep] = useState(0)
  const [viewMode, setViewMode] = useState<'table' | 'board'>('table')
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<OutreachStatus | null>(null)
  const poolIdxRef = useRef(4)

  useEffect(() => {
    api.listCustomers()
      .then(setCustomers)
      .catch(() => setError('Cannot reach the backend. Start it with: uvicorn main:app --reload'))
      .finally(() => setLoading(false))
  }, [])

  // Cycle live signal feed every 9 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const next = SIGNAL_POOL[poolIdxRef.current % SIGNAL_POOL.length]
      poolIdxRef.current += 1
      setLiveFeed(prev => [
        { ...next, id: Date.now(), ts: Date.now(), isNew: true },
        ...prev.slice(0, 3),
      ])
    }, 9000)
    return () => clearInterval(interval)
  }, [])

  // Refresh activity log when returning from CustomerDetail
  useEffect(() => {
    setActivityLog(loadActivityLog())
  }, [customers])

  useEffect(() => {
    localStorage.setItem('lp_outreach', JSON.stringify(outreach))
  }, [outreach])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const searched = q
      ? customers.filter(c =>
          c.name.toLowerCase().includes(q) ||
          c.account_number.toLowerCase().includes(q)
        )
      : customers
    const statusFiltered = filter === 'all' ? searched : searched.filter(c => c.life_event.status === filter)
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
  }, [customers, filter, sort, confThreshold, search])

  // Note indicators — check localStorage once per customers load
  const hasNotes = useMemo(() => {
    const map: Record<string, boolean> = {}
    for (const c of customers) {
      const n = localStorage.getItem(`lp_notes_${c.id}`)
      if (n?.trim()) map[c.id] = true
    }
    return map
  }, [customers])

  // Follow-up dates
  const followUps = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of customers) {
      const v = localStorage.getItem(`lp_followup_${c.id}`)
      if (v) map[c.id] = v
    }
    return map
  }, [customers])

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

  const eventBreakdown = useMemo(() => {
    const counts = new Map<LifeEventType, number>()
    for (const c of customers) {
      counts.set(c.life_event.event_type, (counts.get(c.life_event.event_type) ?? 0) + 1)
    }
    const max = Math.max(...counts.values(), 1)
    return (Object.keys(EVENT_TYPE_CONFIG) as LifeEventType[])
      .filter(t => counts.has(t))
      .map(t => ({ type: t, count: counts.get(t)!, pct: (counts.get(t)! / max) * 100 }))
  }, [customers])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase()
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select'
      if (isInput) {
        if (e.key === 'Escape') {
          setSearch('')
          ;(e.target as HTMLElement).blur()
        }
        return
      }
      switch (e.key) {
        case 'j':
          setSelectedIdx(i => Math.min(i + 1, filtered.length - 1))
          break
        case 'k':
          setSelectedIdx(i => Math.max(i - 1, 0))
          break
        case 'Enter':
          if (selectedIdx >= 0 && filtered[selectedIdx]) {
            navigate(`/customers/${filtered[selectedIdx].id}`)
          }
          break
        case '/':
          e.preventDefault()
          searchRef.current?.focus()
          break
        case 'Escape':
          setSearch('')
          setSelectedIdx(-1)
          setDemoOpen(false)
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [filtered, selectedIdx, navigate])

  function exportAuditLog() {
    const lines = activityLog.map(e =>
      `[${new Date(e.timestamp).toISOString()}] ${e.rmName ?? 'System'} · ${e.customerName} · ${e.fromStatus} → ${e.toStatus}`
    )
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lifepulse-audit-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const updateOutreach = (id: string, status: OutreachStatus) => {
    setOutreach(prev => ({ ...prev, [id]: status }))
    const labels: Record<OutreachStatus, string> = {
      not_contacted: 'Marked not contacted',
      contacted: 'Outreach logged',
      converted: 'Marked converted',
    }
    showToast(labels[status])
  }

  const getOutreach = (id: string): OutreachStatus =>
    outreach[id] ?? 'not_contacted'

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
      {/* Demo tour modal */}
      {demoOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDemoOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md px-8 py-8" onClick={e => e.stopPropagation()}>
            {/* Progress dots */}
            <div className="flex items-center justify-between mb-7">
              <div className="flex items-center gap-1.5">
                {DEMO_STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setDemoStep(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === demoStep ? 'w-6 bg-accent' :
                      i < demoStep ? 'w-3 bg-accent/30' : 'w-3 bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <button onClick={() => setDemoOpen(false)} className="text-gray-300 hover:text-gray-500 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Step content */}
            <span className="text-5xl block mb-5">{DEMO_STEPS[demoStep].icon}</span>
            <h2 className="text-xl font-bold text-gray-900 mb-3">{DEMO_STEPS[demoStep].title}</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-8">{DEMO_STEPS[demoStep].desc}</p>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setDemoStep(s => s - 1)}
                disabled={demoStep === 0}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-xs text-gray-300">{demoStep + 1} of {DEMO_STEPS.length}</span>
              {demoStep < DEMO_STEPS.length - 1 ? (
                <button
                  onClick={() => setDemoStep(s => s + 1)}
                  className="px-5 py-2 bg-accent hover:bg-accent-dark text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={() => setDemoOpen(false)}
                  className="px-5 py-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Got it
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Life Event Intelligence</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Customers with detected life event signals — sorted by priority
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden lg:flex items-center gap-1.5 text-[10px] text-gray-300 mr-1">
            <kbd className="px-1 py-0.5 bg-gray-100 rounded font-mono text-gray-400">j</kbd>
            <kbd className="px-1 py-0.5 bg-gray-100 rounded font-mono text-gray-400">k</kbd> navigate ·
            <kbd className="px-1 py-0.5 bg-gray-100 rounded font-mono text-gray-400">/</kbd> search ·
            <kbd className="px-1 py-0.5 bg-gray-100 rounded font-mono text-gray-400">↵</kbd> open
          </span>
          <button
            onClick={() => { setDemoStep(0); setDemoOpen(true) }}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Demo Tour
          </button>
        </div>
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

      {/* Pipeline + Event Breakdown + Confidence */}
      {!loading && !error && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Outreach pipeline */}
          <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Outreach Pipeline</p>
            <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 mb-2.5">
              {pipeline.not_contacted > 0 && (
                <div className="bg-gray-200 transition-all" style={{ width: `${(pipeline.not_contacted / stats.total) * 100}%` }} />
              )}
              {pipeline.contacted > 0 && (
                <div className="bg-accent/60 transition-all" style={{ width: `${(pipeline.contacted / stats.total) * 100}%` }} />
              )}
              {pipeline.converted > 0 && (
                <div className="bg-gray-800 transition-all" style={{ width: `${(pipeline.converted / stats.total) * 100}%` }} />
              )}
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-gray-400">
                <span className="w-2 h-2 rounded-full bg-gray-200 flex-shrink-0" />
                {pipeline.not_contacted} not contacted
              </span>
              <span className="flex items-center gap-1.5 text-accent font-medium">
                <span className="w-2 h-2 rounded-full bg-accent/60 flex-shrink-0" />
                {pipeline.contacted} contacted
              </span>
              <span className="flex items-center gap-1.5 text-gray-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-gray-800 flex-shrink-0" />
                {pipeline.converted} converted
              </span>
            </div>
          </div>

          {/* Event type breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Event Breakdown</p>
            <div className="space-y-2">
              {eventBreakdown.map(({ type, count, pct }) => {
                const cfg = EVENT_TYPE_CONFIG[type]
                return (
                  <div key={type} className="flex items-center gap-2">
                    <span className="text-sm w-4 text-center leading-none">{cfg.icon}</span>
                    <span className="text-[11px] text-gray-500 w-24 truncate">{cfg.label}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all bg-accent/70"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-600 tabular-nums w-3 text-right">{count}</span>
                  </div>
                )
              })}
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

      {/* Live Intelligence Feed */}
      {!loading && !error && (
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-3.5 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Live</p>
            </div>
            <div className="h-4 w-px bg-gray-100 flex-shrink-0" />
            <div className="flex items-center gap-2 overflow-x-auto flex-1 no-scrollbar">
              {liveFeed.map((sig, idx) => (
                <div
                  key={sig.id}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-100 flex-shrink-0 transition-all ${
                    idx === 0 && sig.isNew ? 'bg-accent/5 border-accent/20' : 'bg-gray-50'
                  }`}
                >
                  <span className="text-sm leading-none">{sig.icon}</span>
                  <div>
                    <p className="text-[11px] font-medium text-gray-700 whitespace-nowrap">{sig.initials} · {sig.label}</p>
                    <p className="text-[10px] text-gray-400 whitespace-nowrap">{sig.detail} · {relativeTime(new Date(sig.ts).toISOString())}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter + search + sort bar */}
      {!loading && !error && (
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2 flex-1">
            {/* Status filters */}
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

            {/* Search */}
            <div className="relative ml-2">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                placeholder="Search name or account… (/)"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/40 w-56 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {viewMode === 'table' && (
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
            )}
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {filtered.length} of {customers.length}
            </span>

            {/* View toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode('table')}
                title="Table view"
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'table' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M3 10h18M3 14h18M10 4v16M3 6a1 1 0 011-1h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('board')}
                title="Board view"
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'board' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="18" rx="1" />
                  <rect x="14" y="3" width="7" height="18" rx="1" />
                </svg>
              </button>
            </div>
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

      {/* Board view */}
      {!loading && !error && viewMode === 'board' && (
        <div className="flex gap-4 mb-4 items-start">
          {BOARD_COLUMNS.map(col => {
            const colCustomers = filtered.filter(c => getOutreach(c.id) === col.key)
            const isTarget = dragOverCol === col.key
            return (
              <div
                key={col.key}
                className="flex-1 min-w-0"
                onDragOver={e => { e.preventDefault(); setDragOverCol(col.key) }}
                onDragLeave={e => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null)
                }}
                onDrop={e => {
                  e.preventDefault()
                  if (dragId) updateOutreach(dragId, col.key)
                  setDragId(null)
                  setDragOverCol(null)
                }}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-1 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.headerDot}`} />
                    <span className="text-xs font-semibold text-gray-700">{col.label}</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 tabular-nums">{colCustomers.length}</span>
                </div>

                {/* Drop zone */}
                <div className={`min-h-96 rounded-xl p-2 space-y-2 transition-all ${
                  isTarget
                    ? `bg-white ring-2 ring-dashed ${col.dropRing}`
                    : 'bg-gray-50/60'
                }`}>
                  {colCustomers.map(c => (
                    <BoardCard
                      key={c.id}
                      c={c}
                      hasNote={!!hasNotes[c.id]}
                      followUpDate={followUps[c.id]}
                      onDragStart={() => setDragId(c.id)}
                      onClick={() => navigate(`/customers/${c.id}`)}
                    />
                  ))}
                  {colCustomers.length === 0 && (
                    <div className={`flex flex-col items-center justify-center h-24 rounded-lg gap-1.5 transition-colors ${
                      isTarget ? 'bg-white/60' : 'border border-dashed border-gray-200'
                    }`}>
                      <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      <span className="text-[10px] text-gray-300">Drag cards here</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Table */}
      {!loading && !error && viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
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
              {filtered.map((c, idx) => {
                const ev = c.life_event
                const ini = initials(c.name)
                const evConfig = EVENT_TYPE_CONFIG[ev.event_type]
                const os = getOutreach(c.id)
                const followUpDate = followUps[c.id]
                const followUpDays = followUpDate
                  ? Math.ceil((new Date(followUpDate).getTime() - Date.now()) / 86400000)
                  : null
                const isSelected = idx === selectedIdx
                return (
                  <tr
                    key={c.id}
                    className={`hover:bg-gray-50/60 transition-colors cursor-pointer group ${
                      isSelected ? 'bg-accent/5 ring-1 ring-inset ring-accent/20' : ''
                    }`}
                    onClick={() => navigate(`/customers/${c.id}`)}
                  >
                    {/* Customer */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">
                            {ini}
                          </div>
                          {hasNotes[c.id] && (
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent border-2 border-white" title="Has notes" />
                          )}
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
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
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

                    {/* Days + follow-up */}
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500 tabular-nums">
                            {ev.days_since_first_signal}d ago
                          </span>
                          {ev.days_since_first_signal <= 7 && ev.status !== 'resolved' && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-gray-900 text-white rounded-full leading-none">
                              Urgent
                            </span>
                          )}
                        </div>
                        {followUpDays !== null && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none self-start ${
                            followUpDays < 0 ? 'bg-red-50 text-red-400' :
                            followUpDays === 0 ? 'bg-amber-50 text-amber-500' :
                            followUpDays <= 3 ? 'bg-amber-50 text-amber-500' :
                            'bg-accent/10 text-accent'
                          }`}>
                            {followUpDays < 0 ? `${Math.abs(followUpDays)}d overdue` :
                             followUpDays === 0 ? 'Follow-up today' :
                             `Follow-up ${followUpDays}d`}
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
              {search
                ? `No customers match "${search}".`
                : confThreshold > 0
                ? `No customers above ${confThreshold}% confidence with this filter.`
                : 'No customers match this filter.'}
            </div>
          )}
        </div>
      )}

      {/* Compliance Audit Log */}
      {!loading && !error && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2.5">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span className="text-sm font-semibold text-gray-900">Compliance Audit Log</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 border border-gray-200 text-gray-400 rounded-full">FCRA</span>
              {activityLog.length > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-accent/10 text-accent rounded-full">
                  {activityLog.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activityLog.length > 0 && (
                <button
                  onClick={exportAuditLog}
                  className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Export
                </button>
              )}
              <button
                onClick={() => setActivityOpen(o => !o)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${activityOpen ? '' : '-rotate-90'}`}
                  fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                >
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {activityOpen && (
            <div>
              {activityLog.length === 0 ? (
                <p className="text-xs text-gray-400 px-6 py-5">
                  No status changes recorded. All RM actions on customer records will appear here.
                </p>
              ) : (
                <>
                  <ul className="divide-y divide-gray-50">
                    {activityLog.map(entry => (
                      <li
                        key={entry.id}
                        className="flex items-center gap-3 px-6 py-2.5 hover:bg-gray-50/40 transition-colors cursor-pointer"
                        onClick={() => navigate(`/customers/${entry.customerId}`)}
                      >
                        <span className="text-[10px] font-mono text-gray-300 flex-shrink-0 w-32 tabular-nums">
                          {new Date(entry.timestamp).toISOString().slice(0, 19).replace('T', ' ')}
                        </span>
                        <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-[9px] font-bold text-accent flex-shrink-0">
                          {initials(entry.customerName)}
                        </div>
                        <div className="flex-1 min-w-0 flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-800">{entry.customerName}</span>
                          <span className="text-[10px] text-gray-400">·</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLOR[entry.fromStatus]}`}>
                            {entry.fromStatus}
                          </span>
                          <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLOR[entry.toStatus]}`}>
                            {entry.toStatus}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {entry.rmName ?? 'System'}
                        </span>
                        <span className="text-[11px] text-gray-300 flex-shrink-0 w-14 text-right">
                          {relativeTime(entry.timestamp)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-gray-300 px-6 py-2.5 border-t border-gray-50">
                    Records are append-only and cannot be modified. Retained per FCRA §605 requirements.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
