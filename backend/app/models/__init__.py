"""Every table model is imported here, so SQLAlchemy knows about all tables.

Shared file: each module adds ONLY its own block of imports, and its model names to __all__.
"""
# ---- Module 1: Auth & Administration (and the AI Assistant) ----
from app.models.activity_log import ActivityLog
from app.models.ai_assistant import AIConversation, AIMessage
from app.models.permission import Permission
from app.models.role import Role
from app.models.role_permission import role_permissions
from app.models.store_setting import StoreSetting
from app.models.user import User

# ---- Module 2: Product Catalog ----
from app.models.catalog import Brand, Category, TaxRate, Unit
from app.models.product import Product

# ---- Module 3: Suppliers & Purchasing ----
from app.models.purchase import Purchase, PurchaseItem, SupplierPayment
from app.models.supplier import Supplier

# ---- Module 4: Inventory & Expiry ----
from app.models.stock import ProductStock, StockAdjustment, StockBatch, StockMovement

# ---- Module 5: POS, Sales & Invoices ----
from app.models.sale import HeldCart, HeldCartItem, Invoice, Payment, Sale, SaleItem

# ---- Module 6: Customers, Dues & Loyalty ----
from app.models.customer import Customer, CustomerPayment, LoyaltyTier, LoyaltyTransaction

__all__ = [
    # Module 1
    "ActivityLog", "AIConversation", "AIMessage", "Permission", "Role", "StoreSetting", "User", "role_permissions",
    # Module 2
    "Brand", "Category", "Product", "TaxRate", "Unit",
    # Module 3
    "Purchase", "PurchaseItem", "Supplier", "SupplierPayment",
    # Module 4
    "ProductStock", "StockAdjustment", "StockBatch", "StockMovement",
    # Module 5
    "HeldCart", "HeldCartItem", "Invoice", "Payment", "Sale", "SaleItem",
    # Module 6
    "Customer", "CustomerPayment", "LoyaltyTier", "LoyaltyTransaction",
]
