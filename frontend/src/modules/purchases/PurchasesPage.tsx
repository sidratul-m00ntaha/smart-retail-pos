import { useEffect, useState } from "react";
import "./purchasing.css";
import { purchasingApi } from "./purchasingApi";
import type { Purchase, PurchaseInput, Supplier } from "../../types/purchasing";
import PurchasesTab from "./components/PurchasesTab";
import PurchaseDrawer from "./components/PurchaseDrawer";
import Toast from "./components/Toast";
import { useToast } from "./useToast";

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { message, showToast } = useToast();

  async function load() {
    const [p, s] = await Promise.all([purchasingApi.listPurchases(), purchasingApi.listSuppliers()]);
    setPurchases(p);
    setSuppliers(s);
  }
  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function handleCreate(data: PurchaseInput) {
    const p = await purchasingApi.createPurchase(data);
    setDrawerOpen(false);
    showToast(`Purchase ${p.PurchaseNo} confirmed · stock increased.`);
    await load();
  }

  if (loading) return <div className="purchasing-page">Loading…</div>;

  return (
    <div className="purchasing-page">
      <div className="stat-strip">
        <div className="stat-chip"><span className="n">{purchases.length}</span> purchases logged</div>
      </div>

      <PurchasesTab
        purchases={purchases}
        search={search}
        onSearchChange={setSearch}
        onNewPurchase={() => setDrawerOpen(true)}
      />

      <PurchaseDrawer open={drawerOpen} suppliers={suppliers} onClose={() => setDrawerOpen(false)} onSave={handleCreate} />
      <Toast message={message} />
    </div>
  );
}
