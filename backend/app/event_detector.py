"""
Rule-based life event detector.

Analyzes a customer's transaction history to surface and score life events.
The data generator pre-seeds events; this module validates and enriches them
by re-deriving signals directly from transaction patterns.
"""

from collections import Counter, defaultdict
from datetime import date, timedelta
from typing import List

from app.models import CustomerDetail, EventType, Transaction, TransactionType

RECENT_WINDOW = 45  # days to look back for event signals

SIGNAL_CATEGORIES = {
    EventType.RELOCATION:       {"Moving & Storage", "Furniture"},
    EventType.NEW_BABY:         {"Baby & Kids", "Medical"},
    EventType.HOME_PURCHASE:    {"Real Estate", "Home Improvement"},
    EventType.JOB_CHANGE:       {"Professional"},
    EventType.FINANCIAL_STRESS: {"Bank Fee", "Payday Loan"},
    EventType.MARRIAGE:         {"Wedding", "Jewelry"},
    EventType.DIVORCE:          {"Legal", "Housing"},
}

SIGNAL_KEYWORDS = {
    EventType.RELOCATION: [
        "u-haul", "pods", "storage", "moving", "penske",
        "ikea", "wayfair", "ashley furniture",
        "new acct", "new service", "new install",
    ],
    EventType.NEW_BABY: [
        "buy buy baby", "carter", "pottery barn kids",
        "ob/gyn", "prenatal", "pediatric", "maternity", "baby registry",
    ],
    EventType.HOME_PURCHASE: [
        "title insurance", "home inspection", "escrow",
        "home depot", "lowe's", "floor & decor", "ace hardware",
        "wire transfer",
    ],
    EventType.JOB_CHANGE: [
        "linkedin premium", "ziprecruiter", "career coach",
        "men's wearhouse", "j.crew",
    ],
    EventType.FINANCIAL_STRESS: [
        "overdraft", "nsf fee", "late fee", "late payment fee",
        "cash express", "check into cash", "advance america",
    ],
    EventType.MARRIAGE: [
        "ballroom", "david's bridal", "kay jewelers", "zola",
        "wedding", "paradise island", "honeymoon",
    ],
    EventType.DIVORCE: [
        "family law", "mediation", "legalzoom",
        "apartment deposit", "separation",
    ],
}


def _recent(txns: List[Transaction], today: date = date.today()) -> List[Transaction]:
    cutoff = today - timedelta(days=RECENT_WINDOW)
    return [t for t in txns if t.date >= cutoff]


def _merchant_matches(merchant: str, keywords: List[str]) -> bool:
    ml = merchant.lower()
    return any(kw in ml for kw in keywords)


def detect_signals(customer: CustomerDetail) -> dict[EventType, List[Transaction]]:
    """Return a mapping of event type → matching signal transactions."""
    today = date.today()
    recent = _recent(customer.transactions, today)
    hits: dict[EventType, List[Transaction]] = defaultdict(list)

    for txn in recent:
        for event_type, keywords in SIGNAL_KEYWORDS.items():
            if _merchant_matches(txn.merchant, keywords):
                hits[event_type].append(txn)
            elif txn.category in SIGNAL_CATEGORIES.get(event_type, set()):
                hits[event_type].append(txn)

    # Financial stress: also flag if 3+ bank fees of any kind
    fee_txns = [t for t in recent if "fee" in t.merchant.lower() or t.category == "Bank Fee"]
    if len(fee_txns) >= 3:
        for ft in fee_txns:
            if ft not in hits[EventType.FINANCIAL_STRESS]:
                hits[EventType.FINANCIAL_STRESS].append(ft)

    # Financial stress: flag spending drop > 40% in last 30 days vs prior 30 days
    last_30_start = today - timedelta(days=30)
    prior_30_start = today - timedelta(days=60)
    last_30_spend = sum(
        t.amount for t in customer.transactions
        if t.date >= last_30_start and t.transaction_type == TransactionType.DEBIT
    )
    prior_30_spend = sum(
        t.amount for t in customer.transactions
        if prior_30_start <= t.date < last_30_start and t.transaction_type == TransactionType.DEBIT
    )
    if prior_30_spend > 0 and last_30_spend < prior_30_spend * 0.6:
        hits[EventType.FINANCIAL_STRESS]  # ensure key exists (already a defaultdict)

    return dict(hits)


def score_event(customer: CustomerDetail) -> float:
    """Re-derive a confidence score from raw signal count (for validation)."""
    if not customer.life_event:
        return 0.0
    signals = detect_signals(customer)
    event_hits = signals.get(customer.life_event.event_type, [])
    # Scale: 1 hit = 0.55, each additional hit adds ~0.07, max ~0.97
    base = 0.55 + min(len(event_hits) * 0.07, 0.42)
    return round(min(base, 0.98), 2)
