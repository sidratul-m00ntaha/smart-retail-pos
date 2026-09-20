"""Every permission code and which roles have it.

The single list used by init_db.py (to fill the database) and by require_permission()
(to catch misspelled codes). Matches the table in docs/database/module-1-auth-admin.md.

Need a new permission? Add it here and to that table, in a PR reviewed by the Module 1 owner,
then run: python -m app.init_db
"""

# Permission code -> description
PERMISSIONS = {
    "users.manage": "Create, edit, deactivate users; assign roles",
    "settings.manage": "Change store settings",
    "activity_logs.view": "See the activity log",
    "tax_rates.manage": "Create and change VAT rates",
    "products.manage": "Products, categories, brands, units",
    "suppliers.manage": "Suppliers",
    "purchases.manage": "Create purchases, pay supplier dues",
    "inventory.manage": "Stock adjustments and batches",
    "customers.manage": "View, edit, update credit limit, or deactivate customers",
    "customers.create": "Register a new customer (used by the POS at checkout)",
    "customer_dues.receive": "Receive customer due payments",
    "loyalty.configure": "Loyalty tiers",
    "pos.sell": "Use the POS: sales, invoices, invoice SMS",
    "sales.view": "Sales history and invoices",
    "reports.view": "Dashboard, reports, expiry alerts",
    "ai.use": "AI Assistant",
}

ADMIN_ONLY = {"users.manage", "settings.manage", "activity_logs.view", "tax_rates.manage"}

# Role name -> (description, permission codes)
ROLES = {
    "Admin": ("Full access to everything", set(PERMISSIONS)),
    "Manager": ("Runs the store: products, purchasing, inventory, customers, reports", set(PERMISSIONS) - ADMIN_ONLY),
    # Cashiers can register a new customer at checkout, but not edit or deactivate customers
    "Cashier": ("Operates the POS", {"pos.sell", "customers.create"}),
}
