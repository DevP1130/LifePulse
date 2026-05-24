"""
Synthetic transaction data generator for LifePulse — Relocation Intelligence.

Produces 12 customers, each mid-relocation, with realistic 90-day transaction
histories and embedded relocation signal patterns (trucks, storage, USPS,
new-city utilities, furniture, temp housing, new-market merchants).
"""

import uuid
import random
from datetime import date, timedelta
from typing import List, Tuple

from app.models import (
    CustomerDetail,
    RelocationEvent,
    RelocationSignal,
    RelocationStatus,
    Transaction,
    TransactionType,
)

_RNG = random.Random(42)
TODAY = date(2026, 5, 24)
HISTORY_DAYS = 90


# ── New-city utility companies (realistic, city-specific) ─────────────────────

UTILITIES_BY_CITY: dict[str, List[Tuple[str, str]]] = {
    "Austin, TX":      [("CPS Energy — New Account",         "Utilities"), ("Atmos Energy — New Service", "Utilities")],
    "Charlotte, NC":   [("Duke Energy Progress — New Acct",  "Utilities"), ("Piedmont Natural Gas",        "Utilities")],
    "Denver, CO":      [("Xcel Energy — New Account",        "Utilities"), ("Black Hills Energy",          "Utilities")],
    "Miami, FL":       [("FPL — Florida Power & Light",      "Utilities"), ("TECO Peoples Gas — New Acct", "Utilities")],
    "Nashville, TN":   [("NES — Nashville Electric",         "Utilities"), ("Nashville Gas Co — New Acct", "Utilities")],
    "Portland, OR":    [("Portland General Electric",        "Utilities"), ("NW Natural Gas — New Acct",   "Utilities")],
    "Chicago, IL":     [("ComEd — New Account",              "Utilities"), ("Peoples Gas — New Account",   "Utilities")],
    "Phoenix, AZ":     [("APS — Arizona Public Service",     "Utilities"), ("Southwest Gas — New Acct",    "Utilities")],
    "Dallas, TX":      [("Oncor Electric — New Account",     "Utilities"), ("Atmos Energy — New Service",  "Utilities")],
    "Las Vegas, NV":   [("NV Energy — New Account",          "Utilities"), ("Southwest Gas — New Acct",    "Utilities")],
    "Tampa, FL":       [("TECO Energy — Tampa Electric",     "Utilities"), ("Peoples Gas — New Account",   "Utilities")],
    "Scottsdale, AZ":  [("APS — Arizona Public Service",     "Utilities"), ("Southwest Gas — New Acct",    "Utilities")],
}

# ── Signal catalog: (signal_type, label, merchant, lo_amt, hi_amt, description_tmpl) ──

SIGNAL_TEMPLATES: dict[str, Tuple[str, str, float, float, str]] = {
    "TRUCK_RENTAL": (
        "Moving Truck Rental",
        "Moving Truck",
        650, 1_450,
        "Moving truck rental — strong indicator of imminent or in-progress relocation",
    ),
    "STORAGE_UNIT": (
        "Storage Unit",
        "Storage Rental",
        119, 229,
        "Storage unit rental — suggests transitional housing or staging for a move",
    ),
    "ADDRESS_CHANGE": (
        "Address Change Service",
        "Mail Forwarding",
        1.10, 1.10,
        "USPS mail forwarding activated — official address change request confirmed",
    ),
    "SHIPPING_SERVICE": (
        "Packing & Shipping",
        "Shipping Service",
        38, 140,
        "UPS/FedEx bulk shipment — multiple packages forwarded to new address",
    ),
    "NEW_UTILITY": (
        "New Utility Setup",
        "New-City Utility",
        45, 165,
        "New utility account activated in destination city — near-certain relocation signal",
    ),
    "TEMP_HOUSING": (
        "Temporary Housing",
        "Temp Housing",
        680, 2_400,
        "Extended-stay hotel or short-term rental — indicates active relocation in progress",
    ),
    "FURNITURE": (
        "Furniture & Home Goods",
        "Furniture",
        240, 2_100,
        "Significant home furnishing purchase — consistent with setting up a new residence",
    ),
    "NEW_CITY_MERCHANT": (
        "New-Market Activity",
        "New-Market Txn",
        12, 180,
        "Transaction at merchant located in destination market — geographic shift confirmed",
    ),
}

# Merchants for each signal type
SIGNAL_MERCHANTS: dict[str, List[str]] = {
    "TRUCK_RENTAL":       ["U-Haul Truck Rental", "Penske Truck Rental", "Budget Truck Rental", "PODS Moving & Storage"],
    "STORAGE_UNIT":       ["Public Storage", "CubeSmart Self Storage", "Extra Space Storage", "Life Storage"],
    "ADDRESS_CHANGE":     ["USPS.com — Address Change", "USPS — Priority Mail Forward"],
    "SHIPPING_SERVICE":   ["The UPS Store", "FedEx Office Print & Ship", "USPS Priority Mail"],
    "NEW_UTILITY":        [],  # populated per-customer from UTILITIES_BY_CITY
    "TEMP_HOUSING":       ["Extended Stay America", "Marriott Residence Inn", "Airbnb — Austin TX", "Hilton Garden Inn"],
    "FURNITURE":          ["IKEA", "Wayfair", "West Elm", "HomeGoods", "Ashley HomeStore", "Crate & Barrel"],
    "NEW_CITY_MERCHANT":  [],  # will use city-specific gas/grocery in build logic
}

# ── Everyday merchant catalog ─────────────────────────────────────────────────
# (name, category, lo, hi, weekly_freq)

EVERYDAY: List[Tuple[str, str, float, float, float]] = [
    ("Whole Foods Market",     "Grocery",      45,  130, 1.5),
    ("Trader Joe's",           "Grocery",      35,   90, 1.0),
    ("Chipotle Mexican Grill", "Restaurant",   12,   18, 1.2),
    ("Starbucks",              "Restaurant",    5,   14, 2.5),
    ("DoorDash",               "Restaurant",   22,   52, 0.9),
    ("Shell",                  "Gas & Auto",   44,   82, 1.0),
    ("Amazon",                 "Retail",       25,  200, 1.4),
    ("Target",                 "Retail",       30,  120, 0.8),
    ("CVS Pharmacy",           "Pharmacy",     12,   58, 0.6),
]

MONTHLY_SUBS: List[Tuple[str, str, float]] = [
    ("Netflix",          "Streaming", 15.49),
    ("Spotify",          "Streaming",  9.99),
    ("Verizon Wireless", "Utilities", 85.00),
    ("Planet Fitness",   "Health",    10.00),
]

MONTHLY_UTILITIES: List[Tuple[str, str, float, float]] = [
    ("ConEdison Electric", "Utilities",  80, 175),
    ("National Grid Gas",  "Utilities",  38, 115),
    ("Comcast Xfinity",    "Utilities",  82, 118),
]

SALARY_EMPLOYERS = [
    "Capital One Financial Corp.",
    "Deloitte & Touche LLP",
    "Amazon Web Services",
    "Google LLC",
    "JPMorgan Chase Bank",
    "Salesforce Inc.",
    "Microsoft Corporation",
    "Kaiser Permanente",
]

# ── Customer seed definitions ─────────────────────────────────────────────────

CUSTOMER_SEEDS = [
    {
        "name": "Alice Chen",
        "age": 31,
        "origin_city": "San Francisco, CA",
        "destination_city": "Austin, TX",
        "rm": "Morgan Hayes",
        "confidence": 0.91,
        "churn_risk": 0.76,
        "status": RelocationStatus.ACTIVE,
        "tenure_years": 3,
        "days_since_first_signal": 12,
        "signal_types": ["TRUCK_RENTAL", "STORAGE_UNIT", "ADDRESS_CHANGE", "NEW_UTILITY", "FURNITURE"],
    },
    {
        "name": "Marcus Johnson",
        "age": 29,
        "origin_city": "Atlanta, GA",
        "destination_city": "Charlotte, NC",
        "rm": "Chris Delano",
        "confidence": 0.72,
        "churn_risk": 0.58,
        "status": RelocationStatus.NEW,
        "tenure_years": 2,
        "days_since_first_signal": 8,
        "signal_types": ["TRUCK_RENTAL", "STORAGE_UNIT", "SHIPPING_SERVICE"],
    },
    {
        "name": "Sarah Williams",
        "age": 34,
        "origin_city": "Austin, TX",
        "destination_city": "Denver, CO",
        "rm": "Morgan Hayes",
        "confidence": 0.64,
        "churn_risk": 0.44,
        "status": RelocationStatus.NEW,
        "tenure_years": 5,
        "days_since_first_signal": 3,
        "signal_types": ["TRUCK_RENTAL", "ADDRESS_CHANGE"],
    },
    {
        "name": "David Rodriguez",
        "age": 27,
        "origin_city": "New York, NY",
        "destination_city": "Miami, FL",
        "rm": "Taylor Brooks",
        "confidence": 0.89,
        "churn_risk": 0.34,
        "status": RelocationStatus.CONTACTED,
        "tenure_years": 1,
        "days_since_first_signal": 22,
        "signal_types": ["TRUCK_RENTAL", "STORAGE_UNIT", "ADDRESS_CHANGE", "NEW_UTILITY", "TEMP_HOUSING", "FURNITURE"],
    },
    {
        "name": "Emily Thompson",
        "age": 26,
        "origin_city": "Chicago, IL",
        "destination_city": "Nashville, TN",
        "rm": "Chris Delano",
        "confidence": 0.83,
        "churn_risk": 0.71,
        "status": RelocationStatus.ACTIVE,
        "tenure_years": 2,
        "days_since_first_signal": 15,
        "signal_types": ["TRUCK_RENTAL", "STORAGE_UNIT", "SHIPPING_SERVICE", "NEW_UTILITY", "FURNITURE"],
    },
    {
        "name": "James Park",
        "age": 32,
        "origin_city": "Seattle, WA",
        "destination_city": "Portland, OR",
        "rm": "Taylor Brooks",
        "confidence": 0.58,
        "churn_risk": 0.38,
        "status": RelocationStatus.NEW,
        "tenure_years": 4,
        "days_since_first_signal": 5,
        "signal_types": ["STORAGE_UNIT", "SHIPPING_SERVICE"],
    },
    {
        "name": "Priya Patel",
        "age": 38,
        "origin_city": "Boston, MA",
        "destination_city": "Chicago, IL",
        "rm": "Morgan Hayes",
        "confidence": 0.71,
        "churn_risk": 0.52,
        "status": RelocationStatus.NEW,
        "tenure_years": 6,
        "days_since_first_signal": 7,
        "signal_types": ["TRUCK_RENTAL", "ADDRESS_CHANGE", "STORAGE_UNIT"],
    },
    {
        "name": "Robert Kim",
        "age": 44,
        "origin_city": "Denver, CO",
        "destination_city": "Phoenix, AZ",
        "rm": "Jordan Mitchell",
        "confidence": 0.94,
        "churn_risk": 0.28,
        "status": RelocationStatus.CONTACTED,
        "tenure_years": 8,
        "days_since_first_signal": 30,
        "signal_types": ["TRUCK_RENTAL", "STORAGE_UNIT", "ADDRESS_CHANGE", "NEW_UTILITY", "TEMP_HOUSING", "FURNITURE", "NEW_CITY_MERCHANT"],
    },
    {
        "name": "Jennifer Adams",
        "age": 33,
        "origin_city": "Houston, TX",
        "destination_city": "Dallas, TX",
        "rm": "Jordan Mitchell",
        "confidence": 0.78,
        "churn_risk": 0.64,
        "status": RelocationStatus.ACTIVE,
        "tenure_years": 4,
        "days_since_first_signal": 18,
        "signal_types": ["TRUCK_RENTAL", "STORAGE_UNIT", "NEW_UTILITY", "FURNITURE"],
    },
    {
        "name": "Michael Torres",
        "age": 41,
        "origin_city": "Los Angeles, CA",
        "destination_city": "Las Vegas, NV",
        "rm": "Taylor Brooks",
        "confidence": 0.86,
        "churn_risk": 0.67,
        "status": RelocationStatus.ACTIVE,
        "tenure_years": 7,
        "days_since_first_signal": 25,
        "signal_types": ["TRUCK_RENTAL", "STORAGE_UNIT", "ADDRESS_CHANGE", "NEW_UTILITY", "TEMP_HOUSING", "FURNITURE"],
    },
    {
        "name": "Lisa Zhang",
        "age": 35,
        "origin_city": "Miami, FL",
        "destination_city": "Tampa, FL",
        "rm": "Chris Delano",
        "confidence": 0.67,
        "churn_risk": 0.49,
        "status": RelocationStatus.NEW,
        "tenure_years": 3,
        "days_since_first_signal": 10,
        "signal_types": ["TRUCK_RENTAL", "STORAGE_UNIT", "SHIPPING_SERVICE"],
    },
    {
        "name": "Daniel Brown",
        "age": 48,
        "origin_city": "Phoenix, AZ",
        "destination_city": "Scottsdale, AZ",
        "rm": "Jordan Mitchell",
        "confidence": 0.92,
        "churn_risk": 0.12,
        "status": RelocationStatus.RESOLVED,
        "tenure_years": 11,
        "days_since_first_signal": 35,
        "signal_types": ["TRUCK_RENTAL", "STORAGE_UNIT", "ADDRESS_CHANGE", "NEW_UTILITY", "FURNITURE", "NEW_CITY_MERCHANT"],
    },
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _r2(v: float) -> float:
    return round(v, 2)


def _acct(name: str) -> str:
    h = sum(ord(c) * (i + 31) for i, c in enumerate(name)) & 0xFFFFFFFF
    return f"****{abs(h) % 10_000:04d}"


def _new_city_merchant(dest: str) -> Tuple[str, str]:
    city = dest.split(",")[0]
    options = [
        (f"Shell — {city}", "Gas & Auto"),
        (f"Kroger — {city}", "Grocery"),
        (f"HEB — {city}", "Grocery"),
        (f"Safeway — {city}", "Grocery"),
        (f"Walgreens — {city}", "Pharmacy"),
    ]
    return _RNG.choice(options)


def _build_signals(
    seed: dict,
    history_start: date,
) -> List[RelocationSignal]:
    signal_types = seed["signal_types"]
    days_first = seed["days_since_first_signal"]
    dest = seed["destination_city"]
    first_date = TODAY - timedelta(days=days_first)
    n = len(signal_types)

    signals: List[RelocationSignal] = []
    for idx, stype in enumerate(signal_types):
        # spread signals from first_date → yesterday
        day_offset = int((idx / max(n - 1, 1)) * (days_first - 1))
        sig_date = first_date + timedelta(days=day_offset)
        if sig_date >= TODAY:
            sig_date = TODAY - timedelta(days=1)

        label, cat_label, lo, hi, desc_tmpl = SIGNAL_TEMPLATES[stype]

        if stype == "NEW_UTILITY":
            city_utils = UTILITIES_BY_CITY.get(dest, [("New Utility Provider", "Utilities")])
            merchant, _ = _RNG.choice(city_utils)
            desc = f"New utility account activated in {dest} — near-certain relocation signal"
        elif stype == "NEW_CITY_MERCHANT":
            merchant, _ = _new_city_merchant(dest)
            desc = f"Transaction at merchant located in {dest} market — geographic shift detected"
        elif stype == "ADDRESS_CHANGE":
            merchant = _RNG.choice(SIGNAL_MERCHANTS["ADDRESS_CHANGE"])
            desc = desc_tmpl
            lo = hi = 1.10
        else:
            merchant = _RNG.choice(SIGNAL_MERCHANTS[stype])
            desc = desc_tmpl

        amount = _r2(_RNG.uniform(lo, hi))
        signals.append(RelocationSignal(
            id=str(uuid.uuid4()),
            signal_type=stype,
            label=label,
            merchant=merchant,
            detected_date=sig_date,
            amount=amount,
            description=desc,
        ))

    return sorted(signals, key=lambda s: s.detected_date)


def _build_transactions(
    seed: dict,
    signals: List[RelocationSignal],
) -> List[Transaction]:
    history_start = TODAY - timedelta(days=HISTORY_DAYS)
    txns: List[Transaction] = []
    current = history_start
    subs_added: set[str] = set()

    while current <= TODAY:
        # Bi-monthly salary
        if current.day in (1, 15):
            employer = _RNG.choice(SALARY_EMPLOYERS)
            txns.append(Transaction(
                id=str(uuid.uuid4()),
                date=current,
                merchant=f"Direct Deposit — {employer}",
                category="Income",
                amount=_r2(_RNG.uniform(2_600, 4_200)),
                transaction_type=TransactionType.CREDIT,
            ))

        # Monthly utilities (5th–9th)
        if 5 <= current.day <= 9:
            for name, cat, lo, hi in MONTHLY_UTILITIES:
                key = f"{name}-{current.month}-{current.year}"
                if key not in subs_added:
                    txns.append(Transaction(
                        id=str(uuid.uuid4()),
                        date=current,
                        merchant=name,
                        category=cat,
                        amount=_r2(_RNG.uniform(lo, hi)),
                        transaction_type=TransactionType.DEBIT,
                    ))
                    subs_added.add(key)

        # Monthly subscriptions (8th–12th)
        if 8 <= current.day <= 12:
            for name, cat, price in MONTHLY_SUBS:
                key = f"{name}-{current.month}-{current.year}"
                if key not in subs_added:
                    txns.append(Transaction(
                        id=str(uuid.uuid4()),
                        date=current,
                        merchant=name,
                        category=cat,
                        amount=price,
                        transaction_type=TransactionType.DEBIT,
                    ))
                    subs_added.add(key)

        # Daily variable spend
        for merchant, cat, lo, hi, wfreq in EVERYDAY:
            if _RNG.random() < wfreq / 7.0:
                txns.append(Transaction(
                    id=str(uuid.uuid4()),
                    date=current,
                    merchant=merchant,
                    category=cat,
                    amount=_r2(_RNG.uniform(lo, hi)),
                    transaction_type=TransactionType.DEBIT,
                ))

        current += timedelta(days=1)

    # Add signal transactions (flagged)
    for sig in signals:
        txns.append(Transaction(
            id=str(uuid.uuid4()),
            date=sig.detected_date,
            merchant=sig.merchant,
            category=sig.label,
            amount=sig.amount,
            transaction_type=TransactionType.DEBIT,
            is_signal=True,
        ))

    return sorted(txns, key=lambda t: t.date, reverse=True)


# ── Public API ────────────────────────────────────────────────────────────────

def _build_customer(seed: dict) -> CustomerDetail:
    signals = _build_signals(seed, TODAY - timedelta(days=HISTORY_DAYS))
    transactions = _build_transactions(seed, signals)

    debit_total = sum(t.amount for t in transactions if t.transaction_type == TransactionType.DEBIT)
    avg_monthly = _r2(debit_total / 3)

    first_signal_date = signals[0].detected_date if signals else TODAY

    relocation = RelocationEvent(
        confidence=seed["confidence"],
        churn_risk=seed["churn_risk"],
        status=seed["status"],
        origin_city=seed["origin_city"],
        destination_city=seed["destination_city"],
        first_signal_date=first_signal_date,
        days_since_first_signal=seed["days_since_first_signal"],
        signals=signals,
    )

    return CustomerDetail(
        id=str(uuid.uuid5(uuid.NAMESPACE_DNS, seed["name"])),
        name=seed["name"],
        account_number=_acct(seed["name"]),
        age=seed["age"],
        relationship_manager=seed["rm"],
        relocation=relocation,
        avg_monthly_spend=avg_monthly,
        account_tenure_years=seed["tenure_years"],
        transactions=transactions,
    )


_CUSTOMERS: List[CustomerDetail] = [_build_customer(s) for s in CUSTOMER_SEEDS]

# In-memory status store so PATCH updates survive within a process session
_STATUS_OVERRIDES: dict[str, RelocationStatus] = {}


def get_all_customers() -> List[CustomerDetail]:
    result = []
    for c in _CUSTOMERS:
        if c.id in _STATUS_OVERRIDES:
            updated = c.model_copy(deep=True)
            updated.relocation.status = _STATUS_OVERRIDES[c.id]
            result.append(updated)
        else:
            result.append(c)
    return result


def get_customer_by_id(customer_id: str) -> CustomerDetail | None:
    base = next((c for c in _CUSTOMERS if c.id == customer_id), None)
    if base is None:
        return None
    if customer_id in _STATUS_OVERRIDES:
        updated = base.model_copy(deep=True)
        updated.relocation.status = _STATUS_OVERRIDES[customer_id]
        return updated
    return base


def update_customer_status(customer_id: str, status: RelocationStatus) -> bool:
    if not any(c.id == customer_id for c in _CUSTOMERS):
        return False
    _STATUS_OVERRIDES[customer_id] = status
    return True
