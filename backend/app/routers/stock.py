"""Current stock levels: /api/stock (PRD 5.8)."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import require_permission
from app.database import get_db
from app.models import Product, ProductStock, User
from app.schemas.stock import ProductStockOut
from app.services import stock_service

router = APIRouter(prefix="/api/stock", tags=["Inventory"])


@router.get("", response_model=list[ProductStockOut])
def list_stock(db: Session = Depends(get_db), current_user: User = Depends(require_permission("inventory.manage"))):
    """Current stock level for every active product.

    Ensures every active product has a ProductStock row (creating one, synced
    from Products.current_quantity, if it doesn't exist yet) so a brand-new
    product shows up here immediately with the right starting number, rather
    than being invisible until someone manually adjusts it.
    """
    active_product_ids = list(db.scalars(select(Product.product_id).where(Product.status == "active")))
    for product_id in active_product_ids:
        stock_service._get_or_create_product_stock(db, product_id)
    db.commit()

    stock_rows = list(db.scalars(select(ProductStock)))
    return [stock_service.to_product_stock_out(row) for row in stock_rows]


@router.get("/low", response_model=list[ProductStockOut])
def list_low_stock(db: Session = Depends(get_db), current_user: User = Depends(require_permission("inventory.manage"))):
    """Products at or below their reorder level."""
    return [stock_service.to_product_stock_out(row) for row in stock_service.list_low_stock(db)]