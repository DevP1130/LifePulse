"""
Synthetic transaction data generator for LifePulse.

Generates 90 days of realistic customer transaction histories with
life-event signals embedded in the most recent 30-45 days.
"""

import random
import uuid
from datetime import date, timedelta
from typing import List, Tuple

from app.models import (
    CustomerDetail,
    EventType,
    LifeEvent,
    Severity,
    Transaction,
    TransactionType,
)

# Fixed seed for reproducible demo data
_RNG = random.Random(42)

TODAY = date(2026, 5, 24)
HISTORY_DAYS = 90
EVENT_WINDOW_DAYS = 38  # how far back events start appearing


# ── Merchant catalogs ─────────────────────────────────────────────────────────
# Each entry: (merchant_name, category, min_amount, max_amount, weekly_frequency)

EVERYDAY: List[Tuple[str, str, float, float, float]] = [
    ("Whole Foods Market",    "Grocery",      45,  130, 1.5),
    ("Trader Joe's",          "Grocery",      35,   90, 1.0),
    ("Safeway",               "Grocery",      40,  110, 0.8),
    ("Chipotle Mexican Grill","Restaurant",   12,   18, 1.2),
    ("Starbucks",             "Restaurant",    5,   14, 2.5),
    ("Panera Bread",          "Restaurant",   11,   20, 0.8),
    ("DoorDash",              "Restaurant",   25,   55, 1.0),
    ("Uber Eats",             "Restaurant",   22,   50, 0.7),
    ("Shell",                 "Gas & Auto",   45,   85, 1.0),
    ("Chevron",               "Gas & Auto",   44,   82, 0.7),
    ("Amazon",                "Retail",       25,  200, 1.5),
    ("Target",                "Retail",       30,  120, 0.8),
    ("CVS Pharmacy",          "Pharmacy",     12,   60, 0.7),
    ("Walgreens",             "Pharmacy",     10,   55, 0.5),
]

# Monthly recurring charges — generated once per month
MONTHLY_SUBSCRIPTIONS: List[Tuple[str, str, float]] = [
    ("Netflix",            "Streaming",  15.49),
    ("Spotify",            "Streaming",   9.99),
    ("Verizon Wireless",   "Utilities",  85.00),
    ("Planet Fitness",     "Health",     10.00),
]

MONTHLY_UTILITIES: List[Tuple[str, str, float, float]] = [
    ("ConEdison Electric", "Utilities",  80, 180),
    ("National Grid Gas",  "Utilities",  40, 120),
    ("Comcast Xfinity",    "Utilities",  85, 120),
]

SALARY_EMPLOYERS = [
    "Capital One Financial Corp.",
    "Deloitte & Touche LLP",
    "Amazon Web Services",
    "Google LLC",
    "JPMorgan Chase Bank",
    "Salesforce Inc.",
    "Microsoft Corporation",
    "Northrop Grumman",
    "Kaiser Permanente",
    "Lockheed Martin Corp.",
]

# ── Event-specific merchant signals ──────────────────────────────────────────
# Each entry: (merchant_name, category, min_amount, max_amount)

EVENT_SIGNALS: dict[EventType, List[Tuple[str, str, float, float]]] = {
    EventType.RELOCATION: [
        ("U-Haul Truck Rental",          "Moving & Storage",  650, 1_400),
        ("PODS Moving & Storage",         "Moving & Storage",  800, 1_600),
        ("Public Storage",                "Moving & Storage",  120,   220),
        ("IKEA",                          "Furniture",         350, 1_800),
        ("Wayfair",                       "Furniture",         200, 1_200),
        ("Ashley Furniture",              "Furniture",         400, 2_000),
        ("ConEdison Electric - New Acct", "Utilities",          90,   150),
        ("National Grid - New Service",   "Utilities",          50,   110),
        ("Comcast Xfinity - New Install", "Utilities",          85,   150),
    ],
    EventType.NEW_BABY: [
        ("Buy Buy Baby",             "Baby & Kids",   250,   800),
        ("Carter's",                 "Baby & Kids",    80,   250),
        ("Pottery Barn Kids",        "Baby & Kids",   350,   900),
        ("OB/GYN Specialists",       "Medical",       200,   500),
        ("Prenatal Care Center",     "Medical",       150,   400),
        ("Pediatric Associates",     "Medical",        80,   200),
        ("Motherhood Maternity",     "Baby & Kids",   100,   350),
        ("Amazon Baby Registry",     "Baby & Kids",   200,   600),
    ],
    EventType.HOME_PURCHASE: [
        ("Title Insurance Co.",          "Real Estate",   900, 1_800),
        ("Home Inspection Services LLC", "Real Estate",   400,   650),
        ("Escrow Services Inc.",         "Real Estate",   500, 1_200),
        ("Home Depot",                   "Home Improvement", 150,   800),
        ("Lowe's Home Improvement",      "Home Improvement", 120,   600),
        ("Floor & Decor",                "Home Improvement", 200, 1_000),
        ("Ace Hardware",                 "Home Improvement",  40,   200),
    ],
    EventType.JOB_CHANGE: [
        ("LinkedIn Premium",          "Professional",   39.99,  39.99),
        ("ZipRecruiter Pro",          "Professional",   24.99,  24.99),
        ("Men's Wearhouse",           "Clothing",       200,    600),
        ("J.Crew",                    "Clothing",       150,    400),
        ("Career Coach Services",     "Professional",   150,    300),
    ],
    EventType.FINANCIAL_STRESS: [
        ("Overdraft Fee - Capital One",   "Bank Fee",   35,  35),
        ("NSF Fee - Capital One",         "Bank Fee",   35,  35),
        ("Late Fee - Verizon Wireless",   "Bank Fee",   10,  10),
        ("Late Payment Fee - Electric",   "Bank Fee",   15,  15),
        ("ACE Cash Express",              "Payday Loan", 200, 500),
        ("Check Into Cash",               "Payday Loan", 150, 400),
    ],
    EventType.MARRIAGE: [
        ("The Grand Ballroom Events",    "Wedding",    2_500, 6_000),
        ("David's Bridal",               "Wedding",      800, 2_200),
        ("Kay Jewelers",                 "Jewelry",    2_500, 8_000),
        ("Zola Wedding Registry",        "Wedding",      200,   800),
        ("United Airlines",              "Travel",       400, 1_200),
        ("Paradise Island Resorts",      "Travel",     1_800, 4_500),
        ("Wedding Photography by JL",    "Wedding",    1_800, 3_500),
    ],
    EventType.DIVORCE: [
        ("Family Law Associates",    "Legal",    1_500, 4_500),
        ("Mediation Services LLC",   "Legal",      800, 2_000),
        ("LegalZoom",                "Legal",      200,   500),
        ("New Apartment Deposit",    "Housing",  1_500, 3_000),
        ("IKEA",                     "Furniture",  300, 1_200),
        ("U-Haul Truck Rental",      "Moving & Storage", 250, 650),
    ],
}

# ── Customer seed profiles ────────────────────────────────────────────────────

CUSTOMER_SEEDS = [
    {
        "name": "Alice Chen",
        "age": 31,
        "location": "San Francisco, CA",
        "rm": "Morgan Hayes",
        "event_type": EventType.RELOCATION,
        "confidence": 0.91,
        "salary": 6_800,
        "tenure_years": 3,
        "signal_indices": [0, 1, 2, 3, 7],   # which EVENT_SIGNALS entries to use
    },
    {
        "name": "Marcus Johnson",
        "age": 29,
        "location": "Atlanta, GA",
        "rm": "Chris Delano",
        "event_type": EventType.NEW_BABY,
        "confidence": 0.87,
        "salary": 5_400,
        "tenure_years": 2,
        "signal_indices": [0, 1, 3, 4, 5],
    },
    {
        "name": "Sarah Williams",
        "age": 34,
        "location": "Austin, TX",
        "rm": "Morgan Hayes",
        "event_type": EventType.HOME_PURCHASE,
        "confidence": 0.94,
        "salary": 8_200,
        "tenure_years": 5,
        "signal_indices": [0, 1, 2, 3, 4],
    },
    {
        "name": "David Rodriguez",
        "age": 27,
        "location": "New York, NY",
        "rm": "Taylor Brooks",
        "event_type": EventType.JOB_CHANGE,
        "confidence": 0.78,
        "salary": 7_100,
        "tenure_years": 1,
        "signal_indices": [0, 1, 2],
    },
    {
        "name": "Emily Thompson",
        "age": 26,
        "location": "Chicago, IL",
        "rm": "Chris Delano",
        "event_type": EventType.FINANCIAL_STRESS,
        "confidence": 0.85,
        "salary": 3_800,
        "tenure_years": 2,
        "signal_indices": [0, 1, 2, 3, 4],
    },
    {
        "name": "James Park",
        "age": 32,
        "location": "Seattle, WA",
        "rm": "Taylor Brooks",
        "event_type": EventType.MARRIAGE,
        "confidence": 0.96,
        "salary": 9_500,
        "tenure_years": 4,
        "signal_indices": [0, 1, 2, 3, 4, 5, 6],
    },
    {
        "name": "Priya Patel",
        "age": 38,
        "location": "Boston, MA",
        "rm": "Morgan Hayes",
        "event_type": EventType.DIVORCE,
        "confidence": 0.82,
        "salary": 7_600,
        "tenure_years": 6,
        "signal_indices": [0, 1, 2, 3],
    },
    {
        "name": "Robert Kim",
        "age": 44,
        "location": "Denver, CO",
        "rm": "Jordan Mitchell",
        "event_type": EventType.RELOCATION,
        "confidence": 0.89,
        "salary": 10_200,
        "tenure_years": 8,
        "signal_indices": [0, 2, 3, 6, 7],
    },
    {
        "name": "Jennifer Adams",
        "age": 33,
        "location": "Houston, TX",
        "rm": "Jordan Mitchell",
        "event_type": EventType.NEW_BABY,
        "confidence": 0.93,
        "salary": 6_300,
        "tenure_years": 4,
        "signal_indices": [0, 1, 2, 3, 4, 6],
    },
    {
        "name": "Michael Torres",
        "age": 41,
        "location": "Los Angeles, CA",
        "rm": "Taylor Brooks",
        "event_type": EventType.JOB_CHANGE,
        "confidence": 0.76,
        "salary": 8_800,
        "tenure_years": 7,
        "signal_indices": [0, 1, 3],
    },
    {
        "name": "Lisa Zhang",
        "age": 35,
        "location": "Miami, FL",
        "rm": "Chris Delano",
        "event_type": EventType.FINANCIAL_STRESS,
        "confidence": 0.92,
        "salary": 4_100,
        "tenure_years": 3,
        "signal_indices": [0, 1, 2, 3, 4, 5],
    },
    {
        "name": "Daniel Brown",
        "age": 48,
        "location": "Phoenix, AZ",
        "rm": "Jordan Mitchell",
        "event_type": EventType.HOME_PURCHASE,
        "confidence": 0.88,
        "salary": 12_400,
        "tenure_years": 11,
        "signal_indices": [0, 1, 2, 3, 5, 6],
    },
]


# ── Helper utilities ──────────────────────────────────────────────────────────

def _acct_number(seed_str: str) -> str:
    h = 0
    for ch in seed_str:
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    return f"****{abs(h) % 10000:04d}"


def _round2(v: float) -> float:
    return round(v, 2)


def _jitter(val: float, pct: float = 0.15) -> float:
    return _round2(val * (1 + _RNG.uniform(-pct, pct)))


def _pick_date(start: date, end: date) -> date:
    delta = (end - start).days
    return start + timedelta(days=_RNG.randint(0, max(delta, 0)))


def _severity(confidence: float) -> Severity:
    if confidence >= 0.88:
        return Severity.HIGH
    if confidence >= 0.78:
        return Severity.MEDIUM
    return Severity.LOW


# ── Core generation ───────────────────────────────────────────────────────────

def _generate_everyday_transactions(start: date, end: date, stress: bool = False) -> List[Transaction]:
    """Daily-frequency everyday spending for the given date range."""
    txns: List[Transaction] = []
    current = start

    # Spread subscriptions across month 1 on fixed days
    sub_day_offset = 0
    subs_added: set[str] = set()

    while current <= end:
        # Salary credit — on the 1st and 15th
        if current.day in (1, 15):
            employer = _RNG.choice(SALARY_EMPLOYERS)
            salary_amount = _RNG.uniform(2_400, 3_200) if not stress else _RNG.uniform(1_600, 2_000)
            txns.append(Transaction(
                id=str(uuid.uuid4()),
                date=current,
                merchant=f"Direct Deposit — {employer}",
                category="Income",
                amount=_round2(salary_amount),
                transaction_type=TransactionType.CREDIT,
            ))

        # Monthly recurring bills — around 5th–10th
        if 5 <= current.day <= 10:
            for name, cat, lo, hi in MONTHLY_UTILITIES:
                if f"{name}-{current.month}-{current.year}" not in subs_added:
                    amount = _round2(_RNG.uniform(lo, hi) * (0.7 if stress else 1.0))
                    txns.append(Transaction(
                        id=str(uuid.uuid4()),
                        date=current,
                        merchant=name,
                        category=cat,
                        amount=amount,
                        transaction_type=TransactionType.DEBIT,
                    ))
                    subs_added.add(f"{name}-{current.month}-{current.year}")

        # Monthly subscriptions — spread day 8–12
        if 8 <= current.day <= 12:
            for name, cat, price in MONTHLY_SUBSCRIPTIONS:
                if f"{name}-{current.month}-{current.year}" not in subs_added:
                    txns.append(Transaction(
                        id=str(uuid.uuid4()),
                        date=current,
                        merchant=name,
                        category=cat,
                        amount=price,
                        transaction_type=TransactionType.DEBIT,
                    ))
                    subs_added.add(f"{name}-{current.month}-{current.year}")

        # Variable daily spending
        spend_multiplier = 0.55 if stress else 1.0
        for merchant, cat, lo, hi, weekly_freq in EVERYDAY:
            daily_prob = weekly_freq / 7.0
            if _RNG.random() < daily_prob:
                amount = _round2(_RNG.uniform(lo, hi) * spend_multiplier)
                txns.append(Transaction(
                    id=str(uuid.uuid4()),
                    date=current,
                    merchant=merchant,
                    category=cat,
                    amount=amount,
                    transaction_type=TransactionType.DEBIT,
                ))

        current += timedelta(days=1)

    return txns


def _generate_event_transactions(
    event_type: EventType,
    signal_indices: List[int],
    event_window_start: date,
) -> List[Transaction]:
    """Generate the signal transactions that betray the life event."""
    candidates = EVENT_SIGNALS[event_type]
    signals: List[Transaction] = []

    # Spread signals over the event window
    for idx, si in enumerate(signal_indices):
        if si >= len(candidates):
            continue
        merchant, category, lo, hi = candidates[si]
        # Stagger over ~30-day window
        day_offset = int((idx / max(len(signal_indices) - 1, 1)) * (EVENT_WINDOW_DAYS - 4)) + 2
        txn_date = event_window_start + timedelta(days=day_offset)
        if txn_date > TODAY:
            txn_date = TODAY - timedelta(days=_RNG.randint(1, 5))

        amount = _round2(_RNG.uniform(lo, hi))
        signals.append(Transaction(
            id=str(uuid.uuid4()),
            date=txn_date,
            merchant=merchant,
            category=category,
            amount=amount,
            transaction_type=TransactionType.DEBIT,
            is_signal=True,
        ))

    # For home purchase: add a large wire transfer
    if event_type == EventType.HOME_PURCHASE:
        down_payment_date = event_window_start + timedelta(days=5)
        signals.append(Transaction(
            id=str(uuid.uuid4()),
            date=down_payment_date,
            merchant="Wire Transfer — Escrow Services Inc.",
            category="Real Estate",
            amount=_round2(_RNG.uniform(22_000, 55_000)),
            transaction_type=TransactionType.DEBIT,
            is_signal=True,
        ))

    # For job change: add new employer deposit (or gap)
    if event_type == EventType.JOB_CHANGE:
        new_employer = _RNG.choice([e for e in SALARY_EMPLOYERS if "Capital One" not in e])
        new_deposit_date = event_window_start + timedelta(days=20)
        signals.append(Transaction(
            id=str(uuid.uuid4()),
            date=new_deposit_date,
            merchant=f"Direct Deposit — {new_employer}",
            category="Income",
            amount=_round2(_RNG.uniform(3_200, 4_800)),
            transaction_type=TransactionType.CREDIT,
            is_signal=True,
        ))

    # For financial stress: repeat fees
    if event_type == EventType.FINANCIAL_STRESS:
        for extra_day in [8, 18, 28]:
            d = event_window_start + timedelta(days=extra_day)
            if d <= TODAY:
                signals.append(Transaction(
                    id=str(uuid.uuid4()),
                    date=d,
                    merchant="Overdraft Fee - Capital One",
                    category="Bank Fee",
                    amount=35.0,
                    transaction_type=TransactionType.DEBIT,
                    is_signal=True,
                ))

    return signals


def _build_life_event(
    event_type: EventType,
    confidence: float,
    signal_txns: List[Transaction],
    event_window_start: date,
) -> LifeEvent:
    severity = _severity(confidence)
    detected_date = event_window_start + timedelta(days=3)
    days_ago = (TODAY - detected_date).days

    signal_descriptions = {
        EventType.RELOCATION: [
            "Moving truck/storage rental detected",
            "Multiple furniture retailer purchases",
            "New utility account activation",
            "Geographic shift in merchant location",
            "High-value home goods purchases",
        ],
        EventType.NEW_BABY: [
            "Baby specialty retailer purchases",
            "OB/GYN and prenatal care charges",
            "Pediatric provider enrollment",
            "Infant product subscription",
            "Maternity apparel purchases",
        ],
        EventType.HOME_PURCHASE: [
            "Title insurance payment detected",
            "Home inspection service charge",
            "Large escrow/wire transfer",
            "Home improvement spend spike",
            "Real estate closing costs",
        ],
        EventType.JOB_CHANGE: [
            "Employer name change in direct deposit",
            "LinkedIn Premium subscription",
            "Professional services spending",
            "Salary deposit pattern disruption",
            "Career-related retail purchases",
        ],
        EventType.FINANCIAL_STRESS: [
            "Multiple NSF/overdraft fees",
            "Payday loan provider charge",
            "Late payment fees across services",
            "Significant spending reduction",
            "Minimum-balance pattern detected",
        ],
        EventType.MARRIAGE: [
            "Wedding venue deposit",
            "Bridal retailer purchases",
            "High-value jewelry purchase",
            "Wedding registry activity",
            "Honeymoon travel booking",
        ],
        EventType.DIVORCE: [
            "Family law attorney retainer",
            "Mediation services charge",
            "New apartment security deposit",
            "Single-occupant utility setup",
            "Moving and storage charges",
        ],
    }

    signal_merchants = [t.merchant for t in signal_txns[:5]]
    signals = signal_descriptions.get(event_type, [])[:len(signal_txns)]

    return LifeEvent(
        event_type=event_type,
        confidence=confidence,
        severity=severity,
        detected_date=detected_date,
        days_ago=days_ago,
        signals=signals,
        signal_transactions=signal_merchants,
    )


# ── Public API ────────────────────────────────────────────────────────────────

def generate_customers() -> List[CustomerDetail]:
    customers: List[CustomerDetail] = []
    history_start = TODAY - timedelta(days=HISTORY_DAYS)
    event_window_start = TODAY - timedelta(days=EVENT_WINDOW_DAYS)

    for seed in CUSTOMER_SEEDS:
        is_stress = seed["event_type"] == EventType.FINANCIAL_STRESS

        # Base everyday transactions for full 90-day window
        everyday_txns = _generate_everyday_transactions(history_start, TODAY, stress=is_stress)

        # Event-specific signal transactions in the recent window
        signal_txns = _generate_event_transactions(
            seed["event_type"],
            seed["signal_indices"],
            event_window_start,
        )

        all_txns = sorted(everyday_txns + signal_txns, key=lambda t: t.date, reverse=True)

        # Average monthly debit spend
        debit_total = sum(t.amount for t in all_txns if t.transaction_type == TransactionType.DEBIT)
        avg_monthly = _round2(debit_total / 3)

        life_event = _build_life_event(
            seed["event_type"],
            seed["confidence"],
            signal_txns,
            event_window_start,
        )

        customer = CustomerDetail(
            id=str(uuid.uuid5(uuid.NAMESPACE_DNS, seed["name"])),
            name=seed["name"],
            account_number=_acct_number(seed["name"]),
            age=seed["age"],
            location=seed["location"],
            relationship_manager=seed["rm"],
            life_event=life_event,
            avg_monthly_spend=avg_monthly,
            account_tenure_years=seed["tenure_years"],
            transactions=all_txns,
        )
        customers.append(customer)

    return customers


# Module-level cache — generated once at import
_CUSTOMERS: List[CustomerDetail] = generate_customers()


def get_all_customers() -> List[CustomerDetail]:
    return _CUSTOMERS


def get_customer_by_id(customer_id: str) -> CustomerDetail | None:
    return next((c for c in _CUSTOMERS if c.id == customer_id), None)
