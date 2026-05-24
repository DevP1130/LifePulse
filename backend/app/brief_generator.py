"""
Outreach brief generator.

Produces a structured, personalized outreach brief for each detected life event.
Template-based — designed to be swapped for a real LLM call in production.
"""

from datetime import date
from typing import List

from app.models import (
    CustomerDetail,
    EventType,
    OutreachBrief,
    RecommendedProduct,
    Transaction,
)

EVENT_LABELS = {
    EventType.RELOCATION:       "Relocation",
    EventType.NEW_BABY:         "Growing Family",
    EventType.HOME_PURCHASE:    "Home Purchase",
    EventType.JOB_CHANGE:       "Career Transition",
    EventType.FINANCIAL_STRESS: "Financial Stress",
    EventType.MARRIAGE:         "Marriage / New Household",
    EventType.DIVORCE:          "Major Life Restructuring",
}

SUMMARIES = {
    EventType.RELOCATION: (
        "{name} appears to be in the midst of a relocation. Transaction signals include moving "
        "truck rentals, storage payments, and new utility account activations — all within the "
        "last {days} days. This is a critical window to offer stability and new-market banking "
        "support before competitors establish a foothold."
    ),
    EventType.NEW_BABY: (
        "{name} is showing strong indicators of a first or new child — multiple baby specialty "
        "retailer purchases, prenatal/OB charges, and pediatric provider activity over the last "
        "{days} days. New parents face immediate cash-flow and savings planning needs; early "
        "outreach can meaningfully strengthen the relationship."
    ),
    EventType.HOME_PURCHASE: (
        "{name} is actively purchasing a home. Escrow, title insurance, and inspection service "
        "charges, combined with a significant wire transfer, confirm a closing is imminent or "
        "just completed. This is the ideal moment to introduce mortgage financing, home equity, "
        "and protection products."
    ),
    EventType.JOB_CHANGE: (
        "{name} has experienced a career transition in the last {days} days — evidenced by a "
        "change in direct deposit source, LinkedIn Premium activation, and professional services "
        "spending. A new role typically brings updated compensation; proactive outreach positions "
        "Capital One as a financial partner for this new chapter."
    ),
    EventType.FINANCIAL_STRESS: (
        "{name} is showing multiple distress signals: recurring overdraft and NSF fees, "
        "payday loan usage, and a measurable decline in overall spending. This customer may "
        "benefit from a debt consolidation consultation, emergency savings guidance, or "
        "restructured credit terms — and relationship outreach could prevent churn."
    ),
    EventType.MARRIAGE: (
        "{name} is planning or has recently completed a marriage. Wedding venue deposits, bridal "
        "retail, a high-value jewelry purchase, and honeymoon travel charges collectively signal "
        "a household merging event. Newlyweds face immediate joint-account, budgeting, and "
        "financial planning needs — the window for action is narrow."
    ),
    EventType.DIVORCE: (
        "{name} is navigating a significant household restructuring — family law retainers, "
        "mediation services, a new apartment deposit, and moving charges all appeared in the "
        "last {days} days. This customer needs empathetic, practical support: account separation, "
        "credit review, and independent financial planning."
    ),
}

PRODUCTS: dict[EventType, List[RecommendedProduct]] = {
    EventType.RELOCATION: [
        RecommendedProduct(
            name="Capital One Checking (New Market)",
            rationale="Establish local banking presence in the new city with fee-free access.",
        ),
        RecommendedProduct(
            name="360 Performance Savings",
            rationale="Relocation expenses often deplete emergency reserves — rebuild savings now.",
        ),
        RecommendedProduct(
            name="Venture Rewards Credit Card",
            rationale="Travel and moving expenses earn high-value miles.",
        ),
        RecommendedProduct(
            name="Auto Loan Refinancing",
            rationale="New state registration often prompts customers to reassess auto financing.",
        ),
    ],
    EventType.NEW_BABY: [
        RecommendedProduct(
            name="Kids Savings Account",
            rationale="Open a 529-linked or UTMA savings account for the new child.",
        ),
        RecommendedProduct(
            name="360 Performance Savings",
            rationale="Build an emergency fund for unexpected medical and childcare costs.",
        ),
        RecommendedProduct(
            name="Life Insurance Referral",
            rationale="New parents consistently underestimate life insurance needs.",
        ),
        RecommendedProduct(
            name="Quicksilver Cash Back Card",
            rationale="Flat 1.5% back on all spending offsets the high cost of new-parent purchases.",
        ),
    ],
    EventType.HOME_PURCHASE: [
        RecommendedProduct(
            name="Home Equity Line of Credit (HELOC)",
            rationale="Immediately available post-closing for renovation and improvement projects.",
        ),
        RecommendedProduct(
            name="Capital One Home Mortgage",
            rationale="If not already financed with Capital One, offer a competitive rate review.",
        ),
        RecommendedProduct(
            name="Homeowners Insurance Referral",
            rationale="New homeowners must secure coverage before closing — or just after.",
        ),
        RecommendedProduct(
            name="360 Performance Savings",
            rationale="Rebuild cash reserves post-down-payment with a high-yield account.",
        ),
    ],
    EventType.JOB_CHANGE: [
        RecommendedProduct(
            name="Wealth Management Consultation",
            rationale="New compensation often includes equity or new benefits — planning is critical.",
        ),
        RecommendedProduct(
            name="401(k) Rollover IRA",
            rationale="Job changers frequently need to roll over employer-sponsored retirement funds.",
        ),
        RecommendedProduct(
            name="Venture X Rewards Card",
            rationale="Higher income tier unlocks premium travel rewards for business travel.",
        ),
        RecommendedProduct(
            name="Personal Line of Credit",
            rationale="Bridges any income gap during onboarding or transition periods.",
        ),
    ],
    EventType.FINANCIAL_STRESS: [
        RecommendedProduct(
            name="Debt Consolidation Loan",
            rationale="Consolidate high-interest obligations into a single, lower-rate payment.",
        ),
        RecommendedProduct(
            name="Overdraft Line of Credit",
            rationale="Replace punitive NSF fees with a low-cost revolving credit line.",
        ),
        RecommendedProduct(
            name="Financial Counseling Session",
            rationale="Free guidance session to rebuild budget and payment cadence.",
        ),
        RecommendedProduct(
            name="360 Performance Savings (Auto-Save)",
            rationale="Automated micro-savings can begin rebuilding an emergency buffer.",
        ),
    ],
    EventType.MARRIAGE: [
        RecommendedProduct(
            name="Joint Checking Account",
            rationale="Most newlyweds consolidate day-to-day finances within 90 days of marriage.",
        ),
        RecommendedProduct(
            name="Venture Rewards Credit Card",
            rationale="Ongoing travel rewards for the newly combined household.",
        ),
        RecommendedProduct(
            name="Home Mortgage Pre-Approval",
            rationale="Married couples frequently begin home shopping in the first year.",
        ),
        RecommendedProduct(
            name="Wealth Management Consultation",
            rationale="Combined finances, joint tax filing, and beneficiary updates all require planning.",
        ),
    ],
    EventType.DIVORCE: [
        RecommendedProduct(
            name="Individual Checking Account",
            rationale="Establish financial independence with a fee-free personal account.",
        ),
        RecommendedProduct(
            name="Credit Builder Program",
            rationale="Shared credit histories may need rebuilding post-separation.",
        ),
        RecommendedProduct(
            name="Personal Line of Credit",
            rationale="Cover transition costs (deposits, legal fees) with flexible, low-rate credit.",
        ),
        RecommendedProduct(
            name="Financial Counseling Session",
            rationale="Divorce significantly changes budgeting needs and tax obligations.",
        ),
    ],
}

TALKING_POINTS: dict[EventType, List[str]] = {
    EventType.RELOCATION: [
        "Acknowledge the excitement and stress of a move — lead with empathy.",
        "Ask where they're relocating and reference Capital One's national presence.",
        "Highlight fee-free ATM access and mobile-first banking for the transition period.",
        "Introduce the 360 Savings account as a way to rebuild the emergency fund depleted by moving costs.",
        "Mention auto loan refinancing in case registration in a new state prompts a vehicle review.",
    ],
    EventType.NEW_BABY: [
        "Open by congratulating them — this is a joyful life moment.",
        "Frame the conversation around financial security for the new family member.",
        "Discuss 529 education savings early — parents who open accounts immediately save 40% more on average.",
        "Recommend increasing emergency fund target from 3 months to 6 months for a growing family.",
        "Offer to review life insurance coverage and beneficiary designations.",
    ],
    EventType.HOME_PURCHASE: [
        "Congratulate them on the home purchase and acknowledge it's likely their biggest financial step.",
        "Introduce a HELOC as a flexible tool for upcoming renovation or improvement projects.",
        "Discuss rebuilding savings: post-down-payment cash reserves are typically at a multi-year low.",
        "Review the existing mortgage rate if not held with Capital One — refinancing opportunities arise quickly.",
        "Ask about homeowners insurance — a natural cross-sell moment at closing time.",
    ],
    EventType.JOB_CHANGE: [
        "Express genuine interest in their career transition — ask about the new role.",
        "Ask about retirement accounts from the previous employer — rollover IRA is a high-value conversation.",
        "Discuss updated direct deposit setup to ensure payroll continuity.",
        "If income increased, introduce premium card products and investment services.",
        "If income is in flux, proactively discuss a personal line of credit as a safety net.",
    ],
    EventType.FINANCIAL_STRESS: [
        "Lead with empathy and a non-judgmental tone — the customer may feel embarrassed.",
        "Frame the conversation as a financial health check-in, not a product pitch.",
        "Explain how an overdraft line of credit eliminates the NSF fee cycle.",
        "Offer a complimentary financial counseling session through Capital One partners.",
        "Set a realistic expectation: small changes (automated savings, consolidated debt) produce rapid improvements.",
    ],
    EventType.MARRIAGE: [
        "Congratulate them — keep the tone warm and celebratory.",
        "Bring up joint accounts naturally: 'Many couples find it easier to manage shared expenses this way.'",
        "Ask about home-buying plans — marriages accelerate this timeline significantly.",
        "Discuss beneficiary updates across all accounts and investment products.",
        "Introduce wealth management for combined financial planning, especially if both parties have different institutions.",
    ],
    EventType.DIVORCE: [
        "Approach with sensitivity — this is a difficult and often painful life transition.",
        "Prioritize account separation and ensure financial independence is established.",
        "Review credit report together to understand shared obligations that need to be separated.",
        "Offer a personal line of credit to bridge transition costs without high-interest alternatives.",
        "Emphasize that Capital One's financial counseling service is available and confidential.",
    ],
}

URGENCY: dict[EventType, tuple[str, str]] = {
    EventType.RELOCATION:       ("High",   "Competitors target new-movers aggressively within 30 days of address change."),
    EventType.NEW_BABY:         ("High",   "New parents make lasting financial decisions in the first 60 days post-birth."),
    EventType.HOME_PURCHASE:    ("Critical","Closing creates an immediate product need window that closes within 2 weeks."),
    EventType.JOB_CHANGE:       ("Medium", "Payroll and retirement decisions are made within the first 30 days of onboarding."),
    EventType.FINANCIAL_STRESS: ("Critical","Customers under financial stress are 3× more likely to churn within 90 days."),
    EventType.MARRIAGE:         ("High",   "Joint financial decisions are typically made within 60 days of marriage."),
    EventType.DIVORCE:          ("High",   "Account restructuring is time-sensitive and legally-driven."),
}

DRAFT_SUBJECTS: dict[EventType, str] = {
    EventType.RELOCATION:       "Settling into your new home — how Capital One can help",
    EventType.NEW_BABY:         "Congratulations! Financial tools for your growing family",
    EventType.HOME_PURCHASE:    "Congratulations on your new home — let's talk next steps",
    EventType.JOB_CHANGE:       "Your next chapter — making the most of your financial transition",
    EventType.FINANCIAL_STRESS: "A quick check-in — resources that may help",
    EventType.MARRIAGE:         "Congratulations! Building your financial future together",
    EventType.DIVORCE:          "We're here to support you through this transition",
}

DRAFT_MESSAGES: dict[EventType, str] = {
    EventType.RELOCATION: (
        "Hi {first_name},\n\n"
        "I noticed some recent activity that suggests you may be in the middle of a move — "
        "congratulations on the new chapter! Relocating can be stressful, and I wanted to reach "
        "out personally to make sure your banking setup supports you through the transition.\n\n"
        "I'd love to set up a 15-minute call to walk you through a few tools that could help: "
        "from setting up your accounts in your new area to rebuilding your savings after the move. "
        "Would {day} at {time} work for a quick conversation?\n\n"
        "Looking forward to connecting,\n{rm_name}\nCapital One Relationship Manager"
    ),
    EventType.NEW_BABY: (
        "Hi {first_name},\n\n"
        "Congratulations — it looks like your family is growing! I wanted to reach out personally "
        "to offer my support and share a few financial tools specifically designed for new parents.\n\n"
        "From setting up a savings account for your little one to reviewing your insurance coverage, "
        "there are a few simple steps that make a big difference early on. I'd love to schedule a "
        "brief call — would {day} work for you?\n\n"
        "Wishing your family all the best,\n{rm_name}\nCapital One Relationship Manager"
    ),
    EventType.HOME_PURCHASE: (
        "Hi {first_name},\n\n"
        "Congratulations on your new home — this is such an exciting milestone! I'm reaching out "
        "because now that you're a homeowner, there are a few financial tools worth exploring: "
        "a home equity line of credit for future projects, and making sure your savings are "
        "positioned to rebuild after the down payment.\n\n"
        "I'd love to schedule 20 minutes to walk through your options. Are you free {day}?\n\n"
        "Best regards,\n{rm_name}\nCapital One Relationship Manager"
    ),
    EventType.JOB_CHANGE: (
        "Hi {first_name},\n\n"
        "I noticed a recent change in your direct deposit and wanted to check in — exciting times! "
        "Career transitions come with important financial decisions: updating payroll, rolling over "
        "any previous employer retirement accounts, and making sure your accounts are set up to "
        "match your new situation.\n\n"
        "Happy to walk through this with you in a quick call — would {day} at {time} work?\n\n"
        "Congratulations on the new role,\n{rm_name}\nCapital One Relationship Manager"
    ),
    EventType.FINANCIAL_STRESS: (
        "Hi {first_name},\n\n"
        "I'm reaching out because I want to make sure you have access to all the resources "
        "available to you. Sometimes unexpected expenses put pressure on a budget, and I wanted "
        "to check in personally — not with a sales pitch, but to see if there's anything "
        "Capital One can do to make things a bit easier.\n\n"
        "We have a few tools that have helped others in similar situations. Would you be open "
        "to a brief, confidential conversation this week?\n\n"
        "Here for you,\n{rm_name}\nCapital One Relationship Manager"
    ),
    EventType.MARRIAGE: (
        "Hi {first_name},\n\n"
        "Congratulations on your upcoming (or recent) marriage — what a wonderful milestone! "
        "I wanted to reach out to help make the financial side of combining households as "
        "smooth as possible. From setting up joint accounts to thinking about your long-term "
        "financial goals as a couple, I'm here to help.\n\n"
        "Would you and your partner be open to a 20-minute call this week?\n\n"
        "With congratulations,\n{rm_name}\nCapital One Relationship Manager"
    ),
    EventType.DIVORCE: (
        "Hi {first_name},\n\n"
        "I wanted to reach out personally during what I know can be a challenging time. "
        "Making sure your finances are set up to support your independence is important, "
        "and I'm here to help with any account changes, credit review, or financial planning "
        "you might need.\n\n"
        "Everything we discuss is completely confidential. Would you like to set up a time "
        "to talk this week?\n\n"
        "Here to support you,\n{rm_name}\nCapital One Relationship Manager"
    ),
}

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
TIMES = ["9:00 AM", "10:30 AM", "2:00 PM", "3:30 PM"]


def generate_brief(customer: CustomerDetail) -> OutreachBrief:
    if not customer.life_event:
        raise ValueError(f"Customer {customer.id} has no detected life event.")

    event = customer.life_event
    first_name = customer.name.split()[0]

    import random as _r
    _r.seed(hash(customer.id))
    day = _r.choice(DAYS)
    time = _r.choice(TIMES)

    summary = SUMMARIES[event.event_type].format(
        name=first_name,
        days=event.days_ago,
    )

    draft_msg = DRAFT_MESSAGES[event.event_type].format(
        first_name=first_name,
        day=day,
        time=time,
        rm_name=customer.relationship_manager,
    )

    urgency_level, urgency_rationale = URGENCY[event.event_type]

    signal_txns = [
        t for t in customer.transactions
        if t.is_signal
    ]

    return OutreachBrief(
        customer_id=customer.id,
        customer_name=customer.name,
        event_type=event.event_type,
        event_label=EVENT_LABELS[event.event_type],
        summary=summary,
        signal_transactions=signal_txns,
        recommended_products=PRODUCTS[event.event_type],
        talking_points=TALKING_POINTS[event.event_type],
        urgency_level=urgency_level,
        urgency_rationale=urgency_rationale,
        draft_subject=DRAFT_SUBJECTS[event.event_type],
        draft_message=draft_msg,
        generated_date=date.today(),
    )
