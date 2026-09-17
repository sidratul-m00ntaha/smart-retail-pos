"""Login logic: find the user and check the password (PRD 5.1)."""
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models import User
from app.schemas.auth import CurrentUser

# Checked when the login name doesn't exist, so a wrong name takes as long as a wrong password.
# Otherwise the response time would reveal which usernames exist.
_DUMMY_HASH = hash_password("not-a-real-password")


def authenticate(db: Session, login: str, password: str) -> User | None:
    """Returns the user if the username/email and password are correct, otherwise None."""
    login = login.strip()
    user = db.scalar(select(User).where(or_(User.username == login, User.email == login)))
    if user is None:
        verify_password(password, _DUMMY_HASH)
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def to_current_user(user: User) -> CurrentUser:
    """The details the frontend needs: who the user is, their role and their permissions."""
    return CurrentUser(
        user_id=user.user_id,
        username=user.username,
        full_name=user.full_name,
        email=user.email,
        role=user.role.name,
        permissions=sorted(permission.code for permission in user.role.permissions),
    )
