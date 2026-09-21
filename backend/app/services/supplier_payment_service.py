# """Paying suppliers (PRD 5.7): every payment reduces what the store owes.

# A payment either belongs to ONE purchase (purchase_id given) or is spread over the supplier's oldest open
# purchases first (FIFO). Either way the purchases' paid and due amounts are updated, so:

#     supplier outstanding due  =  sum of its purchases' due_amount
#     a recorded payment reduces that due by exactly the payment amount

# Per team convention nothing here calls db.commit(): the router commits once.
# """
# from decimal import Decimal

# from fastapi import HTTPException, status
# from sqlalchemy import or_, select
# from sqlalchemy.orm import Session

# from app.models import Purchase, Supplier, SupplierPayment, User
# from app.schemas.supplier_payment import SupplierPaymentCreate, SupplierPaymentOut
# from app.services import supplier_service
# from app.services.activity_log_service import log_activity
# from app.services.purchase_calculator import money, payment_status_for


# def list_payments(db: Session, search: str | None = None, supplier_id: int | None = None) -> list[SupplierPaymentOut]:
#     """Payment history, newest first."""
#     query = (
#         select(SupplierPayment, Supplier.name, Purchase.purchase_number, User.full_name)
#         .join(Supplier, Supplier.supplier_id == SupplierPayment.supplier_id)
#         .outerjoin(Purchase, Purchase.purchase_id == SupplierPayment.purchase_id)
#         .outerjoin(User, User.user_id == SupplierPayment.created_by)
#         .order_by(SupplierPayment.created_at.desc(), SupplierPayment.supplier_payment_id.desc())
#     )
#     if search and search.strip():
#         term = search.strip()
#         query = query.where(
#             or_(Supplier.name.contains(term, autoescape=True), Purchase.purchase_number.contains(term, autoescape=True))
#         )
#     if supplier_id is not None:
#         query = query.where(SupplierPayment.supplier_id == supplier_id)
#     return [_to_out(*row) for row in db.execute(query)]


# def get_payment_out(db: Session, supplier_payment_id: int) -> SupplierPaymentOut:
#     row = db.execute(
#         select(SupplierPayment, Supplier.name, Purchase.purchase_number, User.full_name)
#         .join(Supplier, Supplier.supplier_id == SupplierPayment.supplier_id)
#         .outerjoin(Purchase, Purchase.purchase_id == SupplierPayment.purchase_id)
#         .outerjoin(User, User.user_id == SupplierPayment.created_by)
#         .where(SupplierPayment.supplier_payment_id == supplier_payment_id)
#     ).one_or_none()
#     if row is None:
#         raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found.")
#     return _to_out(*row)


# def create_payment(db: Session, data: SupplierPaymentCreate, current_user: User) -> SupplierPayment:
#     # An inactive supplier can still be paid: the store may owe it money
#     supplier = supplier_service.get_supplier_or_404(db, data.supplier_id)
#     amount = money(data.amount)

#     if data.purchase_id is not None:
#         purchase = db.get(Purchase, data.purchase_id)
#         if purchase is None or purchase.supplier_id != supplier.supplier_id:
#             raise HTTPException(status.HTTP_400_BAD_REQUEST, "That purchase doesn't belong to this supplier.")
#         due = Decimal(str(purchase.due_amount))
#         if amount > due:
#             raise HTTPException(
#                 status.HTTP_400_BAD_REQUEST, f"Purchase {purchase.purchase_number} only has {due} due. The payment can't be more."
#             )
#         _apply(purchase, amount)
#         target = f" for {purchase.purchase_number}"
#     else:
#         open_purchases = list(
#             db.scalars(
#                 select(Purchase)
#                 .where(Purchase.supplier_id == supplier.supplier_id, Purchase.due_amount > 0)
#                 .order_by(Purchase.created_at, Purchase.purchase_id)
#             )
#         )
#         outstanding = sum((Decimal(str(p.due_amount)) for p in open_purchases), Decimal("0.00"))
#         if outstanding <= 0:
#             raise HTTPException(status.HTTP_400_BAD_REQUEST, f"'{supplier.name}' has nothing due.")
#         if amount > outstanding:
#             raise HTTPException(
#                 status.HTTP_400_BAD_REQUEST, f"'{supplier.name}' only has {outstanding} due. The payment can't be more."
#             )
#         remaining = amount
#         for purchase in open_purchases:  # oldest first
#             applied = min(Decimal(str(purchase.due_amount)), remaining)
#             _apply(purchase, applied)
#             remaining -= applied
#             if remaining <= 0:
#                 break
#         target = ""

#     payment = SupplierPayment(
#         supplier_id=supplier.supplier_id,
#         purchase_id=data.purchase_id,
#         amount=amount,
#         method=data.method,
#         note=data.note,
#         created_by=current_user.user_id,
#     )
#     db.add(payment)
#     db.flush()
#     log_activity(
#         db,
#         current_user.user_id,
#         "PAYMENT",
#         "Supplier",
#         reference=supplier.name,
#         details=f"Paid {amount} by {data.method}{target}",
#     )
#     return payment


# def _apply(purchase: Purchase, amount: Decimal) -> None:
#     """Moves `amount` from the purchase's due to its paid."""
#     paid = money(Decimal(str(purchase.paid_amount)) + amount)
#     total = Decimal(str(purchase.total_amount))
#     purchase.paid_amount = paid
#     purchase.due_amount = total - paid
#     purchase.payment_status = payment_status_for(total, paid)


# def _to_out(payment: SupplierPayment, supplier_name: str, purchase_number: str | None, created_by_name: str | None) -> SupplierPaymentOut:
#     return SupplierPaymentOut(
#         supplier_payment_id=payment.supplier_payment_id,
#         supplier_id=payment.supplier_id,
#         supplier_name=supplier_name,
#         purchase_id=payment.purchase_id,
#         purchase_number=purchase_number,
#         amount=payment.amount,
#         method=payment.method,
#         note=payment.note,
#         created_by=payment.created_by,
#         created_by_name=created_by_name,
#         created_at=payment.created_at,
#     )



















"""Paying suppliers (PRD 5.7): every payment reduces what the store owes.

A payment either belongs to ONE purchase (purchase_id given) or is spread over the supplier's oldest open
purchases first (FIFO). Either way the purchases' paid and due amounts are updated, so:

    supplier outstanding due  =  sum of its purchases' due_amount
    a recorded payment reduces that due by exactly the payment amount

Per team convention nothing here calls db.commit(): the router commits once.
"""
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import Purchase, Supplier, SupplierPayment, User
from app.schemas.supplier_payment import SupplierPaymentCreate, SupplierPaymentOut
from app.services import supplier_service
from app.services.activity_log_service import log_activity
from app.services.purchase_calculator import money, payment_status_for


def list_payments(db: Session, search: str | None = None, supplier_id: int | None = None) -> list[SupplierPaymentOut]:
    """Payment history, newest first."""
    query = (
        select(SupplierPayment, Supplier.name, Purchase.purchase_number, User.full_name)
        .join(Supplier, Supplier.supplier_id == SupplierPayment.supplier_id)
        .outerjoin(Purchase, Purchase.purchase_id == SupplierPayment.purchase_id)
        .outerjoin(User, User.user_id == SupplierPayment.created_by)
        .order_by(SupplierPayment.created_at.desc(), SupplierPayment.supplier_payment_id.desc())
    )
    if search and search.strip():
        term = search.strip()
        query = query.where(
            or_(Supplier.name.contains(term, autoescape=True), Purchase.purchase_number.contains(term, autoescape=True))
        )
    if supplier_id is not None:
        query = query.where(SupplierPayment.supplier_id == supplier_id)
    return [_to_out(*row) for row in db.execute(query)]


def get_payment_out(db: Session, supplier_payment_id: int) -> SupplierPaymentOut:
    row = db.execute(
        select(SupplierPayment, Supplier.name, Purchase.purchase_number, User.full_name)
        .join(Supplier, Supplier.supplier_id == SupplierPayment.supplier_id)
        .outerjoin(Purchase, Purchase.purchase_id == SupplierPayment.purchase_id)
        .outerjoin(User, User.user_id == SupplierPayment.created_by)
        .where(SupplierPayment.supplier_payment_id == supplier_payment_id)
    ).one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found.")
    return _to_out(*row)


def create_payment(db: Session, data: SupplierPaymentCreate, current_user: User) -> SupplierPayment:
    # An inactive supplier can still be paid: the store may owe it money
    supplier = supplier_service.get_supplier_or_404(db, data.supplier_id)
    amount = money(data.amount)

    if data.purchase_id is not None:
        purchase = db.get(Purchase, data.purchase_id)
        if purchase is None or purchase.supplier_id != supplier.supplier_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "That purchase doesn't belong to this supplier.")
        due = Decimal(str(purchase.due_amount))
        if amount > due:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, f"Purchase {purchase.purchase_number} only has {due} due. The payment can't be more."
            )
        _apply(purchase, amount)
        target = f" for {purchase.purchase_number}"
    else:
        open_purchases = list(
            db.scalars(
                select(Purchase)
                .where(Purchase.supplier_id == supplier.supplier_id, Purchase.due_amount > 0)
                .order_by(Purchase.created_at, Purchase.purchase_id)
            )
        )
        outstanding = sum((Decimal(str(p.due_amount)) for p in open_purchases), Decimal("0.00"))
        if outstanding <= 0:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"'{supplier.name}' has nothing due.")
        if amount > outstanding:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, f"'{supplier.name}' only has {outstanding} due. The payment can't be more."
            )
        remaining = amount
        for purchase in open_purchases:  # oldest first
            applied = min(Decimal(str(purchase.due_amount)), remaining)
            _apply(purchase, applied)
            remaining -= applied
            if remaining <= 0:
                break
        target = ""

    payment = SupplierPayment(
        supplier_id=supplier.supplier_id,
        purchase_id=data.purchase_id,
        amount=amount,
        method=data.method,
        note=data.note,
        created_by=current_user.user_id,
    )
    db.add(payment)
    db.flush()
    log_activity(
        db,
        current_user.user_id,
        "PAYMENT",
        "Supplier",
        reference=supplier.name,
        details=f"Paid {amount} by {data.method}{target}",
    )
    return payment


def _apply(purchase: Purchase, amount: Decimal) -> None:
    """Moves `amount` from the purchase's due to its paid."""
    paid = money(Decimal(str(purchase.paid_amount)) + amount)
    total = Decimal(str(purchase.total_amount))
    purchase.paid_amount = paid
    purchase.due_amount = total - paid
    purchase.payment_status = payment_status_for(total, paid)


def _to_out(payment: SupplierPayment, supplier_name: str, purchase_number: str | None, created_by_name: str | None) -> SupplierPaymentOut:
    return SupplierPaymentOut(
        supplier_payment_id=payment.supplier_payment_id,
        supplier_id=payment.supplier_id,
        supplier_name=supplier_name,
        purchase_id=payment.purchase_id,
        purchase_number=purchase_number,
        amount=payment.amount,
        method=payment.method,
        note=payment.note,
        created_by=payment.created_by,
        created_by_name=created_by_name,
        created_at=payment.created_at,
    )