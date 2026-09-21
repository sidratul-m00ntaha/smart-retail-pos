"""Dashboard endpoint (PRD 5.19). Real data only - see services/dashboard_service.py."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_permission
from app.database import get_db
from app.models import User
from app.services import dashboard_service as svc

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("")
def dashboard(db: Session = Depends(get_db), current_user: User = Depends(require_permission("reports.view"))):
    return svc.get_dashboard_data(db)
