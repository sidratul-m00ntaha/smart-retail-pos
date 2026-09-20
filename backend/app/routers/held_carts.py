"""Held carts API (Module 5): pause a bill and resume it later."""
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_permission
from app.database import get_db
from app.schemas.held_cart import HeldCartOut, HeldCartResumeOut, HeldCartSave
from app.services import held_cart_service

router = APIRouter(prefix="/api/held-carts", tags=["held-carts"])


@router.post("", response_model=HeldCartOut, status_code=status.HTTP_201_CREATED)
def hold_cart(
    payload: HeldCartSave,
    db: Session = Depends(get_db),
    user=Depends(require_permission("pos.sell")),
):
    """Pauses the current bill so the cashier can serve the next customer."""
    return held_cart_service.hold_cart(db, payload, cashier_id=user.user_id)


@router.get("", response_model=list[HeldCartOut])
def list_held_carts(
    db: Session = Depends(get_db),
    user=Depends(require_permission("pos.sell")),
):
    """All bills on hold, newest first."""
    return held_cart_service.list_held_carts(db)


@router.get("/{held_cart_id}", response_model=HeldCartResumeOut)
def resume_held_cart(
    held_cart_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission("pos.sell")),
):
    """Loads a held bill with today's prices and stock. It stays on hold until the sale is completed."""
    return held_cart_service.resume_held_cart(db, held_cart_id)


@router.put("/{held_cart_id}", response_model=HeldCartOut)
def update_held_cart(
    held_cart_id: int,
    payload: HeldCartSave,
    db: Session = Depends(get_db),
    user=Depends(require_permission("pos.sell")),
):
    """Holds a resumed bill again with its new items, instead of creating a duplicate."""
    return held_cart_service.update_held_cart(db, held_cart_id, payload)


@router.delete("/{held_cart_id}", status_code=status.HTTP_204_NO_CONTENT)
def discard_held_cart(
    held_cart_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission("pos.sell")),
):
    """Throws a held bill away (the row is kept with status 'discarded')."""
    held_cart_service.discard_held_cart(db, held_cart_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
