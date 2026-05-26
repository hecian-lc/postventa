from pydantic import BaseModel, computed_field
from typing import Optional, List
from datetime import datetime
from ..models.quote import QuoteStatus, ItemType


class QuoteItemCreate(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float
    item_type: ItemType = ItemType.mano_obra


class QuoteItemOut(QuoteItemCreate):
    id: int
    model_config = {"from_attributes": True}


class QuoteCreate(BaseModel):
    work_order_id: int
    title: str
    notes: Optional[str] = None
    valid_until: Optional[datetime] = None
    items: List[QuoteItemCreate] = []


class QuoteUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[QuoteStatus] = None
    notes: Optional[str] = None
    valid_until: Optional[datetime] = None
    items: Optional[List[QuoteItemCreate]] = None


class UserMini(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}


class OTMini(BaseModel):
    id: int
    ot_number: str
    equipment_type: str
    brand: Optional[str] = None
    model: Optional[str] = None
    client: "ClientMini"
    model_config = {"from_attributes": True}


class ClientMini(BaseModel):
    id: int
    name: str
    company: Optional[str] = None
    model_config = {"from_attributes": True}


OTMini.model_rebuild()


class QuoteOut(BaseModel):
    id: int
    quote_number: str
    work_order: OTMini
    title: str
    status: QuoteStatus
    notes: Optional[str]
    valid_until: Optional[datetime]
    created_by: UserMini
    created_at: datetime
    updated_at: Optional[datetime]
    items: List[QuoteItemOut] = []
    total: float = 0.0
    model_config = {"from_attributes": True}


class QuoteSummary(BaseModel):
    id: int
    quote_number: str
    work_order: OTMini
    title: str
    status: QuoteStatus
    created_at: datetime
    total: float = 0.0
    model_config = {"from_attributes": True}
