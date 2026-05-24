from pydantic import BaseModel
from typing import List, Optional
from datetime import date
from enum import Enum


class TransactionType(str, Enum):
    DEBIT = "debit"
    CREDIT = "credit"


class RelocationStatus(str, Enum):
    NEW = "new"
    ACTIVE = "active"
    CONTACTED = "contacted"
    RESOLVED = "resolved"


class Transaction(BaseModel):
    id: str
    date: date
    merchant: str
    category: str
    amount: float
    transaction_type: TransactionType
    is_signal: bool = False


class RelocationSignal(BaseModel):
    id: str
    signal_type: str       # TRUCK_RENTAL | STORAGE_UNIT | ADDRESS_CHANGE | etc.
    label: str             # human-readable category name
    merchant: str
    detected_date: date
    amount: float
    description: str       # one-line explanation shown in signal feed


class RelocationEvent(BaseModel):
    confidence: float
    churn_risk: float
    status: RelocationStatus
    origin_city: str
    destination_city: str
    first_signal_date: date
    days_since_first_signal: int
    signals: List[RelocationSignal]


class CustomerSummary(BaseModel):
    id: str
    name: str
    account_number: str
    age: int
    relationship_manager: str
    relocation: RelocationEvent
    avg_monthly_spend: float
    account_tenure_years: int


class CustomerDetail(CustomerSummary):
    transactions: List[Transaction]


class ConversationStarter(BaseModel):
    customer_id: str
    customer_name: str
    tier: str                      # "early" | "active" | "deep" | "post"
    opener: str                    # 2–3 sentence personalized opening
    key_context: List[str]         # 3 bullet points for the RM
    suggested_products: List[str]
    churn_risk_explanation: str
    call_guide: str                # a short script for the call
    generated_date: date


class StatusUpdate(BaseModel):
    status: RelocationStatus
