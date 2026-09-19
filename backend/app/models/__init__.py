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

__all__ = ["ActivityLog", "Permission", "Role", "StoreSetting", "User", "role_permissions","Category", "Brand", "Unit", "TaxRate", "Product"]
from app.models.catalog import Brand, Category, TaxRate, Unit
from app.models.product import Product