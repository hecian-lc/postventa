from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class SparePart(Base):
    __tablename__ = "spare_parts"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, nullable=True, unique=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    quantity = Column(Float, default=0, nullable=False)
    min_stock = Column(Float, default=1, nullable=False)
    unit_price = Column(Float, nullable=True)
    supplier = Column(String, nullable=True)
    location = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    ot_usage = relationship("OTSparePart", back_populates="spare_part")


class OTSparePart(Base):
    __tablename__ = "ot_spare_parts"

    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    work_order = relationship("WorkOrder", back_populates="spare_parts_used")
    spare_part_id = Column(Integer, ForeignKey("spare_parts.id"), nullable=True)
    spare_part = relationship("SparePart", back_populates="ot_usage")
    description = Column(String, nullable=False)
    quantity = Column(Float, default=1, nullable=False)
    unit_price = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
