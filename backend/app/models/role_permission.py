"""RolePermissions table: which role has which permission."""
from sqlalchemy import Column, ForeignKey, Table

from app.database import Base

role_permissions = Table(
    "RolePermissions",
    Base.metadata,
    Column("role_id", ForeignKey("Roles.role_id"), primary_key=True),
    Column("permission_id", ForeignKey("Permissions.permission_id"), primary_key=True),
)