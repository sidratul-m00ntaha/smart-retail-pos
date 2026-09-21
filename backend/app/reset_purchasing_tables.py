"""Rebuilds ONLY Module 3's four tables: SupplierPayments, PurchaseItems, Purchases and Suppliers.

Why: the purchasing code was rewritten (PRD names: supplier_id, total_amount, ...). SQL Server keeps the OLD tables
(SupplierID, Total, ...) because create_all never changes a table that already exists, so every supplier and
purchase request fails with "Invalid column name". This drops the four old tables and creates them again.

It deletes the suppliers, purchases and supplier payments in your LOCAL database. It does not touch products, stock,
customers, sales or any other module's tables. Use it instead of `python -m app.init_db --reset`, which deletes everything.

Run from the backend folder, with .venv active:
    python -m app.reset_purchasing_tables
"""
from app import models  # noqa: F401  (loads every table definition)
from app.database import Base, engine
from app.models import Purchase, PurchaseItem, Supplier, SupplierPayment

MODULE_3_TABLES = [Supplier.__table__, Purchase.__table__, PurchaseItem.__table__, SupplierPayment.__table__]


def main() -> None:
    names = ", ".join(table.name for table in MODULE_3_TABLES)
    answer = input(f"This DELETES all data in: {names}. Other modules are not touched. Type yes to continue: ")
    if answer.strip().lower() != "yes":
        print("Cancelled - nothing was changed.")
        return

    Base.metadata.drop_all(engine, tables=MODULE_3_TABLES)  # children first: SQLAlchemy sorts by foreign key
    Base.metadata.create_all(engine, tables=MODULE_3_TABLES)
    print(f"Rebuilt: {names}")


if __name__ == "__main__":
    main()
