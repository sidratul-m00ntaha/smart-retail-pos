"""Smart Retail POS - FastAPI application entry point."""
from fastapi import Depends, FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.routers import activity_logs, ai, auth, roles, store_settings, users
from app.routers import brands, categories, dashboard, products, tax_rates, units
from app.routers import customers
from app.routers import suppliers, purchases

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
app.include_router(users.router)
app.include_router(roles.router)
app.include_router(activity_logs.router)
app.include_router(store_settings.router)
app.include_router(ai.router)
app.include_router(customers.router)

# Module 2: Product Catalog, Dashboard & Reports
app.include_router(brands.router)
app.include_router(categories.router)
app.include_router(products.router)
app.include_router(dashboard.router)
app.include_router(tax_rates.router)
app.include_router(units.router)

# Module 3: Suppliers & Purchasing
app.include_router(suppliers.router)
app.include_router(purchases.router)

# Module 4: Inventory & Expiry
from app.routers import stock, stock_movements, stock_adjustments, expiry
app.include_router(stock.router)
app.include_router(stock_movements.router)
app.include_router(stock_adjustments.router)
app.include_router(expiry.router)

# Module 5: POS, Sales & Invoices
from app.routers import sales, held_carts, invoices
app.include_router(sales.router)
app.include_router(held_carts.router)
app.include_router(invoices.router)
