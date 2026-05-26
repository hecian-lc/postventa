from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .database import engine, Base
from .config import settings
from .routers import auth, users, clients, work_orders, dashboard, spare_parts, quotes, tasks, expenses, invoices, finances
from . import models  # noqa: ensure all models are registered before create_all

app = FastAPI(title="PostVenta API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

static_dir = Path(__file__).parent.parent / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(clients.router)
app.include_router(work_orders.router)
app.include_router(spare_parts.router)
app.include_router(quotes.router)
app.include_router(tasks.router)
app.include_router(expenses.router)
app.include_router(invoices.router)
app.include_router(finances.router)
app.include_router(dashboard.router)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok"}
