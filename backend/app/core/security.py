"""Password hashing and login tokens (JWT)."""
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

# Argon2 - the currently recommended way to store passwords
password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    """Turns a password into a hash that is safe to store in the database."""
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Checks a typed password against a stored hash."""
    return password_hasher.verify(password, password_hash)


def create_access_token(user_id: int) -> str:
    """Creates a signed login token that says who the user is and when it expires."""
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(user_id), "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def read_access_token(token: str) -> int | None:
    """Returns the user id from a valid token, or None if the token is fake, changed or expired."""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        return None
