// frontend/src/modules/customers/CustomersPage.tsx
import { useEffect, useState } from "react";
import { listCustomers, createCustomer, updateCustomer, type Customer } from "../../services/customers";
import { getStoreSettings } from "../../services/store-settings.service";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; phone: string; credit_limit: string; status: string }>({
    name: "", phone: "", credit_limit: "0.00", status: "active",
  });

  // Whatever the Settings page has saved — ৳, $, ₹, etc. Starts blank so we
  // never flash the wrong symbol before the real one loads.
  const [currencySymbol, setCurrencySymbol] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [creditLimit, setCreditLimit] = useState("0.00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;
    listCustomers()
      .then((data) => { if (isCurrent) setCustomers(data); })
      .catch(() => { if (isCurrent) setError("Failed to load customers. Are you logged in?"); });
    getStoreSettings()
      .then((settings) => { if (isCurrent) setCurrencySymbol(settings.currency_symbol); })
      .catch(() => { /* if this fails, amounts just show without a symbol - not worth blocking the page for */ });
    return () => { isCurrent = false; };
  }, []);

  const filtered = customers.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const newCustomer = await createCustomer({ name, phone, credit_limit: creditLimit });
      setCustomers([...customers, newCustomer]);
      setName(""); setPhone(""); setCreditLimit("0.00");
      setShowAddForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create customer. Check if phone already exists.");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (c: Customer) => {
    setEditingId(c.customer_id);
    setEditDraft({ name: c.name, phone: c.phone, credit_limit: c.credit_limit, status: c.status });
  };

  const saveEdit = async (customer_id: number) => {
    setError("");
    try {
      const updated = await updateCustomer(customer_id, editDraft);
      setCustomers(customers.map((c) => (c.customer_id === customer_id ? updated : c)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update customer.");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Customers</h2>

      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone…"
          style={{ padding: "8px", flex: 1, maxWidth: "320px" }}
        />
        <button type="button" onClick={() => setShowAddForm((v) => !v)} style={{ padding: "8px 16px", cursor: "pointer" }}>
          {showAddForm ? "Cancel" : "+ Add customer"}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer Name" required style={{ padding: "8px" }} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (e.g., 017...)" required style={{ padding: "8px" }} />
          <input value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} placeholder="Credit Limit" type="number" step="0.01" style={{ padding: "8px" }} />
          <button type="submit" disabled={loading} style={{ padding: "8px 16px", cursor: "pointer" }}>
            {loading ? "Adding..." : "Save"}
          </button>
        </form>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}

      <table border={1} cellPadding="10" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: "#f4f4f4" }}>
            <th>Customer</th><th>Phone</th><th>Total Purchases</th><th>Credit Limit</th><th>Outstanding Due</th><th>Available Credit</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c) =>
            editingId === c.customer_id ? (
              <tr key={c.customer_id}>
                <td><input value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} style={{ padding: "4px", width: "100%" }} /></td>
                <td><input value={editDraft.phone} onChange={(e) => setEditDraft({ ...editDraft, phone: e.target.value })} style={{ padding: "4px", width: "100%" }} /></td>
                <td>{currencySymbol}{c.total_purchases}</td>
                <td><input value={editDraft.credit_limit} onChange={(e) => setEditDraft({ ...editDraft, credit_limit: e.target.value })} type="number" step="0.01" style={{ padding: "4px", width: "100%" }} /></td>
                <td>{currencySymbol}{c.outstanding_due}</td>
                <td>{currencySymbol}{c.available_credit}</td>
                <td>
                  <select value={editDraft.status} onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value })}>
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button onClick={() => saveEdit(c.customer_id)} style={{ marginRight: "6px" }}>Save</button>
                  <button onClick={() => setEditingId(null)}>Cancel</button>
                </td>
              </tr>
            ) : (
              <tr key={c.customer_id}>
                <td>{c.name}</td>
                <td>{c.phone}</td>
                <td>{currencySymbol}{c.total_purchases}</td>
                <td>{currencySymbol}{c.credit_limit}</td>
                <td style={{ color: c.outstanding_due !== "0.00" ? "red" : "black" }}>{currencySymbol}{c.outstanding_due}</td>
                <td style={{ fontWeight: "bold" }}>{currencySymbol}{c.available_credit}</td>
                <td>
                  <span style={{
                    padding: "4px 8px", borderRadius: "4px",
                    backgroundColor: c.status === "active" ? "#d4edda" : "#f8d7da",
                    color: c.status === "active" ? "#155724" : "#721c24",
                  }}>
                    {c.status}
                  </span>
                </td>
                <td><button onClick={() => startEdit(c)}>Edit</button></td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}