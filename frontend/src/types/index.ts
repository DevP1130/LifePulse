export type EventType =
  | 'relocation'
  | 'new_baby'
  | 'home_purchase'
  | 'job_change'
  | 'financial_stress'
  | 'marriage'
  | 'divorce'

export type Severity = 'high' | 'medium' | 'low'

export interface LifeEvent {
  event_type: EventType
  confidence: number
  severity: Severity
  detected_date: string
  days_ago: number
  signals: string[]
  signal_transactions: string[]
}

export interface CustomerSummary {
  id: string
  name: string
  account_number: string
  age: number
  location: string
  relationship_manager: string
  life_event: LifeEvent | null
  avg_monthly_spend: number
  account_tenure_years: number
}

export interface Transaction {
  id: string
  date: string
  merchant: string
  category: string
  amount: number
  transaction_type: 'debit' | 'credit'
  is_signal: boolean
}

export interface RecommendedProduct {
  name: string
  rationale: string
}

export interface OutreachBrief {
  customer_id: string
  customer_name: string
  event_type: EventType
  event_label: string
  summary: string
  signal_transactions: Transaction[]
  recommended_products: RecommendedProduct[]
  talking_points: string[]
  urgency_level: string
  urgency_rationale: string
  draft_subject: string
  draft_message: string
  generated_date: string
}
