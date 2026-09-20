"""Every table model is imported here, so SQLAlchemy knows about all tables.

Shared file: each module adds ONLY its own block of imports.
"""

# ---- Module 1: Auth & Administration ----
from app.models.activity_log import ActivityLog
from app.models.permission import Permission
from app.models.role import Role
from app.models.role_permission import role_permissions
from app.models.store_setting import StoreSetting
from app.models.user import User

# ---- Customers ----
from app.models.customer import (
    Customer,
    LoyaltyTier,
    CustomerPayment,
    LoyaltyTransaction,
)

# ---- Purchase & Supplier ----
from app.models.supplier import Supplier
from app.models.purchase import Purchase, PurchaseItem, SupplierPayment

# ---- Module 2: Product Catalog ----
from app.models.catalog import Brand, Category, TaxRate, Unit
from app.models.product import Product

# ---- Module 4: Inventory & Expiry ----
from app.models.stock import (
    ProductStock,
    StockMovement,
    StockAdjustment,
    StockBatch,
)

# ---- Module 5: POS, Sales & Invoices ----
from app.models.sale import (
    Sale,
    SaleItem,
    Payment,
    Invoice,
    HeldCart,
    HeldCartItem,
)

__all__ = [
    "ActivityLog",
    "Permission",
    "Role",
    "StoreSetting",
    "User",
    "role_permissions",
    "Customer",
    "LoyaltyTier",
    "CustomerPayment",
    "LoyaltyTransaction",
    "Supplier",
    "Purchase",
    "PurchaseItem",
    "SupplierPayment",
    "Brand",
    "Category",
    "TaxRate",
    "Unit",
    "Product",
    "ProductStock",
    "StockMovement",
    "StockAdjustment",
    "StockBatch",
    "Sale",
    "SaleItem",
    "Payment",
    "Invoice",
    "HeldCart",
    "HeldCartItem",
]