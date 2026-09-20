"""Pause and resume a bill (held carts).

A held cart is NOT a sale: no stock, points, due or invoice is touched. Only product and quantity are
saved, so on resume everything (price, VAT, stock) is checked against today's data. Stock is not
reserved while a cart is held. When the bill is finally paid, complete_sale marks the held cart
'completed' in the same transaction as the sale.
"""
from contextlib import contextmanager

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models import User
from app.models.customer import Customer
from app.models.sale import HeldCart, HeldCartItem
from app.schemas.held_cart import HeldCartItemOut, HeldCartOut, HeldCartResumeItem, HeldCartResumeOut, HeldCartSave
from app.services.sale_dependencies import get_available_quantity, get_sellable_product
from app.services.sale_service import merge_cart_lines


@contextmanager
def _commit_or_rollback(db: Session):
    """One commit at the end, or everything is undone."""
    try:
        yield
        db.commit()
    except Exception:
        db.rollback()
        raise


def hold_cart(db: Session, data: HeldCartSave, cashier_id: int) -> HeldCartOut:
    quantities = _validate(db, data)
    with _commit_or_rollback(db):
        cart = HeldCart(cashier_id=cashier_id, customer_id=data.customer_id, note=_clean(data.note))
        db.add(cart)
        db.flush()
        _add_items(db, cart, quantities)
    db.refresh(cart)
    return _to_out(db, cart)


def update_held_cart(db: Session, held_cart_id: int, data: HeldCartSave) -> HeldCartOut:
    """Saves changes to a bill that was resumed and is being held again, so it doesn't turn into a duplicate."""
    cart = _get_held(db, held_cart_id)
    quantities = _validate(db, data)
    with _commit_or_rollback(db):
        cart.customer_id = data.customer_id
        cart.note = _clean(data.note)
        cart.updated_at = func.sysutcdatetime()
        db.execute(delete(HeldCartItem).where(HeldCartItem.held_cart_id == cart.held_cart_id))
        _add_items(db, cart, quantities)
    db.refresh(cart)
    return _to_out(db, cart)


def list_held_carts(db: Session) -> list[HeldCartOut]:
    """Every bill on hold, newest first. Any cashier can recall any of them (the customer may return to another counter)."""
    rows = db.execute(
        select(HeldCart, User.full_name)
        .outerjoin(User, HeldCart.cashier_id == User.user_id)
        .where(HeldCart.status == "held")
        .order_by(HeldCart.created_at.desc(), HeldCart.held_cart_id.desc())
    ).all()
    return [_to_out(db, cart, cashier_name) for cart, cashier_name in rows]


def resume_held_cart(db: Session, held_cart_id: int) -> HeldCartResumeOut:
    """Loads a held bill with today's prices, VAT and stock. It stays on hold until the sale is completed."""
    cart = _get_held(db, held_cart_id)
    items: list[HeldCartResumeItem] = []
    for item in sorted(cart.items, key=lambda i: i.held_cart_item_id):
        name = unit_price = vat_percent = problem = None
        try:
            product = get_sellable_product(db, item.product_id)
            name, unit_price, vat_percent = product.name, product.unit_price, product.vat_percent
        except HTTPException as err:  # unknown or inactive product: show it on the screen instead of failing the whole cart
            problem = str(err.detail)
        available = get_available_quantity(db, item.product_id)
        if problem is None and item.quantity > available:
            problem = "Out of stock." if available <= 0 else f"Only {available} in stock."
        items.append(
            HeldCartResumeItem(
                product_id=item.product_id,
                quantity=item.quantity,
                product_name=name,
                unit_price=unit_price,
                vat_percent=vat_percent,
                available_quantity=available,
                problem=problem,
            )
        )
    return HeldCartResumeOut(
        held_cart_id=cart.held_cart_id,
        customer_id=cart.customer_id,
        note=cart.note,
        created_at=cart.created_at,
        has_problems=any(i.problem for i in items),
        items=items,
    )


def discard_held_cart(db: Session, held_cart_id: int) -> None:
    """Rows are kept (status 'discarded'), not deleted."""
    cart = _get_held(db, held_cart_id)
    with _commit_or_rollback(db):
        cart.status = "discarded"
        cart.updated_at = func.sysutcdatetime()


# ---- helpers ----

def _get_held(db: Session, held_cart_id: int) -> HeldCart:
    cart = db.get(HeldCart, held_cart_id)
    if cart is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "The held bill was not found.")
    if cart.status != "held":
        raise HTTPException(status.HTTP_409_CONFLICT, "This held bill was already completed or discarded.")
    return cart


def _validate(db: Session, data: HeldCartSave):
    quantities = merge_cart_lines(data.items)
    for product_id in quantities:
        get_sellable_product(db, product_id)  # raises 404 (or 400 if inactive) for a product that can't be sold
    if data.customer_id is not None:
        customer = db.get(Customer, data.customer_id)
        if customer is None or customer.status != "active":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "The customer was not found or is not active.")
    return quantities


def _add_items(db: Session, cart: HeldCart, quantities) -> None:
    db.add_all(HeldCartItem(held_cart_id=cart.held_cart_id, product_id=pid, quantity=qty) for pid, qty in quantities.items())
    db.flush()


def _clean(note: str | None) -> str | None:
    return note.strip() or None if note else None


def _to_out(db: Session, cart: HeldCart, cashier_name: str | None = None) -> HeldCartOut:
    if cashier_name is None:
        cashier_name = db.scalar(select(User.full_name).where(User.user_id == cart.cashier_id))
    items = [HeldCartItemOut(product_id=i.product_id, quantity=i.quantity) for i in sorted(cart.items, key=lambda i: i.held_cart_item_id)]
    return HeldCartOut(
        held_cart_id=cart.held_cart_id,
        cashier_id=cart.cashier_id,
        cashier_name=cashier_name,
        customer_id=cart.customer_id,
        note=cart.note,
        status=cart.status,
        item_count=len(items),
        created_at=cart.created_at,
        updated_at=cart.updated_at,
        items=items,
    )
