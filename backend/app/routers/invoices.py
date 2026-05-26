from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date, datetime, timezone

from ..database import get_db
from ..schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceOut, InvoiceSummary
from ..models.invoice import Invoice, InvoiceItem, InvoiceStatus
from ..models.client import Client
from ..models.quote import Quote
from ..dependencies import get_current_user
from ..models.user import User

router = APIRouter(prefix="/invoices", tags=["invoices"])


def _next_invoice_number(db: Session) -> str:
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    prefix = f"FAC-{now.strftime('%Y%m')}-"
    last = db.query(Invoice).filter(Invoice.invoice_number.like(f"{prefix}%")).order_by(Invoice.id.desc()).first()
    seq = int(last.invoice_number.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:04d}"


def _load(db: Session, invoice_id: int) -> Invoice:
    inv = (
        db.query(Invoice)
        .options(
            joinedload(Invoice.client),
            joinedload(Invoice.work_order),
            joinedload(Invoice.created_by),
            joinedload(Invoice.items),
        )
        .filter(Invoice.id == invoice_id)
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return inv


def _compute_total(inv: Invoice) -> float:
    return sum(i.quantity * i.unit_price for i in inv.items)


def _to_out(inv: Invoice) -> InvoiceOut:
    out = InvoiceOut.model_validate(inv)
    out.total = _compute_total(inv)
    return out


def _to_summary(inv: Invoice) -> InvoiceSummary:
    s = InvoiceSummary.model_validate(inv)
    s.total = _compute_total(inv)
    return s


@router.get("/", response_model=List[InvoiceSummary])
def list_invoices(
    status: Optional[InvoiceStatus] = None,
    client_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(Invoice).options(
        joinedload(Invoice.client),
        joinedload(Invoice.work_order),
        joinedload(Invoice.items),
    )
    if status:
        q = q.filter(Invoice.status == status)
    if client_id:
        q = q.filter(Invoice.client_id == client_id)
    if date_from:
        q = q.filter(Invoice.issue_date >= date_from)
    if date_to:
        q = q.filter(Invoice.issue_date <= date_to)

    # Auto-mark overdue
    today = datetime.now(timezone.utc).date()
    invs = q.order_by(Invoice.issue_date.desc()).all()
    for inv in invs:
        if inv.status == InvoiceStatus.emitida and inv.due_date and inv.due_date < today:
            inv.status = InvoiceStatus.vencida
    db.commit()

    return [_to_summary(inv) for inv in invs]


@router.post("/", response_model=InvoiceOut)
def create_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not db.query(Client).filter(Client.id == data.client_id).first():
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    items = data.items
    # Auto-populate from quote if provided and no items given
    if data.quote_id and not items:
        quote = db.query(Quote).options(joinedload(Quote.items)).filter(Quote.id == data.quote_id).first()
        if quote:
            items = [{"description": i.description, "quantity": i.quantity, "unit_price": i.unit_price}
                     for i in quote.items]

    invoice = Invoice(
        invoice_number=_next_invoice_number(db),
        client_id=data.client_id,
        work_order_id=data.work_order_id,
        quote_id=data.quote_id,
        issue_date=data.issue_date,
        due_date=data.due_date,
        notes=data.notes,
        created_by_id=current_user.id,
    )
    db.add(invoice)
    db.flush()

    for item_data in items:
        if isinstance(item_data, dict):
            db.add(InvoiceItem(invoice_id=invoice.id, **item_data))
        else:
            db.add(InvoiceItem(invoice_id=invoice.id, **item_data.model_dump()))

    db.commit()
    return _to_out(_load(db, invoice.id))


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(invoice_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return _to_out(_load(db, invoice_id))


@router.put("/{invoice_id}", response_model=InvoiceOut)
def update_invoice(
    invoice_id: int,
    data: InvoiceUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    for k, v in data.model_dump(exclude_none=True, exclude={"items"}).items():
        setattr(invoice, k, v)

    if data.items is not None:
        db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice_id).delete()
        for item_data in data.items:
            db.add(InvoiceItem(invoice_id=invoice_id, **item_data.model_dump()))

    db.commit()
    return _to_out(_load(db, invoice_id))


@router.delete("/{invoice_id}")
def delete_invoice(invoice_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    db.delete(invoice)
    db.commit()
    return {"ok": True}


@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(invoice_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    from ..services.pdf_service import generate_invoice_pdf
    invoice = _load(db, invoice_id)
    pdf_bytes = generate_invoice_pdf(invoice)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{invoice.invoice_number}.pdf"'},
    )
