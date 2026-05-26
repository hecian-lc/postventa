from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date

from ..database import get_db
from ..schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseOut
from ..models.expense import Expense, ExpenseCategory
from ..dependencies import get_current_user
from ..models.user import User

router = APIRouter(prefix="/expenses", tags=["expenses"])


def _load(db: Session, expense_id: int) -> Expense:
    e = (
        db.query(Expense)
        .options(joinedload(Expense.created_by), joinedload(Expense.work_order))
        .filter(Expense.id == expense_id)
        .first()
    )
    if not e:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    return e


@router.get("/", response_model=List[ExpenseOut])
def list_expenses(
    category: Optional[ExpenseCategory] = None,
    work_order_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(Expense).options(
        joinedload(Expense.created_by), joinedload(Expense.work_order)
    )
    if category:
        q = q.filter(Expense.category == category)
    if work_order_id:
        q = q.filter(Expense.work_order_id == work_order_id)
    if date_from:
        q = q.filter(Expense.expense_date >= date_from)
    if date_to:
        q = q.filter(Expense.expense_date <= date_to)
    return q.order_by(Expense.expense_date.desc()).all()


@router.post("/", response_model=ExpenseOut)
def create_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = Expense(**data.model_dump(), created_by_id=current_user.id)
    db.add(expense)
    db.commit()
    return _load(db, expense.id)


@router.put("/{expense_id}", response_model=ExpenseOut)
def update_expense(
    expense_id: int,
    data: ExpenseUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(expense, k, v)
    db.commit()
    return _load(db, expense_id)


@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    db.delete(expense)
    db.commit()
    return {"ok": True}


@router.get("/summary/by-category")
def summary_by_category(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    from sqlalchemy import func
    q = db.query(Expense.category, func.sum(Expense.amount).label("total"))
    if date_from:
        q = q.filter(Expense.expense_date >= date_from)
    if date_to:
        q = q.filter(Expense.expense_date <= date_to)
    rows = q.group_by(Expense.category).all()
    return [{"category": r.category, "total": r.total or 0} for r in rows]
