from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas.client import ClientCreate, ClientUpdate, ClientOut
from ..models.client import Client
from ..models.work_order import WorkOrder
from ..dependencies import get_current_user

router = APIRouter(prefix="/clients", tags=["clients"])


def _enrich(client: Client, db: Session) -> ClientOut:
    total = db.query(WorkOrder).filter(WorkOrder.client_id == client.id).count()
    out = ClientOut.model_validate(client)
    out.total_ots = total
    return out


@router.get("/", response_model=List[ClientOut])
def list_clients(search: str = "", db: Session = Depends(get_db), _=Depends(get_current_user)):
    q = db.query(Client)
    if search:
        q = q.filter(
            Client.name.ilike(f"%{search}%") | Client.company.ilike(f"%{search}%")
        )
    return [_enrich(c, db) for c in q.order_by(Client.name).all()]


@router.post("/", response_model=ClientOut)
def create_client(data: ClientCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    client = Client(**data.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return _enrich(client, db)


@router.get("/{client_id}", response_model=ClientOut)
def get_client(client_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return _enrich(client, db)


@router.put("/{client_id}", response_model=ClientOut)
def update_client(client_id: int, data: ClientUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(client, field, value)
    db.commit()
    db.refresh(client)
    return _enrich(client, db)


@router.delete("/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    db.delete(client)
    db.commit()
    return {"ok": True}
