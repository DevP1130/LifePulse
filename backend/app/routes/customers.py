from fastapi import APIRouter, HTTPException, Query
from typing import List

from app.data_generator import get_all_customers, get_customer_by_id, update_customer_status
from app.brief_generator import generate_conversation_starter
from app.models import CustomerSummary, CustomerDetail, ConversationStarter, StatusUpdate, EventStatus

router = APIRouter(prefix="/api/customers", tags=["customers"])


@router.get("", response_model=List[CustomerSummary])
def list_customers():
    customers = get_all_customers()
    return [CustomerSummary(**c.model_dump(exclude={"transactions"})) for c in customers]


@router.get("/{customer_id}", response_model=CustomerDetail)
def get_customer(customer_id: str):
    customer = get_customer_by_id(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.get("/{customer_id}/transactions")
def get_transactions(customer_id: str, limit: int = 60):
    customer = get_customer_by_id(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer.transactions[:limit]


@router.get("/{customer_id}/brief", response_model=ConversationStarter)
def get_conversation_starter(
    customer_id: str,
    tone: str = Query("conversational", pattern="^(formal|conversational|empathetic)$"),
):
    customer = get_customer_by_id(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return generate_conversation_starter(customer, tone=tone)


@router.patch("/{customer_id}/status", response_model=CustomerSummary)
def patch_status(customer_id: str, body: StatusUpdate):
    ok = update_customer_status(customer_id, body.status)
    if not ok:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer = get_customer_by_id(customer_id)
    return CustomerSummary(**customer.model_dump(exclude={"transactions"}))
