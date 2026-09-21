# # from decimal import Decimal
# # from typing import List, Optional

# # from fastapi import HTTPException, status
# # from sqlalchemy import func
# # from sqlalchemy.orm import Session

# # from app.models.purchase import Purchase, SupplierPayment
# # from app.models.supplier import Supplier
# # from app.schemas.supplier import SupplierCreate, SupplierOut, SupplierPaymentCreate, SupplierPaymentOut, SupplierUpdate
# # from app.services import module_stubs


# # def _to_out(db: Session, s: Supplier) -> SupplierOut:
# #     total = db.query(func.coalesce(func.sum(Purchase.Total), 0)).filter(
# #         Purchase.SupplierID == s.SupplierID
# #     ).scalar()
# #     due = db.query(func.coalesce(func.sum(Purchase.Due), 0)).filter(
# #         Purchase.SupplierID == s.SupplierID
# #     ).scalar()
# #     return SupplierOut(
# #         SupplierID=s.SupplierID, Name=s.Name, Phone=s.Phone, Email=s.Email,
# #         Address=s.Address, Status=s.Status, CreatedAt=s.CreatedAt,
# #         TotalPurchases=Decimal(total), Due=Decimal(due),
# #     )


# # def list_suppliers(db: Session, search: Optional[str] = None, status_filter: Optional[str] = None) -> List[SupplierOut]:
# #     q = db.query(Supplier)
# #     if search:
# #         q = q.filter(Supplier.Name.ilike(f"%{search}%"))
# #     if status_filter and status_filter != "All":
# #         q = q.filter(Supplier.Status == status_filter)
# #     return [_to_out(db, s) for s in q.order_by(Supplier.Name).all()]


# # def get_supplier(db: Session, supplier_id: int) -> Supplier:
# #     s = db.get(Supplier, supplier_id)
# #     if not s:
# #         raise HTTPException(status.HTTP_404_NOT_FOUND, "Supplier not found.")
# #     return s


# # def create_supplier(db: Session, data: SupplierCreate) -> SupplierOut:
# #     s = Supplier(**data.model_dump())
# #     db.add(s)
# #     db.commit()
# #     db.refresh(s)
# #     return _to_out(db, s)


# # def update_supplier(db: Session, supplier_id: int, data: SupplierUpdate) -> SupplierOut:
# #     s = get_supplier(db, supplier_id)
# #     for field, value in data.model_dump().items():
# #         setattr(s, field, value)
# #     db.commit()
# #     db.refresh(s)
# #     return _to_out(db, s)


# # def pay_supplier(db: Session, supplier_id: int, data: SupplierPaymentCreate, user_id: Optional[int]) -> SupplierOut:
# #     """
# #     Records a payment and pays down the supplier's open purchases oldest-first
# #     (FIFO), since the prototype tracked one lump due per supplier but real
# #     accounting needs the due tied back to specific purchases.
# #     """
# #     s = get_supplier(db, supplier_id)
# #     current = _to_out(db, s)
# #     if data.Amount <= 0 or data.Amount > current.Due:
# #         raise HTTPException(status.HTTP_400_BAD_REQUEST, "Payment amount can't exceed the outstanding due.")

# #     db.add(SupplierPayment(
# #         SupplierID=supplier_id, PurchaseID=data.PurchaseID,
# #         Amount=data.Amount, Method=data.Method, CreatedByUserID=user_id,
# #     ))

# #     remaining = data.Amount
# #     open_purchases = (
# #         db.query(Purchase)
# #         .filter(Purchase.SupplierID == supplier_id, Purchase.Due > 0)
# #         .order_by(Purchase.PurchaseDate)
# #         .all()
# #     )
# #     for p in open_purchases:
# #         if remaining <= 0:
# #             break
# #         applied = min(p.Due, remaining)
# #         p.Due -= applied
# #         p.Paid += applied
# #         remaining -= applied

# #     module_stubs.log_activity(db, user_id, "supplier_payment", f"Paid {data.Amount} to supplier #{supplier_id}")

# #     db.commit()
# #     db.refresh(s)
# #     return _to_out(db, s)


# # def list_payments(db: Session, search: Optional[str] = None) -> List[SupplierPaymentOut]:
# #     q = db.query(SupplierPayment).join(Supplier, SupplierPayment.SupplierID == Supplier.SupplierID)
# #     if search:
# #         like = f"%{search}%"
# #         q = q.outerjoin(Purchase, SupplierPayment.PurchaseID == Purchase.PurchaseID).filter(
# #             (Supplier.Name.ilike(like)) | (Purchase.PurchaseNo.ilike(like))
# #         )
# #     rows = q.order_by(SupplierPayment.PaymentDate.desc()).all()
# #     return [
# #         SupplierPaymentOut(
# #             PaymentID=p.PaymentID, SupplierID=p.SupplierID,
# #             SupplierName=p.supplier.Name if p.supplier else None,
# #             PurchaseID=p.PurchaseID, PurchaseNo=p.purchase.PurchaseNo if p.purchase else None,
# #             Amount=p.Amount, Method=p.Method, PaymentDate=p.PaymentDate,
# #         )
# #         for p in rows
# #     ]





# #------------------------------------------
# """Supplier management (PRD 5.5) and each supplier's totals (PRD 5.7).

# Per team convention these functions never call db.commit(): the router commits once, so a failing
# request never leaves half-saved rows.
# """
# from decimal import Decimal

# from fastapi import HTTPException, status
# from sqlalchemy import func, or_, select
# from sqlalchemy.orm import Session

# from app.models import Purchase, Supplier, User
# from app.schemas.supplier import SupplierCreate, SupplierOut, SupplierUpdate
# from app.services.activity_log_service import log_activity
# from app.services.purchase_calculator import money

# ZERO = Decimal("0.00")
# # supplier_id -> (purchase count, total purchases, total paid, outstanding due)
# Totals = tuple[int, Decimal, Decimal, Decimal]
# NO_TOTALS: Totals = (0, ZERO, ZERO, ZERO)


# def supplier_totals(db: Session, supplier_id: int | None = None) -> dict[int, Totals]:
#     """Total purchases, total paid and outstanding due for every supplier that has purchases, in one query."""
#     query = select(
#         Purchase.supplier_id,
#         func.count(Purchase.purchase_id),
#         func.coalesce(func.sum(Purchase.total_amount), 0),
#         func.coalesce(func.sum(Purchase.paid_amount), 0),
#         func.coalesce(func.sum(Purchase.due_amount), 0),
#     ).group_by(Purchase.supplier_id)
#     if supplier_id is not None:
#         query = query.where(Purchase.supplier_id == supplier_id)
#     return {
#         row[0]: (row[1], money(Decimal(str(row[2]))), money(Decimal(str(row[3]))), money(Decimal(str(row[4]))))
#         for row in db.execute(query)
#     }


# def to_supplier_out(supplier: Supplier, totals: Totals = NO_TOTALS) -> SupplierOut:
#     count, total, paid, due = totals
#     return SupplierOut(
#         supplier_id=supplier.supplier_id,
#         name=supplier.name,
#         phone=supplier.phone,
#         email=supplier.email,
#         address=supplier.address,
#         status=supplier.status,
#         purchase_count=count,
#         total_purchases=total,
#         total_paid=paid,
#         outstanding_due=due,
#         created_at=supplier.created_at,
#         updated_at=supplier.updated_at,
#     )


# def list_suppliers(db: Session, search: str | None = None, status_filter: str | None = None) -> list[SupplierOut]:
#     query = select(Supplier).order_by(Supplier.name)
#     if search and search.strip():
#         term = search.strip()
#         query = query.where(
#             or_(
#                 Supplier.name.contains(term, autoescape=True),
#                 Supplier.phone.contains(term, autoescape=True),
#                 Supplier.email.contains(term, autoescape=True),
#             )
#         )
#     if status_filter:
#         query = query.where(Supplier.status == status_filter)
#     totals = supplier_totals(db)
#     return [to_supplier_out(s, totals.get(s.supplier_id, NO_TOTALS)) for s in db.scalars(query)]


# def get_supplier_or_404(db: Session, supplier_id: int) -> Supplier:
#     supplier = db.get(Supplier, supplier_id)
#     if supplier is None:
#         raise HTTPException(status.HTTP_404_NOT_FOUND, "Supplier not found.")
#     return supplier


# def get_supplier_out(db: Session, supplier_id: int) -> SupplierOut:
#     supplier = get_supplier_or_404(db, supplier_id)
#     return to_supplier_out(supplier, supplier_totals(db, supplier_id).get(supplier_id, NO_TOTALS))


# def require_active_supplier(db: Session, supplier_id: int) -> Supplier:
#     """The supplier of a new purchase: it must exist and be active (PRD 5.5)."""
#     supplier = get_supplier_or_404(db, supplier_id)
#     if supplier.status != "active":
#         raise HTTPException(status.HTTP_400_BAD_REQUEST, f"'{supplier.name}' is inactive and can't be used for a new purchase.")
#     return supplier


# def create_supplier(db: Session, data: SupplierCreate, current_user: User) -> Supplier:
#     _check_name_is_free(db, data.name)
#     supplier = Supplier(**data.model_dump())
#     db.add(supplier)
#     db.flush()  # gives the supplier its supplier_id
#     log_activity(db, current_user.user_id, "CREATE", "Supplier", reference=supplier.name, details=f"Phone: {supplier.phone}")
#     return supplier


# def update_supplier(db: Session, supplier_id: int, data: SupplierUpdate, current_user: User) -> Supplier:
#     supplier = get_supplier_or_404(db, supplier_id)
#     _check_name_is_free(db, data.name, except_supplier_id=supplier_id)

#     changes = _describe_changes(supplier, data)
#     for field, value in data.model_dump().items():
#         setattr(supplier, field, value)
#     if changes:
#         log_activity(db, current_user.user_id, "UPDATE", "Supplier", reference=supplier.name, details="; ".join(changes)[:500])
#     return supplier


# def _check_name_is_free(db: Session, name: str, except_supplier_id: int | None = None) -> None:
#     query = select(Supplier.supplier_id).where(func.lower(Supplier.name) == name.lower())
#     if except_supplier_id is not None:
#         query = query.where(Supplier.supplier_id != except_supplier_id)
#     if db.scalar(query) is not None:
#         raise HTTPException(status.HTTP_409_CONFLICT, f"A supplier named '{name}' already exists.")


# def _describe_changes(supplier: Supplier, data: SupplierUpdate) -> list[str]:
#     changes = []
#     for field, label in (("name", "Name"), ("phone", "Phone"), ("email", "Email"), ("address", "Address")):
#         old, new = getattr(supplier, field), getattr(data, field)
#         if old != new:
#             changes.append(f"{label}: {old or '(empty)'} → {new or '(empty)'}")
#     if data.status != supplier.status:
#         changes.append("Activated" if data.status == "active" else "Deactivated")
#     return changes






















"""Supplier management (PRD 5.5) and each supplier's totals (PRD 5.7).

Per team convention these functions never call db.commit(): the router commits once, so a failing
request never leaves half-saved rows.
"""
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import Purchase, Supplier, User
from app.schemas.supplier import SupplierCreate, SupplierOut, SupplierUpdate
from app.services.activity_log_service import log_activity
from app.services.purchase_calculator import money

ZERO = Decimal("0.00")
# supplier_id -> (purchase count, total purchases, total paid, outstanding due)
Totals = tuple[int, Decimal, Decimal, Decimal]
NO_TOTALS: Totals = (0, ZERO, ZERO, ZERO)


def supplier_totals(db: Session, supplier_id: int | None = None) -> dict[int, Totals]:
    """Total purchases, total paid and outstanding due for every supplier that has purchases, in one query."""
    query = select(
        Purchase.supplier_id,
        func.count(Purchase.purchase_id),
        func.coalesce(func.sum(Purchase.total_amount), 0),
        func.coalesce(func.sum(Purchase.paid_amount), 0),
        func.coalesce(func.sum(Purchase.due_amount), 0),
    ).group_by(Purchase.supplier_id)
    if supplier_id is not None:
        query = query.where(Purchase.supplier_id == supplier_id)
    return {
        row[0]: (row[1], money(Decimal(str(row[2]))), money(Decimal(str(row[3]))), money(Decimal(str(row[4]))))
        for row in db.execute(query)
    }


def to_supplier_out(supplier: Supplier, totals: Totals = NO_TOTALS) -> SupplierOut:
    count, total, paid, due = totals
    return SupplierOut(
        supplier_id=supplier.supplier_id,
        name=supplier.name,
        phone=supplier.phone,
        email=supplier.email,
        address=supplier.address,
        status=supplier.status,
        purchase_count=count,
        total_purchases=total,
        total_paid=paid,
        outstanding_due=due,
        created_at=supplier.created_at,
        updated_at=supplier.updated_at,
    )


def list_suppliers(db: Session, search: str | None = None, status_filter: str | None = None) -> list[SupplierOut]:
    query = select(Supplier).order_by(Supplier.name)
    if search and search.strip():
        term = search.strip()
        query = query.where(
            or_(
                Supplier.name.contains(term, autoescape=True),
                Supplier.phone.contains(term, autoescape=True),
                Supplier.email.contains(term, autoescape=True),
            )
        )
    if status_filter:
        query = query.where(Supplier.status == status_filter)
    totals = supplier_totals(db)
    return [to_supplier_out(s, totals.get(s.supplier_id, NO_TOTALS)) for s in db.scalars(query)]


def get_supplier_or_404(db: Session, supplier_id: int) -> Supplier:
    supplier = db.get(Supplier, supplier_id)
    if supplier is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Supplier not found.")
    return supplier


def get_supplier_out(db: Session, supplier_id: int) -> SupplierOut:
    supplier = get_supplier_or_404(db, supplier_id)
    return to_supplier_out(supplier, supplier_totals(db, supplier_id).get(supplier_id, NO_TOTALS))


def require_active_supplier(db: Session, supplier_id: int) -> Supplier:
    """The supplier of a new purchase: it must exist and be active (PRD 5.5)."""
    supplier = get_supplier_or_404(db, supplier_id)
    if supplier.status != "active":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"'{supplier.name}' is inactive and can't be used for a new purchase.")
    return supplier


def create_supplier(db: Session, data: SupplierCreate, current_user: User) -> Supplier:
    _check_name_is_free(db, data.name)
    supplier = Supplier(**data.model_dump())
    db.add(supplier)
    db.flush()  # gives the supplier its supplier_id
    log_activity(db, current_user.user_id, "CREATE", "Supplier", reference=supplier.name, details=f"Phone: {supplier.phone}")
    return supplier


def update_supplier(db: Session, supplier_id: int, data: SupplierUpdate, current_user: User) -> Supplier:
    supplier = get_supplier_or_404(db, supplier_id)
    _check_name_is_free(db, data.name, except_supplier_id=supplier_id)

    changes = _describe_changes(supplier, data)
    for field, value in data.model_dump().items():
        setattr(supplier, field, value)
    if changes:
        log_activity(db, current_user.user_id, "UPDATE", "Supplier", reference=supplier.name, details="; ".join(changes)[:500])
    return supplier


def _check_name_is_free(db: Session, name: str, except_supplier_id: int | None = None) -> None:
    query = select(Supplier.supplier_id).where(func.lower(Supplier.name) == name.lower())
    if except_supplier_id is not None:
        query = query.where(Supplier.supplier_id != except_supplier_id)
    if db.scalar(query) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, f"A supplier named '{name}' already exists.")


def _describe_changes(supplier: Supplier, data: SupplierUpdate) -> list[str]:
    changes = []
    for field, label in (("name", "Name"), ("phone", "Phone"), ("email", "Email"), ("address", "Address")):
        old, new = getattr(supplier, field), getattr(data, field)
        if old != new:
            changes.append(f"{label}: {old or '(empty)'} → {new or '(empty)'}")
    if data.status != supplier.status:
        changes.append("Activated" if data.status == "active" else "Deactivated")
    return changes