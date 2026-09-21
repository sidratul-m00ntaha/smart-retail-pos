# AI Assistant (PRD 5.22)

**Owner:** Module 1 (@sidratul-m00ntaha) · **Page:** AI Assistant · **Permission:** `ai.use` (Admin, Manager)

A chat page where a manager asks questions in plain English and gets answers built from the shop's
own records — today's sales, stock levels, customer dues, supplier dues, expiry and loyalty.

## How a question is answered

```text
"How much did we sell today?"
        │
        ▼
1. Intent detection        which of the approved reports answers this?      services/ai/intents.py
        │                  (word matching; an AI provider can help - below)
        ▼
2. Approved report         one fixed, parameterised query over the real     services/ai/report_functions.py
   function                tables. Read-only.
        │
        ▼
3. Answer                  a sentence built from those numbers              services/ai/answers.py
        │                  (an AI provider may rewrite the wording)
        ▼
4. Saved                   question + answer + the function's name          AIConversations / AIMessages
```

**The safety rules from the PRD, and how they are kept:**

| Rule | How |
|---|---|
| No open database access | The assistant can only call the functions in `REPORT_FUNCTIONS`. A name that isn't in that list is refused. |
| No raw SQL from the AI | Every query is written by us in Python. The AI only ever picks a function name and simple arguments (period, days, limit, product name), and those are checked before use. |
| Cannot change records | The report functions only read. Nothing in the assistant writes to a business table. |
| Every answer traceable | Each saved answer stores the `report_function` that produced it, and the page shows it under the answer. |

## What it can answer today

| Report function | Answers questions like |
|---|---|
| `sales_summary` | How much did we sell today / yesterday / this week / this month? |
| `top_products` | What are the best selling products this month? |
| `payment_methods` | How did customers pay today? |
| `low_stock` | Which products are low on stock or out of stock? |
| `inventory_value` | What is my stock worth? |
| `expiring_soon` | What is expiring in the next 7 days? |
| `customer_dues` | How much do customers owe us? Who owes the most? |
| `supplier_dues` | How much do we owe suppliers? |
| `purchases_summary` | What did we purchase this month? |
| `loyalty_summary` | How many loyalty points are out there, and by tier? |
| `product_lookup` | What is the price of rice? How much milk is in stock? |
| `recent_sales` | What were the last sales? Show me the recent bills. |
| `invoice_lookup` | Show invoice INV-2026-00125. |
| `unpaid_sales` | Which sales are still unpaid? |
| `sales_by_cashier` | Who sold the most today? Sales by cashier this month. |
| `held_bills` | How many bills are on hold at the till? |
| `stock_movements_summary` | What stock moved today, and why? |
| `catalog_summary` | What VAT rates do we have? How many categories and brands? |
| `products_by_category` | Show products by category. Which category is the biggest? |
| `customer_lookup` | Find customer Rahim. How much does Nusrat owe? |
| `supplier_lookup` | Find supplier Pran Foods. |
| `stock_adjustments_summary` | What stock adjustments were made this month? |
| `business_summary` | How is my business doing? |

Anything else gets an honest "I can only answer questions about the shop's own data", with examples.

## Adding a new question type

1. **Write the report function** in `backend/app/services/ai/report_functions.py`. Take `db` as the first
   argument, read only, and return plain numbers and strings (no ORM objects).
2. **Register it** in `REPORT_FUNCTIONS` at the bottom of that file, with a one-line description.
3. **Write the sentence** in `services/ai/answers.py` and add it to `_WRITERS`.
4. **Add the words that suggest it** to `_INTENTS` in `services/ai/intents.py`.
5. Add a line to the table above.

Nothing else changes — the API, the page and the safety checks all work from those lists.

## Switching on an AI provider (optional)

Without a key the assistant already works: it matches the question itself and answers from templates.
A key adds two things: nicer wording, and a better chance of understanding an unusual question.

1. Get a free key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Put it in `backend/.env`:

   ```ini
   AI_API_KEY=your-key-here
   AI_MODEL=gemini-2.5-flash
   ```

3. `pip install -r requirements.txt` (installs `google-genai`), then restart the backend.

The page's badge changes from **Built-in answers** to **AI wording on**.

**The provider still never touches the database.** It only sees the question, the list of approved
function names, and numbers a report function already returned. If the provider is slow, errors or
returns something odd, the built-in answer is used instead — the page keeps working.

## Tables

### AIConversations

One saved chat. Users only ever see their own.

| Column               | Type          | Rules                                  |
| -------------------- | ------------- | -------------------------------------- |
| `ai_conversation_id` | INT           | PK, auto-numbered                      |
| `user_id`            | INT           | NOT NULL, FK → Users, indexed          |
| `title`              | NVARCHAR(150) | NOT NULL – the first question, shortened |
| `created_at`         | DATETIME2     | NOT NULL                               |
| `updated_at`         | DATETIME2     |                                        |

### AIMessages

Every question and every answer, in order.

| Column               | Type           | Rules                                                        |
| -------------------- | -------------- | ------------------------------------------------------------ |
| `ai_message_id`      | INT            | PK, auto-numbered                                            |
| `ai_conversation_id` | INT            | NOT NULL, FK → AIConversations, indexed                      |
| `role`               | NVARCHAR(10)   | NOT NULL – `user` or `assistant`                             |
| `content`            | NVARCHAR(4000) | NOT NULL – the question, or the answer                       |
| `intent`             | NVARCHAR(50)   | Assistant messages: which intent matched                     |
| `report_function`    | NVARCHAR(100)  | Assistant messages: which approved function produced it      |
| `created_at`         | DATETIME2      | NOT NULL                                                     |

Deleting a chat deletes its messages with it.

## API

| Endpoint | What it does |
|---|---|
| `GET /api/ai/info` | Example questions, the approved report functions, and whether a provider is switched on |
| `POST /api/ai/ask` | `{question, conversation_id?}` → `{conversation_id, answer, intent, report_function, data}`. **400** for a blank question, **422** over 500 characters |
| `GET /api/ai/conversations` | The user's own chats, newest first |
| `GET /api/ai/conversations/{id}` | One chat with all its messages (**404** for someone else's) |
| `DELETE /api/ai/conversations/{id}` | Deletes one of your own chats (204) |

All of them need the `ai.use` permission: **401** when not logged in, **403** for a cashier.

## Notes

- Times use the shop's own day (`STORE_UTC_OFFSET_HOURS` in `backend/.env`, 6 for Bangladesh), so
  "today" means today in the shop, not in UTC, and times in answers read like the till receipts.
- Money is shown with the currency from **Settings → Store**.
- The assistant reads the real tables directly. It does **not** use `services/report_service.py`,
  which still returns sample numbers for parts of the dashboard.
