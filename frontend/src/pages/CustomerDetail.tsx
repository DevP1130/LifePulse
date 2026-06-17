import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
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

interface ProductRec {
  icon: string
  product: string
  category: string
  why: string
}

const PRODUCT_FIT: Record<LifeEventType, ProductRec[]> = {
  relocation: [
    { icon: '🏦', product: '360 Checking',     category: 'Banking',   why: 'Opening a local account before the move makes utility and rent payments seamless from day one.' },
    { icon: '🚗', product: 'Auto Loan',         category: 'Lending',   why: 'Relocation frequently triggers a vehicle upgrade — competitive rates and quick approval.' },
    { icon: '🏠', product: 'Home Loan',         category: 'Mortgage',  why: 'If purchasing at the destination, locking a rate now protects against market movement.' },
  ],
  new_baby: [
    { icon: '💰', product: '360 Savings',       category: 'Banking',   why: 'Dedicated savings account for college or emergency fund — automate transfers from day one.' },
    { icon: '📈', product: 'UTMA Account',      category: 'Investing', why: 'Custodial investing account for long-term wealth transfer to the child at age 18–21.' },
    { icon: '🛡️', product: 'Life Insurance',    category: 'Protection', why: 'New dependents make coverage a priority — referral to Capital One\'s insurance partners.' },
  ],
  marriage: [
    { icon: '🏦', product: 'Joint Checking',    category: 'Banking',   why: 'Consolidating household finances simplifies bill pay and builds combined credit history.' },
    { icon: '💳', product: 'Venture X Card',    category: 'Credit',    why: 'Honeymoon and household spending earn travel rewards with no foreign transaction fees.' },
    { icon: '💰', product: '360 Savings',       category: 'Banking',   why: 'Joint savings goal account for a home down payment or shared emergency fund.' },
  ],
  home_purchase: [
    { icon: '🏠', product: 'Home Loan',         category: 'Mortgage',  why: 'Capital One offers competitive rates — pre-approval before the offer strengthens negotiating position.' },
    { icon: '🔑', product: 'HELOC',             category: 'Lending',   why: 'Post-closing, a home equity line provides flexible access to funds for renovations.' },
    { icon: '🏦', product: '360 Checking',      category: 'Banking',   why: 'Auto-pay from a Capital One account may qualify for a rate discount on the mortgage.' },
  ],
  job_change: [
    { icon: '💰', product: '360 Savings',       category: 'Banking',   why: 'Higher income from a new role is an opportunity to automate savings toward financial goals.' },
    { icon: '📊', product: 'IRA Rollover',      category: 'Investing', why: '401(k) from the prior employer — Capital One can manage the rollover transition.' },
    { icon: '💳', product: 'Savor Card',        category: 'Credit',    why: 'Dining and entertainment rewards align with the lifestyle shifts common in job transitions.' },
  ],
  retirement: [
    { icon: '📊', product: 'IRA / Roth IRA',    category: 'Investing', why: 'Roll over employer funds and maximize contributions before income changes.' },
    { icon: '🏦', product: 'High-Yield Savings', category: 'Banking',  why: 'Capital preservation with competitive rates — ideal for a fixed-income transition.' },
    { icon: '👤', product: 'Wealth Management', category: 'Advisory',  why: 'Personalized withdrawal strategy and portfolio management with a dedicated advisor.' },
  ],
}

const CATEGORY_COLOR: Record<string, string> = {
  Banking:    'bg-blue-50 text-blue-500',
  Lending:    'bg-purple-50 text-purple-500',
  Mortgage:   'bg-orange-50 text-orange-500',
  Investing:  'bg-green-50 text-green-600',
  Credit:     'bg-accent/10 text-accent',
  Protection: 'bg-red-50 text-red-400',
  Advisory:   'bg-gray-100 text-gray-600',
}

function ProductFitCard({ rec, rank }: { rec: ProductRec; rank: number }) {
  const [added, setAdded] = useState(false)

  return (
    <div className={`relative flex flex-col gap-2.5 rounded-xl border px-4 py-4 transition-all ${
      rank === 0 ? 'border-accent/20 bg-accent/[0.03]' : 'border-gray-100 bg-gray-50/40'
    }`}>
      {rank === 0 && (
        <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wide text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">
          Best fit
        </span>
      )}
      <div className="flex items-start gap-2.5">
        <span className="text-xl leading-none mt-0.5">{rec.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{rec.product}</p>
          </div>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${CATEGORY_COLOR[rec.category] ?? 'bg-gray-100 text-gray-500'}`}>
            {rec.category}
          </span>
        </div>
      </div>
      <p className="text-[11px] text-gray-500 leading-snug">{rec.why}</p>
      <button
        onClick={() => setAdded(a => !a)}
        className={`mt-auto text-[11px] font-semibold py-1.5 rounded-lg border transition-colors ${
          added
            ? 'bg-gray-900 text-white border-gray-900'
            : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
        }`}
      >
        {added ? '✓ Added to brief' : 'Add to brief'}
      </button>
    </div>
  )
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
  const { showToast } = useToast()

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

  const [notes, setNotes] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load notes + follow-up date from localStorage
  useEffect(() => {
    if (!id) return
    setNotes(localStorage.getItem(`lp_notes_${id}`) ?? '')
    setFollowUpDate(localStorage.getItem(`lp_followup_${id}`) ?? '')
  }, [id])

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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      if (e.key === 'Escape') navigate('/customers')
      if (e.key === '1') setTone('formal')
      if (e.key === '2') setTone('conversational')
      if (e.key === '3') setTone('empathetic')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  const handleNotesChange = (val: string) => {
    setNotes(val)
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current)
    notesTimerRef.current = setTimeout(() => {
      if (id) {
        localStorage.setItem(`lp_notes_${id}`, val)
        showToast('Notes saved', 'info')
      }
    }, 800)
  }

  const handleFollowUpChange = (val: string) => {
    setFollowUpDate(val)
    if (id) {
      if (val) {
        localStorage.setItem(`lp_followup_${id}`, val)
        showToast('Follow-up date set', 'info')
      } else {
        localStorage.removeItem(`lp_followup_${id}`)
      }
    }
  }

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
    showToast('Email copied to clipboard')
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
      showToast(`Status updated to ${newStatus}`)
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

  const followUpDays = followUpDate
    ? Math.ceil((new Date(followUpDate).getTime() - Date.now()) / 86400000)
    : null

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-6 no-print">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
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

        <div className="flex items-center gap-3">
          {/* Keyboard hint */}
          <span className="hidden lg:flex items-center gap-1.5 text-[10px] text-gray-300">
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-400 font-mono">Esc</kbd> back
            <span className="mx-1">·</span>
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-400 font-mono">1</kbd>
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-400 font-mono">2</kbd>
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-400 font-mono">3</kbd> tone
          </span>

          {/* Print button */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
            </svg>
            Print Brief
          </button>
        </div>
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
          <div className="flex flex-col gap-2 no-print">
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

            {/* Follow-up date */}
            <div className="flex items-center gap-1.5 mt-1">
              <svg className="w-3 h-3 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <input
                type="date"
                value={followUpDate}
                onChange={e => handleFollowUpChange(e.target.value)}
                className="text-[11px] text-gray-500 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-accent/20 rounded cursor-pointer"
                title="Follow-up date"
              />
            </div>
            {followUpDays !== null && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full text-center ${
                followUpDays < 0 ? 'bg-red-50 text-red-400' :
                followUpDays === 0 ? 'bg-amber-50 text-amber-500' :
                followUpDays <= 3 ? 'bg-amber-50 text-amber-500' :
                'bg-accent/10 text-accent'
              }`}>
                {followUpDays < 0 ? `${Math.abs(followUpDays)}d overdue` :
                 followUpDays === 0 ? 'Follow-up today' :
                 `Follow-up in ${followUpDays}d`}
              </span>
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

      {/* Product Fit Recommendations */}
      <div className="bg-white rounded-xl border border-gray-100 px-6 py-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Product Fit</p>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">
            {evConfig.icon} {evConfig.label}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {PRODUCT_FIT[ev.event_type].map((rec, i) => (
            <ProductFitCard key={rec.product} rec={rec} rank={i} />
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-3 pt-3 border-t border-gray-50">
          Recommendations are based on the detected life event and Capital One's product portfolio. Confirm suitability with the customer before presenting.
        </p>
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

        <div className="col-span-2 flex flex-col gap-3 no-print">
          {/* Tone selector */}
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Brief Tone</p>
              <span className="text-[10px] text-gray-300">
                <kbd className="px-1 py-0.5 bg-gray-100 rounded font-mono text-gray-400">1</kbd>
                <kbd className="px-1 py-0.5 bg-gray-100 rounded font-mono text-gray-400 ml-0.5">2</kbd>
                <kbd className="px-1 py-0.5 bg-gray-100 rounded font-mono text-gray-400 ml-0.5">3</kbd>
              </span>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {(['formal', 'conversational', 'empathetic'] as const).map((t, i) => (
                <button
                  key={t}
                  onClick={() => handleToneChange(t)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                    tone === t
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {i + 1}. {t}
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

      {/* RM Notes */}
      <div className="bg-white rounded-xl border border-gray-100 px-6 py-5 mt-6 no-print">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">RM Notes</h2>
            {notes.trim() && (
              <span className="w-1.5 h-1.5 rounded-full bg-accent/60" />
            )}
          </div>
          <span className="text-[10px] text-gray-300">auto-saved · private</span>
        </div>
        <textarea
          value={notes}
          onChange={e => handleNotesChange(e.target.value)}
          placeholder="Add private notes about this customer… not visible to the customer or in exports."
          className="w-full text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-accent/30 border border-gray-100 placeholder-gray-400 leading-relaxed"
          rows={4}
        />
      </div>
    </div>
  )
}
