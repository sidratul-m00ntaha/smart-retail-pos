# Module 6: Customers, Dues & Loyalty

## Database Schema
This module manages customer records, their outstanding dues, loyalty tiers, and payment history.

### Tables
- **Customers**: Core customer data, credit limits, and current due balances.
- **LoyaltyTiers**: Configuration for Regular/Silver/Gold tiers and discount percentages.
- **CustomerPayments**: Records of payments made by customers to reduce their outstanding due.
- **LoyaltyTransactions**: History of points earned by customers.

### Entity Relationship Diagram
```mermaid
erDiagram
    Customers ||--o{ CustomerPayments : "makes"
    Customers ||--o{ LoyaltyTransactions : "earns"
    Customers }o--|| LoyaltyTiers : "belongs to"

    Customers {
        int customer_id PK
        string name
        string phone
        string email
        decimal credit_limit
        decimal outstanding_due
        int loyalty_points
        int loyalty_tier_id FK
        string status
    }

    LoyaltyTiers {
        int loyalty_tier_id PK
        string name
        int required_points
        decimal discount_percent
    }

    CustomerPayments {
        int customer_payment_id PK
        int customer_id FK
        decimal amount
        string method
        int recorded_by FK
    }

    LoyaltyTransactions {
        int loyalty_transaction_id PK
        int customer_id FK
        int sale_id
        string transaction_type
        int points
    }