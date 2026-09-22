// frontend/src/modules/customers/DuePaymentsPage.tsx
import { useEffect, useState } from "react";
import { listCustomers, recordPayment, type Customer } from "../../services/customers";

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
      .then((settings: any) => {
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
    <div style={{ padding: "20px" }}>
      <h2>Due Payments</h2>

      {/* Payment Form */}
      <div style={{ backgroundColor: "#f9f9f9", padding: "20px", borderRadius: "8px", marginBottom: "30px" }}>
        <h3>Record a Payment</h3>
        <form onSubmit={handlePayment} style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ marginBottom: "5px", fontSize: "14px", fontWeight: "bold" }}>Customer</label>
            <select 
              value={selectedCustomerId} 
              onChange={e => setSelectedCustomerId(e.target.value === "" ? "" : Number(e.target.value))}
              required
              style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc", minWidth: "200px" }}
            >
              <option value="">Select a customer...</option>
              {customers.map(c => (
                <option key={c.customer_id} value={c.customer_id}>
                  {c.name} {parseFloat(c.outstanding_due) > 0 ? `(Due: ${currencySymbol}${c.outstanding_due})` : '(No Due)'}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ marginBottom: "5px", fontSize: "14px", fontWeight: "bold" }}>Amount ({currencySymbol})</label>
            <input 
              type="number" 
              step="0.01" 
              min="0.01"
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              placeholder="0.00" 
              required 
              style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc", width: "120px" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ marginBottom: "5px", fontSize: "14px", fontWeight: "bold" }}>Method</label>
            <select 
              value={method} 
              onChange={e => setMethod(e.target.value)}
              style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc", width: "120px" }}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="digital">Digital</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={loading || !selectedCustomerId || !amount}
            style={{ 
              padding: "9px 20px", 
              backgroundColor: loading ? "#ccc" : "#28a745", 
              color: "white", 
              border: "none", 
              borderRadius: "4px", 
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "bold"
            }}
          >
            {loading ? "Processing..." : "Record Payment"}
          </button>
        </form>

        {message && (
          <p style={{ 
            marginTop: "15px", 
            color: message.type === "success" ? "green" : "red", 
            fontWeight: "bold" 
          }}>
            {message.text}
          </p>
        )}
      </div>

      {/* Customers with Due Table */}
      <h3>Customers with Outstanding Due</h3>
      {customersWithDue.length === 0 ? (
        <p style={{ color: "#666" }}>Great news! No customers currently have an outstanding due.</p>
      ) : (
        <table border={1} cellPadding="10" style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
          <thead>
            <tr style={{ backgroundColor: "#f4f4f4" }}>
              <th>Customer</th>
              <th>Phone</th>
              <th>Credit Limit</th>
              <th style={{ color: "#dc3545" }}>Outstanding Due</th>
              <th>Available Credit</th>
            </tr>
          </thead>
          <tbody>
            {customersWithDue.map(c => (
              <tr key={c.customer_id}>
                <td>{c.name}</td>
                <td>{c.phone}</td>
                <td>{currencySymbol}{c.credit_limit}</td>
                <td style={{ fontWeight: "bold", color: "#dc3545" }}>{currencySymbol}{c.outstanding_due}</td>
                <td>{currencySymbol}{c.available_credit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}