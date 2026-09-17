"""Shared FastAPI dependencies that other modules use to protect their endpoints."""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

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
