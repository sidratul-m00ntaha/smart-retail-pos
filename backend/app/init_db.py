"""Create the database tables and the starting data.

Run from the backend folder, with .venv active:
    python -m app.init_db           creates missing tables and starting data (safe to run again)
    python -m app.init_db --reset   DELETES all tables and data, then creates everything again
"""
import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models  # noqa: F401  (loads every table definition)
from app.core.config import settings
from app.core.permissions import PERMISSIONS, ROLES
from app.core.security import hash_password
from app.database import Base, SessionLocal, engine
from app.models import Permission, Role, StoreSetting, User

def seed_roles_and_permissions(db: Session) -> None:
    permissions = {}

    for code, description in PERMISSIONS.items():
        permission = db.scalar(
            select(Permission).where(Permission.code == code)
        )

        if permission is None:
            permission = Permission(
                code=code,
                description=description,
            )
            db.add(permission)

        permissions[code] = permission

    for name, (description, codes) in ROLES.items():
        role = db.scalar(
            select(Role).where(Role.name == name)
        )

        if role is None:
            role = Role(
                name=name,
                description=description,
            )
            db.add(role)

        # Keep the database synchronized with the role definition.
        role.permissions = [
            permissions[code]
            for code in sorted(codes)
        ]

    db.flush()


def seed_store_settings(db: Session) -> None:
    if db.get(StoreSetting, 1) is None:
        db.add(StoreSetting(store_setting_id=1, store_name="Smart Retail Store", currency_code="BDT", invoice_prefix="INV"))


def seed_first_admin(db: Session) -> None:
    if db.scalar(select(User).where(User.username == settings.first_admin_username)):
        return  # already exists
    if not settings.first_admin_password:
        sys.exit("FIRST_ADMIN_PASSWORD is missing in backend/.env - add it and run this again.")

    admin_role = db.scalar(select(Role).where(Role.name == "Admin"))
    db.add(User(
        full_name="Administrator",
        username=settings.first_admin_username,
        email=settings.first_admin_email,
        password_hash=hash_password(settings.first_admin_password),
        role=admin_role,
    ))


def main() -> None:
    if "--reset" in sys.argv:
        answer = input("This DELETES all tables and data in your local database. Type yes to continue: ")
        if answer.strip().lower() != "yes":
            print("Cancelled - nothing was changed.")
            return
        Base.metadata.drop_all(engine)
        print("All tables deleted.")

    Base.metadata.create_all(engine)
    print("Tables are ready:", ", ".join(sorted(Base.metadata.tables)))

    with SessionLocal() as db:
        seed_roles_and_permissions(db)
        seed_store_settings(db)
        seed_first_admin(db)
        db.commit()  # all starting data is saved together, or none of it

    print(f"Starting data is ready. Log in as '{settings.first_admin_username}' with FIRST_ADMIN_PASSWORD.")


if __name__ == "__main__":
    main()
