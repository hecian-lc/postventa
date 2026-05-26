from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timezone

from ..database import get_db
from ..schemas.quote import QuoteCreate, QuoteUpdate, QuoteOut, QuoteSummary
from ..models.quote import Quote, QuoteItem
from ..models.work_order import WorkOrder
from ..dependencies import get_current_user
from ..models.user import User

router = APIRouter(prefix="/quotes", tags=["quotes"])


def _next_quote_number(db: Session) -> str:
    now = datetime.now(timezone.utc)
    prefix = f"PRES-{now.strftime('%Y%m')}-"
    last = db.query(Quote).filter(Quote.quote_number.like(f"{prefix}%")).order_by(Quote.id.desc()).first()
    seq = int(last.quote_number.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:04d}"


def _load(db: Session, quote_id: int) -> Quote:
    q = (
        db.query(Quote)
        .options(
            joinedload(Quote.work_order).joinedload(WorkOrder.client),
            joinedload(Quote.created_by),
            joinedload(Quote.items),
        )
        .filter(Quote.id == quote_id)
        .first()
    )
    if not q:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")
    return q


def _compute_total(quote: Quote) -> float:
    return sum(item.quantity * item.unit_price for item in quote.items)


def _to_out(q: Quote) -> QuoteOut:
    out = QuoteOut.model_validate(q)
    out.total = _compute_total(q)
    return out


def _to_summary(q: Quote) -> QuoteSummary:
    s = QuoteSummary.model_validate(q)
    s.total = _compute_total(q)
    return s


@router.get("/", response_model=List[QuoteSummary])
def list_quotes(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = db.query(Quote).options(
        joinedload(Quote.work_order).joinedload(WorkOrder.client),
        joinedload(Quote.items),
    )
    if status:
        query = query.filter(Quote.status == status)
    quotes = query.order_by(Quote.created_at.desc()).all()
    return [_to_summary(q) for q in quotes]


@router.post("/", response_model=QuoteOut)
def create_quote(
    data: QuoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not db.query(WorkOrder).filter(WorkOrder.id == data.work_order_id).first():
        raise HTTPException(status_code=404, detail="OT no encontrada")

    quote = Quote(
        quote_number=_next_quote_number(db),
        work_order_id=data.work_order_id,
        title=data.title,
        notes=data.notes,
        valid_until=data.valid_until,
        created_by_id=current_user.id,
    )
    db.add(quote)
    db.flush()

    for item_data in data.items:
        db.add(QuoteItem(quote_id=quote.id, **item_data.model_dump()))

    db.commit()
    return _to_out(_load(db, quote.id))


@router.get("/{quote_id}", response_model=QuoteOut)
def get_quote(quote_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return _to_out(_load(db, quote_id))


@router.put("/{quote_id}", response_model=QuoteOut)
def update_quote(
    quote_id: int,
    data: QuoteUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")

    for k, v in data.model_dump(exclude_none=True, exclude={"items"}).items():
        setattr(quote, k, v)

    if data.items is not None:
        db.query(QuoteItem).filter(QuoteItem.quote_id == quote_id).delete()
        for item_data in data.items:
            db.add(QuoteItem(quote_id=quote_id, **item_data.model_dump()))

    db.commit()
    return _to_out(_load(db, quote_id))


@router.delete("/{quote_id}")
def delete_quote(quote_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")
    db.delete(quote)
    db.commit()
    return {"ok": True}


@router.get("/{quote_id}/pdf")
def download_quote_pdf(quote_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    from ..services.pdf_service import generate_quote_pdf
    quote = _load(db, quote_id)
    pdf_bytes = generate_quote_pdf(quote)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{quote.quote_number}.pdf"'},
    )
