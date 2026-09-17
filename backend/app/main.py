"""Smart Retail POS - FastAPI application entry point."""
from fastapi import Depends, FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.routers import auth

app = FastAPI(title=settings.app_name, version="0.1.0")

# Allow the React frontend (a different address/port) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", include_in_schema=False)
def root():
    return {"message": "Smart Retail POS API is running. Open /docs to see the API."}


@app.get("/api/health", tags=["Health"])
def health_check(response: Response, db: Session = Depends(get_db)):
    """Checks that the API is running and can reach SQL Server."""
    try:
        db.execute(text("SELECT 1"))
        return {"api": "ok", "database": "ok"}
    except SQLAlchemyError as error:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"api": "ok", "database": "error", "detail": str(error).splitlines()[0]}


# ---- Routers: each module registers ONLY its own routers here ----
# Module 1: Auth & Administration
app.include_router(auth.router)