from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, timedelta, date

from ..database import get_db
from ..models.invoice import Invoice, InvoiceStatus
from ..models.expense import Expense
from ..dependencies import get_current_user

router = APIRouter(prefix="/finances", tags=["finances"])


def _month_range(offset: int = 0):
    now = datetime.now(timezone.utc)
    year = now.year
    month = now.month - offset
    while month <= 0:
        month += 12
        year -= 1
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1)
    else:
        end = date(year, month + 1, 1)
    return start, end


@router.get("/stats")
def get_financial_stats(db: Session = Depends(get_db), _=Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    month_start, month_end = _month_range(0)

    # Revenue (invoices)
    total_invoiced_month = (
        db.query(func.coalesce(func.sum(Invoice.id), 0)).scalar() or 0
    )
    # Use subquery approach for totals — sum from items
    from ..models.invoice import InvoiceItem
    from sqlalchemy import and_

    def invoice_total_subq(status_filter=None, date_filter=None):
        q = (
            db.query(func.coalesce(func.sum(InvoiceItem.quantity * InvoiceItem.unit_price), 0))
            .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
        )
        if status_filter:
            q = q.filter(Invoice.status.in_(status_filter))
        if date_filter:
            q = q.filter(Invoice.issue_date >= date_filter[0], Invoice.issue_date < date_filter[1])
        return q.scalar() or 0

    invoiced_month = invoice_total_subq(
        status_filter=[InvoiceStatus.emitida, InvoiceStatus.pagada, InvoiceStatus.vencida],
        date_filter=(month_start, month_end),
    )
    collected_month = invoice_total_subq(
        status_filter=[InvoiceStatus.pagada],
        date_filter=(month_start, month_end),
    )
    pending_collection = invoice_total_subq(
        status_filter=[InvoiceStatus.emitida, InvoiceStatus.vencida],
    )

    # Expenses
    def expense_total(date_filter=None, category=None):
        q = db.query(func.coalesce(func.sum(Expense.amount), 0))
        if date_filter:
            q = q.filter(Expense.expense_date >= date_filter[0], Expense.expense_date < date_filter[1])
        if category:
            q = q.filter(Expense.category == category)
        return q.scalar() or 0

    expenses_month = expense_total(date_filter=(month_start, month_end))
    balance_month = invoiced_month - expenses_month

    # Monthly trend (last 6 months)
    monthly = []
    for i in range(5, -1, -1):
        start, end = _month_range(i)
        rev = invoice_total_subq(
            status_filter=[InvoiceStatus.emitida, InvoiceStatus.pagada, InvoiceStatus.vencida],
            date_filter=(start, end),
        )
        exp = expense_total(date_filter=(start, end))
        monthly.append({
            "month": start.strftime("%b %Y"),
            "ingresos": round(rev, 2),
            "gastos": round(exp, 2),
        })

    # Expenses by category (current month)
    cat_rows = (
        db.query(Expense.category, func.sum(Expense.amount).label("total"))
        .filter(Expense.expense_date >= month_start, Expense.expense_date < month_end)
        .group_by(Expense.category)
        .all()
    )
    by_category = [{"category": r.category, "total": round(r.total or 0, 2)} for r in cat_rows]

    # Outstanding invoices count
    overdue_count = (
        db.query(func.count(Invoice.id))
        .filter(
            Invoice.status == InvoiceStatus.vencida,
        )
        .scalar() or 0
    )

    # Top clients by revenue (all time)
    from ..models.client import Client
    top_clients_rows = (
        db.query(Client.name, func.coalesce(func.sum(InvoiceItem.quantity * InvoiceItem.unit_price), 0).label("total"))
        .join(Invoice, Invoice.client_id == Client.id)
        .join(InvoiceItem, InvoiceItem.invoice_id == Invoice.id)
        .filter(Invoice.status.in_([InvoiceStatus.emitida, InvoiceStatus.pagada]))
        .group_by(Client.id)
        .order_by(func.sum(InvoiceItem.quantity * InvoiceItem.unit_price).desc())
        .limit(5)
        .all()
    )
    top_clients = [{"name": r.name, "total": round(r.total, 2)} for r in top_clients_rows]

    return {
        "invoiced_month": round(invoiced_month, 2),
        "collected_month": round(collected_month, 2),
        "expenses_month": round(expenses_month, 2),
        "balance_month": round(balance_month, 2),
        "pending_collection": round(pending_collection, 2),
        "overdue_count": overdue_count,
        "monthly_trend": monthly,
        "by_category": by_category,
        "top_clients": top_clients,
    }
