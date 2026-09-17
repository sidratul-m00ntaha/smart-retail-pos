"""Shapes of the users and roles API's requests and responses."""
from pydantic import BaseModel, Field, field_validator

from app.schemas.common import UtcDateTime

USERNAME_PATTERN = r"^[A-Za-z0-9._-]+$"
EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class UserFields(BaseModel):
    full_name: str = Field(min_length=1, max_length=100)
    username: str = Field(min_length=3, max_length=50, pattern=USERNAME_PATTERN)
    email: str = Field(max_length=255, pattern=EMAIL_PATTERN)
    role_id: int
    is_active: bool = True

    @field_validator("full_name", "username", mode="before")
    @classmethod
    def strip_spaces(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("email", mode="before")
    @classmethod
    def clean_email(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value


class UserCreate(UserFields):
    password: str = Field(min_length=8, max_length=128)


class UserUpdate(UserFields):
    is_active: bool  # required when editing, so it can't be switched on by accident


class PasswordReset(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)


class UserOut(BaseModel):
    user_id: int
    full_name: str
    username: str
    email: str
    role_id: int
    role: str
    is_active: bool
    last_login_at: UtcDateTime | None
    created_at: UtcDateTime


class RoleOut(BaseModel):
    role_id: int
    name: str
    description: str | None
    permissions: list[str]
