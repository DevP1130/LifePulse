export type EventStatus = 'new' | 'active' | 'contacted' | 'resolved'
export type TransactionType = 'debit' | 'credit'
export type LifeEventType = 'relocation' | 'new_baby' | 'marriage' | 'home_purchase' | 'job_change' | 'retirement'

export interface Transaction {
  id: string
  date: string
  merchant: string
  category: string
  amount: number
  transaction_type: TransactionType
  is_signal: boolean
}

export interface EventSignal {
  id: string
  signal_type: string
  label: string
  merchant: string
  detected_date: string
  amount: number
  description: string
}

export interface LifeEvent {
  event_type: LifeEventType
  event_summary: string
  confidence: number
  churn_risk: number
  status: EventStatus
  first_signal_date: string
  days_since_first_signal: number
  signals: EventSignal[]
  origin_city?: string
  destination_city?: string
}

export interface CustomerSummary {
  id: string
  name: string
  account_number: string
  age: number
  relationship_manager: string
  life_event: LifeEvent
  avg_monthly_spend: number
  account_tenure_years: number
}

export interface CustomerDetail extends CustomerSummary {
  transactions: Transaction[]
}

export interface ConversationStarter {
  customer_id: string
  customer_name: string
  tier: 'early' | 'active' | 'deep' | 'post'
  opener: string
  key_context: string[]
  suggested_products: string[]
  churn_risk_explanation: string
  call_guide: string
  generated_date: string
}
