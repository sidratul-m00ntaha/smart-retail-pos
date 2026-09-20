from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.purchase import Purchase, SupplierPayment
from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate, SupplierOut, SupplierPaymentCreate, SupplierPaymentOut, SupplierUpdate
from app.services import module_stubs


def _to_out(db: Session, s: Supplier) -> SupplierOut:
    total = db.query(func.coalesce(func.sum(Purchase.Total), 0)).filter(
        Purchase.SupplierID == s.SupplierID
    ).scalar()
    due = db.query(func.coalesce(func.sum(Purchase.Due), 0)).filter(
        Purchase.SupplierID == s.SupplierID
    ).scalar()
    return SupplierOut(
        SupplierID=s.SupplierID, Name=s.Name, Phone=s.Phone, Email=s.Email,
        Address=s.Address, Status=s.Status, CreatedAt=s.CreatedAt,
        TotalPurchases=Decimal(total), Due=Decimal(due),
    )


def list_suppliers(db: Session, search: Optional[str] = None, status_filter: Optional[str] = None) -> List[SupplierOut]:
    q = db.query(Supplier)
    if search:
        q = q.filter(Supplier.Name.ilike(f"%{search}%"))
    if status_filter and status_filter != "All":
        q = q.filter(Supplier.Status == status_filter)
    return [_to_out(db, s) for s in q.order_by(Supplier.Name).all()]


def get_supplier(db: Session, supplier_id: int) -> Supplier:
    s = db.get(Supplier, supplier_id)
    if not s:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Supplier not found.")
    return s


def create_supplier(db: Session, data: SupplierCreate) -> SupplierOut:
    s = Supplier(**data.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return _to_out(db, s)


def update_supplier(db: Session, supplier_id: int, data: SupplierUpdate) -> SupplierOut:
    s = get_supplier(db, supplier_id)
    for field, value in data.model_dump().items():
        setattr(s, field, value)
    db.commit()
    db.refresh(s)
    return _to_out(db, s)


def pay_supplier(db: Session, supplier_id: int, data: SupplierPaymentCreate, user_id: Optional[int]) -> SupplierOut:
    """
    Records a payment and pays down the supplier's open purchases oldest-first
    (FIFO), since the prototype tracked one lump due per supplier but real
    accounting needs the due tied back to specific purchases.
    """
    s = get_supplier(db, supplier_id)
    current = _to_out(db, s)
    if data.Amount <= 0 or data.Amount > current.Due:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Payment amount can't exceed the outstanding due.")

    db.add(SupplierPayment(
        SupplierID=supplier_id, PurchaseID=data.PurchaseID,
        Amount=data.Amount, Method=data.Method, CreatedByUserID=user_id,
    ))

    remaining = data.Amount
    open_purchases = (
        db.query(Purchase)
        .filter(Purchase.SupplierID == supplier_id, Purchase.Due > 0)
        .order_by(Purchase.PurchaseDate)
        .all()
    )
    for p in open_purchases:
        if remaining <= 0:
            break
        applied = min(p.Due, remaining)
        p.Due -= applied
        p.Paid += applied
        remaining -= applied

    module_stubs.log_activity(db, user_id, "supplier_payment", f"Paid {data.Amount} to supplier #{supplier_id}")

    db.commit()
    db.refresh(s)
    return _to_out(db, s)


def list_payments(db: Session, search: Optional[str] = None) -> List[SupplierPaymentOut]:
    q = db.query(SupplierPayment).join(Supplier, SupplierPayment.SupplierID == Supplier.SupplierID)
    if search:
        like = f"%{search}%"
        q = q.outerjoin(Purchase, SupplierPayment.PurchaseID == Purchase.PurchaseID).filter(
            (Supplier.Name.ilike(like)) | (Purchase.PurchaseNo.ilike(like))
        )
    rows = q.order_by(SupplierPayment.PaymentDate.desc()).all()
    return [
        SupplierPaymentOut(
            PaymentID=p.PaymentID, SupplierID=p.SupplierID,
            SupplierName=p.supplier.Name if p.supplier else None,
            PurchaseID=p.PurchaseID, PurchaseNo=p.purchase.PurchaseNo if p.purchase else None,
            Amount=p.Amount, Method=p.Method, PaymentDate=p.PaymentDate,
        )
        for p in rows
    ]
