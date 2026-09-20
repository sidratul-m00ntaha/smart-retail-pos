import { useEffect, useState } from "react";
import "./purchasing.css";
import { purchasingApi } from "./purchasingApi";
import type { Supplier, SupplierInput, SupplierPaymentInput, SupplierStatus } from "../../types/purchasing";
import SuppliersTab from "./components/SuppliersTab";
import SupplierDrawer from "./components/SupplierDrawer";
import PayDrawer from "./components/PayDrawer";
import Toast from "./components/Toast";
import { useToast } from "./useToast";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SupplierStatus | "All">("All");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [paying, setPaying] = useState<Supplier | null>(null);

  const { message, showToast } = useToast();

  async function load() {
    setSuppliers(await purchasingApi.listSuppliers());
  }

  useEffect(() => {
    let isCurrent = true;
    purchasingApi
      .listSuppliers()
      .then((rows) => {
        if (isCurrent) setSuppliers(rows);
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const totalDue = suppliers.reduce((s, x) => s + x.Due, 0);
  const activeCount = suppliers.filter((s) => s.Status === "Active").length;

  async function handleSave(data: SupplierInput) {
    if (editing) {
      await purchasingApi.updateSupplier(editing.SupplierID, data);
      showToast("Supplier updated.");
    } else {
      await purchasingApi.createSupplier(data);
      showToast("Supplier added.");
    }
    setDrawerOpen(false);
    await load();
  }

  async function handlePay(data: SupplierPaymentInput) {
    if (!paying) return;
    await purchasingApi.paySupplier(paying.SupplierID, data);
    setPayOpen(false);
    showToast(`Tk ${data.Amount.toLocaleString()} paid to ${paying.Name}.`);
    await load();
  }

  if (loading) return <div className="purchasing-page">Loading…</div>;

  return (
    <div className="purchasing-page">
      <div className="stat-strip">
        <div className="stat-chip"><span className="n">{suppliers.length}</span> suppliers</div>
        <div className="stat-chip"><span className="n">{activeCount}</span> active</div>
        <div className="stat-chip warn"><span className="n">Tk {totalDue.toLocaleString()}</span> total payable</div>
      </div>

      <SuppliersTab
        suppliers={suppliers}
        search={search}
        status={status}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onAdd={() => { setEditing(null); setDrawerOpen(true); }}
        onEdit={(s) => { setEditing(s); setDrawerOpen(true); }}
        onPay={(s) => { setPaying(s); setPayOpen(true); }}
      />

      <SupplierDrawer open={drawerOpen} editing={editing} onClose={() => setDrawerOpen(false)} onSave={handleSave} />
      <PayDrawer open={payOpen} supplier={paying} onClose={() => setPayOpen(false)} onSave={handlePay} />
      <Toast message={message} />
    </div>
  );
}
