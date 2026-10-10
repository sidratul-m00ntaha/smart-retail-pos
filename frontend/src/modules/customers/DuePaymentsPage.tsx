// frontend/src/modules/customers/DuePaymentsPage.tsx
import { useEffect, useState } from "react";
import { listCustomers, recordPayment, type Customer } from "../../services/customers";
import styles from "./customers.module.css";

// ⚠️ PRE-FLIGHT CHECK: If this import gives a red error, delete this line and change 
// `const [currencySymbol, setCurrencySymbol] = useState("");` to `const currencySymbol = "৳";` below.
import { getStoreSettings } from "../../services/store-settings.service"; 

export default function DuePaymentsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | "">("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Dynamic currency symbol from settings
  const [currencySymbol, setCurrencySymbol] = useState("");

  const loadCustomers = async () => {
    try {
      const data = await listCustomers();
      setCustomers(data);
    } catch {
      setMessage({ type: "error", text: "Failed to load customers." });
    }
  };

  useEffect(() => {
    let isCurrent = true;
    
    // 1. Fetch customers
    listCustomers()
      .then((data) => {
        if (isCurrent) setCustomers(data);
      })
      .catch(() => {
        if (isCurrent) setMessage({ type: "error", text: "Failed to load customers." });
      });
      
    // 2. Fetch currency symbol from settings
    getStoreSettings()
      .then((settings) => {
        if (isCurrent && settings?.currency_symbol) {
          setCurrencySymbol(settings.currency_symbol);
        }
      })
      .catch(() => {
        // Fails silently to prevent page crash if settings aren't ready
      });
      
    return () => {
      isCurrent = false;
    };
  }, []);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !amount) return;

    setLoading(true);
    setMessage(null);

    try {
      await recordPayment({
        customer_id: Number(selectedCustomerId),
        amount: Number(amount),
        method: method,
      });
      
      setMessage({ type: "success", text: "Payment recorded successfully!" });
      setAmount("");
      setSelectedCustomerId("");
      
      // Reload customers to show the updated outstanding_due
      await loadCustomers();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to record payment." });
    } finally {
      setLoading(false);
    }
  };

  // Filter to only show customers who actually owe money
  const customersWithDue = customers.filter(c => parseFloat(c.outstanding_due) > 0);

  return (
    <div>
      <h2 className={styles.heading}>Due Payments</h2>

      {/* Payment Form */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Record a Payment</h3>
        <form onSubmit={handlePayment} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Customer</label>
            <select
              className={`${styles.select} ${styles.wide}`}
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value === "" ? "" : Number(e.target.value))}
              required
            >
              <option value="">Select a customer...</option>
              {customers.map(c => (
                <option key={c.customer_id} value={c.customer_id}>
                  {c.name} {parseFloat(c.outstanding_due) > 0 ? `(Due: ${currencySymbol}${c.outstanding_due})` : '(No Due)'}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Amount ({currencySymbol})</label>
            <input
              className={`${styles.input} ${styles.w120}`}
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Method</label>
            <select
              className={`${styles.select} ${styles.w120}`}
              value={method}
              onChange={e => setMethod(e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="digital">Digital</option>
            </select>
          </div>

          <button
            type="submit"
            className={styles.primaryButton}
            disabled={loading || !selectedCustomerId || !amount}
          >
            {loading ? "Processing..." : "Record Payment"}
          </button>
        </form>

        {message && (
          <p className={message.type === "success" ? styles.messageOk : styles.messageError}>
            {message.text}
          </p>
        )}
      </div>

      {/* Customers with Due Table */}
      <h3 className={styles.subheading}>Customers with Outstanding Due</h3>
      {customersWithDue.length === 0 ? (
        <p className={styles.empty}>Great news! No customers currently have an outstanding due.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Credit Limit</th>
                <th className={styles.dueHead}>Outstanding Due</th>
                <th>Available Credit</th>
              </tr>
            </thead>
            <tbody>
              {customersWithDue.map(c => (
                <tr key={c.customer_id}>
                  <td>{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{currencySymbol}{c.credit_limit}</td>
                  <td className={styles.due}>{currencySymbol}{c.outstanding_due}</td>
                  <td>{currencySymbol}{c.available_credit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
