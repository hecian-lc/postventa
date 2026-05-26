from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timezone

from ..database import get_db
from ..schemas.task import TaskCreate, TaskUpdate, TaskOut
from ..models.task import Task, TaskStatus
from ..dependencies import get_current_user
from ..models.user import User

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _load_tasks(q):
    return q.options(
        joinedload(Task.assigned_to),
        joinedload(Task.created_by),
        joinedload(Task.work_order),
    )


@router.get("/", response_model=List[TaskOut])
def list_tasks(
    status: Optional[TaskStatus] = None,
    assigned_to_id: Optional[int] = None,
    work_order_id: Optional[int] = None,
    overdue_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = _load_tasks(db.query(Task))
    if status:
        q = q.filter(Task.status == status)
    if assigned_to_id:
        q = q.filter(Task.assigned_to_id == assigned_to_id)
    if work_order_id:
        q = q.filter(Task.work_order_id == work_order_id)
    if overdue_only:
        q = q.filter(
            Task.due_date < datetime.now(timezone.utc),
            Task.status != TaskStatus.completada,
        )
    return q.order_by(Task.due_date.asc().nulls_last(), Task.created_at.desc()).all()


@router.post("/", response_model=TaskOut)
def create_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = Task(**data.model_dump(), created_by_id=current_user.id)
    db.add(task)
    db.commit()
    return _load_tasks(db.query(Task)).filter(Task.id == task.id).first()


@router.put("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(task, k, v)
    db.commit()
    return _load_tasks(db.query(Task)).filter(Task.id == task_id).first()


@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    db.delete(task)
    db.commit()
    return {"ok": True}
