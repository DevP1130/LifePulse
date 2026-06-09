import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import type { CustomerDetail as CustomerDetailType, ConversationStarter, EmailDraft, EventStatus, LifeEventType, ActivityEntry, SignalSummary } from '../types'
import StatusBadge from '../components/StatusBadge'
import MiniBar from '../components/MiniBar'
import SignalFeed from '../components/SignalFeed'
import SignalTimeline from '../components/SignalTimeline'
import ConversationStarterCard from '../components/ConversationStarterCard'
import TransactionTable from '../components/TransactionTable'

function appendActivity(entry: Omit<ActivityEntry, 'id' | 'timestamp'>) {
  try {
    const existing: ActivityEntry[] = JSON.parse(localStorage.getItem('lp_activity') ?? '[]')
    const newEntry: ActivityEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ...entry,
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem('lp_activity', JSON.stringify([newEntry, ...existing].slice(0, 100)))
  } catch {}
}

const STATUS_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  new:       ['active', 'contacted'],
  active:    ['contacted', 'resolved'],
  contacted: ['resolved', 'active'],
  resolved:  ['active'],
}

const STATUS_ACTION_LABEL: Record<EventStatus, string> = {
  new:       'Mark Active',
  active:    'Mark Contacted',
  contacted: 'Mark Resolved',
  resolved:  'Reopen',
}

const EVENT_TYPE_CONFIG: Record<LifeEventType, { label: string; icon: string }> = {
  relocation:    { label: 'Relocation',    icon: '🗺️' },
  new_baby:      { label: 'New Baby',      icon: '👶' },
  marriage:      { label: 'Marriage',      icon: '💍' },
  home_purchase: { label: 'Home Purchase', icon: '🏠' },
  job_change:    { label: 'Job Change',    icon: '💼' },
  retirement:    { label: 'Retirement',    icon: '🌅' },
}

function computeAIFactors(customer: CustomerDetailType) {
  const signals = customer.life_event.signals
  const sorted = [...signals].sort((a, b) => new Date(a.detected_date).getTime() - new Date(b.detected_date).getTime())
  const spanDays = sorted.length > 1
    ? (new Date(sorted[sorted.length - 1].detected_date).getTime() - new Date(sorted[0].detected_date).getTime()) / 86_400_000
    : 0
  const uniqueTypes = new Set(signals.map(s => s.signal_type)).size

  return [
    {
      label: 'Signal Volume',
      score: Math.min(signals.length / 6, 1),
      detail: `${signals.length} transaction${signals.length !== 1 ? 's' : ''} flagged`,
    },
    {
      label: 'Temporal Clustering',
      score: signals.length > 1 ? Math.max(0, 1 - spanDays / 45) : 0.4,
      detail: signals.length < 2 ? 'Single signal — limited pattern' :
        spanDays < 7 ? `Clustered within ${Math.round(spanDays)} days` :
        `Spread over ${Math.round(spanDays)} days`,
    },
    {
      label: 'Signal Diversity',
      score: Math.min(uniqueTypes / 4, 1),
      detail: `${uniqueTypes} distinct signal type${uniqueTypes !== 1 ? 's' : ''}`,
    },
    {
      label: 'Recency',
      score: Math.max(0, 1 - customer.life_event.days_since_first_signal / 90),
      detail: `First detected ${customer.life_event.days_since_first_signal}d ago`,
    },
  ]
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [customer, setCustomer] = useState<CustomerDetailType | null>(null)
  const [starter, setStarter] = useState<ConversationStarter | null>(null)
  const [signalSummary, setSignalSummary] = useState<SignalSummary | null>(null)
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null)
  const [loadingCustomer, setLoadingCustomer] = useState(true)
  const [loadingStarter, setLoadingStarter] = useState(true)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [copied, setCopied] = useState(false)
  const [factorsOpen, setFactorsOpen] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tone, setTone] = useState<'formal' | 'conversational' | 'empathetic'>('conversational')

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.getCustomer(id).then(setCustomer),
      api.getStarter(id, tone).then(setStarter),
      api.getSignalSummary(id).then(setSignalSummary).finally(() => setLoadingSummary(false)),
    ])
      .catch(() => setError('Failed to load customer data.'))
      .finally(() => {
        setLoadingCustomer(false)
        setLoadingStarter(false)
      })
  }, [id])

  const handleToneChange = async (newTone: 'formal' | 'conversational' | 'empathetic') => {
    if (!id || newTone === tone) return
    setTone(newTone)
    setLoadingStarter(true)
    if (emailDraft) setEmailDraft(null)
    try {
      const refreshed = await api.getStarter(id, newTone)
      setStarter(refreshed)
    } catch {
      // silent fail in demo
    } finally {
      setLoadingStarter(false)
    }
  }

  const handleGenerateEmail = async () => {
    if (!id) return
    setLoadingEmail(true)
    try {
      const draft = await api.getEmailDraft(id, tone)
      setEmailDraft(draft)
    } catch {
      // silent fail
    } finally {
      setLoadingEmail(false)
    }
  }

  const handleCopyEmail = async () => {
    if (!emailDraft) return
    await navigator.clipboard.writeText(`Subject: ${emailDraft.subject}\n\n${emailDraft.body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStatusChange = async (newStatus: EventStatus) => {
    if (!customer || !id) return
    const prevStatus = customer.life_event.status
    setUpdatingStatus(true)
    try {
      const updated = await api.updateStatus(id, newStatus)
      setCustomer(prev => prev ? { ...prev, life_event: { ...prev.life_event, status: updated.life_event.status } } : prev)
      appendActivity({ customerId: id, customerName: customer.name, fromStatus: prevStatus, toStatus: newStatus, rmName: user?.name ?? 'System' })
      if (starter) {
        const refreshed = await api.getStarter(id)
        setStarter(refreshed)
      }
    } catch {
      // status update failed silently — demo environment
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loadingCustomer) {
    return (
      <div className="px-8 py-8 flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-sm">Loading customer…</span>
        </div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="px-8 py-8">
        <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl px-6 py-5 text-sm">
          {error ?? 'Customer not found.'}
        </div>
      </div>
    )
  }

  const ev = customer.life_event
  const status = ev.status
  const transitions = STATUS_TRANSITIONS[status]
  const primaryAction = transitions[0]
  const evConfig = EVENT_TYPE_CONFIG[ev.event_type]

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
        <button
          onClick={() => navigate('/customers')}
          className="hover:text-accent transition-colors"
        >
          Customers
        </button>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span className="text-gray-700 font-medium">{customer.name}</span>
      </div>

      {/* Customer header */}
      <div className="bg-white rounded-xl border border-gray-100 px-6 py-5 mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-lg font-bold text-accent flex-shrink-0">
            {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-lg font-bold text-gray-900">{customer.name}</h1>
              <StatusBadge status={status} />
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{customer.account_number}</span>
              <span>·</span>
              <span>{customer.account_tenure_years} year customer</span>
              <span>·</span>
              <span>RM: {customer.relationship_manager}</span>
            </div>

            {/* Life event badge + detail */}
            <div className="flex items-center gap-3 mt-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                {evConfig.icon} {evConfig.label}
              </span>

              {ev.event_type === 'relocation' && ev.origin_city && ev.destination_city ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 font-medium">{ev.origin_city}</span>
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                  <span className="text-sm font-semibold text-accent">{ev.destination_city}</span>
                </div>
              ) : (
                <span className="text-sm text-gray-600">{ev.event_summary}</span>
              )}

              <span className="text-xs text-gray-400">
                First signal {ev.days_since_first_signal}d ago
              </span>
            </div>
          </div>
        </div>

        {/* Stats + actions */}
        <div className="flex items-start gap-8 flex-shrink-0">
          <div className="text-right">
            <div className="flex flex-col gap-2">
              <div>
                <p className="text-xs text-gray-400 mb-1">Confidence</p>
                <MiniBar value={ev.confidence} variant="confidence" />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Churn Risk</p>
                <MiniBar value={ev.churn_risk} variant="risk" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleStatusChange(primaryAction)}
              disabled={updatingStatus}
              className="px-4 py-2 bg-accent hover:bg-accent-dark text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              {updatingStatus ? 'Updating…' : STATUS_ACTION_LABEL[status]}
            </button>
            {transitions[1] && (
              <button
                onClick={() => handleStatusChange(transitions[1])}
                disabled={updatingStatus}
                className="px-4 py-2 border border-gray-200 text-gray-600 hover:border-gray-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                {STATUS_ACTION_LABEL[transitions[1]]}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Detection Rationale + AI Transparency */}
      <div className="bg-white rounded-xl border border-gray-100 px-6 py-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Detection Rationale</p>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-accent/10 text-accent rounded-full">Claude</span>
        </div>
        {loadingSummary ? (
          <p className="text-sm text-gray-300 animate-pulse">Generating analysis…</p>
        ) : (
          <p className="text-sm text-gray-600 leading-relaxed">{signalSummary?.summary}</p>
        )}

        {/* AI Transparency toggle */}
        {customer && (
          <div className="mt-3 pt-3 border-t border-gray-50">
            <button
              onClick={() => setFactorsOpen(o => !o)}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className={`w-3 h-3 transition-transform ${factorsOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M9 18l6-6-6-6" />
              </svg>
              Model Factors
            </button>

            {factorsOpen && (
              <div className="mt-3 space-y-2.5">
                {computeAIFactors(customer).map(f => (
                  <div key={f.label} className="flex items-center gap-3">
                    <span className="text-[11px] text-gray-500 w-36 flex-shrink-0">{f.label}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent/70 rounded-full transition-all"
                        style={{ width: `${Math.round(f.score * 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-600 tabular-nums w-8 text-right">
                      {Math.round(f.score * 100)}%
                    </span>
                    <span className="text-[10px] text-gray-400 w-52 truncate">{f.detail}</span>
                  </div>
                ))}
                <p className="text-[10px] text-gray-400 leading-snug pt-1 border-t border-gray-50 mt-3">
                  ⚠ Model analyzes Capital One card and checking transactions only. Customers who primarily use external accounts may be under-detected. Estimated false positive rate: 8–12%. All AI-generated insights require RM validation before customer contact. Scores recalibrate weekly.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Signal feed + conversation starter — two columns */}
      <div className="grid grid-cols-5 gap-6 mb-6">
        <div className="col-span-3">
          <div className="bg-white rounded-xl border border-gray-100 px-6 py-5 h-full">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Signal Timeline</h2>
            <p className="text-xs text-gray-400 mb-4">
              {ev.signals.length} signal{ev.signals.length !== 1 ? 's' : ''} detected · first seen {ev.days_since_first_signal}d ago
            </p>
            <SignalTimeline signals={ev.signals} />
            <div className="border-t border-gray-50 pt-4">
              <SignalFeed signals={ev.signals} />
            </div>
          </div>
        </div>

        <div className="col-span-2 flex flex-col gap-3">
          {/* Tone selector */}
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-3.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">Brief Tone</p>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {(['formal', 'conversational', 'empathetic'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => handleToneChange(t)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                    tone === t
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-2 leading-snug">
              {tone === 'formal' && 'Professional and concise — reads like a letter from a financial advisor.'}
              {tone === 'conversational' && 'Warm and natural — feels like a genuine check-in, not a sales call.'}
              {tone === 'empathetic' && 'Leads with care — acknowledges the human side before any banking topic.'}
            </p>
          </div>

          <ConversationStarterCard starter={starter!} loading={loadingStarter} />

          {/* Email draft */}
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-3.5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Outreach Email</p>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-accent/10 text-accent rounded-full">Claude</span>
              </div>
              {emailDraft && !loadingEmail && (
                <button
                  onClick={handleGenerateEmail}
                  className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Regenerate
                </button>
              )}
            </div>

            {!emailDraft && !loadingEmail && (
              <button
                onClick={handleGenerateEmail}
                className="w-full py-2 text-xs font-semibold text-accent border border-accent/30 rounded-lg hover:bg-accent/5 transition-colors"
              >
                Draft Outreach Email
              </button>
            )}

            {loadingEmail && (
              <div className="flex items-center justify-center gap-2 py-4 text-gray-400">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span className="text-xs">Drafting email…</span>
              </div>
            )}

            {emailDraft && !loadingEmail && (
              <div>
                <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Subject</p>
                  <p className="text-xs font-medium text-gray-800">{emailDraft.subject}</p>
                </div>
                <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto pr-1">
                  {emailDraft.body}
                </div>
                <button
                  onClick={handleCopyEmail}
                  className={`mt-3 w-full py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    copied
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800'
                  }`}
                >
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-white rounded-xl border border-gray-100 px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Transaction History</h2>
            <p className="text-xs text-gray-400 mt-0.5">Last 90 days · signal transactions highlighted</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Life event signal
            </span>
          </div>
        </div>
        <TransactionTable transactions={customer.transactions} limit={50} />
      </div>
    </div>
  )
}
