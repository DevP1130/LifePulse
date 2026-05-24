import { useState, useEffect, useCallback } from 'react'
import type { CustomerSummary, EventType, OutreachBrief } from './types'
import { api } from './services/api'
import Header from './components/Header'
import StatsBar from './components/StatsBar'
import CustomerTable from './components/CustomerTable'
import OutreachBriefModal from './components/OutreachBriefModal'

const EVENT_FILTER_OPTIONS: { value: EventType | 'all'; label: string }[] = [
  { value: 'all',              label: 'All Events' },
  { value: 'relocation',       label: 'Relocation' },
  { value: 'new_baby',         label: 'Growing Family' },
  { value: 'home_purchase',    label: 'Home Purchase' },
  { value: 'job_change',       label: 'Career Transition' },
  { value: 'financial_stress', label: 'Financial Stress' },
  { value: 'marriage',         label: 'Marriage' },
  { value: 'divorce',          label: 'Life Restructuring' },
]

export default function App() {
  const [customers, setCustomers]     = useState<CustomerSummary[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [filterEvent, setFilterEvent] = useState<EventType | 'all'>('all')
  const [brief, setBrief]             = useState<OutreachBrief | null>(null)
  const [loadingId, setLoadingId]     = useState<string | null>(null)
  const [briefError, setBriefError]   = useState<string | null>(null)

  useEffect(() => {
    api.listCustomers()
      .then(setCustomers)
      .catch(() => setError('Failed to load customers. Is the backend running on port 8000?'))
      .finally(() => setLoading(false))
  }, [])

  const handleViewBrief = useCallback(async (id: string) => {
    setLoadingId(id)
    setBriefError(null)
    try {
      const data = await api.getBrief(id)
      setBrief(data)
    } catch {
      setBriefError('Could not load outreach brief. Please try again.')
    } finally {
      setLoadingId(null)
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      {customers.length > 0 && <StatsBar customers={customers} />}

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-6 py-8">

        {/* Page title + filter row */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Customer Intelligence Feed</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              AI-detected life events requiring relationship manager outreach
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">Filter:</label>
            <select
              value={filterEvent}
              onChange={e => setFilterEvent(e.target.value as EventType | 'all')}
              className="text-sm border border-slate-200 bg-white rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1a2a6c]/30"
            >
              {EVENT_FILTER_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* States */}
        {loading && (
          <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-sm">Loading customer data…</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-6 py-5 text-sm">
            <p className="font-semibold">Connection error</p>
            <p className="mt-1 opacity-80">{error}</p>
            <p className="mt-2 text-xs opacity-60">
              Start the backend: <code className="font-mono bg-red-100 px-1 rounded">cd backend && uvicorn main:app --reload</code>
            </p>
          </div>
        )}

        {briefError && (
          <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 text-sm">
            {briefError}
          </div>
        )}

        {!loading && !error && (
          <CustomerTable
            customers={customers}
            onViewBrief={handleViewBrief}
            loadingId={loadingId}
            filterEvent={filterEvent}
          />
        )}

        {!loading && !error && customers.length > 0 && (
          <p className="mt-4 text-xs text-slate-400 text-right">
            Showing {customers.filter(c => filterEvent === 'all' || c.life_event?.event_type === filterEvent).length} of {customers.length} customers
          </p>
        )}
      </main>

      {brief && (
        <OutreachBriefModal brief={brief} onClose={() => setBrief(null)} />
      )}
    </div>
  )
}
