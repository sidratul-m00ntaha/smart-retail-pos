from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.purchase import Purchase, PurchaseItem
from app.models.supplier import Supplier
from app.schemas.purchase import PurchaseCreate, PurchaseItemOut, PurchaseOut
from app.services import module_stubs


def _next_purchase_no(db: Session) -> str:
    year = datetime.utcnow().year
    prefix = f"PUR-{year}-"
    last = (
        db.query(Purchase.PurchaseNo)
        .filter(Purchase.PurchaseNo.like(f"{prefix}%"))
        .order_by(Purchase.PurchaseNo.desc())
        .first()
    )
    seq = int(last[0].split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:04d}"


def _to_out(p: Purchase) -> PurchaseOut:
    return PurchaseOut(
        PurchaseID=p.PurchaseID, PurchaseNo=p.PurchaseNo, SupplierID=p.SupplierID,
        SupplierName=p.supplier.Name if p.supplier else None,
        PurchaseDate=p.PurchaseDate, Subtotal=p.Subtotal, Discount=p.Discount,
        VAT=p.VAT, Total=p.Total, Paid=p.Paid, Due=p.Due, Status=p.Status,
        Items=[
            PurchaseItemOut(
                PurchaseItemID=i.PurchaseItemID, ProductID=i.ProductID,
                Quantity=i.Quantity, UnitPrice=i.UnitPrice, LineTotal=i.LineTotal,
            )
            for i in p.items
        ],
    )


def list_purchases(db: Session, search: Optional[str] = None) -> List[PurchaseOut]:
    q = db.query(Purchase).join(Supplier)
    if search:
        like = f"%{search}%"
        q = q.filter((Purchase.PurchaseNo.ilike(like)) | (Supplier.Name.ilike(like)))
    return [_to_out(p) for p in q.order_by(Purchase.PurchaseDate.desc()).all()]


def get_purchase(db: Session, purchase_id: int) -> Purchase:
    p = db.get(Purchase, purchase_id)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Purchase not found.")
    return p


def create_purchase(db: Session, data: PurchaseCreate, user_id: Optional[int]) -> PurchaseOut:
    supplier = db.get(Supplier, data.SupplierID)
    if not supplier or supplier.Status != "Active":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Select an active supplier.")

    subtotal = sum((i.Quantity * i.UnitPrice for i in data.Items), Decimal("0"))
    discount = min(data.Discount, subtotal)
    taxable = subtotal - discount
    vat = (taxable * data.VATRate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    total = taxable + vat

    if data.Paid > total:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Paid amount can't exceed the grand total.")
    due = total - data.Paid

    purchase = Purchase(
        PurchaseNo=_next_purchase_no(db), SupplierID=data.SupplierID,
        Subtotal=subtotal, Discount=discount, VAT=vat, Total=total,
        Paid=data.Paid, Due=due, Status="Confirmed", CreatedByUserID=user_id,
    )
    db.add(purchase)
    db.flush()  # assigns PurchaseID without committing

    for item in data.Items:
        db.add(PurchaseItem(
            PurchaseID=purchase.PurchaseID, ProductID=item.ProductID,
            Quantity=item.Quantity, UnitPrice=item.UnitPrice,
            LineTotal=item.Quantity * item.UnitPrice,
        ))
        module_stubs.stock_in(db, item.ProductID, item.Quantity, reference=purchase.PurchaseNo)

    module_stubs.log_activity(db, user_id, "purchase_confirmed", f"Purchase {purchase.PurchaseNo} confirmed")

    # Single commit at the end (PRD 5.14 / rule 8.2): everything is saved, or nothing is.
    db.commit()
    db.refresh(purchase)
    return _to_out(purchase)
