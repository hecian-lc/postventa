import enum
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Enum, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class ExpenseCategory(str, enum.Enum):
    repuestos = "repuestos"
    herramientas = "herramientas"
    servicios_externos = "servicios_externos"
    mano_obra = "mano_obra"
    insumos = "insumos"
    otros = "otros"


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, nullable=False)
    category = Column(Enum(ExpenseCategory), default=ExpenseCategory.otros, nullable=False)
    amount = Column(Float, nullable=False)
    expense_date = Column(Date, nullable=False)
    supplier = Column(String, nullable=True)
    receipt_number = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=True)
    work_order = relationship("WorkOrder", back_populates="expenses")

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by = relationship("User")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
