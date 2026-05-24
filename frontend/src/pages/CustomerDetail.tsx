import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import type { CustomerDetail as CustomerDetailType, ConversationStarter, RelocationStatus } from '../types'
import StatusBadge from '../components/StatusBadge'
import MiniBar from '../components/MiniBar'
import SignalFeed from '../components/SignalFeed'
import ConversationStarterCard from '../components/ConversationStarterCard'
import TransactionTable from '../components/TransactionTable'

const STATUS_TRANSITIONS: Record<RelocationStatus, RelocationStatus[]> = {
  new:       ['active', 'contacted'],
  active:    ['contacted', 'resolved'],
  contacted: ['resolved', 'active'],
  resolved:  ['active'],
}

const STATUS_ACTION_LABEL: Record<RelocationStatus, string> = {
  new:       'Mark Active',
  active:    'Mark Contacted',
  contacted: 'Mark Resolved',
  resolved:  'Reopen',
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [customer, setCustomer] = useState<CustomerDetailType | null>(null)
  const [starter, setStarter] = useState<ConversationStarter | null>(null)
  const [loadingCustomer, setLoadingCustomer] = useState(true)
  const [loadingStarter, setLoadingStarter] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.getCustomer(id).then(setCustomer),
      api.getStarter(id).then(setStarter),
    ])
      .catch(() => setError('Failed to load customer data.'))
      .finally(() => {
        setLoadingCustomer(false)
        setLoadingStarter(false)
      })
  }, [id])

  const handleStatusChange = async (newStatus: RelocationStatus) => {
    if (!customer || !id) return
    setUpdatingStatus(true)
    try {
      const updated = await api.updateStatus(id, newStatus)
      setCustomer(prev => prev ? { ...prev, relocation: { ...prev.relocation, status: updated.relocation.status } } : prev)
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

  const rel = customer.relocation
  const status = rel.status
  const transitions = STATUS_TRANSITIONS[status]
  const primaryAction = transitions[0]

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
            {/* Route */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm text-gray-700 font-medium">{rel.origin_city}</span>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              <span className="text-sm font-semibold text-accent">{rel.destination_city}</span>
              <span className="text-xs text-gray-400 ml-2">
                First signal {rel.days_since_first_signal}d ago
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
                <MiniBar value={rel.confidence} variant="confidence" />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Churn Risk</p>
                <MiniBar value={rel.churn_risk} variant="risk" />
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

      {/* Signal feed + conversation starter — two columns */}
      <div className="grid grid-cols-5 gap-6 mb-6">
        {/* Signal feed — 3/5 */}
        <div className="col-span-3">
          <div className="bg-white rounded-xl border border-gray-100 px-6 py-5 h-full">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">
              Signal Timeline
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              {rel.signals.length} relocation signal{rel.signals.length !== 1 ? 's' : ''} detected · first seen {rel.days_since_first_signal}d ago
            </p>
            <SignalFeed signals={rel.signals} />
          </div>
        </div>

        {/* Conversation starter — 2/5 */}
        <div className="col-span-2">
          <ConversationStarterCard starter={starter!} loading={loadingStarter} />
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-white rounded-xl border border-gray-100 px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Transaction History</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Last 90 days · signal transactions highlighted
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Relocation signal
            </span>
          </div>
        </div>
        <TransactionTable transactions={customer.transactions} limit={50} />
      </div>
    </div>
  )
}
