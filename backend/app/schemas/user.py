from pydantic import BaseModel, EmailStr
from datetime import datetime
from ..models.user import UserRole


class UserBase(BaseModel):
    email: str
    name: str
    role: UserRole = UserRole.technician


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    password: str | None = None


class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
