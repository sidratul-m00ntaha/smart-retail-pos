"""Business logic for the small supporting catalogs (PRD 5.4, 5.16).

Per convention: these functions do NOT call db.commit() - the router commits
once, so a failing request never leaves a half-written row.
"""
from typing import Optional, Type

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Brand, Category, TaxRate, Unit, User
from app.services.activity_log_service import log_activity


def _get_or_404(db: Session, model: Type, pk_value: int, label: str):
    obj = db.get(model, pk_value)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{label} not found")
    return obj


def _check_unique_name(db: Session, model: Type, name: str, pk_field: str, exclude_id: Optional[int] = None):
    existing = db.scalar(select(model).where(model.name == name))
    if existing and getattr(existing, pk_field) != exclude_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"'{name}' already exists")


# ---------- Category ----------
def list_categories(db: Session, status_filter: Optional[str] = None):
    stmt = select(Category)
    if status_filter:
        stmt = stmt.where(Category.status == status_filter)
    return db.scalars(stmt.order_by(Category.name)).all()


def create_category(db: Session, data, current_user: User) -> Category:
    _check_unique_name(db, Category, data.name, "category_id")
    obj = Category(**data.model_dump())
    db.add(obj)
    db.flush()
    log_activity(db, current_user.user_id, "CREATE", "Category", reference=obj.name)
    return obj


def update_category(db: Session, category_id: int, data, current_user: User) -> Category:
    obj = _get_or_404(db, Category, category_id, "Category")
    changes = data.model_dump(exclude_unset=True)
    if "name" in changes:
        _check_unique_name(db, Category, changes["name"], "category_id", exclude_id=category_id)
    for key, value in changes.items():
        setattr(obj, key, value)
    db.flush()
    log_activity(db, current_user.user_id, "UPDATE", "Category", reference=obj.name)
    return obj


# ---------- Brand ----------
def list_brands(db: Session, status_filter: Optional[str] = None):
    stmt = select(Brand)
    if status_filter:
        stmt = stmt.where(Brand.status == status_filter)
    return db.scalars(stmt.order_by(Brand.name)).all()


def create_brand(db: Session, data, current_user: User) -> Brand:
    _check_unique_name(db, Brand, data.name, "brand_id")
    obj = Brand(**data.model_dump())
    db.add(obj)
    db.flush()
    log_activity(db, current_user.user_id, "CREATE", "Brand", reference=obj.name)
    return obj


def update_brand(db: Session, brand_id: int, data, current_user: User) -> Brand:
    obj = _get_or_404(db, Brand, brand_id, "Brand")
    changes = data.model_dump(exclude_unset=True)
    if "name" in changes:
        _check_unique_name(db, Brand, changes["name"], "brand_id", exclude_id=brand_id)
    for key, value in changes.items():
        setattr(obj, key, value)
    db.flush()
    log_activity(db, current_user.user_id, "UPDATE", "Brand", reference=obj.name)
    return obj


# ---------- Unit ----------
def list_units(db: Session, status_filter: Optional[str] = None):
    stmt = select(Unit)
    if status_filter:
        stmt = stmt.where(Unit.status == status_filter)
    return db.scalars(stmt.order_by(Unit.name)).all()


def create_unit(db: Session, data, current_user: User) -> Unit:
    _check_unique_name(db, Unit, data.name, "unit_id")
    obj = Unit(**data.model_dump())
    db.add(obj)
    db.flush()
    log_activity(db, current_user.user_id, "CREATE", "Unit", reference=obj.name)
    return obj


def update_unit(db: Session, unit_id: int, data, current_user: User) -> Unit:
    obj = _get_or_404(db, Unit, unit_id, "Unit")
    changes = data.model_dump(exclude_unset=True)
    if "name" in changes:
        _check_unique_name(db, Unit, changes["name"], "unit_id", exclude_id=unit_id)
    for key, value in changes.items():
        setattr(obj, key, value)
    db.flush()
    log_activity(db, current_user.user_id, "UPDATE", "Unit", reference=obj.name)
    return obj


# ---------- TaxRate ----------
def list_tax_rates(db: Session, status_filter: Optional[str] = None):
    stmt = select(TaxRate)
    if status_filter:
        stmt = stmt.where(TaxRate.status == status_filter)
    return db.scalars(stmt.order_by(TaxRate.name)).all()


def create_tax_rate(db: Session, data, current_user: User) -> TaxRate:
    _check_unique_name(db, TaxRate, data.name, "tax_rate_id")
    obj = TaxRate(**data.model_dump())
    db.add(obj)
    db.flush()
    log_activity(db, current_user.user_id, "CREATE", "TaxRate", reference=obj.name)
    return obj


def update_tax_rate(db: Session, tax_rate_id: int, data, current_user: User) -> TaxRate:
    obj = _get_or_404(db, TaxRate, tax_rate_id, "Tax rate")
    changes = data.model_dump(exclude_unset=True)
    if "name" in changes:
        _check_unique_name(db, TaxRate, changes["name"], "tax_rate_id", exclude_id=tax_rate_id)
    for key, value in changes.items():
        setattr(obj, key, value)
    db.flush()
    log_activity(db, current_user.user_id, "UPDATE", "TaxRate", reference=obj.name)
    return obj
