"""
Synthetic transaction data generator for LifePulse — Life Event Intelligence.

Produces 19 customers across 4 life event types (relocation, new baby, marriage,
home purchase), each with realistic 90-day transaction histories and embedded
life event signal patterns.
"""

import uuid
import random
from datetime import date, timedelta
from typing import List, Tuple

from app.models import (
    CustomerDetail,
    EventSignal,
    EventStatus,
    LifeEvent,
    LifeEventType,
    Transaction,
    TransactionType,
)

_RNG = random.Random(42)
TODAY = date(2026, 5, 25)
HISTORY_DAYS = 90


# ── City-specific utility companies (relocation signals) ──────────────────────

UTILITIES_BY_CITY: dict[str, List[Tuple[str, str]]] = {
    "Austin, TX":     [("CPS Energy — New Account", "Utilities"), ("Atmos Energy — New Service", "Utilities")],
    "Charlotte, NC":  [("Duke Energy Progress — New Acct", "Utilities"), ("Piedmont Natural Gas", "Utilities")],
    "Denver, CO":     [("Xcel Energy — New Account", "Utilities"), ("Black Hills Energy", "Utilities")],
    "Miami, FL":      [("FPL — Florida Power & Light", "Utilities"), ("TECO Peoples Gas — New Acct", "Utilities")],
    "Nashville, TN":  [("NES — Nashville Electric", "Utilities"), ("Nashville Gas Co — New Acct", "Utilities")],
    "Portland, OR":   [("Portland General Electric", "Utilities"), ("NW Natural Gas — New Acct", "Utilities")],
    "Chicago, IL":    [("ComEd — New Account", "Utilities"), ("Peoples Gas — New Account", "Utilities")],
    "Phoenix, AZ":    [("APS — Arizona Public Service", "Utilities"), ("Southwest Gas — New Acct", "Utilities")],
    "Dallas, TX":     [("Oncor Electric — New Account", "Utilities"), ("Atmos Energy — New Service", "Utilities")],
    "Las Vegas, NV":  [("NV Energy — New Account", "Utilities"), ("Southwest Gas — New Acct", "Utilities")],
    "Tampa, FL":      [("TECO Energy — Tampa Electric", "Utilities"), ("Peoples Gas — New Account", "Utilities")],
    "Scottsdale, AZ": [("APS — Arizona Public Service", "Utilities"), ("Southwest Gas — New Acct", "Utilities")],
}


# ── Signal templates: (label, cat, lo_amt, hi_amt, description) ───────────────

SIGNAL_TEMPLATES: dict[str, Tuple[str, str, float, float, str]] = {
    # Relocation
    "TRUCK_RENTAL":      ("Moving Truck Rental",   "Moving",    650,   1_450,  "Moving truck rental — strong indicator of imminent or in-progress relocation"),
    "STORAGE_UNIT":      ("Storage Unit",          "Storage",   119,     229,  "Storage unit rental — suggests transitional housing or staging for a move"),
    "ADDRESS_CHANGE":    ("Address Change Service","Mail",      1.10,   1.10,  "USPS mail forwarding activated — official address change request confirmed"),
    "SHIPPING_SERVICE":  ("Packing & Shipping",    "Shipping",   38,     140,  "UPS/FedEx bulk shipment — multiple packages forwarded to new address"),
    "NEW_UTILITY":       ("New Utility Setup",     "Utilities",  45,     165,  "New utility account activated in destination city — near-certain relocation signal"),
    "TEMP_HOUSING":      ("Temporary Housing",     "Housing",   680,   2_400,  "Extended-stay hotel or short-term rental — active relocation in progress"),
    "FURNITURE":         ("Furniture & Home Goods","Home Goods",240,   2_100,  "Significant home furnishing purchase — consistent with setting up a new residence"),
    "NEW_CITY_MERCHANT": ("New-Market Activity",   "Retail",     12,     180,  "Transaction at merchant in destination market — geographic shift confirmed"),

    # New Baby
    "MATERNITY_STORE":   ("Maternity Apparel",     "Apparel",    45,     220,  "Maternity clothing purchase — pregnancy in progress"),
    "BABY_REGISTRY":     ("Baby Registry Purchase","Baby Store", 55,     240,  "Purchase at baby specialty store — registry setup and initial items"),
    "BABY_GEAR":         ("Baby Gear Purchase",    "Baby Gear",  89,     450,  "Baby gear purchase — stroller, car seat, or similar new-arrival essential"),
    "BABY_FURNITURE":    ("Nursery Furniture",     "Home Goods",180,   1_200,  "Crib, dresser, or nursery furniture — preparing baby's room"),
    "HOSPITAL_BILL":     ("Hospital Delivery Charge","Medical",1_200,  4_500,  "Labor and delivery hospital charge — new baby arrival confirmed"),
    "PEDIATRICIAN":      ("Pediatrician Visit",    "Medical",    85,     280,  "Pediatric clinic payment — newborn care established"),
    "CHILDCARE_DEPOSIT": ("Childcare Deposit",     "Childcare", 800,   2_400,  "Daycare deposit secured — childcare arranged for new baby"),

    # Marriage
    "ENGAGEMENT_RING":   ("Engagement Ring",       "Jewelry",  2_500, 12_000,  "Jewelry store purchase — engagement ring, wedding imminent"),
    "WEDDING_VENUE":     ("Wedding Venue Deposit", "Wedding",  2_000,  8_000,  "Venue deposit paid — ceremony and reception booked"),
    "WEDDING_PLANNER":   ("Wedding Planner Retainer","Wedding",1_500,  5_000,  "Wedding planning service retained — full-service coordination"),
    "BRIDAL_STORE":      ("Bridal & Formalwear",   "Apparel",   800,   4_500,  "Bridal boutique purchase — wedding attire secured"),
    "CATERING_DEPOSIT":  ("Catering Deposit",      "Wedding",  1_500,  6_000,  "Catering company deposit — reception planning underway"),
    "HONEYMOON_BOOKING": ("Honeymoon Travel",      "Travel",   2_000,  8_000,  "Flight or resort booking — honeymoon planned"),
    "WEDDING_REGISTRY":  ("Wedding Registry",      "Retail",    100,     500,  "Department store purchase tied to wedding registry"),

    # Home Purchase
    "HOME_INSPECTION":   ("Home Inspection Fee",   "Real Estate",350,    650,  "Home inspection service — active purchase offer in progress"),
    "APPRAISAL_FEE":     ("Property Appraisal",   "Real Estate",450,    850,  "Appraisal fee paid — mortgage underwriting in progress"),
    "REAL_ESTATE_ATTY":  ("Real Estate Attorney", "Legal",      800,   3_500,  "Real estate attorney fees — closing process underway"),
    "DOWN_PAYMENT":      ("Down Payment / Escrow", "Real Estate",15_000,80_000,"Large escrow or down payment transfer — home purchase closing"),
    "HOME_IMPROVEMENT":  ("Home Improvement",      "Home Goods", 500,   5_000,  "Large purchase at home improvement retailer — new home renovation"),
}

SIGNAL_MERCHANTS: dict[str, List[str]] = {
    # Relocation
    "TRUCK_RENTAL":      ["U-Haul Truck Rental", "Penske Truck Rental", "Budget Truck Rental", "PODS Moving & Storage"],
    "STORAGE_UNIT":      ["Public Storage", "CubeSmart Self Storage", "Extra Space Storage", "Life Storage"],
    "ADDRESS_CHANGE":    ["USPS.com — Address Change", "USPS — Priority Mail Forward"],
    "SHIPPING_SERVICE":  ["The UPS Store", "FedEx Office Print & Ship", "USPS Priority Mail"],
    "NEW_UTILITY":       [],  # populated from UTILITIES_BY_CITY
    "TEMP_HOUSING":      ["Extended Stay America", "Marriott Residence Inn", "Airbnb", "Hilton Garden Inn"],
    "FURNITURE":         ["IKEA", "Wayfair", "West Elm", "HomeGoods", "Ashley HomeStore", "Crate & Barrel"],
    "NEW_CITY_MERCHANT": [],  # populated city-specific

    # New Baby
    "MATERNITY_STORE":   ["Motherhood Maternity", "H&M Maternity", "A Pea in the Pod", "Pink Blush Maternity"],
    "BABY_REGISTRY":     ["buybuy BABY", "Target — Baby Registry", "Amazon Baby Registry"],
    "BABY_GEAR":         ["buybuy BABY", "Target — Baby Gear", "Amazon Baby", "Pottery Barn Kids"],
    "BABY_FURNITURE":    ["buybuy BABY", "IKEA Nursery", "Pottery Barn Kids", "Wayfair — Nursery"],
    "HOSPITAL_BILL":     ["UCSF Medical Center", "NYU Langone Health", "Houston Methodist", "Northwestern Memorial", "Johns Hopkins"],
    "PEDIATRICIAN":      ["Children's Health Pediatrics", "Pediatric Associates", "Kids First Pediatrics", "Little Ones Clinic"],
    "CHILDCARE_DEPOSIT": ["Bright Horizons", "KinderCare Learning Centers", "La Petite Academy", "The Learning Experience"],

    # Marriage
    "ENGAGEMENT_RING":   ["Tiffany & Co.", "Kay Jewelers", "Jared The Galleria", "Zales", "James Allen"],
    "WEDDING_VENUE":     ["Grand Ballroom Events", "Marriott Weddings", "Historic Estate Events", "The Knot Venues"],
    "WEDDING_PLANNER":   ["Bliss Wedding Planners", "Forever After Events", "WeddingWire Pro", "The Knot Planner"],
    "BRIDAL_STORE":      ["David's Bridal", "Kleinfeld Bridal", "BHLDN Bridal", "White by Vera Wang"],
    "CATERING_DEPOSIT":  ["Wolfgang Puck Catering", "OCCASIONS Catering", "Crave Catering", "Saveur Catering"],
    "HONEYMOON_BOOKING": ["Expedia Travel", "Sandals Resorts", "Delta Vacations", "Apple Vacations"],
    "WEDDING_REGISTRY":  ["Crate & Barrel Registry", "Williams-Sonoma Registry", "Macy's Wedding Registry"],

    # Home Purchase
    "HOME_INSPECTION":   ["Pillar To Post Inspection", "HouseMaster Home Inspections", "WIN Home Inspection"],
    "APPRAISAL_FEE":     ["Clarocity Valuation", "National Property Appraisers", "ValueAmerica Appraisals"],
    "REAL_ESTATE_ATTY":  ["Smith & Associates RE Law", "Premier Real Estate Attorneys", "Closing Attorney Services"],
    "DOWN_PAYMENT":      ["First American Title Insurance", "Chicago Title Co.", "Fidelity National Title"],
    "HOME_IMPROVEMENT":  ["The Home Depot", "Lowe's Home Improvement", "Menards", "ACE Hardware"],
}


# ── Everyday merchant catalog ─────────────────────────────────────────────────

EVERYDAY: List[Tuple[str, str, float, float, float]] = [
    ("Whole Foods Market",     "Grocery",    45,  130, 1.5),
    ("Trader Joe's",           "Grocery",    35,   90, 1.0),
    ("Chipotle Mexican Grill", "Restaurant", 12,   18, 1.2),
    ("Starbucks",              "Restaurant",  5,   14, 2.5),
    ("DoorDash",               "Restaurant", 22,   52, 0.9),
    ("Shell",                  "Gas & Auto", 44,   82, 1.0),
    ("Amazon",                 "Retail",     25,  200, 1.4),
    ("Target",                 "Retail",     30,  120, 0.8),
    ("CVS Pharmacy",           "Pharmacy",   12,   58, 0.6),
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
    # ── RELOCATION ────────────────────────────────────────────────────────────
    {
        "name": "Alice Chen",
        "event_type": LifeEventType.RELOCATION,
        "event_summary": "Moving from San Francisco to Austin",
        "age": 31, "origin_city": "San Francisco, CA", "destination_city": "Austin, TX",
        "rm": "Morgan Hayes", "confidence": 0.91, "churn_risk": 0.76,
        "status": EventStatus.ACTIVE, "tenure_years": 3, "days_since_first_signal": 12,
        "signal_types": ["TRUCK_RENTAL", "STORAGE_UNIT", "ADDRESS_CHANGE", "NEW_UTILITY", "FURNITURE"],
    },
    {
        "name": "Marcus Johnson",
        "event_type": LifeEventType.RELOCATION,
        "event_summary": "Moving from Atlanta to Charlotte",
        "age": 29, "origin_city": "Atlanta, GA", "destination_city": "Charlotte, NC",
        "rm": "Chris Delano", "confidence": 0.72, "churn_risk": 0.58,
        "status": EventStatus.NEW, "tenure_years": 2, "days_since_first_signal": 8,
        "signal_types": ["TRUCK_RENTAL", "STORAGE_UNIT", "SHIPPING_SERVICE"],
    },
    {
        "name": "Sarah Williams",
        "event_type": LifeEventType.RELOCATION,
        "event_summary": "Moving from Austin to Denver",
        "age": 34, "origin_city": "Austin, TX", "destination_city": "Denver, CO",
        "rm": "Morgan Hayes", "confidence": 0.64, "churn_risk": 0.44,
        "status": EventStatus.NEW, "tenure_years": 5, "days_since_first_signal": 3,
        "signal_types": ["TRUCK_RENTAL", "ADDRESS_CHANGE"],
    },
    {
        "name": "David Rodriguez",
        "event_type": LifeEventType.RELOCATION,
        "event_summary": "Moving from New York to Miami",
        "age": 27, "origin_city": "New York, NY", "destination_city": "Miami, FL",
        "rm": "Taylor Brooks", "confidence": 0.89, "churn_risk": 0.34,
        "status": EventStatus.CONTACTED, "tenure_years": 1, "days_since_first_signal": 22,
        "signal_types": ["TRUCK_RENTAL", "STORAGE_UNIT", "ADDRESS_CHANGE", "NEW_UTILITY", "TEMP_HOUSING", "FURNITURE"],
    },
    {
        "name": "Emily Thompson",
        "event_type": LifeEventType.RELOCATION,
        "event_summary": "Moving from Chicago to Nashville",
        "age": 26, "origin_city": "Chicago, IL", "destination_city": "Nashville, TN",
        "rm": "Chris Delano", "confidence": 0.83, "churn_risk": 0.71,
        "status": EventStatus.ACTIVE, "tenure_years": 2, "days_since_first_signal": 15,
        "signal_types": ["TRUCK_RENTAL", "STORAGE_UNIT", "SHIPPING_SERVICE", "NEW_UTILITY", "FURNITURE"],
    },
    {
        "name": "James Park",
        "event_type": LifeEventType.RELOCATION,
        "event_summary": "Moving from Seattle to Portland",
        "age": 32, "origin_city": "Seattle, WA", "destination_city": "Portland, OR",
        "rm": "Taylor Brooks", "confidence": 0.58, "churn_risk": 0.38,
        "status": EventStatus.NEW, "tenure_years": 4, "days_since_first_signal": 5,
        "signal_types": ["STORAGE_UNIT", "SHIPPING_SERVICE"],
    },
    {
        "name": "Robert Kim",
        "event_type": LifeEventType.RELOCATION,
        "event_summary": "Moving from Denver to Phoenix",
        "age": 44, "origin_city": "Denver, CO", "destination_city": "Phoenix, AZ",
        "rm": "Jordan Mitchell", "confidence": 0.94, "churn_risk": 0.28,
        "status": EventStatus.CONTACTED, "tenure_years": 8, "days_since_first_signal": 30,
        "signal_types": ["TRUCK_RENTAL", "STORAGE_UNIT", "ADDRESS_CHANGE", "NEW_UTILITY", "TEMP_HOUSING", "FURNITURE", "NEW_CITY_MERCHANT"],
    },
    {
        "name": "Jennifer Adams",
        "event_type": LifeEventType.RELOCATION,
        "event_summary": "Moving from Houston to Dallas",
        "age": 33, "origin_city": "Houston, TX", "destination_city": "Dallas, TX",
        "rm": "Jordan Mitchell", "confidence": 0.78, "churn_risk": 0.64,
        "status": EventStatus.ACTIVE, "tenure_years": 4, "days_since_first_signal": 18,
        "signal_types": ["TRUCK_RENTAL", "STORAGE_UNIT", "NEW_UTILITY", "FURNITURE"],
    },
    {
        "name": "Michael Torres",
        "event_type": LifeEventType.RELOCATION,
        "event_summary": "Moving from Los Angeles to Las Vegas",
        "age": 41, "origin_city": "Los Angeles, CA", "destination_city": "Las Vegas, NV",
        "rm": "Taylor Brooks", "confidence": 0.86, "churn_risk": 0.67,
        "status": EventStatus.ACTIVE, "tenure_years": 7, "days_since_first_signal": 25,
        "signal_types": ["TRUCK_RENTAL", "STORAGE_UNIT", "ADDRESS_CHANGE", "NEW_UTILITY", "TEMP_HOUSING", "FURNITURE"],
    },
    {
        "name": "Daniel Brown",
        "event_type": LifeEventType.RELOCATION,
        "event_summary": "Relocated from Phoenix to Scottsdale",
        "age": 48, "origin_city": "Phoenix, AZ", "destination_city": "Scottsdale, AZ",
        "rm": "Jordan Mitchell", "confidence": 0.92, "churn_risk": 0.12,
        "status": EventStatus.RESOLVED, "tenure_years": 11, "days_since_first_signal": 35,
        "signal_types": ["TRUCK_RENTAL", "STORAGE_UNIT", "ADDRESS_CHANGE", "NEW_UTILITY", "FURNITURE", "NEW_CITY_MERCHANT"],
    },

    # ── NEW BABY ──────────────────────────────────────────────────────────────
    {
        "name": "Jessica Martinez",
        "event_type": LifeEventType.NEW_BABY,
        "event_summary": "Expecting first child",
        "age": 29,
        "rm": "Morgan Hayes", "confidence": 0.84, "churn_risk": 0.62,
        "status": EventStatus.NEW, "tenure_years": 2, "days_since_first_signal": 14,
        "signal_types": ["MATERNITY_STORE", "BABY_REGISTRY", "BABY_GEAR", "BABY_FURNITURE"],
    },
    {
        "name": "Carlos Webb",
        "event_type": LifeEventType.NEW_BABY,
        "event_summary": "Recently welcomed a newborn",
        "age": 35,
        "rm": "Chris Delano", "confidence": 0.93, "churn_risk": 0.48,
        "status": EventStatus.ACTIVE, "tenure_years": 5, "days_since_first_signal": 24,
        "signal_types": ["BABY_GEAR", "HOSPITAL_BILL", "PEDIATRICIAN", "CHILDCARE_DEPOSIT"],
    },
    {
        "name": "Sophie Anderson",
        "event_type": LifeEventType.NEW_BABY,
        "event_summary": "Expecting a baby — second trimester",
        "age": 31,
        "rm": "Taylor Brooks", "confidence": 0.71, "churn_risk": 0.55,
        "status": EventStatus.NEW, "tenure_years": 3, "days_since_first_signal": 7,
        "signal_types": ["MATERNITY_STORE", "BABY_REGISTRY", "BABY_FURNITURE"],
    },

    # ── MARRIAGE ──────────────────────────────────────────────────────────────
    {
        "name": "Nathan Collins",
        "event_type": LifeEventType.MARRIAGE,
        "event_summary": "Recently engaged, planning a wedding",
        "age": 28,
        "rm": "Jordan Mitchell", "confidence": 0.81, "churn_risk": 0.58,
        "status": EventStatus.NEW, "tenure_years": 2, "days_since_first_signal": 18,
        "signal_types": ["ENGAGEMENT_RING", "WEDDING_VENUE", "WEDDING_PLANNER", "WEDDING_REGISTRY"],
    },
    {
        "name": "Aisha Patel",
        "event_type": LifeEventType.MARRIAGE,
        "event_summary": "Wedding in approximately 6 weeks",
        "age": 32,
        "rm": "Morgan Hayes", "confidence": 0.89, "churn_risk": 0.41,
        "status": EventStatus.ACTIVE, "tenure_years": 4, "days_since_first_signal": 30,
        "signal_types": ["ENGAGEMENT_RING", "WEDDING_VENUE", "BRIDAL_STORE", "CATERING_DEPOSIT", "HONEYMOON_BOOKING"],
    },
    {
        "name": "Olivia Grant",
        "event_type": LifeEventType.MARRIAGE,
        "event_summary": "Just got married",
        "age": 30,
        "rm": "Chris Delano", "confidence": 0.96, "churn_risk": 0.29,
        "status": EventStatus.CONTACTED, "tenure_years": 6, "days_since_first_signal": 45,
        "signal_types": ["ENGAGEMENT_RING", "WEDDING_VENUE", "BRIDAL_STORE", "CATERING_DEPOSIT", "HONEYMOON_BOOKING", "WEDDING_REGISTRY"],
    },

    # ── HOME PURCHASE ─────────────────────────────────────────────────────────
    {
        "name": "Lauren Kim",
        "event_type": LifeEventType.HOME_PURCHASE,
        "event_summary": "Purchasing first home",
        "age": 36,
        "rm": "Jordan Mitchell", "confidence": 0.79, "churn_risk": 0.42,
        "status": EventStatus.NEW, "tenure_years": 6, "days_since_first_signal": 11,
        "signal_types": ["HOME_INSPECTION", "APPRAISAL_FEE", "REAL_ESTATE_ATTY"],
    },
    {
        "name": "Derek Foster",
        "event_type": LifeEventType.HOME_PURCHASE,
        "event_summary": "Closing on new home — move-in imminent",
        "age": 43,
        "rm": "Taylor Brooks", "confidence": 0.95, "churn_risk": 0.21,
        "status": EventStatus.CONTACTED, "tenure_years": 9, "days_since_first_signal": 32,
        "signal_types": ["HOME_INSPECTION", "APPRAISAL_FEE", "REAL_ESTATE_ATTY", "DOWN_PAYMENT", "HOME_IMPROVEMENT"],
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


def _build_signals(seed: dict) -> List[EventSignal]:
    signal_types = seed["signal_types"]
    days_first = seed["days_since_first_signal"]
    dest = seed.get("destination_city")
    first_date = TODAY - timedelta(days=days_first)
    n = len(signal_types)

    signals: List[EventSignal] = []
    for idx, stype in enumerate(signal_types):
        day_offset = int((idx / max(n - 1, 1)) * (days_first - 1))
        sig_date = first_date + timedelta(days=day_offset)
        if sig_date >= TODAY:
            sig_date = TODAY - timedelta(days=1)

        tmpl = SIGNAL_TEMPLATES.get(stype)
        if not tmpl:
            continue
        label, _cat, lo, hi, desc_tmpl = tmpl

        if stype == "NEW_UTILITY" and dest:
            city_utils = UTILITIES_BY_CITY.get(dest, [("New Utility Provider", "Utilities")])
            merchant, _ = _RNG.choice(city_utils)
            desc = f"New utility account activated in {dest} — near-certain relocation signal"
        elif stype == "NEW_CITY_MERCHANT" and dest:
            merchant, _ = _new_city_merchant(dest)
            desc = f"Transaction at merchant in {dest} market — geographic shift detected"
        elif stype == "ADDRESS_CHANGE":
            merchant = _RNG.choice(SIGNAL_MERCHANTS["ADDRESS_CHANGE"])
            desc = desc_tmpl
            lo = hi = 1.10
        else:
            merchants = SIGNAL_MERCHANTS.get(stype, [])
            merchant = _RNG.choice(merchants) if merchants else stype.replace("_", " ").title()
            desc = desc_tmpl

        amount = _r2(_RNG.uniform(lo, hi)) if lo != hi else lo
        signals.append(EventSignal(
            id=str(uuid.uuid4()),
            signal_type=stype,
            label=label,
            merchant=merchant,
            detected_date=sig_date,
            amount=amount,
            description=desc,
        ))

    return sorted(signals, key=lambda s: s.detected_date)


def _build_transactions(seed: dict, signals: List[EventSignal]) -> List[Transaction]:
    history_start = TODAY - timedelta(days=HISTORY_DAYS)
    txns: List[Transaction] = []
    current = history_start
    subs_added: set[str] = set()

    while current <= TODAY:
        if current.day in (1, 15):
            employer = _RNG.choice(SALARY_EMPLOYERS)
            txns.append(Transaction(
                id=str(uuid.uuid4()), date=current,
                merchant=f"Direct Deposit — {employer}",
                category="Income",
                amount=_r2(_RNG.uniform(2_600, 4_200)),
                transaction_type=TransactionType.CREDIT,
            ))

        if 5 <= current.day <= 9:
            for name, cat, lo, hi in MONTHLY_UTILITIES:
                key = f"{name}-{current.month}-{current.year}"
                if key not in subs_added:
                    txns.append(Transaction(
                        id=str(uuid.uuid4()), date=current, merchant=name, category=cat,
                        amount=_r2(_RNG.uniform(lo, hi)), transaction_type=TransactionType.DEBIT,
                    ))
                    subs_added.add(key)

        if 8 <= current.day <= 12:
            for name, cat, price in MONTHLY_SUBS:
                key = f"{name}-{current.month}-{current.year}"
                if key not in subs_added:
                    txns.append(Transaction(
                        id=str(uuid.uuid4()), date=current, merchant=name, category=cat,
                        amount=price, transaction_type=TransactionType.DEBIT,
                    ))
                    subs_added.add(key)

        for merchant, cat, lo, hi, wfreq in EVERYDAY:
            if _RNG.random() < wfreq / 7.0:
                txns.append(Transaction(
                    id=str(uuid.uuid4()), date=current, merchant=merchant, category=cat,
                    amount=_r2(_RNG.uniform(lo, hi)), transaction_type=TransactionType.DEBIT,
                ))

        current += timedelta(days=1)

    for sig in signals:
        txns.append(Transaction(
            id=str(uuid.uuid4()), date=sig.detected_date,
            merchant=sig.merchant, category=sig.label,
            amount=sig.amount, transaction_type=TransactionType.DEBIT,
            is_signal=True,
        ))

    return sorted(txns, key=lambda t: t.date, reverse=True)


# ── Public API ────────────────────────────────────────────────────────────────

def _build_customer(seed: dict) -> CustomerDetail:
    signals = _build_signals(seed)
    transactions = _build_transactions(seed, signals)

    debit_total = sum(t.amount for t in transactions if t.transaction_type == TransactionType.DEBIT)
    avg_monthly = _r2(debit_total / 3)
    first_signal_date = signals[0].detected_date if signals else TODAY

    life_event = LifeEvent(
        event_type=seed["event_type"],
        event_summary=seed["event_summary"],
        confidence=seed["confidence"],
        churn_risk=seed["churn_risk"],
        status=seed["status"],
        first_signal_date=first_signal_date,
        days_since_first_signal=seed["days_since_first_signal"],
        signals=signals,
        origin_city=seed.get("origin_city"),
        destination_city=seed.get("destination_city"),
    )

    return CustomerDetail(
        id=str(uuid.uuid5(uuid.NAMESPACE_DNS, seed["name"])),
        name=seed["name"],
        account_number=_acct(seed["name"]),
        age=seed["age"],
        relationship_manager=seed["rm"],
        life_event=life_event,
        avg_monthly_spend=avg_monthly,
        account_tenure_years=seed["tenure_years"],
        transactions=transactions,
    )


_CUSTOMERS: List[CustomerDetail] = [_build_customer(s) for s in CUSTOMER_SEEDS]
_STATUS_OVERRIDES: dict[str, EventStatus] = {}


def get_all_customers() -> List[CustomerDetail]:
    result = []
    for c in _CUSTOMERS:
        if c.id in _STATUS_OVERRIDES:
            updated = c.model_copy(deep=True)
            updated.life_event.status = _STATUS_OVERRIDES[c.id]
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
        updated.life_event.status = _STATUS_OVERRIDES[customer_id]
        return updated
    return base


def update_customer_status(customer_id: str, status: EventStatus) -> bool:
    if not any(c.id == customer_id for c in _CUSTOMERS):
        return False
    _STATUS_OVERRIDES[customer_id] = status
    return True
