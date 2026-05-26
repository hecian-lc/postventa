import enum
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Enum, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class InvoiceStatus(str, enum.Enum):
    borrador = "borrador"
    emitida = "emitida"
    pagada = "pagada"
    vencida = "vencida"
    anulada = "anulada"


class PaymentMethod(str, enum.Enum):
    efectivo = "efectivo"
    transferencia = "transferencia"
    cheque = "cheque"
    tarjeta = "tarjeta"
    otro = "otro"


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, index=True, nullable=False)

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    client = relationship("Client", back_populates="invoices")

    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=True)
    work_order = relationship("WorkOrder", back_populates="invoices")

    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=True)
    quote = relationship("Quote")

    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.borrador, nullable=False)
    payment_method = Column(Enum(PaymentMethod), nullable=True)

    issue_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=True)
    payment_date = Column(Date, nullable=True)

    notes = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by = relationship("User")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    items = relationship(
        "InvoiceItem", back_populates="invoice",
        cascade="all, delete-orphan", order_by="InvoiceItem.id"
    )


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    invoice = relationship("Invoice", back_populates="items")
    description = Column(String, nullable=False)
    quantity = Column(Float, default=1, nullable=False)
    unit_price = Column(Float, nullable=False)
