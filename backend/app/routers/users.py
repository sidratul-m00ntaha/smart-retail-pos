"""User management endpoints: /api/users (PRD 5.2). Admins only."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_permission
from app.database import get_db
from app.models import User
from app.schemas.user import PasswordReset, UserCreate, UserOut, UserUpdate
from app.services import user_service

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(require_permission("users.manage"))):
    """All staff accounts, sorted by name."""
    return [user_service.to_user_out(user) for user in user_service.list_users(db)]


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_permission("users.manage"))):
    return user_service.to_user_out(user_service.get_user_or_404(db, user_id))


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users.manage")),
):
    """Create a staff account. The new user can sign in straight away."""
    user = user_service.create_user(db, data, current_user)
    db.commit()
    return user_service.to_user_out(user)


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users.manage")),
):
    """Edit a user's details, role and active status."""
    user = user_service.get_user_or_404(db, user_id)
    user_service.update_user(db, user, data, current_user)
    db.commit()
    return user_service.to_user_out(user)


@router.post("/{user_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(
    user_id: int,
    data: PasswordReset,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users.manage")),
):
    """Set a new password for a user (e.g. when they forgot it)."""
    user = user_service.get_user_or_404(db, user_id)
    user_service.reset_password(db, user, data.new_password, current_user)
    db.commit()
