// // import { useEffect, useState } from "react";
// // import "./purchasing.css";
// // import { purchasingApi } from "./purchasingApi";
// // import type { SupplierPayment } from "../../types/purchasing";

// // export default function SupplierPaymentsPage() {
// //   const [payments, setPayments] = useState<SupplierPayment[]>([]);
// //   const [search, setSearch] = useState("");
// //   const [loading, setLoading] = useState(true);

// //   useEffect(() => {
// //     purchasingApi.listPayments().then(setPayments).finally(() => setLoading(false));
// //   }, []);

// //   const rows = payments.filter(
// //     (p) =>
// //       !search ||
// //       (p.SupplierName ?? "").toLowerCase().includes(search.toLowerCase()) ||
// //       (p.PurchaseNo ?? "").toLowerCase().includes(search.toLowerCase())
// //   );

// //   if (loading) return <div className="purchasing-page">Loading…</div>;

// //   return (
// //     <div className="purchasing-page">
// //       <div className="toolbar">
// //         <div className="search-field">
// //           <span className="field-icon">🔍</span>
// //           <input
// //             placeholder="Search supplier or purchase no."
// //             value={search}
// //             onChange={(e) => setSearch(e.target.value)}
// //           />
// //         </div>
// //       </div>

// //       <div className="table-card">
// //         <table>
// //           <thead>
// //             <tr><th>Date</th><th>Supplier</th><th>Purchase no.</th><th>Amount</th><th>Method</th></tr>
// //           </thead>
// //           <tbody>
// //             {rows.length === 0 && (
// //               <tr className="empty-row"><td colSpan={5}>No payments recorded yet.</td></tr>
// //             )}
// //             {rows.map((p) => (
// //               <tr key={p.PaymentID}>
// //                 <td className="mono">
// //                   {new Date(p.PaymentDate).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" })}
// //                 </td>
// //                 <td>{p.SupplierName}</td>
// //                 <td className="mono">{p.PurchaseNo ?? "—"}</td>
// //                 <td className="mono">Tk {p.Amount.toLocaleString()}</td>
// //                 <td>{p.Method}</td>
// //               </tr>
// //             ))}
// //           </tbody>
// //         </table>
// //       </div>
// //     </div>
// //   );
// // }


// //----------------------------------------------
// import { useEffect, useMemo, useState } from 'react'
// import MessagePanel from '../../components/common/MessagePanel.tsx'
// import { ApiError } from '../../services/api.ts'
// import { getSupplierPayments, getSuppliers } from '../../services/purchasing.service.ts'
// import type { PaymentMethod, Supplier, SupplierPayment } from '../../types/purchasing.ts'
// import { formatDateTime } from '../../utils/date.ts'
// import PaySupplierForm from './PaySupplierForm.tsx'
// import { formatMoney, methodLabel, moneyText, PAYMENT_METHODS, toHundredths } from './purchasingUtils.ts'
// import styles from './purchasing.module.css'

// type Notice = { text: string; isError?: boolean }

// /** Supplier payments page (PRD 5.7): every payment made to suppliers, and a place to make a new one. */
// export default function SupplierPaymentsPage() {
//   const [payments, setPayments] = useState<SupplierPayment[]>([])
//   const [suppliers, setSuppliers] = useState<Supplier[]>([])
//   const [isLoading, setIsLoading] = useState(true)
//   const [loadError, setLoadError] = useState<string | null>(null)
//   const [search, setSearch] = useState('')
//   const [methodFilter, setMethodFilter] = useState<'All' | PaymentMethod>('All')
//   const [isPaying, setIsPaying] = useState(false)
//   const [notice, setNotice] = useState<Notice | null>(null)

//   useEffect(() => {
//     let isCurrent = true
//     Promise.all([getSupplierPayments(), getSuppliers()])
//       .then(([paymentRows, supplierRows]) => {
//         if (!isCurrent) return
//         setPayments(paymentRows)
//         setSuppliers(supplierRows)
//       })
//       .catch((err) => {
//         if (isCurrent) setLoadError(errorText(err, 'Could not load the payments.'))
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

//   const visiblePayments = useMemo(() => {
//     const term = search.trim().toLowerCase()
//     return payments.filter(
//       (payment) =>
//         (term === '' || payment.supplier_name.toLowerCase().includes(term) || (payment.purchase_number ?? '').toLowerCase().includes(term)) &&
//         (methodFilter === 'All' || payment.method === methodFilter),
//     )
//   }, [payments, search, methodFilter])

//   async function handleSaved(message: string) {
//     setIsPaying(false)
//     setNotice({ text: message })
//     try {
//       const [paymentRows, supplierRows] = await Promise.all([getSupplierPayments(), getSuppliers()])
//       setPayments(paymentRows)
//       setSuppliers(supplierRows)
//     } catch (err) {
//       setNotice({ text: errorText(err, 'Saved, but the list could not be refreshed.'), isError: true })
//     }
//   }

//   if (isLoading) return <MessagePanel title="Loading payments…" />
//   if (loadError) return <MessagePanel title="Could not load the payments">{loadError}</MessagePanel>

//   const totalDue = suppliers.reduce((sum, supplier) => sum + toHundredths(supplier.outstanding_due), 0)
//   const owedCount = suppliers.filter((supplier) => toHundredths(supplier.outstanding_due) > 0).length
//   const totalPaid = payments.reduce((sum, payment) => sum + toHundredths(payment.amount), 0)

//   return (
//     <>
//       <div className={styles.statStrip}>
//         <span className={totalDue > 0 ? `${styles.statChip} ${styles.statWarn}` : styles.statChip}>
//           <b>{formatMoney(totalDue)}</b> still owed to {owedCount} {owedCount === 1 ? 'supplier' : 'suppliers'}
//         </span>
//         <span className={styles.statChip}>
//           <b>{formatMoney(totalPaid)}</b> paid in {payments.length} {payments.length === 1 ? 'payment' : 'payments'}
//         </span>
//       </div>

//       <div className={styles.toolbar}>
//         <label className={styles.search}>
//           <span className={styles.visuallyHidden}>Search payments</span>
//           <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
//             <circle cx="11" cy="11" r="7" />
//             <path d="m20 20-3.5-3.5" />
//           </svg>
//           <input type="search" placeholder="Search supplier or purchase no." value={search} onChange={(event) => setSearch(event.target.value)} />
//         </label>

//         <select
//           className={styles.select}
//           value={methodFilter}
//           onChange={(event) => setMethodFilter(event.target.value as 'All' | PaymentMethod)}
//           aria-label="Filter by payment method"
//         >
//           <option value="All">All methods</option>
//           {PAYMENT_METHODS.map((item) => (
//             <option key={item.value} value={item.value}>
//               {item.label}
//             </option>
//           ))}
//         </select>

//         <span className={styles.spacer} />
//         <button type="button" className={styles.primaryButton} onClick={() => setIsPaying(true)}>
//           + Pay supplier
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
//               <th>Date</th>
//               <th>Supplier</th>
//               <th>Purchase no.</th>
//               <th className={styles.right}>Amount</th>
//               <th>Method</th>
//               <th>Recorded by</th>
//               <th>Note</th>
//             </tr>
//           </thead>
//           <tbody>
//             {visiblePayments.length === 0 && (
//               <tr>
//                 <td colSpan={7} className={styles.emptyRow}>
//                   {payments.length === 0 ? 'No payments yet.' : 'No payments match these filters.'}
//                 </td>
//               </tr>
//             )}
//             {visiblePayments.map((payment) => (
//               <tr key={payment.supplier_payment_id}>
//                 <td className={styles.mono}>{formatDateTime(payment.created_at)}</td>
//                 <td>{payment.supplier_name}</td>
//                 <td className={styles.mono}>{payment.purchase_number ?? 'Oldest purchases first'}</td>
//                 <td className={`${styles.mono} ${styles.right}`}>{moneyText(payment.amount)}</td>
//                 <td>{methodLabel(payment.method)}</td>
//                 <td>{payment.created_by_name ?? '—'}</td>
//                 <td className={styles.mutedText}>{payment.note ?? '—'}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       {isPaying && <PaySupplierForm suppliers={suppliers} onClose={() => setIsPaying(false)} onSaved={handleSaved} />}
//     </>
//   )
// }

// function errorText(err: unknown, fallback: string): string {
//   return err instanceof ApiError ? err.message : fallback
// }



















import { useEffect, useMemo, useState } from 'react'
import MessagePanel from '../../components/common/MessagePanel.tsx'
import { ApiError } from '../../services/api.ts'
import { getSupplierPayments, getSuppliers } from '../../services/purchasing.service.ts'
import type { PaymentMethod, Supplier, SupplierPayment } from '../../types/purchasing.ts'
import { formatDateTime } from '../../utils/date.ts'
import PaySupplierForm from './PaySupplierForm.tsx'
import { formatMoney, methodLabel, moneyText, PAYMENT_METHODS, toHundredths } from './purchasingUtils.ts'
import styles from './purchasing.module.css'

type Notice = { text: string; isError?: boolean }

/** Supplier payments page (PRD 5.7): every payment made to suppliers, and a place to make a new one. */
export default function SupplierPaymentsPage() {
  const [payments, setPayments] = useState<SupplierPayment[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<'All' | PaymentMethod>('All')
  const [isPaying, setIsPaying] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    let isCurrent = true
    Promise.all([getSupplierPayments(), getSuppliers()])
      .then(([paymentRows, supplierRows]) => {
        if (!isCurrent) return
        setPayments(paymentRows)
        setSuppliers(supplierRows)
      })
      .catch((err) => {
        if (isCurrent) setLoadError(errorText(err, 'Could not load the payments.'))
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

  const visiblePayments = useMemo(() => {
    const term = search.trim().toLowerCase()
    return payments.filter(
      (payment) =>
        (term === '' || payment.supplier_name.toLowerCase().includes(term) || (payment.purchase_number ?? '').toLowerCase().includes(term)) &&
        (methodFilter === 'All' || payment.method === methodFilter),
    )
  }, [payments, search, methodFilter])

  async function handleSaved(message: string) {
    setIsPaying(false)
    setNotice({ text: message })
    try {
      const [paymentRows, supplierRows] = await Promise.all([getSupplierPayments(), getSuppliers()])
      setPayments(paymentRows)
      setSuppliers(supplierRows)
    } catch (err) {
      setNotice({ text: errorText(err, 'Saved, but the list could not be refreshed.'), isError: true })
    }
  }

  if (isLoading) return <MessagePanel title="Loading payments…" />
  if (loadError) return <MessagePanel title="Could not load the payments">{loadError}</MessagePanel>

  const totalDue = suppliers.reduce((sum, supplier) => sum + toHundredths(supplier.outstanding_due), 0)
  const owedCount = suppliers.filter((supplier) => toHundredths(supplier.outstanding_due) > 0).length
  const totalPaid = payments.reduce((sum, payment) => sum + toHundredths(payment.amount), 0)

  return (
    <>
      <div className={styles.statStrip}>
        <span className={totalDue > 0 ? `${styles.statChip} ${styles.statWarn}` : styles.statChip}>
          <b>{formatMoney(totalDue)}</b> still owed to {owedCount} {owedCount === 1 ? 'supplier' : 'suppliers'}
        </span>
        <span className={styles.statChip}>
          <b>{formatMoney(totalPaid)}</b> paid in {payments.length} {payments.length === 1 ? 'payment' : 'payments'}
        </span>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <span className={styles.visuallyHidden}>Search payments</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input type="search" placeholder="Search supplier or purchase no." value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>

        <select
          className={styles.select}
          value={methodFilter}
          onChange={(event) => setMethodFilter(event.target.value as 'All' | PaymentMethod)}
          aria-label="Filter by payment method"
        >
          <option value="All">All methods</option>
          {PAYMENT_METHODS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <span className={styles.spacer} />
        <button type="button" className={styles.primaryButton} onClick={() => setIsPaying(true)}>
          + Pay Supplier
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
              <th>Date</th>
              <th>Supplier</th>
              <th>Purchase no.</th>
              <th className={styles.right}>Amount</th>
              <th>Method</th>
              <th>Recorded by</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {visiblePayments.length === 0 && (
              <tr>
                <td colSpan={7} className={styles.emptyRow}>
                  {payments.length === 0 ? 'No payments yet.' : 'No payments match these filters.'}
                </td>
              </tr>
            )}
            {visiblePayments.map((payment) => (
              <tr key={payment.supplier_payment_id}>
                <td className={styles.mono}>{formatDateTime(payment.created_at)}</td>
                <td>{payment.supplier_name}</td>
                <td className={styles.mono}>{payment.purchase_number ?? 'Oldest purchases first'}</td>
                <td className={`${styles.mono} ${styles.right}`}>{moneyText(payment.amount)}</td>
                <td>{methodLabel(payment.method)}</td>
                <td>{payment.created_by_name ?? '—'}</td>
                <td className={styles.mutedText}>{payment.note ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isPaying && <PaySupplierForm suppliers={suppliers} onClose={() => setIsPaying(false)} onSaved={handleSaved} />}
    </>
  )
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback
}
