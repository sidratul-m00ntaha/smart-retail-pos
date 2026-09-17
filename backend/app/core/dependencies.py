"""Shared FastAPI dependencies that other modules use to protect their endpoints."""
from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.permissions import PERMISSIONS
from app.core.security import read_access_token
from app.database import get_db
from app.models import User

# Tells FastAPI (and Swagger's Authorize button) where to get a login token.
# auto_error=False: a missing token gets the same clear message as an invalid one (below).
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """The logged-in user. Rejects the request (401) if the token is missing, invalid or expired."""
    user_id = read_access_token(token) if token else None
    user = db.get(User, user_id) if user_id is not None else None
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You are not logged in or your session has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_permission(code: str) -> Callable[..., User]:
    """Protects an endpoint: only users whose role has this permission may call it.

    Gives you the logged-in user. Not logged in -> 401. Logged in but not allowed -> 403.

        current_user: User = Depends(require_permission("products.manage"))
    """
    if code not in PERMISSIONS:
        # Stops the app at startup, so a misspelled code can't silently lock everyone out
        raise ValueError(f"Unknown permission '{code}'. Valid codes are listed in backend/app/core/permissions.py")

    def check_permission(current_user: User = Depends(get_current_user)) -> User:
        if not any(permission.code == code for permission in current_user.role.permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to do this.",
            )
        return current_user

    return check_permission
