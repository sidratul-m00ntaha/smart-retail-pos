# backend/app/services/customer_service.py
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.customer import Customer, LoyaltyTier

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

def add_points(db: Session, customer_id: int, points: int) -> Customer:
    """Adds loyalty points and auto-upgrades tier if threshold is crossed. Does NOT commit."""
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise ValueError("Customer not found")
        
    # 1. Add the points
    customer.loyalty_points = customer.loyalty_points + points
    
    # 2. PRD 5.13: Auto-upgrade tier if they crossed a threshold
    # Find the highest tier they qualify for based on their new point total
    best_tier = db.query(LoyaltyTier).filter(
        LoyaltyTier.required_points <= customer.loyalty_points
    ).order_by(LoyaltyTier.required_points.desc()).first()
    
    # If they qualify for a better tier, and it's different from their current one, upgrade them
    if best_tier and customer.loyalty_tier_id != best_tier.loyalty_tier_id:
        customer.loyalty_tier_id = best_tier.loyalty_tier_id
        
    db.flush()
    return customer