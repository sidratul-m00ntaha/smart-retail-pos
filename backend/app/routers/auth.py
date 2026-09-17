"""Authentication endpoints: /api/auth (PRD 5.1)."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.security import create_access_token
from app.database import get_db
from app.models import User
from app.schemas.auth import CurrentUser, LoginResponse
from app.services import auth_service
from app.services.activity_log_service import log_activity

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Log in with username or email and password. Returns a token, the role and the permissions."""
    user = auth_service.authenticate(db, form_data.username, form_data.password)
    if user is None:
        # Same message whether the username or the password was wrong (PRD 5.1)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive. Please contact an administrator.",
        )

    user.last_login_at = func.sysutcdatetime()
    log_activity(db, user.user_id, "LOGIN", "User", reference=user.username)
    db.commit()

    return LoginResponse(access_token=create_access_token(user.user_id), user=auth_service.to_current_user(user))


@router.get("/me", response_model=CurrentUser)
def read_current_user(current_user: User = Depends(get_current_user)):
    """The logged-in user's details, role and permissions."""
    return auth_service.to_current_user(current_user)
