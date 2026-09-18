// frontend/src/modules/customers/CustomersPage.tsx
import { useEffect, useState } from "react";
import { listCustomers, createCustomer, type Customer } from "../../services/customers";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [creditLimit, setCreditLimit] = useState("0.00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await listCustomers();
      setCustomers(data);
    } catch (err) {
      setError("Failed to load customers. Are you logged in?");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const newCustomer = await createCustomer({ 
        name, 
        phone, 
        credit_limit: creditLimit 
      });
      setCustomers([...customers, newCustomer]);
      setName("");
      setPhone("");
      setCreditLimit("0.00");
    } catch (err: any) {
      setError(err.message || "Failed to create customer. Check if phone already exists.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Customers</h2>
      
      <form onSubmit={handleAdd} style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
        <input 
          value={name} 
          onChange={e => setName(e.target.value)} 
          placeholder="Customer Name" 
          required 
          style={{ padding: "8px" }}
        />
        <input 
          value={phone} 
          onChange={e => setPhone(e.target.value)} 
          placeholder="Phone (e.g., 017...)" 
          required 
          style={{ padding: "8px" }}
        />
        <input 
          value={creditLimit} 
          onChange={e => setCreditLimit(e.target.value)} 
          placeholder="Credit Limit" 
          type="number" 
          step="0.01"
          style={{ padding: "8px" }}
        />
        <button type="submit" disabled={loading} style={{ padding: "8px 16px", cursor: "pointer" }}>
          {loading ? "Adding..." : "+ Add Customer"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <table border={1} cellPadding="10" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: "#f4f4f4" }}>
            <th>Customer</th>
            <th>Phone</th>
            <th>Credit Limit</th>
            <th>Outstanding Due</th>
            <th>Available Credit</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {customers.map(c => (
            <tr key={c.customer_id}>
              <td>{c.name}</td>
              <td>{c.phone}</td>
              <td>${c.credit_limit}</td>
              <td style={{ color: c.outstanding_due !== "0.00" ? "red" : "black" }}>
                ${c.outstanding_due}
              </td>
              <td style={{ fontWeight: "bold" }}>${c.available_credit}</td>
              <td>
                <span style={{ 
                  padding: "4px 8px", 
                  borderRadius: "4px", 
                  backgroundColor: c.status === "active" ? "#d4edda" : "#f8d7da",
                  color: c.status === "active" ? "#155724" : "#721c24"
                }}>
                  {c.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}