from collections import defaultdict
from datetime import timedelta

from fastapi import APIRouter

from app.data_generator import TODAY, get_all_customers
from app.models import EventStatus, LifeEventType

router = APIRouter(prefix="/api", tags=["analytics"])


@router.get("/analytics")
def get_analytics():
    customers = get_all_customers()
    total = len(customers)

    # Pipeline funnel
    pipeline: dict[str, int] = {s: 0 for s in ("new", "active", "contacted", "resolved")}
    for c in customers:
        pipeline[c.life_event.status.value] += 1

    # Event breakdown with outreach rates
    event_breakdown = {}
    for et in LifeEventType:
        cohort = [c for c in customers if c.life_event.event_type == et]
        if not cohort:
            continue
        contacted = sum(
            1 for c in cohort
            if c.life_event.status in (EventStatus.CONTACTED, EventStatus.RESOLVED)
        )
        resolved = sum(1 for c in cohort if c.life_event.status == EventStatus.RESOLVED)
        event_breakdown[et.value] = {
            "count": len(cohort),
            "contacted_count": contacted,
            "resolved_count": resolved,
            "contacted_pct": contacted / len(cohort),
            "resolved_pct": resolved / len(cohort),
            "avg_confidence": sum(c.life_event.confidence for c in cohort) / len(cohort),
        }

    # Signals detected per week over the last 12 weeks
    week_counts: list[int] = [0] * 12
    for c in customers:
        for sig in c.life_event.signals:
            days_ago = (TODAY - sig.detected_date).days
            idx = days_ago // 7
            if 0 <= idx < 12:
                week_counts[idx] += 1

    signals_by_week = []
    for i in range(11, -1, -1):
        week_end = TODAY - timedelta(days=i * 7)
        signals_by_week.append({
            "week": week_end.strftime("%-m/%-d"),
            "count": week_counts[i],
        })

    # Confidence distribution (5 equal buckets)
    conf_buckets = [{"label": f"{b*20}–{b*20+20}%", "count": 0} for b in range(5)]
    for c in customers:
        bucket = min(int(c.life_event.confidence * 100 // 20), 4)
        conf_buckets[bucket]["count"] += 1

    total_signals = sum(len(c.life_event.signals) for c in customers)
    avg_conf = sum(c.life_event.confidence for c in customers) / total if total else 0
    avg_risk = sum(c.life_event.churn_risk for c in customers) / total if total else 0

    # Risk segmentation with annual value at risk
    seg: dict[str, dict] = {
        "high":   {"label": "High Risk",   "count": 0, "annual_value_at_risk": 0.0},
        "medium": {"label": "Medium Risk", "count": 0, "annual_value_at_risk": 0.0},
        "low":    {"label": "Low Risk",    "count": 0, "annual_value_at_risk": 0.0},
    }
    for c in customers:
        tier = "high" if c.life_event.churn_risk >= 0.65 else "medium" if c.life_event.churn_risk >= 0.40 else "low"
        seg[tier]["count"] += 1
        seg[tier]["annual_value_at_risk"] += c.avg_monthly_spend * 12

    risk_segments = {
        k: {**v, "pct": v["count"] / total if total else 0}
        for k, v in seg.items()
    }

    return {
        "total_customers": total,
        "total_signals": total_signals,
        "avg_confidence": avg_conf,
        "avg_churn_risk": avg_risk,
        "pipeline_funnel": pipeline,
        "event_breakdown": event_breakdown,
        "signals_by_week": signals_by_week,
        "confidence_distribution": conf_buckets,
        "risk_segments": risk_segments,
    }
