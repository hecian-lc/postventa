from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from ..models.task import TaskStatus, TaskPriority


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.pendiente
    priority: TaskPriority = TaskPriority.normal
    due_date: Optional[datetime] = None
    assigned_to_id: Optional[int] = None
    work_order_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[datetime] = None
    assigned_to_id: Optional[int] = None


class UserMini(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}


class OTMini(BaseModel):
    id: int
    ot_number: str
    model_config = {"from_attributes": True}


class TaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: TaskStatus
    priority: TaskPriority
    due_date: Optional[datetime]
    assigned_to: Optional[UserMini]
    created_by: UserMini
    work_order: Optional[OTMini]
    created_at: datetime
    updated_at: Optional[datetime]
    model_config = {"from_attributes": True}
