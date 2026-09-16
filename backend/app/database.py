"""Database connection: engine, SessionLocal, Base and get_db."""
from sqlalchemy import URL, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

DATABASE_URL = URL.create(
    "mssql+pyodbc",
    username=settings.db_user,
    password=settings.db_password,
    host=settings.db_server,
    port=settings.db_port,
    database=settings.db_name,
    query={
        "driver": settings.db_driver,
        # The local Docker SQL Server uses a self-signed certificate.
        # Fine for development - do NOT use this for a real deployment.
        "TrustServerCertificate": "yes",
    },
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    """All database models (tables) will inherit from this class."""


def get_db():
    """Gives each API request its own database session, then closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()