"""Business logic for Products (PRD 5.3).

`find_for_sale` is the hand-off function other modules call: Module 5 (POS)
uses it to resolve a scanned barcode or typed search into a sellable
product, and Module 3 (Purchasing) uses `get_product` the same way for
purchase line items. Like every cross-module function, it never commits.
"""
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.models import Product, User
from app.schemas.product import ProductStats
from app.services.activity_log_service import log_activity


def _base_query():
    return select(Product).options(
        joinedload(Product.category),
        joinedload(Product.brand),
        joinedload(Product.unit),
        joinedload(Product.tax_rate),
    )


def list_products(
    db: Session,
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    status_filter: Optional[str] = None,
):
    stmt = _base_query()
    if search and search.strip():
        term = search.strip()
        stmt = stmt.where(
            or_(
                Product.name.contains(term, autoescape=True),
                Product.product_code.contains(term, autoescape=True),
                Product.barcode == term,
            )
        )
    if category_id:
        stmt = stmt.where(Product.category_id == category_id)
    if status_filter:
        stmt = stmt.where(Product.status == status_filter)
    return db.scalars(stmt.order_by(Product.name)).unique().all()


def get_product(db: Session, product_id: int) -> Product:
    obj = db.scalars(_base_query().where(Product.product_id == product_id)).unique().one_or_none()
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return obj


def get_stats(db: Session) -> ProductStats:
    rows = db.scalars(select(Product)).all()
    total = len(rows)
    active = sum(1 for p in rows if p.status == "active")
    low = sum(1 for p in rows if p.status == "active" and 0 < p.current_quantity <= p.reorder_level)
    out = sum(1 for p in rows if p.status == "active" and p.current_quantity == 0)
    return ProductStats(total=total, active=active, inactive=total - active, low_stock=low, out_of_stock=out)


def _check_unique_codes(db: Session, product_code: str, barcode: Optional[str], exclude_id: Optional[int] = None):
    existing = db.scalar(select(Product).where(Product.product_code == product_code))
    if existing and existing.product_id != exclude_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"SKU '{product_code}' already exists")
    if barcode:
        existing = db.scalar(select(Product).where(Product.barcode == barcode))
        if existing and existing.product_id != exclude_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Barcode '{barcode}' is already used")


def create_product(db: Session, data, current_user: User) -> Product:
    _check_unique_codes(db, data.product_code, data.barcode)
    obj = Product(**data.model_dump(), current_quantity=0)
    db.add(obj)
    db.flush()
    log_activity(db, current_user.user_id, "CREATE", "Product", reference=f"{obj.product_code} - {obj.name}")
    return get_product(db, obj.product_id)


def update_product(db: Session, product_id: int, data, current_user: User) -> Product:
    obj = get_product(db, product_id)
    changes = data.model_dump(exclude_unset=True)
    if "product_code" in changes or "barcode" in changes:
        _check_unique_codes(
            db,
            changes.get("product_code", obj.product_code),
            changes.get("barcode", obj.barcode),
            exclude_id=product_id,
        )
    for key, value in changes.items():
        setattr(obj, key, value)
    db.flush()
    log_activity(db, current_user.user_id, "UPDATE", "Product", reference=f"{obj.product_code} - {obj.name}")
    return get_product(db, product_id)


def set_status(db: Session, product_id: int, active: bool, current_user: User) -> Product:
    obj = get_product(db, product_id)
    obj.status = "active" if active else "inactive"
    db.flush()
    log_activity(db, current_user.user_id, "UPDATE", "Product", reference=f"{obj.product_code} - {obj.status}")
    return obj

def delete_product(db: Session, product_id: int, current_user: User) -> None:
    obj = get_product(db, product_id)

    log_activity(
        db,
        current_user.user_id,
        "DELETE",
        "Product",
        reference=f"{obj.product_code} - {obj.name}",
    )

    db.delete(obj)
    db.flush()
# ---------- Cross-module hand-off (used by Module 5 POS, Module 3 Purchasing) ----------
def find_for_sale(db: Session, code_or_barcode: str) -> Optional[Product]:
    """Resolve a scanned barcode or typed SKU to a product for the POS cart.
    Returns None (never raises) so the caller can fall back to manual search."""
    stmt = _base_query().where(
        or_(Product.barcode == code_or_barcode, Product.product_code == code_or_barcode)
    )
    product = db.scalars(stmt).unique().one_or_none()
    if not product or product.status != "active":
        return None
    return product
