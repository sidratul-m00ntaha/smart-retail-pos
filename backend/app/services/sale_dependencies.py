"""Stand-ins for functions of other modules that are not on `main` yet (team plan, section 6).

Module 5 reads products ONLY through get_sellable_product(). When Module 2's product_service is
merged into main, replace the stand-in below with the real version in the comment block. Nothing
else in Module 5 has to change.
"""
from dataclasses import dataclass
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.stock import ProductStock


@dataclass(frozen=True)
class SellableProduct:
    product_id: int
    name: str
    unit_price: Decimal  # selling price, VAT excluded
    vat_percent: Decimal


# ---- STAND-IN for Module 2's product lookup: sample data so the sale flow can be built and tested ----
_SAMPLE_PRODUCTS = {
    1: SellableProduct(1, "Milk 1L", Decimal("90.00"), Decimal("5.00")),
    2: SellableProduct(2, "Rice 5kg", Decimal("450.00"), Decimal("0.00")),
    3: SellableProduct(3, "Soap", Decimal("35.50"), Decimal("15.00")),
}


def get_sellable_product(db: Session, product_id: int) -> SellableProduct:
    product = _SAMPLE_PRODUCTS.get(product_id)
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Product {product_id} was not found.")
    return product


# ---- STAND-IN for Module 4's "available quantity": reads its ProductStock table directly ----
def get_available_quantity(db: Session, product_id: int) -> int:
    """Units in stock right now (0 if the product has no stock row yet). Read-only."""
    return db.scalar(select(ProductStock.current_stock).where(ProductStock.product_id == product_id)) or 0


# ---- REAL VERSION: use this once Module 2's code is on main (then delete the stand-in above) ----
#
# from app.services.product_service import get_product
#
# def get_sellable_product(db: Session, product_id: int) -> SellableProduct:
#     product = get_product(db, product_id)  # raises 404 if the product does not exist
#     if product.status != "active":
#         raise HTTPException(status.HTTP_400_BAD_REQUEST, f"'{product.name}' is inactive and cannot be sold.")
#     # Confirm with Module 2 which VAT source is right: the TaxRate row or Product.tax_percent.
#     vat = product.tax_rate.rate_percent if product.tax_rate is not None else product.tax_percent
#     return SellableProduct(product.product_id, product.name, product.sale_price, vat)
