from pydantic import BaseModel
from typing import List, Optional
from datetime import date
from enum import Enum


class EventType(str, Enum):
    RELOCATION = "relocation"
    NEW_BABY = "new_baby"
    HOME_PURCHASE = "home_purchase"
    JOB_CHANGE = "job_change"
    FINANCIAL_STRESS = "financial_stress"
    MARRIAGE = "marriage"
    DIVORCE = "divorce"


class Severity(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class TransactionType(str, Enum):
    DEBIT = "debit"
    CREDIT = "credit"


class Transaction(BaseModel):
    id: str
    date: date
    merchant: str
    category: str
    amount: float
    transaction_type: TransactionType
    is_signal: bool = False


class LifeEvent(BaseModel):
    event_type: EventType
    confidence: float
    severity: Severity
    detected_date: date
    days_ago: int
    signals: List[str]
    signal_transactions: List[str]


class CustomerSummary(BaseModel):
    id: str
    name: str
    account_number: str
    age: int
    location: str
    relationship_manager: str
    life_event: Optional[LifeEvent]
    avg_monthly_spend: float
    account_tenure_years: int


class CustomerDetail(CustomerSummary):
    transactions: List[Transaction]


class RecommendedProduct(BaseModel):
    name: str
    rationale: str


class OutreachBrief(BaseModel):
    customer_id: str
    customer_name: str
    event_type: EventType
    event_label: str
    summary: str
    signal_transactions: List[Transaction]
    recommended_products: List[RecommendedProduct]
    talking_points: List[str]
    urgency_level: str
    urgency_rationale: str
    draft_subject: str
    draft_message: str
    generated_date: date
