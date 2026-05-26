from pydantic import BaseModel
from typing import List, Optional
from datetime import date
from enum import Enum


class TransactionType(str, Enum):
    DEBIT = "debit"
    CREDIT = "credit"


class EventStatus(str, Enum):
    NEW = "new"
    ACTIVE = "active"
    CONTACTED = "contacted"
    RESOLVED = "resolved"


class LifeEventType(str, Enum):
    RELOCATION = "relocation"
    NEW_BABY = "new_baby"
    MARRIAGE = "marriage"
    HOME_PURCHASE = "home_purchase"
    JOB_CHANGE = "job_change"
    RETIREMENT = "retirement"


class Transaction(BaseModel):
    id: str
    date: date
    merchant: str
    category: str
    amount: float
    transaction_type: TransactionType
    is_signal: bool = False


class EventSignal(BaseModel):
    id: str
    signal_type: str
    label: str
    merchant: str
    detected_date: date
    amount: float
    description: str


class LifeEvent(BaseModel):
    event_type: LifeEventType
    event_summary: str
    confidence: float
    churn_risk: float
    status: EventStatus
    first_signal_date: date
    days_since_first_signal: int
    signals: List[EventSignal]
    # Relocation-only fields
    origin_city: Optional[str] = None
    destination_city: Optional[str] = None


class CustomerSummary(BaseModel):
    id: str
    name: str
    account_number: str
    age: int
    relationship_manager: str
    life_event: LifeEvent
    avg_monthly_spend: float
    account_tenure_years: int


class CustomerDetail(CustomerSummary):
    transactions: List[Transaction]


class ConversationStarter(BaseModel):
    customer_id: str
    customer_name: str
    tier: str                       # "early" | "active" | "deep" | "post"
    opener: str
    key_context: List[str]          # 3 bullet points for the RM
    suggested_products: List[str]
    churn_risk_explanation: str
    call_guide: str
    generated_date: date


class StatusUpdate(BaseModel):
    status: EventStatus
