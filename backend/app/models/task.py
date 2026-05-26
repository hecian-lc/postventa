import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class TaskStatus(str, enum.Enum):
    pendiente = "pendiente"
    en_progreso = "en_progreso"
    completada = "completada"


class TaskPriority(str, enum.Enum):
    baja = "baja"
    normal = "normal"
    alta = "alta"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.pendiente, nullable=False)
    priority = Column(Enum(TaskPriority), default=TaskPriority.normal, nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by = relationship("User", foreign_keys=[created_by_id])
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=True)
    work_order = relationship("WorkOrder", back_populates="tasks")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
