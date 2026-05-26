from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timezone

from ..database import get_db
from ..schemas.work_order import (
    WorkOrderCreate, WorkOrderUpdate, WorkOrderOut, WorkOrderSummary,
    KnowledgeBaseCreate, KnowledgeBaseOut,
)
from ..models.work_order import WorkOrder, WorkOrderHistory, KnowledgeBase, OTStatus
from ..models.client import Client
from ..services import qr_service, ai_service
from ..dependencies import get_current_user
from ..models.user import User

router = APIRouter(prefix="/work-orders", tags=["work-orders"])


def _next_ot_number(db: Session) -> str:
    now = datetime.now(timezone.utc)
    prefix = f"OT-{now.strftime('%Y%m')}-"
    last = (
        db.query(WorkOrder)
        .filter(WorkOrder.ot_number.like(f"{prefix}%"))
        .order_by(WorkOrder.id.desc())
        .first()
    )
    seq = 1
    if last:
        try:
            seq = int(last.ot_number.split("-")[-1]) + 1
        except ValueError:
            pass
    return f"{prefix}{seq:04d}"


def _load_ot(db: Session, ot_id: int) -> WorkOrder:
    ot = (
        db.query(WorkOrder)
        .options(
            joinedload(WorkOrder.client),
            joinedload(WorkOrder.assigned_to),
            joinedload(WorkOrder.received_by),
            joinedload(WorkOrder.history).joinedload(WorkOrderHistory.changed_by),
        )
        .filter(WorkOrder.id == ot_id)
        .first()
    )
    if not ot:
        raise HTTPException(status_code=404, detail="Orden de trabajo no encontrada")
    return ot


@router.get("/", response_model=List[WorkOrderSummary])
def list_work_orders(
    status: Optional[OTStatus] = None,
    client_id: Optional[int] = None,
    assigned_to_id: Optional[int] = None,
    search: str = "",
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(WorkOrder).options(
        joinedload(WorkOrder.client),
        joinedload(WorkOrder.assigned_to),
    )
    if status:
        q = q.filter(WorkOrder.status == status)
    if client_id:
        q = q.filter(WorkOrder.client_id == client_id)
    if assigned_to_id:
        q = q.filter(WorkOrder.assigned_to_id == assigned_to_id)
    if search:
        q = q.filter(
            WorkOrder.ot_number.ilike(f"%{search}%")
            | WorkOrder.equipment_type.ilike(f"%{search}%")
            | WorkOrder.model.ilike(f"%{search}%")
            | WorkOrder.serial_number.ilike(f"%{search}%")
        )
    return q.order_by(WorkOrder.received_at.desc()).all()


@router.post("/", response_model=WorkOrderOut)
def create_work_order(
    data: WorkOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client = db.query(Client).filter(Client.id == data.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    ot_number = _next_ot_number(db)
    ot = WorkOrder(
        **data.model_dump(),
        ot_number=ot_number,
        received_by_id=current_user.id,
    )
    db.add(ot)
    db.flush()

    qr_path = qr_service.generate_qr(ot.id, ot_number)
    ot.qr_code_path = qr_path

    history = WorkOrderHistory(
        work_order_id=ot.id,
        old_status=None,
        new_status=OTStatus.recibido,
        changed_by_id=current_user.id,
        notes="OT creada",
    )
    db.add(history)
    db.commit()
    return _load_ot(db, ot.id)


@router.get("/{ot_id}", response_model=WorkOrderOut)
def get_work_order(ot_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return _load_ot(db, ot_id)


@router.put("/{ot_id}", response_model=WorkOrderOut)
def update_work_order(
    ot_id: int,
    data: WorkOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ot = db.query(WorkOrder).filter(WorkOrder.id == ot_id).first()
    if not ot:
        raise HTTPException(status_code=404, detail="OT no encontrada")

    old_status = ot.status
    for field, value in data.model_dump(exclude_none=True).items():
        if field != "notes":
            setattr(ot, field, value)

    if data.status and data.status != old_status:
        db.add(WorkOrderHistory(
            work_order_id=ot.id,
            old_status=old_status,
            new_status=data.status,
            changed_by_id=current_user.id,
            notes=data.notes,
        ))

    db.commit()
    return _load_ot(db, ot_id)


# --- Knowledge Base ---

@router.post("/{ot_id}/knowledge", response_model=KnowledgeBaseOut)
def add_knowledge(
    ot_id: int,
    data: KnowledgeBaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = KnowledgeBase(
        **data.model_dump(),
        work_order_id=ot_id,
        created_by_id=current_user.id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/knowledge/search", response_model=List[KnowledgeBaseOut])
def search_knowledge(
    q: str = Query(""),
    equipment_type: str = "",
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = db.query(KnowledgeBase).options(joinedload(KnowledgeBase.created_by))
    if q:
        query = query.filter(
            KnowledgeBase.symptoms.ilike(f"%{q}%")
            | KnowledgeBase.diagnosis.ilike(f"%{q}%")
            | KnowledgeBase.solution.ilike(f"%{q}%")
            | KnowledgeBase.tags.ilike(f"%{q}%")
        )
    if equipment_type:
        query = query.filter(KnowledgeBase.equipment_type.ilike(f"%{equipment_type}%"))
    return query.order_by(KnowledgeBase.created_at.desc()).limit(20).all()


# --- AI endpoints ---

@router.post("/{ot_id}/ai/suggest-diagnosis")
async def suggest_diagnosis(
    ot_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    ot = db.query(WorkOrder).filter(WorkOrder.id == ot_id).first()
    if not ot:
        raise HTTPException(status_code=404, detail="OT no encontrada")

    similar = (
        db.query(KnowledgeBase)
        .filter(KnowledgeBase.equipment_type.ilike(f"%{ot.equipment_type}%"))
        .limit(5)
        .all()
    )
    kb_list = [
        {"equipment_type": k.equipment_type, "brand": k.brand, "model": k.model,
         "symptoms": k.symptoms, "diagnosis": k.diagnosis, "solution": k.solution}
        for k in similar
    ]
    result = await ai_service.suggest_diagnosis(
        ot.reported_problem, ot.equipment_type, ot.model or "", kb_list
    )
    return {"suggestion": result}


@router.post("/{ot_id}/ai/generate-report")
async def generate_report(
    ot_id: int,
    diagnosis: str = "",
    solution: str = "",
    components: str = "",
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    ot = _load_ot(db, ot_id)
    kb_list = []
    if ot.knowledge_entry:
        kb_list = [{
            "equipment_type": ot.knowledge_entry.equipment_type,
            "symptoms": ot.knowledge_entry.symptoms,
            "diagnosis": ot.knowledge_entry.diagnosis,
            "solution": ot.knowledge_entry.solution,
        }]
    ot_data = {
        "ot_number": ot.ot_number,
        "client": ot.client.name,
        "equipment_type": ot.equipment_type,
        "brand": ot.brand,
        "model": ot.model,
        "serial_number": ot.serial_number,
        "reported_problem": ot.reported_problem,
        "diagnosis": diagnosis,
        "solution": solution,
        "components_replaced": components,
    }
    result = await ai_service.generate_technical_report(ot_data, kb_list)
    return {"report": result}


@router.get("/{ot_id}/report/pdf")
def download_report_pdf(
    ot_id: int,
    report_text: str = "",
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    from fastapi import Response
    from ..services.pdf_service import generate_report_pdf
    ot = _load_ot(db, ot_id)
    pdf_bytes = generate_report_pdf(ot, report_text or ot.internal_notes or "Sin contenido")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{ot.ot_number}-informe.pdf"'},
    )
