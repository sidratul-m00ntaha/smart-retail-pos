# backend/app/services/customer_service.py
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.customer import Customer, LoyaltyTier, LoyaltyTransaction

def check_credit_limit(db: Session, customer_id: int, sale_amount: Decimal) -> dict:
    """Checks if a customer can afford a sale on credit. Read-only."""
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        return None
    
    new_total_due = customer.outstanding_due + sale_amount
    is_allowed = new_total_due <= customer.credit_limit
    
    return {
        "customer": customer,
        "is_allowed": is_allowed,
        "new_total_due": new_total_due
    }

def add_due(db: Session, customer_id: int, amount: Decimal) -> Customer:
    """Increases outstanding_due. Does NOT commit - the caller commits it."""
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise ValueError("Customer not found")
        
    customer.outstanding_due = customer.outstanding_due + amount
    db.flush() 
    return customer

def add_points(
    db: Session, 
    customer_id: int, 
    points: int, 
    sale_id: int | None = None, 
    description: str | None = None
) -> Customer:
    """Adds loyalty points, logs the earning, and auto-upgrades tier. Does NOT commit."""
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise ValueError("Customer not found")

    # 1. Add the points
    customer.loyalty_points = customer.loyalty_points + points

    # 2. Log the Loyalty Transaction (Fills the Module 5 TODO)
    db.add(LoyaltyTransaction(
        customer_id=customer_id,
        sale_id=sale_id,
        transaction_type="earn",
        points=points,
        description=description or "Points earned from sale",
    ))

    # 3. Auto-upgrade tier if threshold is crossed
    best_tier = db.query(LoyaltyTier).filter(
        LoyaltyTier.required_points <= customer.loyalty_points
    ).order_by(LoyaltyTier.required_points.desc()).first()

    if best_tier and customer.loyalty_tier_id != best_tier.loyalty_tier_id:
        customer.loyalty_tier_id = best_tier.loyalty_tier_id

    db.flush() # No commit! Module 5 handles the final commit.
    return customer