"""
Stand-ins for the functions other modules will provide, per section 6 of the
Team Module Plan ("Until the real version exists, use a simple stand-in that
returns sample data"). Purchase/supplier code below calls these by name, so
swapping a stub for the real import later is a one-line change per function —
nothing else in this module needs to change.

IMPORTANT: stock_in() and log_activity() must never call db.commit() (rule 8.2
in the plan) — the caller (purchase_service.create_purchase / supplier_service
.pay_supplier) commits once at the end, so a failed request leaves nothing
half-saved.
"""
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session


def get_product(db: Session, product_id: int) -> dict:
    """
    STUB for Module 2's product lookup (by ID).
    Real version returns the product's Name, current PurchasePrice, etc.
    Swap for: from app.services.product_service import get_product
    """
    return {"ProductID": product_id, "Name": f"Product #{product_id}", "PurchasePrice": Decimal("0")}


def stock_in(db: Session, product_id: int, quantity: Decimal, reference: str) -> None:
    """
    STUB for Module 4's stock_in(...), called once per purchase line item
    when a purchase is confirmed.
    Swap for: from app.services.stock_service import stock_in
    """
    # TODO(module 4): db.add(StockMovement(ProductID=product_id, Quantity=quantity,
    #                  Type="IN", Reference=reference)); db.flush()
    pass


def log_activity(db: Session, user_id: Optional[int], action: str, details: str) -> None:
    """
    STUB for Module 1's log_activity(...).
    Swap for: from app.services.activity_service import log_activity
    """
    # TODO(module 1): db.add(ActivityLog(UserID=user_id, Action=action, Details=details)); db.flush()
    pass
"""
Stand-ins for the functions other modules will provide, per section 6 of the
Team Module Plan ("Until the real version exists, use a simple stand-in that
returns sample data"). Purchase/supplier code below calls these by name, so
swapping a stub for the real import later is a one-line change per function —
nothing else in this module needs to change.

IMPORTANT: stock_in() and log_activity() must never call db.commit() (rule 8.2
in the plan) — the caller (purchase_service.create_purchase / supplier_service
.pay_supplier) commits once at the end, so a failed request leaves nothing
half-saved.
"""
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session


def get_product(db: Session, product_id: int) -> dict:
    """
    STUB for Module 2's product lookup (by ID).
    Real version returns the product's Name, current PurchasePrice, etc.
    Swap for: from app.services.product_service import get_product
    """
    return {"ProductID": product_id, "Name": f"Product #{product_id}", "PurchasePrice": Decimal("0")}


def stock_in(db: Session, product_id: int, quantity: Decimal, reference: str) -> None:
    """
    STUB for Module 4's stock_in(...), called once per purchase line item
    when a purchase is confirmed.
    Swap for: from app.services.stock_service import stock_in
    """
    # TODO(module 4): db.add(StockMovement(ProductID=product_id, Quantity=quantity,
    #                  Type="IN", Reference=reference)); db.flush()
    pass


def log_activity(db: Session, user_id: Optional[int], action: str, details: str) -> None:
    """
    STUB for Module 1's log_activity(...).
    Swap for: from app.services.activity_service import log_activity
    """
    # TODO(module 1): db.add(ActivityLog(UserID=user_id, Action=action, Details=details)); db.flush()
    pass
