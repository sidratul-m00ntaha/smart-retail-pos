"""Password hashing. Login tokens (JWT) are added in Module 1, Step 4."""
from pwdlib import PasswordHash

# Argon2 - the currently recommended way to store passwords
password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    """Turns a password into a hash that is safe to store in the database."""
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Checks a typed password against a stored hash."""
    return password_hasher.verify(password, password_hash)