export type RelocationStatus = 'new' | 'active' | 'contacted' | 'resolved'
export type TransactionType = 'debit' | 'credit'

export interface Transaction {
  id: string
  date: string
  merchant: string
  category: string
  amount: number
  transaction_type: TransactionType
  is_signal: boolean
}

export interface RelocationSignal {
  id: string
  signal_type: string
  label: string
  merchant: string
  detected_date: string
  amount: number
  description: string
}

export interface RelocationEvent {
  confidence: number
  churn_risk: number
  status: RelocationStatus
  origin_city: string
  destination_city: string
  first_signal_date: string
  days_since_first_signal: number
  signals: RelocationSignal[]
}

export interface CustomerSummary {
  id: string
  name: string
  account_number: string
  age: number
  relationship_manager: string
  relocation: RelocationEvent
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
