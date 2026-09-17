"""App settings, read from backend/.env (never hard-code passwords)."""
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/ folder, so .env is found no matter where you start the app from
BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Smart Retail POS API"

    db_server: str = "127.0.0.1"
    db_port: int = 1433
    db_name: str = "smart_retail_pos"
    db_user: str = "sa"
    db_password: str
    db_driver: str = "ODBC Driver 18 for SQL Server"

    cors_origins: str = "http://localhost:5173"

    # First admin account, created by: python -m app.init_db
    first_admin_username: str = "admin"
    first_admin_email: str = "admin@example.com"
    first_admin_password: str | None = None

    # Login tokens (JWT). The secret must be long and random - see backend/.env.example
    jwt_secret_key: str = Field(min_length=32)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480  # 8 hours = one work shift

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()