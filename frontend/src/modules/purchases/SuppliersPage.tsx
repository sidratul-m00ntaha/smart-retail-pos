// // import { useEffect, useState } from "react";
// // import "./purchasing.css";
// // import { purchasingApi } from "./purchasingApi";
// // import type { Supplier, SupplierInput, SupplierPaymentInput, SupplierStatus } from "../../types/purchasing";
// // import SuppliersTab from "./components/SuppliersTab";
// // import SupplierDrawer from "./components/SupplierDrawer";
// // import PayDrawer from "./components/PayDrawer";
// // import Toast from "./components/Toast";
// // import { useToast } from "./useToast";

// // export default function SuppliersPage() {
// //   const [suppliers, setSuppliers] = useState<Supplier[]>([]);
// //   const [loading, setLoading] = useState(true);
// //   const [search, setSearch] = useState("");
// //   const [status, setStatus] = useState<SupplierStatus | "All">("All");

// //   const [drawerOpen, setDrawerOpen] = useState(false);
// //   const [editing, setEditing] = useState<Supplier | null>(null);
// //   const [payOpen, setPayOpen] = useState(false);
// //   const [paying, setPaying] = useState<Supplier | null>(null);

// //   const { message, showToast } = useToast();

// //   async function load() {
// //     setSuppliers(await purchasingApi.listSuppliers());
// //   }

// //   useEffect(() => {
// //     let isCurrent = true;
// //     purchasingApi
// //       .listSuppliers()
// //       .then((rows) => {
// //         if (isCurrent) setSuppliers(rows);
// //       })
// //       .finally(() => {
// //         if (isCurrent) setLoading(false);
// //       });
// //     return () => {
// //       isCurrent = false;
// //     };
// //   }, []);

// //   const totalDue = suppliers.reduce((s, x) => s + x.Due, 0);
// //   const activeCount = suppliers.filter((s) => s.Status === "Active").length;

// //   async function handleSave(data: SupplierInput) {
// //     if (editing) {
// //       await purchasingApi.updateSupplier(editing.SupplierID, data);
// //       showToast("Supplier updated.");
// //     } else {
// //       await purchasingApi.createSupplier(data);
// //       showToast("Supplier added.");
// //     }
// //     setDrawerOpen(false);
// //     await load();
// //   }

// //   async function handlePay(data: SupplierPaymentInput) {
// //     if (!paying) return;
// //     await purchasingApi.paySupplier(paying.SupplierID, data);
// //     setPayOpen(false);
// //     showToast(`Tk ${data.Amount.toLocaleString()} paid to ${paying.Name}.`);
// //     await load();
// //   }

// //   if (loading) return <div className="purchasing-page">Loading…</div>;

// //   return (
// //     <div className="purchasing-page">
// //       <div className="stat-strip">
// //         <div className="stat-chip"><span className="n">{suppliers.length}</span> suppliers</div>
// //         <div className="stat-chip"><span className="n">{activeCount}</span> active</div>
// //         <div className="stat-chip warn"><span className="n">Tk {totalDue.toLocaleString()}</span> total payable</div>
// //       </div>

// //       <SuppliersTab
// //         suppliers={suppliers}
// //         search={search}
// //         status={status}
// //         onSearchChange={setSearch}
// //         onStatusChange={setStatus}
// //         onAdd={() => { setEditing(null); setDrawerOpen(true); }}
// //         onEdit={(s) => { setEditing(s); setDrawerOpen(true); }}
// //         onPay={(s) => { setPaying(s); setPayOpen(true); }}
// //       />

// //       <SupplierDrawer open={drawerOpen} editing={editing} onClose={() => setDrawerOpen(false)} onSave={handleSave} />
// //       <PayDrawer open={payOpen} supplier={paying} onClose={() => setPayOpen(false)} onSave={handlePay} />
// //       <Toast message={message} />
// //     </div>
// //   );
// // }


// //-----------------------------------------------

// import { useEffect, useMemo, useState } from 'react'
// import { Link } from 'react-router'
// import MessagePanel from '../../components/common/MessagePanel.tsx'
// import { useAuth } from '../../hooks/useAuth.ts'
// import { ApiError } from '../../services/api.ts'
// import { getSuppliers, updateSupplier } from '../../services/purchasing.service.ts'
// import type { Supplier, SupplierStatus } from '../../types/purchasing.ts'
// import { initials } from '../../utils/text.ts'
// import PaySupplierForm from './PaySupplierForm.tsx'
// import SupplierForm from './SupplierForm.tsx'
// import { formatMoney, moneyText, toHundredths } from './purchasingUtils.ts'
// import styles from './purchasing.module.css'

// type StatusFilter = 'All' | SupplierStatus
// type OpenPanel = { type: 'add' } | { type: 'edit'; supplier: Supplier } | { type: 'pay'; supplier: Supplier } | null
// type Notice = { text: string; isError?: boolean }

// /** Suppliers page (PRD 5.5): who we buy from, and what we still owe each of them. */
// export default function SuppliersPage() {
//   const { hasPermission } = useAuth()
//   const canPay = hasPermission('purchases.manage')

//   const [suppliers, setSuppliers] = useState<Supplier[]>([])
//   const [isLoading, setIsLoading] = useState(true)
//   const [loadError, setLoadError] = useState<string | null>(null)
//   const [search, setSearch] = useState('')
//   const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
//   const [openPanel, setOpenPanel] = useState<OpenPanel>(null)
//   const [notice, setNotice] = useState<Notice | null>(null)

//   useEffect(() => {
//     let isCurrent = true
//     getSuppliers()
//       .then((rows) => {
//         if (isCurrent) setSuppliers(rows)
//       })
//       .catch((err) => {
//         if (isCurrent) setLoadError(errorText(err, 'Could not load the suppliers.'))
//       })
//       .finally(() => {
//         if (isCurrent) setIsLoading(false)
//       })
//     return () => {
//       isCurrent = false
//     }
//   }, [])

//   // Hide the notice after a few seconds
//   useEffect(() => {
//     if (!notice) return
//     const timer = setTimeout(() => setNotice(null), 5000)
//     return () => clearTimeout(timer)
//   }, [notice])

//   const visibleSuppliers = useMemo(() => {
//     const term = search.trim().toLowerCase()
//     return suppliers.filter(
//       (supplier) =>
//         (term === '' || [supplier.name, supplier.phone, supplier.email ?? ''].some((text) => text.toLowerCase().includes(term))) &&
//         (statusFilter === 'All' || supplier.status === statusFilter),
//     )
//   }, [suppliers, search, statusFilter])

//   // After any change: show a message and reload the list, so the totals are always up to date
//   async function handleSaved(message: string) {
//     setOpenPanel(null)
//     setNotice({ text: message })
//     try {
//       setSuppliers(await getSuppliers())
//     } catch (err) {
//       setNotice({ text: errorText(err, 'Saved, but the list could not be refreshed.'), isError: true })
//     }
//   }

//   async function toggleActive(supplier: Supplier) {
//     try {
//       const saved = await updateSupplier(supplier.supplier_id, {
//         name: supplier.name,
//         phone: supplier.phone,
//         email: supplier.email ?? '',
//         address: supplier.address ?? '',
//         status: supplier.status === 'active' ? 'inactive' : 'active',
//       })
//       await handleSaved(`${saved.name} is now ${saved.status}.`)
//     } catch (err) {
//       setNotice({ text: errorText(err, 'Could not change the status.'), isError: true })
//     }
//   }

//   if (isLoading) return <MessagePanel title="Loading suppliers…" />
//   if (loadError) return <MessagePanel title="Could not load the suppliers">{loadError}</MessagePanel>

//   const activeCount = suppliers.filter((supplier) => supplier.status === 'active').length
//   const totalDue = suppliers.reduce((sum, supplier) => sum + toHundredths(supplier.outstanding_due), 0)
//   const owedCount = suppliers.filter((supplier) => toHundredths(supplier.outstanding_due) > 0).length

//   return (
//     <>
//       <div className={styles.statStrip}>
//         <span className={styles.statChip}>
//           <b>{suppliers.length}</b> suppliers
//         </span>
//         <span className={styles.statChip}>
//           <b>{activeCount}</b> active
//         </span>
//         <span className={totalDue > 0 ? `${styles.statChip} ${styles.statWarn}` : styles.statChip}>
//           <b>{formatMoney(totalDue)}</b> we owe{owedCount > 0 && ` across ${owedCount} ${owedCount === 1 ? 'supplier' : 'suppliers'}`}
//         </span>
//       </div>

//       <div className={styles.toolbar}>
//         <label className={styles.search}>
//           <span className={styles.visuallyHidden}>Search suppliers</span>
//           <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
//             <circle cx="11" cy="11" r="7" />
//             <path d="m20 20-3.5-3.5" />
//           </svg>
//           <input type="search" placeholder="Search by name, phone or email" value={search} onChange={(event) => setSearch(event.target.value)} />
//         </label>

//         <div className={styles.statusTabs} role="group" aria-label="Filter by status">
//           {(['All', 'active', 'inactive'] as const).map((status) => (
//             <button
//               key={status}
//               type="button"
//               className={status === statusFilter ? `${styles.statusTab} ${styles.statusTabActive}` : styles.statusTab}
//               aria-pressed={status === statusFilter}
//               onClick={() => setStatusFilter(status)}
//             >
//               {status === 'All' ? 'All' : status === 'active' ? 'Active' : 'Inactive'}
//             </button>
//           ))}
//         </div>

//         <span className={styles.spacer} />
//         <button type="button" className={styles.primaryButton} onClick={() => setOpenPanel({ type: 'add' })}>
//           + Add supplier
//         </button>
//       </div>

//       {notice && (
//         <p className={notice.isError ? `${styles.notice} ${styles.noticeError}` : styles.notice} role="status">
//           {notice.text}
//         </p>
//       )}

//       <div className={styles.tableCard}>
//         <table className={styles.table}>
//           <thead>
//             <tr>
//               <th>Supplier</th>
//               <th className={styles.right}>Total purchases</th>
//               <th className={styles.right}>Total paid</th>
//               <th className={styles.right}>Outstanding due</th>
//               <th>Status</th>
//               <th>
//                 <span className={styles.visuallyHidden}>Actions</span>
//               </th>
//             </tr>
//           </thead>
//           <tbody>
//             {visibleSuppliers.length === 0 && (
//               <tr>
//                 <td colSpan={6} className={styles.emptyRow}>
//                   {suppliers.length === 0 ? 'No suppliers yet. Add the first one to start recording purchases.' : 'No suppliers match your search.'}
//                 </td>
//               </tr>
//             )}
//             {visibleSuppliers.map((supplier) => {
//               const due = toHundredths(supplier.outstanding_due)
//               return (
//                 <tr key={supplier.supplier_id}>
//                   <td>
//                     <div className={styles.nameCell}>
//                       <span className={styles.avatar} aria-hidden="true">
//                         {initials(supplier.name)}
//                       </span>
//                       <div>
//                         <p className={styles.nameMain}>{supplier.name}</p>
//                         <p className={styles.nameSub}>
//                           {supplier.phone}
//                           {supplier.purchase_count > 0 && (
//                             <>
//                               {' · '}
//                               <Link to={`/purchasing/purchases?supplier=${supplier.supplier_id}`} className={styles.inlineLink}>
//                                 {supplier.purchase_count} {supplier.purchase_count === 1 ? 'purchase' : 'purchases'}
//                               </Link>
//                             </>
//                           )}
//                         </p>
//                       </div>
//                     </div>
//                   </td>
//                   <td className={`${styles.mono} ${styles.right}`}>{moneyText(supplier.total_purchases)}</td>
//                   <td className={`${styles.mono} ${styles.right}`}>{moneyText(supplier.total_paid)}</td>
//                   <td className={`${styles.mono} ${styles.right} ${due > 0 ? styles.dueText : styles.mutedText}`}>
//                     {moneyText(supplier.outstanding_due)}
//                   </td>
//                   <td>
//                     <span className={supplier.status === 'active' ? `${styles.pill} ${styles.pillActive}` : `${styles.pill} ${styles.pillInactive}`}>
//                       {supplier.status === 'active' ? 'Active' : 'Inactive'}
//                     </span>
//                   </td>
//                   <td>
//                     <div className={styles.rowActions}>
//                       <button
//                         type="button"
//                         className={styles.iconButton}
//                         title="Edit"
//                         aria-label={`Edit ${supplier.name}`}
//                         onClick={() => setOpenPanel({ type: 'edit', supplier })}
//                       >
//                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
//                           <path d="M12 20h9" />
//                           <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
//                         </svg>
//                       </button>
//                       {canPay && (
//                         <button
//                           type="button"
//                           className={styles.iconButton}
//                           title={due > 0 ? 'Pay this supplier' : 'Nothing due'}
//                           aria-label={`Pay ${supplier.name}`}
//                           disabled={due <= 0}
//                           onClick={() => setOpenPanel({ type: 'pay', supplier })}
//                         >
//                           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
//                             <rect x="3" y="6" width="18" height="12" rx="2" />
//                             <path d="M3 10h18M7 15h4" />
//                           </svg>
//                         </button>
//                       )}
//                       <button
//                         type="button"
//                         className={styles.iconButton}
//                         title={supplier.status === 'active' ? 'Deactivate' : 'Activate'}
//                         aria-label={`${supplier.status === 'active' ? 'Deactivate' : 'Activate'} ${supplier.name}`}
//                         onClick={() => toggleActive(supplier)}
//                       >
//                         {supplier.status === 'active' ? (
//                           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
//                             <circle cx="12" cy="12" r="9" />
//                             <path d="M8 12h8" />
//                           </svg>
//                         ) : (
//                           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
//                             <circle cx="12" cy="12" r="9" />
//                             <path d="m8 12 3 3 5-6" />
//                           </svg>
//                         )}
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               )
//             })}
//           </tbody>
//         </table>
//       </div>

//       {openPanel?.type === 'add' && <SupplierForm onClose={() => setOpenPanel(null)} onSaved={handleSaved} />}
//       {openPanel?.type === 'edit' && <SupplierForm supplier={openPanel.supplier} onClose={() => setOpenPanel(null)} onSaved={handleSaved} />}
//       {openPanel?.type === 'pay' && (
//         <PaySupplierForm
//           suppliers={suppliers}
//           initialSupplierId={openPanel.supplier.supplier_id}
//           onClose={() => setOpenPanel(null)}
//           onSaved={handleSaved}
//         />
//       )}
//     </>
//   )
// }

// function errorText(err: unknown, fallback: string): string {
//   return err instanceof ApiError ? err.message : fallback
// }















import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import MessagePanel from '../../components/common/MessagePanel.tsx'
import { useAuth } from '../../hooks/useAuth.ts'
import { ApiError } from '../../services/api.ts'
import { getSuppliers, updateSupplier } from '../../services/purchasing.service.ts'
import type { Supplier, SupplierStatus } from '../../types/purchasing.ts'
import { initials } from '../../utils/text.ts'
import PaySupplierForm from './PaySupplierForm.tsx'
import SupplierForm from './SupplierForm.tsx'
import { formatMoney, moneyText, toHundredths } from './purchasingUtils.ts'
import styles from './purchasing.module.css'

type StatusFilter = 'All' | SupplierStatus
type OpenPanel = { type: 'add' } | { type: 'edit'; supplier: Supplier } | { type: 'pay'; supplier: Supplier } | null
type Notice = { text: string; isError?: boolean }

/** Suppliers page (PRD 5.5): who we buy from, and what we still owe each of them. */
export default function SuppliersPage() {
  const { hasPermission } = useAuth()
  const canPay = hasPermission('purchases.manage')

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    let isCurrent = true
    getSuppliers()
      .then((rows) => {
        if (isCurrent) setSuppliers(rows)
      })
      .catch((err) => {
        if (isCurrent) setLoadError(errorText(err, 'Could not load the suppliers.'))
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })
    return () => {
      isCurrent = false
    }
  }, [])

  // Hide the notice after a few seconds
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  const visibleSuppliers = useMemo(() => {
    const term = search.trim().toLowerCase()
    return suppliers.filter(
      (supplier) =>
        (term === '' || [supplier.name, supplier.phone, supplier.email ?? ''].some((text) => text.toLowerCase().includes(term))) &&
        (statusFilter === 'All' || supplier.status === statusFilter),
    )
  }, [suppliers, search, statusFilter])

  // After any change: show a message and reload the list, so the totals are always up to date
  async function handleSaved(message: string) {
    setOpenPanel(null)
    setNotice({ text: message })
    try {
      setSuppliers(await getSuppliers())
    } catch (err) {
      setNotice({ text: errorText(err, 'Saved, but the list could not be refreshed.'), isError: true })
    }
  }

  async function toggleActive(supplier: Supplier) {
    try {
      const saved = await updateSupplier(supplier.supplier_id, {
        name: supplier.name,
        phone: supplier.phone,
        email: supplier.email ?? '',
        address: supplier.address ?? '',
        status: supplier.status === 'active' ? 'inactive' : 'active',
      })
      await handleSaved(`${saved.name} is now ${saved.status}.`)
    } catch (err) {
      setNotice({ text: errorText(err, 'Could not change the status.'), isError: true })
    }
  }

  if (isLoading) return <MessagePanel title="Loading suppliers…" />
  if (loadError) return <MessagePanel title="Could not load the suppliers">{loadError}</MessagePanel>

  const activeCount = suppliers.filter((supplier) => supplier.status === 'active').length
  const totalDue = suppliers.reduce((sum, supplier) => sum + toHundredths(supplier.outstanding_due), 0)
  const owedCount = suppliers.filter((supplier) => toHundredths(supplier.outstanding_due) > 0).length

  return (
    <>
      <div className={styles.statStrip}>
        <span className={styles.statChip}>
          <b>{suppliers.length}</b> suppliers
        </span>
        <span className={styles.statChip}>
          <b>{activeCount}</b> active
        </span>
        <span className={totalDue > 0 ? `${styles.statChip} ${styles.statWarn}` : styles.statChip}>
          <b>{formatMoney(totalDue)}</b> we owe{owedCount > 0 && ` across ${owedCount} ${owedCount === 1 ? 'supplier' : 'suppliers'}`}
        </span>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <span className={styles.visuallyHidden}>Search suppliers</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input type="search" placeholder="Search by name, phone or email" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>

        <div className={styles.statusTabs} role="group" aria-label="Filter by status">
          {(['All', 'active', 'inactive'] as const).map((status) => (
            <button
              key={status}
              type="button"
              className={status === statusFilter ? `${styles.statusTab} ${styles.statusTabActive}` : styles.statusTab}
              aria-pressed={status === statusFilter}
              onClick={() => setStatusFilter(status)}
            >
              {status === 'All' ? 'All' : status === 'active' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>

        <span className={styles.spacer} />
        <button type="button" className={styles.primaryButton} onClick={() => setOpenPanel({ type: 'add' })}>
          + Add supplier
        </button>
      </div>

      {notice && (
        <p className={notice.isError ? `${styles.notice} ${styles.noticeError}` : styles.notice} role="status">
          {notice.text}
        </p>
      )}

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Supplier</th>
              <th className={styles.right}>Total purchases</th>
              <th className={styles.right}>Total paid</th>
              <th className={styles.right}>Outstanding due</th>
              <th>Status</th>
              <th>
                <span className={styles.visuallyHidden}>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleSuppliers.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.emptyRow}>
                  {suppliers.length === 0 ? 'No suppliers yet. Add the first one to start recording purchases.' : 'No suppliers match your search.'}
                </td>
              </tr>
            )}
            {visibleSuppliers.map((supplier) => {
              const due = toHundredths(supplier.outstanding_due)
              return (
                <tr key={supplier.supplier_id}>
                  <td>
                    <div className={styles.nameCell}>
                      <span className={styles.avatar} aria-hidden="true">
                        {initials(supplier.name)}
                      </span>
                      <div>
                        <p className={styles.nameMain}>{supplier.name}</p>
                        <p className={styles.nameSub}>
                          ID {supplier.supplier_id} · {supplier.phone}
                          {supplier.purchase_count > 0 && (
                            <>
                              {' · '}
                              <Link to={`/purchasing/purchases?supplier=${supplier.supplier_id}`} className={styles.inlineLink}>
                                {supplier.purchase_count} {supplier.purchase_count === 1 ? 'purchase' : 'purchases'}
                              </Link>
                            </>
                          )}
                        </p>
                        {(supplier.email || supplier.address) && (
                          <p className={styles.nameSub}>{[supplier.email, supplier.address].filter(Boolean).join(' · ')}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className={`${styles.mono} ${styles.right}`}>{moneyText(supplier.total_purchases)}</td>
                  <td className={`${styles.mono} ${styles.right}`}>{moneyText(supplier.total_paid)}</td>
                  <td className={`${styles.mono} ${styles.right} ${due > 0 ? styles.dueText : styles.mutedText}`}>
                    {moneyText(supplier.outstanding_due)}
                  </td>
                  <td>
                    <span className={supplier.status === 'active' ? `${styles.pill} ${styles.pillActive}` : `${styles.pill} ${styles.pillInactive}`}>
                      {supplier.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        title="Edit"
                        aria-label={`Edit ${supplier.name}`}
                        onClick={() => setOpenPanel({ type: 'edit', supplier })}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                      {canPay && (
                        <button
                          type="button"
                          className={styles.iconButton}
                          title={due > 0 ? 'Pay this supplier' : 'Nothing due'}
                          aria-label={`Pay ${supplier.name}`}
                          disabled={due <= 0}
                          onClick={() => setOpenPanel({ type: 'pay', supplier })}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                            <rect x="3" y="6" width="18" height="12" rx="2" />
                            <path d="M3 10h18M7 15h4" />
                          </svg>
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.iconButton}
                        title={supplier.status === 'active' ? 'Deactivate' : 'Activate'}
                        aria-label={`${supplier.status === 'active' ? 'Deactivate' : 'Activate'} ${supplier.name}`}
                        onClick={() => toggleActive(supplier)}
                      >
                        {supplier.status === 'active' ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M8 12h8" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                            <circle cx="12" cy="12" r="9" />
                            <path d="m8 12 3 3 5-6" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {openPanel?.type === 'add' && <SupplierForm onClose={() => setOpenPanel(null)} onSaved={handleSaved} />}
      {openPanel?.type === 'edit' && <SupplierForm supplier={openPanel.supplier} onClose={() => setOpenPanel(null)} onSaved={handleSaved} />}
      {openPanel?.type === 'pay' && (
        <PaySupplierForm
          suppliers={suppliers}
          initialSupplierId={openPanel.supplier.supplier_id}
          onClose={() => setOpenPanel(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback
}
