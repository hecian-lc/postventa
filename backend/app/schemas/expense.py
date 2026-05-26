from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from ..models.expense import ExpenseCategory


class ExpenseCreate(BaseModel):
    description: str
    category: ExpenseCategory = ExpenseCategory.otros
    amount: float
    expense_date: date
    supplier: Optional[str] = None
    receipt_number: Optional[str] = None
    notes: Optional[str] = None
    work_order_id: Optional[int] = None


class ExpenseUpdate(ExpenseCreate):
    description: Optional[str] = None
    amount: Optional[float] = None
    expense_date: Optional[date] = None


class UserMini(BaseModel):
    id: int; name: str
    model_config = {"from_attributes": True}


class OTMini(BaseModel):
    id: int; ot_number: str
    model_config = {"from_attributes": True}


class ExpenseOut(ExpenseCreate):
    id: int
    created_by: UserMini
    work_order: Optional[OTMini] = None
    created_at: datetime
    model_config = {"from_attributes": True}
