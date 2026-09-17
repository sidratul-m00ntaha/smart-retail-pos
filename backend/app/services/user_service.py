"""User management rules (PRD 5.2): create, edit, activate/deactivate and reset passwords."""
from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import Role, User
from app.schemas.user import RoleOut, UserCreate, UserOut, UserUpdate
from app.services.activity_log_service import log_activity


def list_users(db: Session) -> list[User]:
    return list(db.scalars(select(User).order_by(User.full_name)))


def list_roles(db: Session) -> list[RoleOut]:
    roles = db.scalars(select(Role).order_by(Role.role_id))
    return [
        RoleOut(
            role_id=role.role_id,
            name=role.name,
            description=role.description,
            permissions=sorted(permission.code for permission in role.permissions),
        )
        for role in roles
    ]


def get_user_or_404(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user


def create_user(db: Session, data: UserCreate, current_user: User) -> User:
    role = _get_role(db, data.role_id)
    _check_username_and_email_are_free(db, data.username, data.email)

    user = User(
        full_name=data.full_name,
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
        role=role,
        is_active=data.is_active,
    )
    db.add(user)
    db.flush()  # gives the user its user_id
    log_activity(db, current_user.user_id, "CREATE", "User", reference=user.username, details=f"Role: {role.name}")
    return user


def update_user(db: Session, user: User, data: UserUpdate, current_user: User) -> User:
    role = _get_role(db, data.role_id)
    _check_username_and_email_are_free(db, data.username, data.email, except_user_id=user.user_id)

    # Protects admins from locking themselves out
    if user.user_id == current_user.user_id:
        if not data.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can't deactivate your own account.")
        if role.role_id != user.role_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can't change your own role.")

    changes = _describe_changes(user, data, role)
    user.full_name = data.full_name
    user.username = data.username
    user.email = data.email
    user.role = role
    user.is_active = data.is_active

    if changes:
        log_activity(db, current_user.user_id, "UPDATE", "User", reference=user.username, details="; ".join(changes)[:500])
    return user


def reset_password(db: Session, user: User, new_password: str, current_user: User) -> None:
    user.password_hash = hash_password(new_password)
    log_activity(db, current_user.user_id, "UPDATE", "User", reference=user.username, details="Password reset")


def to_user_out(user: User) -> UserOut:
    return UserOut(
        user_id=user.user_id,
        full_name=user.full_name,
        username=user.username,
        email=user.email,
        role_id=user.role_id,
        role=user.role.name,
        is_active=user.is_active,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
    )


def _get_role(db: Session, role_id: int) -> Role:
    role = db.get(Role, role_id)
    if role is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please choose a valid role.")
    return role


def _check_username_and_email_are_free(db: Session, username: str, email: str, except_user_id: int | None = None) -> None:
    query = select(User).where(or_(User.username == username, User.email == email))
    if except_user_id is not None:
        query = query.where(User.user_id != except_user_id)
    for existing in db.scalars(query):
        if existing.username.lower() == username.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"The username '{username}' is already taken.")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"The email '{email}' is already used by another user.")


def _describe_changes(user: User, data: UserUpdate, role: Role) -> list[str]:
    changes = []
    if data.full_name != user.full_name:
        changes.append(f"Name: {user.full_name} → {data.full_name}")
    if data.username != user.username:
        changes.append(f"Username: {user.username} → {data.username}")
    if data.email != user.email:
        changes.append(f"Email: {user.email} → {data.email}")
    if role.role_id != user.role_id:
        changes.append(f"Role: {user.role.name} → {role.name}")
    if data.is_active != user.is_active:
        changes.append("Activated" if data.is_active else "Deactivated")
    return changes
