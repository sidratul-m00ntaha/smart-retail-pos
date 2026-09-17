"""Roles endpoint: /api/roles - the roles a user can be given, with their permissions."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_permission
from app.database import get_db
from app.models import User
from app.schemas.user import RoleOut
from app.services import user_service

router = APIRouter(prefix="/api/roles", tags=["Users"])


@router.get("", response_model=list[RoleOut])
def list_roles(db: Session = Depends(get_db), current_user: User = Depends(require_permission("users.manage"))):
    return user_service.list_roles(db)
