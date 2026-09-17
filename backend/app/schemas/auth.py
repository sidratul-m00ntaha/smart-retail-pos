"""Shapes of the authentication API's responses."""
from pydantic import BaseModel


class CurrentUser(BaseModel):
    user_id: int
    username: str
    full_name: str
    email: str
    role: str
    permissions: list[str]


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: CurrentUser
