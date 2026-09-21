# # from datetime import datetime
# # from decimal import ROUND_HALF_UP, Decimal
# # from typing import List, Optional

# # from fastapi import HTTPException, status
# # from sqlalchemy.orm import Session

# # from app.models.purchase import Purchase, PurchaseItem
# # from app.models.supplier import Supplier
# # from app.schemas.purchase import PurchaseCreate, PurchaseItemOut, PurchaseOut
# # from app.services import module_stubs


# # def _next_purchase_no(db: Session) -> str:
# #     year = datetime.utcnow().year
# #     prefix = f"PUR-{year}-"
# #     last = (
# #         db.query(Purchase.PurchaseNo)
# #         .filter(Purchase.PurchaseNo.like(f"{prefix}%"))
# #         .order_by(Purchase.PurchaseNo.desc())
# #         .first()
# #     )
# #     seq = int(last[0].split("-")[-1]) + 1 if last else 1
# #     return f"{prefix}{seq:04d}"


# # def _to_out(p: Purchase) -> PurchaseOut:
# #     return PurchaseOut(
# #         PurchaseID=p.PurchaseID, PurchaseNo=p.PurchaseNo, SupplierID=p.SupplierID,
# #         SupplierName=p.supplier.Name if p.supplier else None,
# #         PurchaseDate=p.PurchaseDate, Subtotal=p.Subtotal, Discount=p.Discount,
# #         VAT=p.VAT, Total=p.Total, Paid=p.Paid, Due=p.Due, Status=p.Status,
# #         Items=[
# #             PurchaseItemOut(
# #                 PurchaseItemID=i.PurchaseItemID, ProductID=i.ProductID,
# #                 Quantity=i.Quantity, UnitPrice=i.UnitPrice, LineTotal=i.LineTotal,
# #             )
# #             for i in p.items
# #         ],
# #     )


# # def list_purchases(db: Session, search: Optional[str] = None) -> List[PurchaseOut]:
# #     q = db.query(Purchase).join(Supplier)
# #     if search:
# #         like = f"%{search}%"
# #         q = q.filter((Purchase.PurchaseNo.ilike(like)) | (Supplier.Name.ilike(like)))
# #     return [_to_out(p) for p in q.order_by(Purchase.PurchaseDate.desc()).all()]


# # def get_purchase(db: Session, purchase_id: int) -> Purchase:
# #     p = db.get(Purchase, purchase_id)
# #     if not p:
# #         raise HTTPException(status.HTTP_404_NOT_FOUND, "Purchase not found.")
# #     return p


# # def create_purchase(db: Session, data: PurchaseCreate, user_id: Optional[int]) -> PurchaseOut:
# #     supplier = db.get(Supplier, data.SupplierID)
# #     if not supplier or supplier.Status != "Active":
# #         raise HTTPException(status.HTTP_400_BAD_REQUEST, "Select an active supplier.")

# #     subtotal = sum((i.Quantity * i.UnitPrice for i in data.Items), Decimal("0"))
# #     discount = min(data.Discount, subtotal)
# #     taxable = subtotal - discount
# #     vat = (taxable * data.VATRate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
# #     total = taxable + vat

# #     if data.Paid > total:
# #         raise HTTPException(status.HTTP_400_BAD_REQUEST, "Paid amount can't exceed the grand total.")
# #     due = total - data.Paid

# #     purchase = Purchase(
# #         PurchaseNo=_next_purchase_no(db), SupplierID=data.SupplierID,
# #         Subtotal=subtotal, Discount=discount, VAT=vat, Total=total,
# #         Paid=data.Paid, Due=due, Status="Confirmed", CreatedByUserID=user_id,
# #     )
# #     db.add(purchase)
# #     db.flush()  # assigns PurchaseID without committing

# #     for item in data.Items:
# #         db.add(PurchaseItem(
# #             PurchaseID=purchase.PurchaseID, ProductID=item.ProductID,
# #             Quantity=item.Quantity, UnitPrice=item.UnitPrice,
# #             LineTotal=item.Quantity * item.UnitPrice,
# #         ))
# #         module_stubs.stock_in(db, item.ProductID, item.Quantity, reference=purchase.PurchaseNo)

# #     module_stubs.log_activity(db, user_id, "purchase_confirmed", f"Purchase {purchase.PurchaseNo} confirmed")

# #     # Single commit at the end (PRD 5.14 / rule 8.2): everything is saved, or nothing is.
# #     db.commit()
# #     db.refresh(purchase)
# #     return _to_out(purchase)

# #----------------------------


# """Recording purchases (PRD 5.6): a confirmed purchase drives stock-in.

# Confirming a purchase does ALL of this, or none of it (PRD 6.3 - the router commits once):

#   1. saves the purchase and its lines (amounts calculated by purchase_calculator, never by the browser)
#   2. increases stock for every line through Module 4's stock_in (which also writes the stock movement
#      and keeps Products.current_quantity up to date)
#   3. for products with expiry tracking, saves the batch (batch number + expiry date) that came in
#   4. saves the payment made now, if any (a SupplierPayments row)
#   5. writes the activity log entry

# The supplier's balance needs no update: it is worked out from the purchases (supplier_service.supplier_totals).
# Per team convention nothing here calls db.commit().
# """
# from datetime import date, datetime, timezone
# from decimal import Decimal
# from uuid import uuid4

# from fastapi import HTTPException, status
# from sqlalchemy import func, or_, select
# from sqlalchemy.orm import Session

# from app.models import Product, Purchase, PurchaseItem, StockBatch, Supplier, SupplierPayment, TaxRate, User
# from app.schemas.purchase import PurchaseCreate, PurchaseItemIn, PurchaseItemOut, PurchaseListOut, PurchaseOut
# from app.services import stock_service, supplier_service
# from app.services.activity_log_service import log_activity
# from app.services.purchase_calculator import LineInput, calculate_purchase, settle_payment


# # ---------- reading ----------
# def list_purchases(
#     db: Session,
#     search: str | None = None,
#     supplier_id: int | None = None,
#     payment_status: str | None = None,
# ) -> list[PurchaseListOut]:
#     """Purchase history, newest first."""
#     query = _purchase_query().order_by(Purchase.created_at.desc(), Purchase.purchase_id.desc())
#     if search and search.strip():
#         term = search.strip()
#         query = query.where(
#             or_(Purchase.purchase_number.contains(term, autoescape=True), Supplier.name.contains(term, autoescape=True))
#         )
#     if supplier_id is not None:
#         query = query.where(Purchase.supplier_id == supplier_id)
#     if payment_status:
#         query = query.where(Purchase.payment_status == payment_status)
#     return [PurchaseListOut(**_list_fields(*row)) for row in db.execute(query)]


# def get_purchase_out(db: Session, purchase_id: int) -> PurchaseOut:
#     row = db.execute(_purchase_query().where(Purchase.purchase_id == purchase_id)).one_or_none()
#     if row is None:
#         raise HTTPException(status.HTTP_404_NOT_FOUND, "Purchase not found.")
#     purchase = row[0]
#     items = [PurchaseItemOut.model_validate(item) for item in sorted(purchase.items, key=lambda i: i.purchase_item_id)]
#     return PurchaseOut(**_list_fields(*row), items=items)


# # ---------- confirming a purchase ----------
# def create_purchase(db: Session, data: PurchaseCreate, current_user: User) -> Purchase:
#     supplier = supplier_service.require_active_supplier(db, data.supplier_id)
#     lines = _prepare_lines(db, data.items)  # every check happens BEFORE anything is saved
#     tax_rate = _get_tax_rate(db, data.tax_rate_id)
#     tax_percent = Decimal(str(tax_rate.rate_percent)) if tax_rate is not None else Decimal("0")

#     try:
#         totals = calculate_purchase(
#             [LineInput(item.product_id, item.quantity, item.unit_price, item.line_discount_percent) for item, _ in lines],
#             data.discount_amount,
#             tax_percent,
#             data.shipping_charge,
#         )
#         settlement = settle_payment(totals.total_amount, data.paid_amount)
#     except ValueError as err:  # includes PurchaseError; the messages are safe to show the manager
#         raise HTTPException(status.HTTP_400_BAD_REQUEST, str(err)) from err
#     if settlement.paid_amount > 0 and data.payment_method is None:
#         raise HTTPException(status.HTTP_400_BAD_REQUEST, "Choose how the supplier was paid.")

#     # The purchase number comes from the database-generated id, so two managers can never get the same number.
#     # It is saved with a throw-away value first because the column can't be empty.
#     purchase = Purchase(
#         purchase_number=f"TMP-{uuid4().hex[:20]}",
#         supplier_id=supplier.supplier_id,
#         subtotal=totals.subtotal,
#         discount_amount=totals.discount_amount,
#         tax_rate_id=tax_rate.tax_rate_id if tax_rate is not None else None,
#         tax_percent=totals.tax_percent,
#         tax_amount=totals.tax_amount,
#         shipping_charge=totals.shipping_charge,
#         total_amount=totals.total_amount,
#         paid_amount=settlement.paid_amount,
#         due_amount=settlement.due_amount,
#         payment_status=settlement.payment_status,
#         note=data.note,
#         created_by=current_user.user_id,
#     )
#     db.add(purchase)
#     db.flush()
#     purchase.purchase_number = f"PUR-{datetime.now(timezone.utc).year}-{purchase.purchase_id:05d}"

#     for (item, product), result in zip(lines, totals.lines):
#         quantity = int(result.quantity)  # stock is counted in whole units
#         batch_number = item.batch_number if product.expiry_tracking else None
#         expiry_date = item.expiry_date if product.expiry_tracking else None
#         db.add(
#             PurchaseItem(
#                 purchase_id=purchase.purchase_id,
#                 product_id=product.product_id,
#                 product_name=product.name,
#                 quantity=result.quantity,
#                 unit_price=result.unit_price,
#                 line_discount_percent=result.line_discount_percent,
#                 line_total=result.line_total,
#                 batch_number=batch_number,
#                 expiry_date=expiry_date,
#             )
#         )
#         if product.expiry_tracking:
#             # Saved here, not through stock_service.add_batch: that would add the stock a second time
#             db.add(StockBatch(product_id=product.product_id, batch_number=batch_number, quantity=quantity, expiry_date=expiry_date))
#         stock_service.stock_in(db, product.product_id, quantity, "purchase", purchase.purchase_id, current_user.user_id)

#     if settlement.paid_amount > 0:
#         db.add(
#             SupplierPayment(
#                 supplier_id=supplier.supplier_id,
#                 purchase_id=purchase.purchase_id,
#                 amount=settlement.paid_amount,
#                 method=data.payment_method,
#                 note="Paid when the purchase was recorded",
#                 created_by=current_user.user_id,
#             )
#         )

#     log_activity(
#         db,
#         current_user.user_id,
#         "CREATE",
#         "Purchase",
#         reference=purchase.purchase_number,
#         details=f"{supplier.name}: total {totals.total_amount}, paid {settlement.paid_amount}, due {settlement.due_amount}",
#     )
#     db.flush()
#     return purchase


# # ---------- helpers ----------
# def _prepare_lines(db: Session, items: list[PurchaseItemIn]) -> list[tuple[PurchaseItemIn, Product]]:
#     """Checks every line against today's product data: it exists, is active, whole quantity, expiry details."""
#     lines = []
#     for item in items:
#         product = db.get(Product, item.product_id)
#         if product is None:
#             raise HTTPException(status.HTTP_404_NOT_FOUND, f"Product {item.product_id} was not found.")
#         if product.status != "active":
#             raise HTTPException(status.HTTP_400_BAD_REQUEST, f"'{product.name}' is inactive and can't be purchased.")
#         if item.quantity != item.quantity.to_integral_value():
#             raise HTTPException(status.HTTP_400_BAD_REQUEST, f"The quantity of '{product.name}' must be a whole number.")
#         if product.expiry_tracking:
#             if not item.batch_number or item.expiry_date is None:
#                 raise HTTPException(
#                     status.HTTP_400_BAD_REQUEST, f"'{product.name}' has expiry tracking: enter a batch number and an expiry date."
#                 )
#             if item.expiry_date < date.today():
#                 raise HTTPException(status.HTTP_400_BAD_REQUEST, f"The expiry date of '{product.name}' is in the past.")
#         lines.append((item, product))
#     return lines


# def _get_tax_rate(db: Session, tax_rate_id: int | None) -> TaxRate | None:
#     if tax_rate_id is None:
#         return None
#     tax_rate = db.get(TaxRate, tax_rate_id)
#     if tax_rate is None or tax_rate.status != "active":
#         raise HTTPException(status.HTTP_400_BAD_REQUEST, "The VAT rate was not found or is not active.")
#     return tax_rate


# def _purchase_query():
#     """Purchases with the supplier's name, the name of the user who recorded it and the number of lines."""
#     item_count = (
#         select(func.count(PurchaseItem.purchase_item_id))
#         .where(PurchaseItem.purchase_id == Purchase.purchase_id)
#         .correlate(Purchase)
#         .scalar_subquery()
#     )
#     return (
#         select(Purchase, Supplier.name, User.full_name, item_count)
#         .join(Supplier, Supplier.supplier_id == Purchase.supplier_id)
#         .outerjoin(User, User.user_id == Purchase.created_by)
#     )


# def _list_fields(purchase: Purchase, supplier_name: str, created_by_name: str | None, item_count: int) -> dict:
#     return {
#         "purchase_id": purchase.purchase_id,
#         "purchase_number": purchase.purchase_number,
#         "supplier_id": purchase.supplier_id,
#         "supplier_name": supplier_name,
#         "subtotal": purchase.subtotal,
#         "discount_amount": purchase.discount_amount,
#         "tax_rate_id": purchase.tax_rate_id,
#         "tax_percent": purchase.tax_percent,
#         "tax_amount": purchase.tax_amount,
#         "shipping_charge": purchase.shipping_charge,
#         "total_amount": purchase.total_amount,
#         "paid_amount": purchase.paid_amount,
#         "due_amount": purchase.due_amount,
#         "payment_status": purchase.payment_status,
#         "status": purchase.status,
#         "note": purchase.note,
#         "created_by": purchase.created_by,
#         "created_by_name": created_by_name,
#         "created_at": purchase.created_at,
#         "item_count": item_count,
#     }














"""Recording purchases (PRD 5.6): a confirmed purchase drives stock-in.

Confirming a purchase does ALL of this, or none of it (PRD 6.3 - the router commits once):

  1. saves the purchase and its lines (amounts calculated by purchase_calculator, never by the browser)
  2. increases stock for every line through Module 4's stock_in (which also writes the stock movement
     and keeps Products.current_quantity up to date)
  3. for products with expiry tracking, saves the batch (batch number + expiry date) that came in
  4. saves the payment made now, if any (a SupplierPayments row)
  5. writes the activity log entry

The supplier's balance needs no update: it is worked out from the purchases (supplier_service.supplier_totals).
Per team convention nothing here calls db.commit().
"""
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import Product, Purchase, PurchaseItem, StockBatch, Supplier, SupplierPayment, TaxRate, User
from app.schemas.purchase import PurchaseCreate, PurchaseItemIn, PurchaseItemOut, PurchaseListOut, PurchaseOut
from app.services import stock_service, supplier_service
from app.services.activity_log_service import log_activity
from app.services.purchase_calculator import LineInput, calculate_purchase, settle_payment


# ---------- reading ----------
def list_purchases(
    db: Session,
    search: str | None = None,
    supplier_id: int | None = None,
    payment_status: str | None = None,
) -> list[PurchaseListOut]:
    """Purchase history, newest first."""
    query = _purchase_query().order_by(Purchase.created_at.desc(), Purchase.purchase_id.desc())
    if search and search.strip():
        term = search.strip()
        query = query.where(
            or_(Purchase.purchase_number.contains(term, autoescape=True), Supplier.name.contains(term, autoescape=True))
        )
    if supplier_id is not None:
        query = query.where(Purchase.supplier_id == supplier_id)
    if payment_status:
        query = query.where(Purchase.payment_status == payment_status)
    return [PurchaseListOut(**_list_fields(*row)) for row in db.execute(query)]


def get_purchase_out(db: Session, purchase_id: int) -> PurchaseOut:
    row = db.execute(_purchase_query().where(Purchase.purchase_id == purchase_id)).one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Purchase not found.")
    purchase = row[0]
    items = [PurchaseItemOut.model_validate(item) for item in sorted(purchase.items, key=lambda i: i.purchase_item_id)]
    return PurchaseOut(**_list_fields(*row), items=items)


# ---------- confirming a purchase ----------
def create_purchase(db: Session, data: PurchaseCreate, current_user: User) -> Purchase:
    supplier = supplier_service.require_active_supplier(db, data.supplier_id)
    lines = _prepare_lines(db, data.items)  # every check happens BEFORE anything is saved
    tax_rate = _get_tax_rate(db, data.tax_rate_id)
    tax_percent = Decimal(str(tax_rate.rate_percent)) if tax_rate is not None else Decimal("0")

    try:
        totals = calculate_purchase(
            [LineInput(item.product_id, item.quantity, item.unit_price, item.line_discount_percent) for item, _ in lines],
            data.discount_amount,
            tax_percent,
            data.shipping_charge,
        )
        settlement = settle_payment(totals.total_amount, data.paid_amount)
    except ValueError as err:  # includes PurchaseError; the messages are safe to show the manager
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(err)) from err
    if settlement.paid_amount > 0 and data.payment_method is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Choose how the supplier was paid.")

    # The purchase number comes from the database-generated id, so two managers can never get the same number.
    # It is saved with a throw-away value first because the column can't be empty.
    purchase = Purchase(
        purchase_number=f"TMP-{uuid4().hex[:20]}",
        supplier_id=supplier.supplier_id,
        subtotal=totals.subtotal,
        discount_amount=totals.discount_amount,
        tax_rate_id=tax_rate.tax_rate_id if tax_rate is not None else None,
        tax_percent=totals.tax_percent,
        tax_amount=totals.tax_amount,
        shipping_charge=totals.shipping_charge,
        total_amount=totals.total_amount,
        paid_amount=settlement.paid_amount,
        due_amount=settlement.due_amount,
        payment_status=settlement.payment_status,
        note=data.note,
        created_by=current_user.user_id,
    )
    db.add(purchase)
    db.flush()
    purchase.purchase_number = f"PUR-{datetime.now(timezone.utc).year}-{purchase.purchase_id:05d}"

    for (item, product), result in zip(lines, totals.lines):
        quantity = int(result.quantity)  # stock is counted in whole units
        batch_number = item.batch_number if product.expiry_tracking else None
        expiry_date = item.expiry_date if product.expiry_tracking else None
        db.add(
            PurchaseItem(
                purchase_id=purchase.purchase_id,
                product_id=product.product_id,
                product_name=product.name,
                quantity=result.quantity,
                unit_price=result.unit_price,
                line_discount_percent=result.line_discount_percent,
                line_total=result.line_total,
                batch_number=batch_number,
                expiry_date=expiry_date,
            )
        )
        if product.expiry_tracking:
            # Saved here, not through stock_service.add_batch: that would add the stock a second time
            db.add(StockBatch(product_id=product.product_id, batch_number=batch_number, quantity=quantity, expiry_date=expiry_date))
        stock_service.stock_in(db, product.product_id, quantity, "purchase", purchase.purchase_id, current_user.user_id)

    if settlement.paid_amount > 0:
        db.add(
            SupplierPayment(
                supplier_id=supplier.supplier_id,
                purchase_id=purchase.purchase_id,
                amount=settlement.paid_amount,
                method=data.payment_method,
                note="Paid when the purchase was recorded",
                created_by=current_user.user_id,
            )
        )

    log_activity(
        db,
        current_user.user_id,
        "CREATE",
        "Purchase",
        reference=purchase.purchase_number,
        details=f"{supplier.name}: total {totals.total_amount}, paid {settlement.paid_amount}, due {settlement.due_amount}",
    )
    db.flush()
    return purchase


# ---------- helpers ----------
def _prepare_lines(db: Session, items: list[PurchaseItemIn]) -> list[tuple[PurchaseItemIn, Product]]:
    """Checks every line against today's product data: it exists, is active, whole quantity, expiry details."""
    lines = []
    for item in items:
        product = db.get(Product, item.product_id)
        if product is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"Product {item.product_id} was not found.")
        if product.status != "active":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"'{product.name}' is inactive and can't be purchased.")
        if item.quantity != item.quantity.to_integral_value():
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"The quantity of '{product.name}' must be a whole number.")
        if product.expiry_tracking:
            if not item.batch_number or item.expiry_date is None:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST, f"'{product.name}' has expiry tracking: enter a batch number and an expiry date."
                )
            if item.expiry_date < date.today():
                raise HTTPException(status.HTTP_400_BAD_REQUEST, f"The expiry date of '{product.name}' is in the past.")
        lines.append((item, product))
    return lines


def _get_tax_rate(db: Session, tax_rate_id: int | None) -> TaxRate | None:
    if tax_rate_id is None:
        return None
    tax_rate = db.get(TaxRate, tax_rate_id)
    if tax_rate is None or tax_rate.status != "active":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The VAT rate was not found or is not active.")
    return tax_rate


def _purchase_query():
    """Purchases with the supplier's name, the name of the user who recorded it and the number of lines."""
    item_count = (
        select(func.count(PurchaseItem.purchase_item_id))
        .where(PurchaseItem.purchase_id == Purchase.purchase_id)
        .correlate(Purchase)
        .scalar_subquery()
    )
    return (
        select(Purchase, Supplier.name, User.full_name, item_count)
        .join(Supplier, Supplier.supplier_id == Purchase.supplier_id)
        .outerjoin(User, User.user_id == Purchase.created_by)
    )


def _list_fields(purchase: Purchase, supplier_name: str, created_by_name: str | None, item_count: int) -> dict:
    return {
        "purchase_id": purchase.purchase_id,
        "purchase_number": purchase.purchase_number,
        "supplier_id": purchase.supplier_id,
        "supplier_name": supplier_name,
        "subtotal": purchase.subtotal,
        "discount_amount": purchase.discount_amount,
        "tax_rate_id": purchase.tax_rate_id,
        "tax_percent": purchase.tax_percent,
        "tax_amount": purchase.tax_amount,
        "shipping_charge": purchase.shipping_charge,
        "total_amount": purchase.total_amount,
        "paid_amount": purchase.paid_amount,
        "due_amount": purchase.due_amount,
        "payment_status": purchase.payment_status,
        "status": purchase.status,
        "note": purchase.note,
        "created_by": purchase.created_by,
        "created_by_name": created_by_name,
        "created_at": purchase.created_at,
        "item_count": item_count,
    }