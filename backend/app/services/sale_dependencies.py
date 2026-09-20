"""Where Module 5 reads products and stock (team plan, section 6).

Module 5 gets products ONLY through get_sellable_product() and stock ONLY through get_available_quantity(),
so a change in Module 2's or Module 4's code is fixed here and nowhere else.
"""
from dataclasses import dataclass
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Product
from app.models.stock import ProductStock
from app.services.product_service import get_product


@dataclass(frozen=True)
class SellableProduct:
    product_id: int
    name: str
    unit_price: Decimal  # selling price, VAT excluded
    vat_percent: Decimal


def get_sellable_product(db: Session, product_id: int) -> SellableProduct:
    """The product as it is sold right now: its price and VAT rate come from the database, never from the browser."""
    try:
        product = get_product(db, product_id)  # Module 2
    except HTTPException as error:
        if error.status_code == status.HTTP_404_NOT_FOUND:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"Product {product_id} was not found.") from error
        raise
    if product.status != "active":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"'{product.name}' is inactive and cannot be sold.")
    # The VAT rate layer (TaxRates) wins: if the rate is changed later, new sales follow it. Products.tax_percent is
    # only the copy that was stored when the product was saved, so it is the fallback for a product with no rate.
    vat = product.tax_rate.rate_percent if product.tax_rate is not None else product.tax_percent
    return SellableProduct(product.product_id, product.name, product.sale_price, vat)


def get_available_quantity(db: Session, product_id: int) -> int:
    """Units that can be sold right now. Read-only.

    Module 4's stock_out starts a product without a ProductStock row from Products.current_quantity, so this
    does the same: the stock row if there is one, otherwise the product's own quantity.
    """
    stock = db.scalar(select(ProductStock.current_stock).where(ProductStock.product_id == product_id))
    if stock is not None:
        return stock
    return db.scalar(select(Product.current_quantity).where(Product.product_id == product_id)) or 0
