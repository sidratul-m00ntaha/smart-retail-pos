// // import { useEffect, useState } from "react";
// // import "./purchasing.css";
// // import { purchasingApi } from "./purchasingApi";
// // import type { Purchase, PurchaseInput, Supplier } from "../../types/purchasing";
// // import PurchasesTab from "./components/PurchasesTab";
// // import PurchaseDrawer from "./components/PurchaseDrawer";
// // import Toast from "./components/Toast";
// // import { useToast } from "./useToast";

// // export default function PurchasesPage() {
// //   const [purchases, setPurchases] = useState<Purchase[]>([]);
// //   const [suppliers, setSuppliers] = useState<Supplier[]>([]);
// //   const [loading, setLoading] = useState(true);
// //   const [search, setSearch] = useState("");
// //   const [drawerOpen, setDrawerOpen] = useState(false);

// //   const { message, showToast } = useToast();

// //   async function load() {
// //     const [p, s] = await Promise.all([purchasingApi.listPurchases(), purchasingApi.listSuppliers()]);
// //     setPurchases(p);
// //     setSuppliers(s);
// //   }
// //   useEffect(() => {
// //     load().finally(() => setLoading(false));
// //   }, []);

// //   async function handleCreate(data: PurchaseInput) {
// //     const p = await purchasingApi.createPurchase(data);
// //     setDrawerOpen(false);
// //     showToast(`Purchase ${p.PurchaseNo} confirmed · stock increased.`);
// //     await load();
// //   }

// //   if (loading) return <div className="purchasing-page">Loading…</div>;

// //   return (
// //     <div className="purchasing-page">
// //       <div className="stat-strip">
// //         <div className="stat-chip"><span className="n">{purchases.length}</span> purchases logged</div>
// //       </div>

// //       <PurchasesTab
// //         purchases={purchases}
// //         search={search}
// //         onSearchChange={setSearch}
// //         onNewPurchase={() => setDrawerOpen(true)}
// //       />

// //       <PurchaseDrawer open={drawerOpen} suppliers={suppliers} onClose={() => setDrawerOpen(false)} onSave={handleCreate} />
// //       <Toast message={message} />
// //     </div>
// //   );
// // }

// //-----------------------------------------------------------------------

// import { useEffect, useMemo, useState } from 'react'
// import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
// import MessagePanel from '../../components/common/MessagePanel.tsx'
// import { useAuth } from '../../hooks/useAuth.ts'
// import { ApiError } from '../../services/api.ts'
// import { getPurchases, getSuppliers } from '../../services/purchasing.service.ts'
// import type { PaymentStatus, PurchaseSummary, Supplier } from '../../types/purchasing.ts'
// import { formatDateTime } from '../../utils/date.ts'
// import PaySupplierForm from './PaySupplierForm.tsx'
// import PurchaseDetail from './PurchaseDetail.tsx'
// import { formatMoney, moneyText, PAYMENT_STATUS_LABEL, toHundredths } from './purchasingUtils.ts'
// import styles from './purchasing.module.css'

// type StatusFilter = 'All' | PaymentStatus
// type OpenPanel = { type: 'detail'; purchaseId: number } | { type: 'pay'; purchase: PurchaseSummary } | null
// type Notice = { text: string; isError?: boolean }

// const STATUS_TABS: { value: StatusFilter; label: string }[] = [
//   { value: 'All', label: 'All' },
//   { value: 'DUE', label: 'Due' },
//   { value: 'PARTIALLY_PAID', label: 'Part paid' },
//   { value: 'PAID', label: 'Paid' },
// ]

// /** Purchases page (PRD 5.6): every purchase, what was paid and what is still due. */
// export default function PurchasesPage() {
//   const { hasPermission } = useAuth()
//   const canPay = hasPermission('purchases.manage')
//   const location = useLocation()
//   const navigate = useNavigate()
//   const [searchParams] = useSearchParams()

//   const [purchases, setPurchases] = useState<PurchaseSummary[]>([])
//   const [suppliers, setSuppliers] = useState<Supplier[]>([])
//   const [isLoading, setIsLoading] = useState(true)
//   const [loadError, setLoadError] = useState<string | null>(null)
//   const [search, setSearch] = useState('')
//   const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
//   const [supplierFilter, setSupplierFilter] = useState(searchParams.get('supplier') ?? '')
//   const [openPanel, setOpenPanel] = useState<OpenPanel>(null)
//   // The new purchase page sends a message here after it saves
//   const [notice, setNotice] = useState<Notice | null>(() => {
//     const text = (location.state as { notice?: string } | null)?.notice
//     return text ? { text } : null
//   })

//   useEffect(() => {
//     let isCurrent = true
//     // The supplier filter is optional: the list still works if the suppliers can't be loaded
//     Promise.all([getPurchases(), getSuppliers().catch(() => [] as Supplier[])])
//       .then(([purchaseRows, supplierRows]) => {
//         if (!isCurrent) return
//         setPurchases(purchaseRows)
//         setSuppliers(supplierRows)
//       })
//       .catch((err) => {
//         if (isCurrent) setLoadError(errorText(err, 'Could not load the purchases.'))
//       })
//       .finally(() => {
//         if (isCurrent) setIsLoading(false)
//       })
//     return () => {
//       isCurrent = false
//     }
//   }, [])

//   // Don't show the same message again when the page is reloaded
//   useEffect(() => {
//     if ((location.state as { notice?: string } | null)?.notice) {
//       navigate(location.pathname + location.search, { replace: true, state: null })
//     }
//   }, [location, navigate])

//   // Hide the notice after a few seconds
//   useEffect(() => {
//     if (!notice) return
//     const timer = setTimeout(() => setNotice(null), 6000)
//     return () => clearTimeout(timer)
//   }, [notice])

//   const visiblePurchases = useMemo(() => {
//     const term = search.trim().toLowerCase()
//     return purchases.filter(
//       (purchase) =>
//         (term === '' || purchase.purchase_number.toLowerCase().includes(term) || purchase.supplier_name.toLowerCase().includes(term)) &&
//         (statusFilter === 'All' || purchase.payment_status === statusFilter) &&
//         (supplierFilter === '' || String(purchase.supplier_id) === supplierFilter),
//     )
//   }, [purchases, search, statusFilter, supplierFilter])

//   async function handlePaid(message: string) {
//     setOpenPanel(null)
//     setNotice({ text: message })
//     try {
//       setPurchases(await getPurchases())
//     } catch (err) {
//       setNotice({ text: errorText(err, 'Saved, but the list could not be refreshed.'), isError: true })
//     }
//   }

//   if (isLoading) return <MessagePanel title="Loading purchases…" />
//   if (loadError) return <MessagePanel title="Could not load the purchases">{loadError}</MessagePanel>

//   const totalBought = purchases.reduce((sum, purchase) => sum + toHundredths(purchase.total_amount), 0)
//   const totalDue = purchases.reduce((sum, purchase) => sum + toHundredths(purchase.due_amount), 0)

//   return (
//     <>
//       <div className={styles.statStrip}>
//         <span className={styles.statChip}>
//           <b>{purchases.length}</b> purchases
//         </span>
//         <span className={styles.statChip}>
//           <b>{formatMoney(totalBought)}</b> bought
//         </span>
//         <span className={totalDue > 0 ? `${styles.statChip} ${styles.statWarn}` : styles.statChip}>
//           <b>{formatMoney(totalDue)}</b> still due
//         </span>
//       </div>

//       <div className={styles.toolbar}>
//         <label className={styles.search}>
//           <span className={styles.visuallyHidden}>Search purchases</span>
//           <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
//             <circle cx="11" cy="11" r="7" />
//             <path d="m20 20-3.5-3.5" />
//           </svg>
//           <input type="search" placeholder="Search purchase no. or supplier" value={search} onChange={(event) => setSearch(event.target.value)} />
//         </label>

//         {suppliers.length > 0 && (
//           <select
//             className={styles.select}
//             value={supplierFilter}
//             onChange={(event) => setSupplierFilter(event.target.value)}
//             aria-label="Filter by supplier"
//           >
//             <option value="">All suppliers</option>
//             {suppliers.map((supplier) => (
//               <option key={supplier.supplier_id} value={supplier.supplier_id}>
//                 {supplier.name}
//               </option>
//             ))}
//           </select>
//         )}

//         <div className={styles.statusTabs} role="group" aria-label="Filter by payment">
//           {STATUS_TABS.map((tab) => (
//             <button
//               key={tab.value}
//               type="button"
//               className={tab.value === statusFilter ? `${styles.statusTab} ${styles.statusTabActive}` : styles.statusTab}
//               aria-pressed={tab.value === statusFilter}
//               onClick={() => setStatusFilter(tab.value)}
//             >
//               {tab.label}
//             </button>
//           ))}
//         </div>

//         <span className={styles.spacer} />
//         <Link to="/purchasing/purchases/new" className={styles.primaryButton}>
//           + New purchase
//         </Link>
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
//               <th>Purchase no.</th>
//               <th>Supplier</th>
//               <th>Date</th>
//               <th className={styles.right}>Total</th>
//               <th className={styles.right}>Paid</th>
//               <th className={styles.right}>Due</th>
//               <th>Payment</th>
//               <th>
//                 <span className={styles.visuallyHidden}>Actions</span>
//               </th>
//             </tr>
//           </thead>
//           <tbody>
//             {visiblePurchases.length === 0 && (
//               <tr>
//                 <td colSpan={8} className={styles.emptyRow}>
//                   {purchases.length === 0 ? 'No purchases yet. Record the first delivery with New purchase.' : 'No purchases match these filters.'}
//                 </td>
//               </tr>
//             )}
//             {visiblePurchases.map((purchase) => {
//               const due = toHundredths(purchase.due_amount)
//               return (
//                 <tr key={purchase.purchase_id}>
//                   <td>
//                     <button type="button" className={`${styles.cellLink} ${styles.mono}`} onClick={() => setOpenPanel({ type: 'detail', purchaseId: purchase.purchase_id })}>
//                       {purchase.purchase_number}
//                     </button>
//                     <p className={styles.nameSub}>
//                       {purchase.item_count} {purchase.item_count === 1 ? 'item' : 'items'}
//                     </p>
//                   </td>
//                   <td>{purchase.supplier_name}</td>
//                   <td className={styles.mono}>{formatDateTime(purchase.created_at)}</td>
//                   <td className={`${styles.mono} ${styles.right}`}>{moneyText(purchase.total_amount)}</td>
//                   <td className={`${styles.mono} ${styles.right}`}>{moneyText(purchase.paid_amount)}</td>
//                   <td className={`${styles.mono} ${styles.right} ${due > 0 ? styles.dueText : styles.mutedText}`}>{moneyText(purchase.due_amount)}</td>
//                   <td>
//                     <span className={`${styles.pill} ${statusClass(purchase.payment_status)}`}>{PAYMENT_STATUS_LABEL[purchase.payment_status]}</span>
//                   </td>
//                   <td>
//                     <div className={styles.rowActions}>
//                       <button
//                         type="button"
//                         className={styles.iconButton}
//                         title="View"
//                         aria-label={`View ${purchase.purchase_number}`}
//                         onClick={() => setOpenPanel({ type: 'detail', purchaseId: purchase.purchase_id })}
//                       >
//                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
//                           <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
//                           <circle cx="12" cy="12" r="3" />
//                         </svg>
//                       </button>
//                       {canPay && (
//                         <button
//                           type="button"
//                           className={styles.iconButton}
//                           title={due > 0 ? 'Pay this purchase' : 'Nothing due'}
//                           aria-label={`Pay ${purchase.purchase_number}`}
//                           disabled={due <= 0}
//                           onClick={() => setOpenPanel({ type: 'pay', purchase })}
//                         >
//                           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
//                             <rect x="3" y="6" width="18" height="12" rx="2" />
//                             <path d="M3 10h18M7 15h4" />
//                           </svg>
//                         </button>
//                       )}
//                     </div>
//                   </td>
//                 </tr>
//               )
//             })}
//           </tbody>
//         </table>
//       </div>

//       {openPanel?.type === 'detail' && (
//         <PurchaseDetail
//           purchaseId={openPanel.purchaseId}
//           canPay={canPay}
//           onClose={() => setOpenPanel(null)}
//           onPay={(purchase) => setOpenPanel({ type: 'pay', purchase })}
//         />
//       )}
//       {openPanel?.type === 'pay' && <PaySupplierForm purchase={openPanel.purchase} onClose={() => setOpenPanel(null)} onSaved={handlePaid} />}
//     </>
//   )
// }

// function statusClass(status: PaymentStatus): string {
//   if (status === 'PAID') return styles.pillPaid
//   if (status === 'PARTIALLY_PAID') return styles.pillPart
//   return styles.pillDue
// }

// function errorText(err: unknown, fallback: string): string {
//   return err instanceof ApiError ? err.message : fallback
// }















import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import MessagePanel from '../../components/common/MessagePanel.tsx'
import { useAuth } from '../../hooks/useAuth.ts'
import { ApiError } from '../../services/api.ts'
import { getPurchases, getSuppliers } from '../../services/purchasing.service.ts'
import type { PaymentStatus, PurchaseSummary, Supplier } from '../../types/purchasing.ts'
import { formatDateTime } from '../../utils/date.ts'
import PaySupplierForm from './PaySupplierForm.tsx'
import PurchaseDetail from './PurchaseDetail.tsx'
import { formatMoney, moneyText, PAYMENT_STATUS_LABEL, toHundredths } from './purchasingUtils.ts'
import styles from './purchasing.module.css'

type StatusFilter = 'All' | PaymentStatus
type OpenPanel = { type: 'detail'; purchaseId: number } | { type: 'pay'; purchase: PurchaseSummary } | null
type Notice = { text: string; isError?: boolean }

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'All', label: 'All' },
  { value: 'DUE', label: 'Due' },
  { value: 'PARTIALLY_PAID', label: 'Part paid' },
  { value: 'PAID', label: 'Paid' },
]

/** Purchases page (PRD 5.6): every purchase, what was paid and what is still due. */
export default function PurchasesPage() {
  const { hasPermission } = useAuth()
  const canPay = hasPermission('purchases.manage')
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [purchases, setPurchases] = useState<PurchaseSummary[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [supplierFilter, setSupplierFilter] = useState(searchParams.get('supplier') ?? '')
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null)
  // The new purchase page sends a message here after it saves
  const [notice, setNotice] = useState<Notice | null>(() => {
    const text = (location.state as { notice?: string } | null)?.notice
    return text ? { text } : null
  })

  useEffect(() => {
    let isCurrent = true
    // The supplier filter is optional: the list still works if the suppliers can't be loaded
    Promise.all([getPurchases(), getSuppliers().catch(() => [] as Supplier[])])
      .then(([purchaseRows, supplierRows]) => {
        if (!isCurrent) return
        setPurchases(purchaseRows)
        setSuppliers(supplierRows)
      })
      .catch((err) => {
        if (isCurrent) setLoadError(errorText(err, 'Could not load the purchases.'))
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })
    return () => {
      isCurrent = false
    }
  }, [])

  // Don't show the same message again when the page is reloaded
  useEffect(() => {
    if ((location.state as { notice?: string } | null)?.notice) {
      navigate(location.pathname + location.search, { replace: true, state: null })
    }
  }, [location, navigate])

  // Hide the notice after a few seconds
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(timer)
  }, [notice])

  const visiblePurchases = useMemo(() => {
    const term = search.trim().toLowerCase()
    return purchases.filter(
      (purchase) =>
        (term === '' || purchase.purchase_number.toLowerCase().includes(term) || purchase.supplier_name.toLowerCase().includes(term)) &&
        (statusFilter === 'All' || purchase.payment_status === statusFilter) &&
        (supplierFilter === '' || String(purchase.supplier_id) === supplierFilter),
    )
  }, [purchases, search, statusFilter, supplierFilter])

  async function handlePaid(message: string) {
    setOpenPanel(null)
    setNotice({ text: message })
    try {
      setPurchases(await getPurchases())
    } catch (err) {
      setNotice({ text: errorText(err, 'Saved, but the list could not be refreshed.'), isError: true })
    }
  }

  if (isLoading) return <MessagePanel title="Loading purchases…" />
  if (loadError) return <MessagePanel title="Could not load the purchases">{loadError}</MessagePanel>

  const totalBought = purchases.reduce((sum, purchase) => sum + toHundredths(purchase.total_amount), 0)
  const totalDue = purchases.reduce((sum, purchase) => sum + toHundredths(purchase.due_amount), 0)

  return (
    <>
      <div className={styles.statStrip}>
        <span className={styles.statChip}>
          <b>{purchases.length}</b> purchases
        </span>
        <span className={styles.statChip}>
          <b>{formatMoney(totalBought)}</b> bought
        </span>
        <span className={totalDue > 0 ? `${styles.statChip} ${styles.statWarn}` : styles.statChip}>
          <b>{formatMoney(totalDue)}</b> still due
        </span>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <span className={styles.visuallyHidden}>Search purchases</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input type="search" placeholder="Search purchase no. or supplier" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>

        {suppliers.length > 0 && (
          <select
            className={styles.select}
            value={supplierFilter}
            onChange={(event) => setSupplierFilter(event.target.value)}
            aria-label="Filter by supplier"
          >
            <option value="">All suppliers</option>
            {suppliers.map((supplier) => (
              <option key={supplier.supplier_id} value={supplier.supplier_id}>
                {supplier.name}
              </option>
            ))}
          </select>
        )}

        <div className={styles.statusTabs} role="group" aria-label="Filter by payment">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={tab.value === statusFilter ? `${styles.statusTab} ${styles.statusTabActive}` : styles.statusTab}
              aria-pressed={tab.value === statusFilter}
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className={styles.spacer} />
        <Link to="/purchasing/purchases/new" className={styles.primaryButton}>
          + New purchase
        </Link>
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
              <th>Purchase no.</th>
              <th>Supplier</th>
              <th>Date</th>
              <th className={styles.right}>Total</th>
              <th className={styles.right}>Paid</th>
              <th className={styles.right}>Due</th>
              <th>Payment</th>
              <th>
                <span className={styles.visuallyHidden}>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visiblePurchases.length === 0 && (
              <tr>
                <td colSpan={8} className={styles.emptyRow}>
                  {purchases.length === 0 ? 'No purchases yet. Record the first delivery with New purchase.' : 'No purchases match these filters.'}
                </td>
              </tr>
            )}
            {visiblePurchases.map((purchase) => {
              const due = toHundredths(purchase.due_amount)
              return (
                <tr key={purchase.purchase_id}>
                  <td>
                    <button type="button" className={`${styles.cellLink} ${styles.mono}`} onClick={() => setOpenPanel({ type: 'detail', purchaseId: purchase.purchase_id })}>
                      {purchase.purchase_number}
                    </button>
                    <p className={styles.nameSub}>
                      {purchase.item_count} {purchase.item_count === 1 ? 'item' : 'items'}
                    </p>
                  </td>
                  <td>{purchase.supplier_name}</td>
                  <td className={styles.mono}>{formatDateTime(purchase.created_at)}</td>
                  <td className={`${styles.mono} ${styles.right}`}>{moneyText(purchase.total_amount)}</td>
                  <td className={`${styles.mono} ${styles.right}`}>{moneyText(purchase.paid_amount)}</td>
                  <td className={`${styles.mono} ${styles.right} ${due > 0 ? styles.dueText : styles.mutedText}`}>{moneyText(purchase.due_amount)}</td>
                  <td>
                    <span className={`${styles.pill} ${statusClass(purchase.payment_status)}`}>{PAYMENT_STATUS_LABEL[purchase.payment_status]}</span>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        title="View"
                        aria-label={`View ${purchase.purchase_number}`}
                        onClick={() => setOpenPanel({ type: 'detail', purchaseId: purchase.purchase_id })}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      {canPay && (
                        <button
                          type="button"
                          className={styles.iconButton}
                          title={due > 0 ? 'Pay this purchase' : 'Nothing due'}
                          aria-label={`Pay ${purchase.purchase_number}`}
                          disabled={due <= 0}
                          onClick={() => setOpenPanel({ type: 'pay', purchase })}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                            <rect x="3" y="6" width="18" height="12" rx="2" />
                            <path d="M3 10h18M7 15h4" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {openPanel?.type === 'detail' && (
        <PurchaseDetail
          purchaseId={openPanel.purchaseId}
          canPay={canPay}
          onClose={() => setOpenPanel(null)}
          onPay={(purchase) => setOpenPanel({ type: 'pay', purchase })}
        />
      )}
      {openPanel?.type === 'pay' && <PaySupplierForm purchase={openPanel.purchase} onClose={() => setOpenPanel(null)} onSaved={handlePaid} />}
    </>
  )
}

function statusClass(status: PaymentStatus): string {
  if (status === 'PAID') return styles.pillPaid
  if (status === 'PARTIALLY_PAID') return styles.pillPart
  return styles.pillDue
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback
}
