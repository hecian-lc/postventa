from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..schemas.spare_part import (
    SparePartCreate, SparePartUpdate, SparePartOut,
    OTSparePartCreate, OTSparePartOut, StockAdjust,
)
from ..models.spare_part import SparePart, OTSparePart
from ..models.work_order import WorkOrder
from ..dependencies import get_current_user

router = APIRouter(prefix="/spare-parts", tags=["spare-parts"])


def _enrich(sp: SparePart) -> SparePartOut:
    out = SparePartOut.model_validate(sp)
    out.low_stock = sp.quantity <= sp.min_stock
    return out


@router.get("/", response_model=List[SparePartOut])
def list_spare_parts(
    search: str = "",
    low_stock_only: bool = False,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(SparePart)
    if search:
        q = q.filter(
            SparePart.name.ilike(f"%{search}%") |
            SparePart.code.ilike(f"%{search}%") |
            SparePart.supplier.ilike(f"%{search}%")
        )
    parts = q.order_by(SparePart.name).all()
    result = [_enrich(p) for p in parts]
    if low_stock_only:
        result = [r for r in result if r.low_stock]
    return result


@router.post("/", response_model=SparePartOut)
def create_spare_part(data: SparePartCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    part = SparePart(**data.model_dump())
    db.add(part)
    db.commit()
    db.refresh(part)
    return _enrich(part)


@router.put("/{part_id}", response_model=SparePartOut)
def update_spare_part(part_id: int, data: SparePartUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    part = db.query(SparePart).filter(SparePart.id == part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Repuesto no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(part, k, v)
    db.commit()
    db.refresh(part)
    return _enrich(part)


@router.post("/{part_id}/adjust", response_model=SparePartOut)
def adjust_stock(part_id: int, data: StockAdjust, db: Session = Depends(get_db), _=Depends(get_current_user)):
    part = db.query(SparePart).filter(SparePart.id == part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Repuesto no encontrado")
    part.quantity = max(0, part.quantity + data.delta)
    db.commit()
    db.refresh(part)
    return _enrich(part)


@router.delete("/{part_id}")
def delete_spare_part(part_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    part = db.query(SparePart).filter(SparePart.id == part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Repuesto no encontrado")
    db.delete(part)
    db.commit()
    return {"ok": True}


# --- OT spare parts usage ---

@router.get("/ot/{ot_id}", response_model=List[OTSparePartOut])
def list_ot_spare_parts(ot_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(OTSparePart).filter(OTSparePart.work_order_id == ot_id).all()


@router.post("/ot/{ot_id}", response_model=OTSparePartOut)
def add_spare_part_to_ot(
    ot_id: int,
    data: OTSparePartCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    if not db.query(WorkOrder).filter(WorkOrder.id == ot_id).first():
        raise HTTPException(status_code=404, detail="OT no encontrada")

    # Descontar stock si viene de inventario
    if data.spare_part_id:
        part = db.query(SparePart).filter(SparePart.id == data.spare_part_id).first()
        if part:
            part.quantity = max(0, part.quantity - data.quantity)
            if not data.unit_price:
                data = data.model_copy(update={"unit_price": part.unit_price})

    usage = OTSparePart(work_order_id=ot_id, **data.model_dump())
    db.add(usage)
    db.commit()
    db.refresh(usage)
    return usage


@router.delete("/ot/item/{item_id}")
def remove_ot_spare_part(item_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    item = db.query(OTSparePart).filter(OTSparePart.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Ítem no encontrado")
    # Devolver al stock si aplica
    if item.spare_part_id:
        part = db.query(SparePart).filter(SparePart.id == item.spare_part_id).first()
        if part:
            part.quantity += item.quantity
    db.delete(item)
    db.commit()
    return {"ok": True}
