// frontend/src/modules/customers/CustomersPage.tsx
import { useEffect, useState } from "react";
import { listCustomers, createCustomer, updateCustomer, type Customer } from "../../services/customers";
import { getStoreSettings } from "../../services/store-settings.service";
import styles from "./customers.module.css";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; phone: string; credit_limit: string; status: string }>({
    name: "", phone: "", credit_limit: "0.00", status: "active",
  });

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
    <div>
      <h2 className={styles.heading}>Customers</h2>

      <div className={styles.toolbar}>
        <input
          className={`${styles.input} ${styles.search}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone…"
        />
        <button type="button" className={styles.primaryButton} onClick={() => setShowAddForm((v) => !v)}>
          {showAddForm ? "Cancel" : "+ Add customer"}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className={styles.addForm}>
          <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer Name" required />
          <input className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (e.g., 017...)" required />
          <input className={styles.input} value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} placeholder="Credit Limit" type="number" step="0.01" />
          <button type="submit" disabled={loading} className={styles.primaryButton}>
            {loading ? "Adding..." : "Save"}
          </button>
        </form>
      )}

      {error && <p className={styles.messageError}>{error}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Customer</th><th>Phone</th><th>Loyalty Points</th><th>Loyalty Tier</th><th>Total Purchases</th><th>Credit Limit</th><th>Outstanding Due</th><th>Available Credit</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) =>
              editingId === c.customer_id ? (
                <tr key={c.customer_id}>
                  <td><input className={`${styles.input} ${styles.cellInput}`} value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} /></td>
                  <td><input className={`${styles.input} ${styles.cellInput}`} value={editDraft.phone} onChange={(e) => setEditDraft({ ...editDraft, phone: e.target.value })} /></td>
                  <td>{c.loyalty_points}</td>
                  <td>{c.loyalty_tier ? c.loyalty_tier.name : "—"}</td>
                  <td>{currencySymbol}{c.total_purchases}</td>
                  <td><input className={`${styles.input} ${styles.cellInput}`} value={editDraft.credit_limit} onChange={(e) => setEditDraft({ ...editDraft, credit_limit: e.target.value })} type="number" step="0.01" /></td>
                  <td>{currencySymbol}{c.outstanding_due}</td>
                  <td>{currencySymbol}{c.available_credit}</td>
                  <td>
                    <select className={styles.select} value={editDraft.status} onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value })}>
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                    </select>
                  </td>
                  <td>
                    <div className={styles.rowButtons}>
                      <button type="button" className={styles.smallButton} onClick={() => saveEdit(c.customer_id)}>Save</button>
                      <button type="button" className={styles.smallButton} onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={c.customer_id}>
                  <td>{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{c.loyalty_points}</td>
                  <td>{c.loyalty_tier ? c.loyalty_tier.name : "—"}</td>
                  <td>{currencySymbol}{c.total_purchases}</td>
                  <td>{currencySymbol}{c.credit_limit}</td>
                  <td className={c.outstanding_due !== "0.00" ? styles.due : undefined}>{currencySymbol}{c.outstanding_due}</td>
                  <td className={styles.strong}>{currencySymbol}{c.available_credit}</td>
                  <td>
                    <span className={`${styles.status} ${c.status === "active" ? styles.statusActive : styles.statusInactive}`}>
                      {c.status}
                    </span>
                  </td>
                  <td><button type="button" className={styles.smallButton} onClick={() => startEdit(c)}>Edit</button></td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
