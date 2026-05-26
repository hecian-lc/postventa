from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from ..models.work_order import OTStatus, Priority


class WorkOrderCreate(BaseModel):
    client_id: int
    equipment_type: str
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    physical_condition: Optional[str] = None
    accessories: Optional[str] = None
    reported_problem: str
    priority: Priority = Priority.normal
    assigned_to_id: Optional[int] = None
    estimated_delivery: Optional[datetime] = None


class WorkOrderUpdate(BaseModel):
    status: Optional[OTStatus] = None
    priority: Optional[Priority] = None
    assigned_to_id: Optional[int] = None
    internal_notes: Optional[str] = None
    estimated_delivery: Optional[datetime] = None
    actual_delivery: Optional[datetime] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    notes: Optional[str] = None


class UserMini(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}


class ClientMini(BaseModel):
    id: int
    name: str
    company: Optional[str] = None
    model_config = {"from_attributes": True}


class HistoryOut(BaseModel):
    id: int
    old_status: Optional[str]
    new_status: str
    notes: Optional[str]
    changed_at: datetime
    changed_by: UserMini
    model_config = {"from_attributes": True}


class WorkOrderOut(BaseModel):
    id: int
    ot_number: str
    client: ClientMini
    equipment_type: str
    brand: Optional[str]
    model: Optional[str]
    serial_number: Optional[str]
    physical_condition: Optional[str]
    accessories: Optional[str]
    reported_problem: str
    status: OTStatus
    priority: Priority
    assigned_to: Optional[UserMini]
    received_by: Optional[UserMini]
    received_at: datetime
    estimated_delivery: Optional[datetime]
    actual_delivery: Optional[datetime]
    internal_notes: Optional[str]
    qr_code_path: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    history: List[HistoryOut] = []
    model_config = {"from_attributes": True}


class WorkOrderSummary(BaseModel):
    id: int
    ot_number: str
    client: ClientMini
    equipment_type: str
    brand: Optional[str]
    model: Optional[str]
    status: OTStatus
    priority: Priority
    assigned_to: Optional[UserMini]
    received_at: datetime
    estimated_delivery: Optional[datetime]
    model_config = {"from_attributes": True}


class KnowledgeBaseCreate(BaseModel):
    work_order_id: Optional[int] = None
    equipment_type: str
    brand: Optional[str] = None
    model: Optional[str] = None
    symptoms: str
    diagnosis: str
    solution: str
    components_replaced: Optional[str] = None
    repair_time_hours: Optional[float] = None
    tags: Optional[str] = None


class KnowledgeBaseOut(KnowledgeBaseCreate):
    id: int
    created_at: datetime
    created_by: UserMini
    model_config = {"from_attributes": True}
