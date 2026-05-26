from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SparePartBase(BaseModel):
    code: Optional[str] = None
    name: str
    description: Optional[str] = None
    quantity: float = 0
    min_stock: float = 1
    unit_price: Optional[float] = None
    supplier: Optional[str] = None
    location: Optional[str] = None


class SparePartCreate(SparePartBase):
    pass


class SparePartUpdate(SparePartBase):
    name: Optional[str] = None
    quantity: Optional[float] = None


class SparePartOut(SparePartBase):
    id: int
    created_at: datetime
    low_stock: bool = False
    model_config = {"from_attributes": True}


class OTSparePartCreate(BaseModel):
    spare_part_id: Optional[int] = None
    description: str
    quantity: float = 1
    unit_price: Optional[float] = None


class OTSparePartOut(BaseModel):
    id: int
    spare_part_id: Optional[int]
    description: str
    quantity: float
    unit_price: Optional[float]
    created_at: datetime
    model_config = {"from_attributes": True}


class StockAdjust(BaseModel):
    delta: float
    reason: Optional[str] = None
