// import { useEffect, useState } from "react";
// import "./purchasing.css";
// import { purchasingApi } from "./purchasingApi";
// import type { Purchase, PurchaseInput, Supplier } from "../../types/purchasing";
// import PurchasesTab from "./components/PurchasesTab";
// import PurchaseDrawer from "./components/PurchaseDrawer";
// import Toast from "./components/Toast";
// import { useToast } from "./useToast";

// export default function PurchasesPage() {
//   const [purchases, setPurchases] = useState<Purchase[]>([]);
//   const [suppliers, setSuppliers] = useState<Supplier[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState("");
//   const [drawerOpen, setDrawerOpen] = useState(false);

//   const { message, showToast } = useToast();

//   async function load() {
//     const [p, s] = await Promise.all([purchasingApi.listPurchases(), purchasingApi.listSuppliers()]);
//     setPurchases(p);
//     setSuppliers(s);
//   }
//   useEffect(() => {
//     load().finally(() => setLoading(false));
//   }, []);

//   async function handleCreate(data: PurchaseInput) {
//     const p = await purchasingApi.createPurchase(data);
//     setDrawerOpen(false);
//     showToast(`Purchase ${p.PurchaseNo} confirmed · stock increased.`);
//     await load();
//   }

//   if (loading) return <div className="purchasing-page">Loading…</div>;

//   return (
//     <div className="purchasing-page">
//       <div className="stat-strip">
//         <div className="stat-chip"><span className="n">{purchases.length}</span> purchases logged</div>
//       </div>

//       <PurchasesTab
//         purchases={purchases}
//         search={search}
//         onSearchChange={setSearch}
//         onNewPurchase={() => setDrawerOpen(true)}
//       />

//       <PurchaseDrawer open={drawerOpen} suppliers={suppliers} onClose={() => setDrawerOpen(false)} onSave={handleCreate} />
//       <Toast message={message} />
//     </div>
//   );
// }



import { useEffect, useState } from "react";
import "./purchasing.css";
import { purchasingApi } from "./purchasingApi";
import type {
  Purchase,
  PurchaseInput,
  Supplier,
  SupplierInput,
  SupplierPaymentInput,
  SupplierStatus,
} from "../../types/purchasing";
import SuppliersTab from "./components/SuppliersTab";
import PurchasesTab from "./components/PurchasesTab";
import SupplierDrawer from "./components/SupplierDrawer";
import PayDrawer from "./components/PayDrawer";
import PurchaseDrawer from "./components/PurchaseDrawer";
import Toast from "./components/Toast";
import { useToast } from "./useToast";

export default function PurchasingPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] =
    useState<"suppliers" | "purchases">("suppliers");

  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierStatus, setSupplierStatus] =
    useState<SupplierStatus | "All">("All");

  const [purchaseSearch, setPurchaseSearch] = useState("");

  const [supplierDrawerOpen, setSupplierDrawerOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] =
    useState<Supplier | null>(null);

  const [payOpen, setPayOpen] = useState(false);
  const [payingSupplier, setPayingSupplier] =
    useState<Supplier | null>(null);

  const [purchaseDrawerOpen, setPurchaseDrawerOpen] = useState(false);

  const { message, showToast } = useToast();

  async function load() {
    const [supplierRows, purchaseRows] = await Promise.all([
      purchasingApi.listSuppliers(),
      purchasingApi.listPurchases(),
    ]);

    setSuppliers(supplierRows);
    setPurchases(purchaseRows);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const totalDue = suppliers.reduce(
    (sum, supplier) => sum + supplier.Due,
    0
  );

  const activeSupplierCount = suppliers.filter(
    (supplier) => supplier.Status === "Active"
  ).length;

  async function handleSupplierSave(data: SupplierInput) {
    if (editingSupplier) {
      await purchasingApi.updateSupplier(
        editingSupplier.SupplierID,
        data
      );
      showToast("Supplier updated.");
    } else {
      await purchasingApi.createSupplier(data);
      showToast("Supplier added.");
    }

    setSupplierDrawerOpen(false);
    await load();
  }

  async function handlePayment(data: SupplierPaymentInput) {
    if (!payingSupplier) return;

    await purchasingApi.paySupplier(
      payingSupplier.SupplierID,
      data
    );

    setPayOpen(false);

    showToast(
      `Tk ${data.Amount.toLocaleString()} paid to ${payingSupplier.Name}.`
    );

    await load();
  }

  async function handlePurchaseCreate(data: PurchaseInput) {
    const purchase = await purchasingApi.createPurchase(data);

    setPurchaseDrawerOpen(false);

    showToast(
      `Purchase ${purchase.PurchaseNo} confirmed · stock increased.`
    );

    await load();
  }

  if (loading) {
    return (
      <div className="purchasing-page">
        Loading…
      </div>
    );
  }

  return (
    <div className="purchasing-page">

      {/* Statistics */}
      <div className="stat-strip">
        <div className="stat-chip">
          <span className="n">{suppliers.length}</span>
          suppliers
        </div>

        <div className="stat-chip">
          <span className="n">{activeSupplierCount}</span>
          active
        </div>

        <div className="stat-chip warn">
          <span className="n">
            Tk {totalDue.toLocaleString()}
          </span>
          total payable
        </div>

        <div className="stat-chip">
          <span className="n">{purchases.length}</span>
          purchases logged
        </div>
      </div>

      {/* Purchasing inner tabs */}
      <div
        className="purchasing-inner-tabs"
        role="tablist"
        aria-label="Purchasing pages"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "suppliers"}
          className={
            activeTab === "suppliers" ? "active" : ""
          }
          onClick={() => setActiveTab("suppliers")}
        >
          Suppliers
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "purchases"}
          className={
            activeTab === "purchases" ? "active" : ""
          }
          onClick={() => setActiveTab("purchases")}
        >
          Purchases
        </button>
      </div>

      {/* Suppliers */}
      {activeTab === "suppliers" ? (
        <SuppliersTab
          suppliers={suppliers}
          search={supplierSearch}
          status={supplierStatus}
          onSearchChange={setSupplierSearch}
          onStatusChange={setSupplierStatus}
          onAdd={() => {
            setEditingSupplier(null);
            setSupplierDrawerOpen(true);
          }}
          onEdit={(supplier) => {
            setEditingSupplier(supplier);
            setSupplierDrawerOpen(true);
          }}
          onPay={(supplier) => {
            setPayingSupplier(supplier);
            setPayOpen(true);
          }}
        />
      ) : (
        <PurchasesTab
          purchases={purchases}
          search={purchaseSearch}
          onSearchChange={setPurchaseSearch}
          onNewPurchase={() =>
            setPurchaseDrawerOpen(true)
          }
        />
      )}

      {/* Supplier drawer */}
      <SupplierDrawer
        open={supplierDrawerOpen}
        editing={editingSupplier}
        onClose={() => setSupplierDrawerOpen(false)}
        onSave={handleSupplierSave}
      />

      {/* Supplier payment drawer */}
      <PayDrawer
        open={payOpen}
        supplier={payingSupplier}
        onClose={() => setPayOpen(false)}
        onSave={handlePayment}
      />

      {/* Purchase drawer */}
      <PurchaseDrawer
        open={purchaseDrawerOpen}
        suppliers={suppliers}
        onClose={() => setPurchaseDrawerOpen(false)}
        onSave={handlePurchaseCreate}
      />

      <Toast message={message} />
    </div>
  );
}