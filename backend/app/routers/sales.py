"""Sales API (Module 5): complete a sale from the POS."""
from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_permission
from app.database import get_db
from app.schemas.sale import SaleCreate, SaleOut
from app.services.notification_service import notify_sale_completed
from app.services.sale_service import complete_sale

router = APIRouter(prefix="/api/sales", tags=["sales"])


@router.post("", response_model=SaleOut, status_code=status.HTTP_201_CREATED)
def create_sale(
    payload: SaleCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user=Depends(require_permission("pos.sell")),
):
    """Completes a sale in one all-or-nothing transaction (PRD 5.14).

    The browser sends only product ids, quantities, the customer and the payments.
    Prices, VAT, discount, stock, due and points are all worked out by the server.
    """
    completed = complete_sale(db, payload, cashier_id=user.user_id)
    # The sale is already committed, so a failing SMS can never undo or block it.
    background_tasks.add_task(
        notify_sale_completed, completed.customer_phone, completed.sale.invoice_number, completed.sale.total_amount
    )
    return completed.sale
