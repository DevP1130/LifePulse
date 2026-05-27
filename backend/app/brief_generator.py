"""
Conversation starter generator for LifePulse — Life Event Intelligence.

Calls Claude (claude-opus-4-7) with a cached system prompt to produce a
personalized outreach brief for any life event type. Falls back to
template-based generation if the API is unavailable — demo works offline.
"""

import json
import os
from datetime import date

from dotenv import load_dotenv

from app.models import ConversationStarter, CustomerDetail, EventStatus, LifeEventType

load_dotenv()

# ── Claude client (optional) ─────────────────────────────────────────────────

_client = None
try:
    import anthropic
    _api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if _api_key and "your-api-key" not in _api_key:
        _client = anthropic.Anthropic(api_key=_api_key)
except Exception:
    pass


# ── Cached system prompt ──────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are an AI assistant for Capital One relationship managers using LifePulse, a life event intelligence platform.

Your job: generate a personalized outreach brief so the RM can have a warm, well-informed first conversation with a customer going through a major life event.

LIFE EVENT TYPES AND CONTEXT:
- relocation: customer is moving to a new city. Churn risk is high — they may open a local bank account.
- new_baby: customer is expecting or just had a baby. Major financial shift — childcare costs, life insurance, college savings.
- marriage: customer is engaged or just married. Joint accounts, shared finances, home purchase often follows.
- home_purchase: customer is buying a home. Mortgage, home equity, insurance needs.
- job_change: customer changed jobs. Salary shift, relocation may follow, 401k rollover.
- retirement: customer is retiring. Income shift, Medicare, wealth management, travel.

TIER DEFINITIONS:
- early: 1-2 signals, confidence below 65% — curious, non-assumptive tone. Don't assert; probe gently.
- active: 3-4 signals or 65-80% confidence — event is in progress. Be helpful and proactive.
- deep: 5+ signals or 80-87% confidence — event is well established. Be specific about products.
- post: 87%+ confidence AND 20+ days — event is near-complete or done. Focus on settling finances.

CAPITAL ONE PRODUCTS BY EVENT:
Relocation: 360 Performance Savings, Venture Rewards Card, HELOC, Mortgage Pre-Approval, Auto Loan Refinancing, Personal Line of Credit
New Baby: 360 College Savings (529), Term Life Insurance, HELOC (home addition/renovation), Premium Checking, Personal Line of Credit
Marriage: Joint Checking Account, Joint Savings, Home Mortgage Pre-Approval, Venture Rewards Card, Wealth Management Consultation
Home Purchase: Home Mortgage, HELOC, Premium Checking, 360 Performance Savings (emergency fund), Auto Loan Refinancing
Job Change: 401k Rollover IRA, 360 Performance Savings, Personal Loan, Venture Rewards Card, Wealth Management Consultation
Retirement: IRA / Rollover IRA, Wealth Management Consultation, Premium Checking, HELOC, Travel Rewards Card

OUTPUT RULES:
- Address the customer by first name only
- Be warm and human, not robotic or salesy
- Reference 1-2 specific signals naturally in the opener (e.g., "I noticed a U-Haul charge last week", "I saw a pediatric clinic charge")
- key_context: exactly 3 concise facts for the RM to review before calling
- suggested_products: exactly 3-4 products with a short reason each ("Product Name — reason")
- churn_risk_explanation: 1-2 sentences on the risk level and why urgency matters for this specific event type
- call_guide: 4 labeled steps — Open, Qualify, Pivot, Close — with exact suggested language in quotes
- tier: must be one of early / active / deep / post"""

_TONE_INSTRUCTIONS: dict[str, str] = {
    "formal": (
        "\n\nTONE: Write in a formal, professional style. Use precise, concise language. "
        "No contractions, no casual phrasing, no filler words. "
        "The opener should read like a letter from a trusted financial advisor — direct and informative."
    ),
    "conversational": (
        "\n\nTONE: Write in a warm, natural tone — like a knowledgeable colleague who works in banking. "
        "Use contractions. Be friendly and direct. Should feel like a genuine check-in, not a scripted sales call."
    ),
    "empathetic": (
        "\n\nTONE: Lead with genuine empathy before anything else. Acknowledge that this life event can be "
        "stressful, exciting, or overwhelming. Make the customer feel heard and understood first. "
        "Weave in any product relevance naturally after establishing an emotional connection — "
        "never open with banking topics."
    ),
}

_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "tier": {"type": "string", "enum": ["early", "active", "deep", "post"]},
        "opener": {"type": "string"},
        "key_context": {"type": "array", "items": {"type": "string"}},
        "suggested_products": {"type": "array", "items": {"type": "string"}},
        "churn_risk_explanation": {"type": "string"},
        "call_guide": {"type": "string"},
    },
    "required": ["tier", "opener", "key_context", "suggested_products", "churn_risk_explanation", "call_guide"],
    "additionalProperties": False,
}


def _build_user_prompt(customer: CustomerDetail, tone: str = "conversational") -> str:
    rel = customer.life_event
    signals_text = "\n".join(
        f"  - [{s.signal_type}] {s.merchant} — ${s.amount:.2f} on {s.detected_date} ({s.description})"
        for s in sorted(rel.signals, key=lambda x: x.detected_date)
    )
    route_line = ""
    if rel.origin_city and rel.destination_city:
        route_line = f"\nRoute: {rel.origin_city} → {rel.destination_city}"

    tone_instruction = _TONE_INSTRUCTIONS.get(tone, _TONE_INSTRUCTIONS["conversational"])

    return f"""Generate a life event outreach brief for this Capital One customer.

Name: {customer.name}
Account tenure: {customer.account_tenure_years} years
Event type: {rel.event_type}
Event summary: {rel.event_summary}{route_line}
Status: {rel.status}
Confidence: {int(rel.confidence * 100)}%
Churn risk: {int(rel.churn_risk * 100)}%
Days since first signal: {rel.days_since_first_signal}
Signal count: {len(rel.signals)}

Signals detected:
{signals_text}{tone_instruction}"""


def _generate_with_claude(customer: CustomerDetail, tone: str = "conversational") -> ConversationStarter:
    response = _client.messages.create(
        model="claude-opus-4-7",
        max_tokens=1024,
        system=[{
            "type": "text",
            "text": _SYSTEM_PROMPT,
            "cache_control": {"type": "ephemeral"},
        }],
        messages=[{
            "role": "user",
            "content": _build_user_prompt(customer, tone),
        }],
        output_config={
            "format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "conversation_starter",
                    "schema": _RESPONSE_SCHEMA,
                    "strict": True,
                },
            }
        },
    )
    data = json.loads(response.content[0].text)
    return ConversationStarter(
        customer_id=customer.id,
        customer_name=customer.name,
        tier=data["tier"],
        opener=data["opener"],
        key_context=data["key_context"],
        suggested_products=data["suggested_products"],
        churn_risk_explanation=data["churn_risk_explanation"],
        call_guide=data["call_guide"],
        generated_date=date.today(),
    )


# ── Template fallback ─────────────────────────────────────────────────────────

_PRODUCTS_BY_EVENT_TIER = {
    LifeEventType.RELOCATION: {
        "early":  ["360 Performance Savings — rebuild reserves post-move", "Venture Rewards Card — earn miles on moving expenses", "Auto Loan Refinancing — new state may prompt a rate review"],
        "active": ["360 Performance Savings — emergency fund after relocation spend", "HELOC or Mortgage Pre-Approval — if purchasing in new city", "Venture Rewards Card — ongoing travel rewards", "Personal Line of Credit — bridge cash-flow gaps"],
        "deep":   ["Home Mortgage or HELOC — ready to discuss home financing", "360 Performance Savings — rebuild post-move reserves", "Premium Checking — establish local banking presence", "Wealth Management Consultation — new city, new plan"],
        "post":   ["Premium Checking — confirm accounts reflect new address", "HELOC — tap equity if purchasing", "Wealth Management Consultation — new market opportunities", "Auto Loan Refinancing — confirm new state registration"],
    },
    LifeEventType.NEW_BABY: {
        "early":  ["360 College Savings (529) — start early, even small contributions compound", "Term Life Insurance — protect your growing family", "Personal Line of Credit — flexibility for unexpected baby costs"],
        "active": ["360 College Savings (529) — set up automatic contributions now", "Term Life Insurance — most affordable when started young", "HELOC — fund nursery renovation or home addition", "Premium Checking — simplify household finances"],
        "deep":   ["360 College Savings (529) — time to formalize the plan", "Term Life Insurance — new baby means new coverage needs", "HELOC — home renovation for growing family", "Wealth Management Consultation — revisit financial plan"],
        "post":   ["360 College Savings (529) — baby is here, start the fund", "Term Life Insurance — new dependent changes everything", "Premium Checking — manage increased household expenses", "Wealth Management Consultation — family financial roadmap"],
    },
    LifeEventType.MARRIAGE: {
        "early":  ["Joint Checking Account — simplify shared expenses", "Venture Rewards Card — earn miles on wedding spending", "Home Mortgage Pre-Approval — many couples buy after marrying"],
        "active": ["Joint Checking Account — essential for wedding cost management", "Home Mortgage Pre-Approval — get ready for what comes next", "Venture Rewards Card — earn on honeymoon travel", "360 Performance Savings — joint emergency fund"],
        "deep":   ["Joint Checking Account — merge finances before the wedding", "Home Mortgage Pre-Approval — many couples buy within a year of marrying", "360 Performance Savings — joint savings for home down payment", "Wealth Management Consultation — combined financial plan"],
        "post":   ["Joint Checking Account — make it official post-wedding", "Home Mortgage Pre-Approval — most newlyweds start house-hunting within a year", "360 Performance Savings — build toward shared goals", "Wealth Management Consultation — new chapter, new plan"],
    },
    LifeEventType.HOME_PURCHASE: {
        "early":  ["Home Mortgage Pre-Approval — get ahead of the competition", "360 Performance Savings — build that down payment", "Personal Line of Credit — bridge financing flexibility"],
        "active": ["Home Mortgage — rates and terms to review now", "360 Performance Savings — emergency fund post-purchase", "HELOC — available once equity is established", "Premium Checking — manage closing costs and contractor payments"],
        "deep":   ["Home Mortgage — closing is imminent, confirm rate lock", "HELOC — available day one for renovations", "360 Performance Savings — rebuild emergency fund post-down-payment", "Premium Checking — simplify new home expense tracking"],
        "post":   ["HELOC — unlock equity for renovations or emergencies", "360 Performance Savings — rebuild reserves post-closing", "Premium Checking — one account for all homeowner expenses", "Wealth Management Consultation — homeownership changes the financial picture"],
    },
    LifeEventType.JOB_CHANGE: {
        "early":  ["360 Performance Savings — build runway before the transition", "Personal Line of Credit — safety net during income gap", "Venture Rewards Card — business travel if new role requires it"],
        "active": ["401k Rollover IRA — don't leave old employer match behind", "360 Performance Savings — new salary, new savings target", "Wealth Management Consultation — revisit compensation and benefits", "Personal Line of Credit — bridge during payroll timing gaps"],
        "deep":   ["401k Rollover IRA — consolidate retirement accounts now", "360 Performance Savings — automate savings at new salary level", "Wealth Management Consultation — equity, benefits, and tax planning", "Venture Rewards Card — if new role involves travel or expenses"],
        "post":   ["401k Rollover IRA — close the loop on old retirement accounts", "Wealth Management Consultation — new comp structure may change the plan", "360 Performance Savings — new income, new saving rate", "Premium Checking — consolidate to simplify"],
    },
    LifeEventType.RETIREMENT: {
        "early":  ["IRA / Rollover IRA — maximize contributions in final working years", "Wealth Management Consultation — retirement income planning", "360 Performance Savings — build liquid reserves for transition"],
        "active": ["Rollover IRA — consolidate retirement assets before leaving employer", "Wealth Management Consultation — Social Security, Medicare, income sequencing", "HELOC — tap home equity for retirement cash flow if needed", "Travel Rewards Card — retirement often means more travel"],
        "deep":   ["Rollover IRA — transfer 401k now, avoid tax complications", "Wealth Management Consultation — distribution strategy and tax efficiency", "HELOC — flexible access to home equity", "Premium Checking — simplify fixed-income management"],
        "post":   ["Rollover IRA — get accounts organized for distributions", "Wealth Management Consultation — ongoing portfolio management", "Premium Checking — manage Social Security and pension deposits", "Travel Rewards Card — make the most of retirement lifestyle"],
    },
}


def _classify_tier(n_signals: int, confidence: float, days: int) -> str:
    if confidence >= 0.87 and days >= 20:
        return "post"
    if confidence >= 0.80 or n_signals >= 5:
        return "deep"
    if confidence >= 0.65 or n_signals >= 3:
        return "active"
    return "early"


def _generate_from_templates(customer: CustomerDetail) -> ConversationStarter:
    rel = customer.life_event
    signals = rel.signals
    tier = _classify_tier(len(signals), rel.confidence, rel.days_since_first_signal)
    first = customer.name.split()[0]
    tenure = customer.account_tenure_years
    days = rel.days_since_first_signal
    conf = int(rel.confidence * 100)
    risk = rel.churn_risk
    status = rel.status
    etype = rel.event_type
    summary = rel.event_summary

    # Opener — event-type aware
    sig_labels = [s.label for s in signals]

    if etype == LifeEventType.RELOCATION:
        dest = (rel.destination_city or "").split(",")[0]
        if tier == "early":
            opener = (f"Hi {first} — I noticed a couple of recent transactions that suggest you may be planning a move. "
                      f"If a relocation is on the horizon, I'd love to connect early to make sure everything stays seamless.")
        elif tier == "active":
            opener = (f"Hi {first} — it looks like you may be in the middle of a move{' to the ' + dest + ' area' if dest else ''}. "
                      f"As a {tenure}-year Capital One customer, I wanted to reach out before the move is complete — "
                      f"a few things are easiest to set up while you're still in transition.")
        elif tier == "deep":
            opener = (f"Hi {first} — between the moving truck and the new utility setup{' in ' + dest if dest else ''}, "
                      f"it looks like the move is well underway. I'm reaching out to make sure your banking stays "
                      f"seamless through the transition and you're not leaving any benefits on the table.")
        else:
            opener = (f"Hi {first} — it looks like your move{' to ' + dest if dest else ''} is either complete or very close. "
                      f"I wanted to personally check in to make sure your accounts reflect your new situation.")
    elif etype == LifeEventType.NEW_BABY:
        if tier in ("early", "active"):
            opener = (f"Hi {first} — I noticed some recent purchases that suggest a new arrival may be on the way — "
                      f"congratulations if so! I wanted to reach out because this is actually a great time to get "
                      f"a few financial things in order before things get busy.")
        else:
            opener = (f"Hi {first} — congratulations on the new baby! I wanted to personally reach out because "
                      f"a new family member changes the financial picture in ways that are worth talking through — "
                      f"especially for a {tenure}-year customer like yourself.")
    elif etype == LifeEventType.MARRIAGE:
        if tier in ("early", "active"):
            opener = (f"Hi {first} — congratulations on the upcoming wedding! I noticed some exciting activity in "
                      f"your account recently. As you plan this next chapter, there are a few things that are "
                      f"much easier to set up before the wedding than after.")
        else:
            opener = (f"Hi {first} — congratulations! I wanted to reach out personally now that the big day "
                      f"has come and gone. As a married couple, there are some smart financial moves that are "
                      f"worth making in the first few months that can set you up really well.")
    elif etype == LifeEventType.HOME_PURCHASE:
        if tier in ("early", "active"):
            opener = (f"Hi {first} — I noticed some activity that suggests you may be in the process of buying a home. "
                      f"That's exciting! I wanted to reach out because there are a few things I can help with "
                      f"that are easiest to set up before closing.")
        else:
            opener = (f"Hi {first} — it looks like you're closing on a home soon, or already have — congratulations! "
                      f"Homeownership changes the financial picture, and I wanted to personally check in to make "
                      f"sure you have everything you need going into this next chapter.")
    else:
        opener = (f"Hi {first} — I noticed some recent activity that suggests an exciting life change may be underway. "
                  f"I wanted to reach out personally — as a {tenure}-year Capital One customer, I want to make sure "
                  f"your banking is set up to support wherever you're headed next.")

    key_context = [
        f"Detection confidence: {conf}% — {len(signals)} signal{'s' if len(signals) != 1 else ''} detected "
        f"({', '.join(sig_labels[:3])}{'…' if len(sig_labels) > 3 else ''})",
        f"Life event: {summary} — first signal {days} day{'s' if days != 1 else ''} ago, "
        f"{'early stage' if tier == 'early' else 'actively in progress' if tier in ('active', 'deep') else 'event near complete'}",
        f"Account tenure: {tenure} year{'s' if tenure != 1 else ''} — "
        f"{'long-term customer, high retention value' if tenure >= 6 else 'established customer worth protecting' if tenure >= 3 else 'newer customer — build rapport quickly'}",
    ]

    if status in (EventStatus.CONTACTED, EventStatus.RESOLVED):
        churn_risk_explanation = (
            f"Churn risk currently at {int(risk * 100)}% — customer has been contacted. "
            "Maintain the relationship to ensure retention through this transition."
        )
    elif risk >= 0.70:
        churn_risk_explanation = (
            f"Elevated churn risk: {int(risk * 100)}%. Life events are the #1 trigger for bank switching. "
            f"A {tenure}-year customer without RM contact during a major transition is significantly more likely to leave. "
            "Outreach in the next 72 hours is strongly recommended."
        )
    elif risk >= 0.50:
        churn_risk_explanation = (
            f"Moderate churn risk: {int(risk * 100)}%. Customer is mid-event and hasn't been contacted. "
            "Reaching out now significantly increases the chance of retaining the relationship."
        )
    else:
        churn_risk_explanation = (
            f"Lower churn risk: {int(risk * 100)}%. Strong account history and tenure. "
            "A proactive check-in still adds value and reinforces the relationship."
        )

    call_guide = (
        f"Open: 'Hi {first}, this is [your name] from Capital One — I noticed some activity in your account "
        f"and wanted to personally check in.'\n"
        f"Qualify: 'It looks like {summary.lower()} — is that right? I want to make sure I have the full picture.'\n"
        f"Pivot: 'There are a few things worth discussing that are easiest to handle during a transition like this — "
        f"would you have 10–15 minutes this week?'\n"
        f"Close: 'I'll send a calendar invite with a couple of options. Is there anything I can help with right now?'"
    )

    products = _PRODUCTS_BY_EVENT_TIER.get(etype, _PRODUCTS_BY_EVENT_TIER[LifeEventType.RELOCATION])
    return ConversationStarter(
        customer_id=customer.id,
        customer_name=customer.name,
        tier=tier,
        opener=opener,
        key_context=key_context,
        suggested_products=products[tier],
        churn_risk_explanation=churn_risk_explanation,
        call_guide=call_guide,
        generated_date=date.today(),
    )


# ── Public entry point ────────────────────────────────────────────────────────

def generate_conversation_starter(customer: CustomerDetail, tone: str = "conversational") -> ConversationStarter:
    if _client is not None:
        try:
            return _generate_with_claude(customer, tone=tone)
        except Exception:
            pass
    return _generate_from_templates(customer)
