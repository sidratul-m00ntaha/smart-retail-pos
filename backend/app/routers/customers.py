from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.dependencies import get_current_user  # Real auth from Module 1!
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerRead

router = APIRouter(prefix="/api/customers", tags=["customers"])

@router.get("/", response_model=list[CustomerRead])
def list_customers(db: Session = Depends(get_db), user=Depends(get_current_user)):
    # Fetch all customers. Pydantic will automatically compute 'available_credit' for each.
    return db.query(Customer).all()

@router.post("/", response_model=CustomerRead)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # Prevent duplicate phone numbers
    existing = db.query(Customer).filter(Customer.phone == payload.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="A customer with this phone number already exists.")

    customer = Customer(
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        address=payload.address,
        credit_limit=payload.credit_limit
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

@router.put("/{customer_id}", response_model=CustomerRead)
def update_customer(customer_id: int, payload: CustomerUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Update only the fields that were provided in the request
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)
        
    db.commit()
    db.refresh(customer)
    return customer