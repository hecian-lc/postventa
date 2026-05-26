from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, timedelta
from ..database import get_db
from ..models.work_order import WorkOrder, OTStatus
from ..dependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

ACTIVE_STATUSES = [
    OTStatus.recibido, OTStatus.verificando, OTStatus.pendiente_verificacion,
    OTStatus.pendiente_aprobacion, OTStatus.esperando_repuestos,
    OTStatus.en_reparacion, OTStatus.reparado, OTStatus.listo_entrega,
]


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), _=Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    counts_by_status = (
        db.query(WorkOrder.status, func.count(WorkOrder.id))
        .group_by(WorkOrder.status)
        .all()
    )
    by_status = {s.value: 0 for s in OTStatus}
    for status, count in counts_by_status:
        by_status[status] = count

    total_active = sum(by_status.get(s, 0) for s in ACTIVE_STATUSES)

    overdue = (
        db.query(func.count(WorkOrder.id))
        .filter(
            WorkOrder.estimated_delivery < now,
            WorkOrder.status.in_(ACTIVE_STATUSES),
        )
        .scalar()
    )

    month_received = (
        db.query(func.count(WorkOrder.id))
        .filter(WorkOrder.received_at >= month_start)
        .scalar()
    )
    month_delivered = (
        db.query(func.count(WorkOrder.id))
        .filter(WorkOrder.actual_delivery >= month_start)
        .scalar()
    )

    # Last 6 months OT count
    monthly = []
    for i in range(5, -1, -1):
        d = now - timedelta(days=30 * i)
        start = d.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if start.month == 12:
            end = start.replace(year=start.year + 1, month=1)
        else:
            end = start.replace(month=start.month + 1)
        count = (
            db.query(func.count(WorkOrder.id))
            .filter(WorkOrder.received_at >= start, WorkOrder.received_at < end)
            .scalar()
        )
        monthly.append({"month": start.strftime("%b %Y"), "ots": count})

    return {
        "by_status": by_status,
        "total_active": total_active,
        "overdue": overdue,
        "month_received": month_received,
        "month_delivered": month_delivered,
        "monthly_trend": monthly,
    }


@router.get("/overdue")
def get_overdue(db: Session = Depends(get_db), _=Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    ots = (
        db.query(WorkOrder)
        .filter(
            WorkOrder.estimated_delivery < now,
            WorkOrder.status.in_(ACTIVE_STATUSES),
        )
        .order_by(WorkOrder.estimated_delivery.asc())
        .limit(10)
        .all()
    )
    return [
        {
            "id": ot.id,
            "ot_number": ot.ot_number,
            "equipment_type": ot.equipment_type,
            "status": ot.status,
            "estimated_delivery": ot.estimated_delivery,
        }
        for ot in ots
    ]
