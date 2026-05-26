from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from ..models.invoice import InvoiceStatus, PaymentMethod


class InvoiceItemCreate(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float


class InvoiceItemOut(InvoiceItemCreate):
    id: int
    model_config = {"from_attributes": True}


class InvoiceCreate(BaseModel):
    client_id: int
    work_order_id: Optional[int] = None
    quote_id: Optional[int] = None
    issue_date: date
    due_date: Optional[date] = None
    notes: Optional[str] = None
    items: List[InvoiceItemCreate] = []


class InvoiceUpdate(BaseModel):
    status: Optional[InvoiceStatus] = None
    payment_method: Optional[PaymentMethod] = None
    payment_date: Optional[date] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None
    items: Optional[List[InvoiceItemCreate]] = None


class UserMini(BaseModel):
    id: int; name: str
    model_config = {"from_attributes": True}


class ClientMini(BaseModel):
    id: int; name: str; company: Optional[str] = None
    model_config = {"from_attributes": True}


class OTMini(BaseModel):
    id: int; ot_number: str; equipment_type: str
    model_config = {"from_attributes": True}


class InvoiceOut(BaseModel):
    id: int
    invoice_number: str
    client: ClientMini
    work_order: Optional[OTMini] = None
    status: InvoiceStatus
    payment_method: Optional[PaymentMethod] = None
    issue_date: date
    due_date: Optional[date] = None
    payment_date: Optional[date] = None
    notes: Optional[str] = None
    created_by: UserMini
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[InvoiceItemOut] = []
    total: float = 0.0
    model_config = {"from_attributes": True}


class InvoiceSummary(BaseModel):
    id: int
    invoice_number: str
    client: ClientMini
    work_order: Optional[OTMini] = None
    status: InvoiceStatus
    issue_date: date
    due_date: Optional[date] = None
    total: float = 0.0
    model_config = {"from_attributes": True}
