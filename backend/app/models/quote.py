import enum
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class QuoteStatus(str, enum.Enum):
    borrador = "borrador"
    enviada = "enviada"
    aprobada = "aprobada"
    rechazada = "rechazada"


class ItemType(str, enum.Enum):
    mano_obra = "mano_obra"
    repuesto = "repuesto"
    servicio = "servicio"
    otro = "otro"


class Quote(Base):
    __tablename__ = "quotes"

    id = Column(Integer, primary_key=True, index=True)
    quote_number = Column(String, unique=True, index=True, nullable=False)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    work_order = relationship("WorkOrder", back_populates="quotes")
    title = Column(String, nullable=False)
    status = Column(Enum(QuoteStatus), default=QuoteStatus.borrador, nullable=False)
    notes = Column(Text, nullable=True)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by = relationship("User")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    items = relationship("QuoteItem", back_populates="quote", cascade="all, delete-orphan", order_by="QuoteItem.id")


class QuoteItem(Base):
    __tablename__ = "quote_items"

    id = Column(Integer, primary_key=True, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=False)
    quote = relationship("Quote", back_populates="items")
    description = Column(String, nullable=False)
    quantity = Column(Float, default=1, nullable=False)
    unit_price = Column(Float, nullable=False)
    item_type = Column(Enum(ItemType), default=ItemType.mano_obra, nullable=False)
