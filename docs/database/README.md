# Database design

Our SQL Server tables, one file per module. **The PRD is the source of truth**; these files turn it into exact tables.
Each module owner writes and maintains their own file, and everyone follows the conventions below.

| Module | File | Owner |
|---|---|---|
| 1 – Auth & Administration | [module-1-auth-admin.md](module-1-auth-admin.md) | @sidratul-m00ntaha |
| 2 – Product Catalog | `module-2-catalog.md` | |
| 3 – Suppliers & Purchasing | `module-3-purchasing.md` | |
| 4 – Inventory & Expiry | `module-4-inventory.md` | |
| 5 – POS, Sales & Invoices | `module-5-sales.md` | |
| 6 – Customers, Dues & Loyalty | `module-6-customers.md` | |

## Conventions

| Topic | Rule | Example |
|---|---|---|
| Table names | PascalCase, plural (same as the PRD) | `Users`, `PurchaseItems` |
| Column names | snake_case | `full_name`, `created_at` |
| Primary key | `<singular>_id`, `INT`, auto-numbered | `user_id` |
| Foreign key | Same name as the key it points to, or a clearer name when the meaning is specific | `role_id`, `cashier_id`, `created_by` |
| Text | `NVARCHAR(n)` with a length (supports every language; SQL Server can't index `NVARCHAR(MAX)`) | `NVARCHAR(100)` |
| Money | `DECIMAL(18,2)` – never `FLOAT` | `sale_price` |
| Quantities | `DECIMAL(18,3)` (allows 1.5 kg) | `quantity` |
| Percentages | `DECIMAL(5,2)` | `tax_percent = 15.00` |
| Yes / no | `BIT`, named `is_...` | `is_active` |
| Date and time | `DATETIME2`, stored in **UTC** | `created_at` |
| Timestamps | Every table has `created_at`; tables that can be edited also have `updated_at` | |
| Status | `is_active` for on/off; `status NVARCHAR(20)` for more than two values | `status = 'completed'` |
| Deleting | Don't delete rows that other records point to – deactivate them instead (PRD 5.3) | `is_active = 0` |
| Unique columns | Make them `NOT NULL` – SQL Server allows only **one** NULL in a UNIQUE column | `email` |

## How to write your module's file

1. Copy the structure of [module-1-auth-admin.md](module-1-auth-admin.md): diagram, tables, notes.
2. Draw the diagram with **Mermaid** inside the markdown file. GitHub draws it automatically, and because it's text, Git can merge it.
3. For tables from other modules that you point to, show only their name in your diagram.
4. Open a PR and add the owners of any module you point to as reviewers.