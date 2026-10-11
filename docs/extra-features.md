# Extra features (not in the original PRD)

Four additions built on top of Module 5 (POS, Sales & Invoices). Each one works with what was already there.

## 1. Mobile wallet payments (bKash, Nagad, Rocket)

- The POS payment panel has a row for each wallet. Typing an amount opens a **Trx ID** box for that wallet.
- The sale cannot be completed until the transaction ID is entered (4 to 50 letters, numbers, `-` or `_`; saved in capitals).
- A transaction ID can pay for **one sale only**. Using it again is refused ("already used for another sale").
- `digital` is still there as the general digital payment. Refunds, customer due payments, the Dashboard and the Reports page know the wallets too.
- Database: the `Payments` table has a new column `reference`. After pulling, run `python -m app.init_db` in `backend` (adds the column, keeps your data).

## 2. POS keyboard shortcuts

| Key | Does |
|---|---|
| `F2` | Focus the scan / SKU box |
| `F3` | Focus the product search box |
| `F8` | Hold the bill |
| `F9` | Complete the sale (says why, if the sale isn't ready) |
| `Esc` | Clear the search boxes; pressed again, asks whether to clear the whole sale |

The keys are shown under the search boxes. They are switched off while the receipt is open.

## 3. QR code on invoices

- Every invoice (the POS receipt and the invoice from the Sales / Invoices pages) shows a QR code. It opens `/i/<code>`, a page with just that invoice, **no login needed**.
- The code is the invoice number plus a signature made with the server's secret key, so one invoice's link cannot be used to guess another's. Nothing extra is stored.
- The public page does not show the cashier, the customer's phone number or any ids.
- **Showing it on a phone (demo):** the phone must be able to reach both the app and the backend.
  1. Find the laptop's address on the Wi-Fi, e.g. `192.168.0.5`.
  2. `backend/.env`: add the app address to `CORS_ORIGINS`, e.g. `http://localhost:5173,http://192.168.0.5:5173`.
  3. `frontend/.env`: set `VITE_API_BASE_URL=http://192.168.0.5:8000` and `VITE_PUBLIC_URL=http://192.168.0.5:5173`.
  4. Start the backend with `uvicorn app.main:app --reload --host 0.0.0.0` and the frontend with `npm run dev -- --host`.
  5. Open the app on the laptop using `http://192.168.0.5:5173`, make a sale and scan the QR code with the phone.

## 4. End-of-day closing (Sales → Day Close)

- Shows one store day: number of sales, net sales, returns, money left on dues, and old dues collected.
- **Money received** by method (on sales, due payments, refunds, net) and **totals per cashier**.
- **Cash drawer:** the drawer should hold `cash already in it + cash on sales + cash from due payments − cash refunded`. Enter the opening cash and the cash you counted; the page shows *Balanced*, *Short* or *Over*.
- Saving records the count (new table `DayClosings`). Closing the same day again replaces the earlier count. The next day suggests the last counted cash as its opening cash.
- Only users with `sales.view` (Admin and Manager) can open it. Saving is written to the activity log.
- The new table is created by `python -m app.init_db`.

## Tests

Backend: `python -m unittest discover -s tests -t .` (the new ones are `test_payment_methods`, `test_invoice_share`, `test_day_close`, `test_extra_features_api`).
