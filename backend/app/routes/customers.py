from fastapi import APIRouter, HTTPException
from typing import List

from app.data_generator import get_all_customers, get_customer_by_id
from app.brief_generator import generate_brief
from app.models import CustomerSummary, CustomerDetail, OutreachBrief

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


@router.get("/{customer_id}/brief", response_model=OutreachBrief)
def get_outreach_brief(customer_id: str):
    customer = get_customer_by_id(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if not customer.life_event:
        raise HTTPException(status_code=404, detail="No life event detected for this customer")
    return generate_brief(customer)
