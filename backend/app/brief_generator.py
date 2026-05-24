"""
Conversation starter generator for LifePulse.

Produces a tiered, personalized outreach brief based on signal count,
confidence score, customer tenure, and relocation stage.
"""

from datetime import date
from typing import List

from app.models import ConversationStarter, CustomerDetail, RelocationStatus

# ── Products recommended per relocation stage ────────────────────────────────

PRODUCTS_BY_TIER = {
    "early": [
        "360 Performance Savings — rebuild reserves post-move",
        "Venture Rewards Credit Card — earn miles on moving expenses",
        "Auto Loan Refinancing — new state may prompt a rate review",
    ],
    "active": [
        "360 Performance Savings — emergency fund after relocation spend",
        "HELOC or Mortgage Pre-Approval — if purchasing in new city",
        "Venture Rewards Credit Card — ongoing travel/moving rewards",
        "Personal Line of Credit — bridge any cash-flow gaps mid-move",
    ],
    "deep": [
        "Home Mortgage or HELOC — ready to discuss home financing",
        "360 Performance Savings — rebuild post-down-payment reserves",
        "Premium Checking (new market) — establish local banking presence",
        "Wealth Management Consultation — new city, new financial plan",
    ],
    "post": [
        "Premium Checking — confirm accounts reflect new address",
        "HELOC — tap equity if purchasing vs. renting",
        "Wealth Management Consultation — new market = new opportunities",
        "Auto Loan Refinancing — confirm new state registration",
    ],
}

# ── Churn risk explanations ───────────────────────────────────────────────────

def _churn_explanation(risk: float, tenure: int, status: RelocationStatus) -> str:
    if status in (RelocationStatus.CONTACTED, RelocationStatus.RESOLVED):
        return (
            f"Churn risk reduced to {int(risk * 100)}% — customer has been contacted. "
            "Continue relationship to ensure account retention through transition."
        )
    if risk >= 0.70:
        return (
            f"Elevated churn risk: {int(risk * 100)}%. Customers with {tenure}-year tenure "
            "who relocate without RM contact are 3× more likely to switch to a local bank. "
            "Outreach in the next 72 hours is strongly recommended."
        )
    if risk >= 0.50:
        return (
            f"Moderate churn risk: {int(risk * 100)}%. Customer is mid-move and has not "
            "been contacted. A personal outreach now significantly increases retention probability."
        )
    return (
        f"Lower churn risk: {int(risk * 100)}%. This customer has a strong account history "
        "and long tenure. A check-in is still valuable to reinforce the relationship."
    )


# ── Tiered openers ────────────────────────────────────────────────────────────

def _opener(seed: dict, tier: str) -> str:
    first = seed["name"].split()[0]
    origin = seed["origin_city"].split(",")[0]
    dest   = seed["destination_city"].split(",")[0]
    tenure = seed["tenure_years"]
    days   = seed["days_since_first_signal"]
    conf   = int(seed["confidence"] * 100)

    if tier == "early":
        return (
            f"Hi {first} — I noticed a couple of recent transactions that suggest you may be "
            f"planning a move from {origin}. I could be reading too much into it, but if a "
            f"relocation is on the horizon, I'd love to connect early to make sure everything "
            f"stays seamless. Even a 10-minute call now can save a lot of friction later."
        )
    if tier == "active":
        return (
            f"Hi {first} — based on some recent activity in your account, it looks like you "
            f"may be in the middle of a move{' to the ' + dest + ' area' if dest else ''}. "
            f"As someone who's been with Capital One for {tenure} year{'s' if tenure != 1 else ''}, "
            f"I wanted to reach out personally before the move is complete — there are a few "
            f"things worth discussing that are easiest to set up before you're fully settled."
        )
    if tier == "deep":
        return (
            f"Hi {first} — between the moving truck, the new utility account in {dest}, and "
            f"a few other signals, it looks like the move is well underway. Congratulations! "
            f"I'm reaching out because customers who relocate often have banking needs that "
            f"shift significantly — and I want to make sure you're not leaving any benefits "
            f"on the table or running into friction as things settle."
        )
    # post
    return (
        f"Hi {first} — it looks like your move to {dest} is either complete or very close to it. "
        f"I wanted to personally check in and make sure your accounts reflect your new situation. "
        f"As a {tenure}-year Capital One customer, you've built up real value here — let's make "
        f"sure none of that is disrupted by the transition."
    )


def _key_context(seed: dict, signals: list, tier: str) -> List[str]:
    dest   = seed["destination_city"]
    tenure = seed["tenure_years"]
    conf   = int(seed["confidence"] * 100)
    days   = seed["days_since_first_signal"]
    sig_labels = [s.label for s in signals]

    ctx = [
        f"Relocation confidence: {conf}% — based on {len(signals)} detected signal{'s' if len(signals) != 1 else ''} "
        f"({', '.join(sig_labels[:3])}{'…' if len(sig_labels) > 3 else ''})",

        f"Destination: {dest} — first signal detected {days} day{'s' if days != 1 else ''} ago, "
        f"{'move appears in early stages' if tier == 'early' else 'move is actively in progress' if tier in ('active', 'deep') else 'relocation appears complete'}",

        f"Account tenure: {tenure} year{'s' if tenure != 1 else ''} — "
        f"{'long-term customer, high retention value' if tenure >= 6 else 'established customer worth protecting' if tenure >= 3 else 'newer customer — build rapport quickly'}",
    ]
    return ctx


def _call_guide(seed: dict, tier: str) -> str:
    first  = seed["name"].split()[0]
    dest   = seed["destination_city"].split(",")[0]
    origin = seed["origin_city"].split(",")[0]

    intro = f"Open: 'Hi {first}, this is [your name] from Capital One — I'm reaching out because I noticed some recent account activity and wanted to check in personally.'"
    qualify = f"Qualify: 'Are you in the process of moving{' to ' + dest if dest else ''}? I want to make sure I have the right picture.'"
    pivot = "Pivot: 'There are a few things that are worth updating before the move is fully complete — would you have 10–15 minutes this week?'"
    close = "Close: 'I'll send a calendar invite with a few options. In the meantime, is there anything pressing I can help with right now?'"
    return f"{intro}\n{qualify}\n{pivot}\n{close}"


# ── Tier classification ───────────────────────────────────────────────────────

def _classify_tier(n_signals: int, confidence: float, days: int) -> str:
    if confidence >= 0.87 and days >= 20:
        return "post"
    if confidence >= 0.80 or n_signals >= 5:
        return "deep"
    if confidence >= 0.65 or n_signals >= 3:
        return "active"
    return "early"


# ── Public entry point ────────────────────────────────────────────────────────

def generate_conversation_starter(customer: CustomerDetail) -> ConversationStarter:
    rel = customer.relocation
    signals = rel.signals
    tier = _classify_tier(len(signals), rel.confidence, rel.days_since_first_signal)

    seed = {
        "name": customer.name,
        "origin_city": rel.origin_city,
        "destination_city": rel.destination_city,
        "tenure_years": customer.account_tenure_years,
        "days_since_first_signal": rel.days_since_first_signal,
        "confidence": rel.confidence,
        "churn_risk": rel.churn_risk,
        "status": rel.status,
    }

    return ConversationStarter(
        customer_id=customer.id,
        customer_name=customer.name,
        tier=tier,
        opener=_opener(seed, tier),
        key_context=_key_context(seed, signals, tier),
        suggested_products=PRODUCTS_BY_TIER[tier],
        churn_risk_explanation=_churn_explanation(rel.churn_risk, customer.account_tenure_years, rel.status),
        call_guide=_call_guide(seed, tier),
        generated_date=date.today(),
    )
