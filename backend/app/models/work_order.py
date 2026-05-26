import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class OTStatus(str, enum.Enum):
    recibido = "recibido"
    verificando = "verificando"
    pendiente_verificacion = "pendiente_verificacion"
    pendiente_aprobacion = "pendiente_aprobacion"
    esperando_repuestos = "esperando_repuestos"
    en_reparacion = "en_reparacion"
    reparado = "reparado"
    listo_entrega = "listo_entrega"
    entregado = "entregado"
    devuelto = "devuelto"
    irreparable = "irreparable"


class Priority(str, enum.Enum):
    baja = "baja"
    normal = "normal"
    alta = "alta"
    urgente = "urgente"


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True, index=True)
    ot_number = Column(String, unique=True, index=True, nullable=False)

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    client = relationship("Client", back_populates="work_orders")

    equipment_type = Column(String, nullable=False)
    brand = Column(String, nullable=True)
    model = Column(String, nullable=True)
    serial_number = Column(String, nullable=True)
    physical_condition = Column(String, nullable=True)
    accessories = Column(Text, nullable=True)
    reported_problem = Column(Text, nullable=False)

    status = Column(Enum(OTStatus), default=OTStatus.recibido, nullable=False)
    priority = Column(Enum(Priority), default=Priority.normal, nullable=False)

    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    received_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    received_by = relationship("User", foreign_keys=[received_by_id])

    received_at = Column(DateTime(timezone=True), server_default=func.now())
    estimated_delivery = Column(DateTime(timezone=True), nullable=True)
    actual_delivery = Column(DateTime(timezone=True), nullable=True)

    internal_notes = Column(Text, nullable=True)
    qr_code_path = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    history = relationship(
        "WorkOrderHistory",
        back_populates="work_order",
        order_by="WorkOrderHistory.changed_at",
    )
    knowledge_entry = relationship(
        "KnowledgeBase", back_populates="work_order", uselist=False
    )
    spare_parts_used = relationship("OTSparePart", back_populates="work_order")
    quotes = relationship("Quote", back_populates="work_order")
    tasks = relationship("Task", back_populates="work_order")
    expenses = relationship("Expense", back_populates="work_order")
    invoices = relationship("Invoice", back_populates="work_order")


class WorkOrderHistory(Base):
    __tablename__ = "work_order_history"

    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    work_order = relationship("WorkOrder", back_populates="history")
    old_status = Column(String, nullable=True)
    new_status = Column(String, nullable=False)
    changed_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    changed_by = relationship("User")
    notes = Column(Text, nullable=True)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())


class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"

    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=True)
    work_order = relationship("WorkOrder", back_populates="knowledge_entry")

    equipment_type = Column(String, nullable=False)
    brand = Column(String, nullable=True)
    model = Column(String, nullable=True)
    symptoms = Column(Text, nullable=False)
    diagnosis = Column(Text, nullable=False)
    solution = Column(Text, nullable=False)
    components_replaced = Column(Text, nullable=True)
    repair_time_hours = Column(Float, nullable=True)
    tags = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by = relationship("User")
