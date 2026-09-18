from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.models.customer import Customer, CustomerPayment, LoyaltyTier # Added LoyaltyTier
from app.schemas.customer import ( 
    CustomerCreate, CustomerUpdate, CustomerRead, 
    PaymentCreate, PaymentRead, PointsCalculation,
    LoyaltyTierCreate, LoyaltyTierUpdate, LoyaltyTierRead,
    CheckCreditPayload, AddDuePayload, AddPointsPayload # <-- ADD THESE
)

router = APIRouter(prefix="/api/customers", tags=["customers"])

@router.get("/", response_model=list[CustomerRead])
def list_customers(
    db: Session = Depends(get_db), 
    user=Depends(get_current_user) # Cashiers need to read customers for POS
):
    return db.query(Customer).all()

@router.post("/", response_model=CustomerRead)
def create_customer(
    payload: CustomerCreate, 
    db: Session = Depends(get_db), 
    user=Depends(require_permission("customers.manage")) # Only Managers/Admins
):
    existing = db.query(Customer).filter(Customer.phone == payload.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="A customer with this phone number already exists.")

    customer = Customer(**payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

@router.put("/{customer_id}", response_model=CustomerRead)
def update_customer(
    customer_id: int, 
    payload: CustomerUpdate, 
    db: Session = Depends(get_db), 
    user=Depends(require_permission("customers.manage")) # Only Managers/Admins
):
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)
        
    db.commit()
    db.refresh(customer)
    return customer
@router.post("/payments", response_model=PaymentRead)
def record_payment(
    payload: PaymentCreate, 
    db: Session = Depends(get_db), 
    user=Depends(require_permission("customer_dues.receive"))
):
    # 1. Find the customer
    customer = db.query(Customer).filter(Customer.customer_id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")

    # 2. Create the payment record
    payment = CustomerPayment(
        customer_id=payload.customer_id,
        amount=payload.amount,
        method=payload.method,
        recorded_by=user.user_id # Links to the logged-in user
    )
    db.add(payment)

    # 3. Safely reduce the outstanding due (Using Decimal math)
    customer.outstanding_due = customer.outstanding_due - payload.amount
    
    # Prevent negative balance just in case they overpay
    if customer.outstanding_due < 0:
        customer.outstanding_due = 0

    # 4. Save changes
    db.commit()
    db.refresh(payment)
    return payment
@router.get("/payments", response_model=list[PaymentRead])
def list_payments(
    db: Session = Depends(get_db), 
    user=Depends(get_current_user)
):
    """Returns a list of all recorded customer payments."""
    # Order by newest first
    return db.query(CustomerPayment).order_by(CustomerPayment.created_at.desc()).all()
# --- LOYALTY HELPER ENDPOINTS FOR MODULE 5 ---

@router.get("/{customer_id}/loyalty-status", response_model=dict)
def get_loyalty_status(
    customer_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user) # Any logged-in user (like a Cashier) can check this
):
    """Returns the customer's current points, tier name, and discount %."""
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Fallback to Regular/0% if they haven't been assigned a tier yet
    tier_name = customer.loyalty_tier.name if customer.loyalty_tier else "Regular"
    discount = customer.loyalty_tier.discount_percent if customer.loyalty_tier else 0.0
    
    return {
        "customer_id": customer.customer_id,
        "loyalty_points": customer.loyalty_points,
        "tier_name": tier_name,
        "discount_percent": float(discount)
    }

@router.post("/calculate-points", response_model=dict)
def calculate_points_earned(
    payload: PointsCalculation,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """
    Pure math helper for Module 5. 
    Example rule: 1 point for every $100 spent.
    Module 5 calls this to know how many points to add AFTER a successful sale.
    """
    # Safely convert Decimal to float for division, then to int for whole points
    points_earned = int(float(payload.sale_amount) / 100.0)
    
    return {
        "sale_amount": float(payload.sale_amount),
        "points_earned": points_earned
    }
# --- LOYALTY TIER CRUD ENDPOINTS ---

@router.get("/loyalty-tiers/", response_model=list[LoyaltyTierRead])
def list_loyalty_tiers(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return db.query(LoyaltyTier).order_by(LoyaltyTier.required_points.asc()).all()

@router.post("/loyalty-tiers/", response_model=LoyaltyTierRead)
def create_loyalty_tier(
    payload: LoyaltyTierCreate,
    db: Session = Depends(get_db),
    user=Depends(require_permission("loyalty.configure"))
):
    tier = LoyaltyTier(**payload.model_dump())
    db.add(tier)
    db.commit()
    db.refresh(tier)
    return tier

@router.put("/loyalty-tiers/{tier_id}", response_model=LoyaltyTierRead)
def update_loyalty_tier(
    tier_id: int,
    payload: LoyaltyTierUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_permission("loyalty.configure"))
):
    tier = db.query(LoyaltyTier).filter(LoyaltyTier.loyalty_tier_id == tier_id).first()
    if not tier:
        raise HTTPException(status_code=404, detail="Loyalty tier not found")
    
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(tier, field, value)
        
    db.commit()
    db.refresh(tier)
    return tier
# --- SPRINT 3: POS INTEGRATION ENDPOINTS (NO-COMMIT LOGIC) ---

@router.post("/check-credit", response_model=dict)
def check_credit_limit(
    payload: CheckCreditPayload,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Module 5 calls this BEFORE a sale to see if the customer can afford it on credit."""
    customer = db.query(Customer).filter(Customer.customer_id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Check if (Current Due + New Sale) exceeds Credit Limit
    # Using Decimal math to prevent floating point errors
    new_total_due = customer.outstanding_due + payload.sale_amount
    is_allowed = new_total_due <= customer.credit_limit
    
    return {
        "customer_id": payload.customer_id,
        "current_due": float(customer.outstanding_due),
        "credit_limit": float(customer.credit_limit),
        "new_total_due": float(new_total_due),
        "is_allowed": is_allowed
    }

@router.post("/add-due", response_model=dict)
def add_due(
    payload: AddDuePayload,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Module 5 calls this AFTER a successful credit sale to increase the customer's debt."""
    customer = db.query(Customer).filter(Customer.customer_id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Safely add Decimal to Decimal
    customer.outstanding_due = customer.outstanding_due + payload.amount
    db.flush() # Updates the session, but doesn't commit to DB yet (per team rules)
    
    return {
        "customer_id": payload.customer_id,
        "new_outstanding_due": float(customer.outstanding_due)
    }

@router.post("/add-points", response_model=dict)
def add_points(
    payload: AddPointsPayload,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Module 5 calls this AFTER a sale to add loyalty points."""
    customer = db.query(Customer).filter(Customer.customer_id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    customer.loyalty_points = customer.loyalty_points + payload.points
    db.flush() # Updates session, no commit yet
    
    return {
        "customer_id": payload.customer_id,
        "new_loyalty_points": customer.loyalty_points
    }