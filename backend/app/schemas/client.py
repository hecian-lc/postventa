from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ClientBase(BaseModel):
    name: str
    company: Optional[str] = None
    rut: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(ClientBase):
    name: Optional[str] = None


class ClientOut(ClientBase):
    id: int
    created_at: datetime
    total_ots: int = 0

    model_config = {"from_attributes": True}
