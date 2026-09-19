import { useEffect, useState } from "react";
import "./purchasing.css";
import { purchasingApi } from "./purchasingApi";
import type { SupplierPayment } from "../../types/purchasing";

export default function SupplierPaymentsPage() {
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    purchasingApi.listPayments().then(setPayments).finally(() => setLoading(false));
  }, []);

  const rows = payments.filter(
    (p) =>
      !search ||
      (p.SupplierName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.PurchaseNo ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="purchasing-page">Loading…</div>;

  return (
    <div className="purchasing-page">
      <div className="toolbar">
        <div className="search-field">
          <span className="field-icon">🔍</span>
          <input
            placeholder="Search supplier or purchase no."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr><th>Date</th><th>Supplier</th><th>Purchase no.</th><th>Amount</th><th>Method</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr className="empty-row"><td colSpan={5}>No payments recorded yet.</td></tr>
            )}
            {rows.map((p) => (
              <tr key={p.PaymentID}>
                <td className="mono">
                  {new Date(p.PaymentDate).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" })}
                </td>
                <td>{p.SupplierName}</td>
                <td className="mono">{p.PurchaseNo ?? "—"}</td>
                <td className="mono">Tk {p.Amount.toLocaleString()}</td>
                <td>{p.Method}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
