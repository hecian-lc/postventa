"""Run once to create the first admin user.
   python create_admin.py
"""
import sys
from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.services.auth_service import hash_password

Base.metadata.create_all(bind=engine)

email = input("Email del admin: ").strip()
name = input("Nombre: ").strip()
password = input("Contraseña: ").strip()

db = SessionLocal()
if db.query(User).filter(User.email == email).first():
    print("Ya existe un usuario con ese email.")
    sys.exit(1)

user = User(
    email=email,
    name=name,
    role=UserRole.admin,
    hashed_password=hash_password(password),
)
db.add(user)
db.commit()
print(f"Admin '{name}' creado correctamente.")
