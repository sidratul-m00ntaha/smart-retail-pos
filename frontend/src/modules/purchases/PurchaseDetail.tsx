// import { useEffect, useState } from 'react'
// import Drawer from '../../components/ui/Drawer.tsx'
// import { ApiError } from '../../services/api.ts'
// import { getPurchase } from '../../services/purchasing.service.ts'
// import type { Purchase } from '../../types/purchasing.ts'
// import { formatDateTime } from '../../utils/date.ts'
// import { moneyText, percentText, PAYMENT_STATUS_LABEL, toHundredths } from './purchasingUtils.ts'
// import styles from './purchasing.module.css'

// type PurchaseDetailProps = {
//   purchaseId: number
//   /** true when the user may pay suppliers */
//   canPay: boolean
//   onClose: () => void
//   /** Called with the loaded purchase when the manager chooses to pay it */
//   onPay: (purchase: Purchase) => void
// }

// /** One purchase with its lines and how it was paid. */
// export default function PurchaseDetail({ purchaseId, canPay, onClose, onPay }: PurchaseDetailProps) {
//   const [purchase, setPurchase] = useState<Purchase | null>(null)
//   const [error, setError] = useState<string | null>(null)

//   useEffect(() => {
//     let isCurrent = true
//     getPurchase(purchaseId)
//       .then((row) => {
//         if (isCurrent) setPurchase(row)
//       })
//       .catch((err) => {
//         if (isCurrent) setError(err instanceof ApiError ? err.message : 'Could not load the purchase.')
//       })
//     return () => {
//       isCurrent = false
//     }
//   }, [purchaseId])

//   const hasDue = purchase !== null && toHundredths(purchase.due_amount) > 0

//   return (
//     <Drawer
//       title={purchase ? purchase.purchase_number : 'Purchase'}
//       onClose={onClose}
//       footer={
//         <>
//           <button type="button" className={styles.secondaryButton} onClick={onClose}>
//             Close
//           </button>
//           {purchase && canPay && hasDue && (
//             <button type="button" className={styles.saveButton} onClick={() => onPay(purchase)}>
//               Pay this purchase
//             </button>
//           )}
//         </>
//       }
//     >
//       {error && (
//         <p className={styles.formError} role="alert">
//           {error}
//         </p>
//       )}
//       {!purchase && !error && <p className={styles.hint}>Loading…</p>}

//       {purchase && (
//         <>
//           <dl className={styles.detailMeta}>
//             <div>
//               <dt>Supplier</dt>
//               <dd>{purchase.supplier_name}</dd>
//             </div>
//             <div>
//               <dt>Date</dt>
//               <dd>{formatDateTime(purchase.created_at)}</dd>
//             </div>
//             <div>
//               <dt>Recorded by</dt>
//               <dd>{purchase.created_by_name ?? '—'}</dd>
//             </div>
//             <div>
//               <dt>Payment</dt>
//               <dd>
//                 <span className={`${styles.pill} ${statusClass(purchase.payment_status)}`}>{PAYMENT_STATUS_LABEL[purchase.payment_status]}</span>
//               </dd>
//             </div>
//           </dl>
//           {purchase.note && <p className={styles.detailNote}>{purchase.note}</p>}

//           <h3 className={styles.detailHeading}>Items</h3>
//           <ul className={styles.itemList}>
//             {purchase.items.map((item) => (
//               <li key={item.purchase_item_id} className={styles.itemRow}>
//                 <div>
//                   <p className={styles.itemName}>{item.product_name}</p>
//                   <p className={styles.itemSub}>
//                     {Number(item.quantity)} × {moneyText(item.unit_price)}
//                     {Number(item.line_discount_percent) > 0 && ` − ${percentText(item.line_discount_percent)}%`}
//                   </p>
//                   {item.batch_number && (
//                     <p className={styles.itemSub}>
//                       Batch {item.batch_number}
//                       {item.expiry_date && `, expires ${item.expiry_date}`}
//                     </p>
//                   )}
//                 </div>
//                 <span className={styles.mono}>{moneyText(item.line_total)}</span>
//               </li>
//             ))}
//           </ul>

//           <dl className={styles.totalsBox}>
//             <div className={styles.totalRow}>
//               <dt>Subtotal</dt>
//               <dd>{moneyText(purchase.subtotal)}</dd>
//             </div>
//             {toHundredths(purchase.discount_amount) > 0 && (
//               <div className={styles.totalRow}>
//                 <dt>Discount</dt>
//                 <dd>− {moneyText(purchase.discount_amount)}</dd>
//               </div>
//             )}
//             {Number(purchase.tax_percent) > 0 && (
//               <div className={styles.totalRow}>
//                 <dt>VAT ({percentText(purchase.tax_percent)}%)</dt>
//                 <dd>{moneyText(purchase.tax_amount)}</dd>
//               </div>
//             )}
//             {toHundredths(purchase.shipping_charge) > 0 && (
//               <div className={styles.totalRow}>
//                 <dt>Shipping</dt>
//                 <dd>{moneyText(purchase.shipping_charge)}</dd>
//               </div>
//             )}
//             <div className={`${styles.totalRow} ${styles.grandTotal}`}>
//               <dt>Total</dt>
//               <dd>{moneyText(purchase.total_amount)}</dd>
//             </div>
//             <div className={styles.totalRow}>
//               <dt>Paid</dt>
//               <dd>{moneyText(purchase.paid_amount)}</dd>
//             </div>
//             <div className={hasDue ? `${styles.totalRow} ${styles.dueText}` : styles.totalRow}>
//               <dt>Due</dt>
//               <dd>{moneyText(purchase.due_amount)}</dd>
//             </div>
//           </dl>
//         </>
//       )}
//     </Drawer>
//   )
// }

// function statusClass(status: Purchase['payment_status']): string {
//   if (status === 'PAID') return styles.pillPaid
//   if (status === 'PARTIALLY_PAID') return styles.pillPart
//   return styles.pillDue
// }


















import { useEffect, useState } from 'react'
import Drawer from '../../components/ui/Drawer.tsx'
import { ApiError } from '../../services/api.ts'
import { getPurchase } from '../../services/purchasing.service.ts'
import type { Purchase } from '../../types/purchasing.ts'
import { formatDateTime } from '../../utils/date.ts'
import { moneyText, percentText, PAYMENT_STATUS_LABEL, toHundredths } from './purchasingUtils.ts'
import styles from './purchasing.module.css'

type PurchaseDetailProps = {
  purchaseId: number
  /** true when the user may pay suppliers */
  canPay: boolean
  onClose: () => void
  /** Called with the loaded purchase when the manager chooses to pay it */
  onPay: (purchase: Purchase) => void
}

/** One purchase with its lines and how it was paid. */
export default function PurchaseDetail({ purchaseId, canPay, onClose, onPay }: PurchaseDetailProps) {
  const [purchase, setPurchase] = useState<Purchase | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCurrent = true
    getPurchase(purchaseId)
      .then((row) => {
        if (isCurrent) setPurchase(row)
      })
      .catch((err) => {
        if (isCurrent) setError(err instanceof ApiError ? err.message : 'Could not load the purchase.')
      })
    return () => {
      isCurrent = false
    }
  }, [purchaseId])

  const hasDue = purchase !== null && toHundredths(purchase.due_amount) > 0

  return (
    <Drawer
      title={purchase ? purchase.purchase_number : 'Purchase'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Close
          </button>
          {purchase && canPay && hasDue && (
            <button type="button" className={styles.saveButton} onClick={() => onPay(purchase)}>
              Pay this purchase
            </button>
          )}
        </>
      }
    >
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}
      {!purchase && !error && <p className={styles.hint}>Loading…</p>}

      {purchase && (
        <>
          <dl className={styles.detailMeta}>
            <div>
              <dt>Supplier</dt>
              <dd>{purchase.supplier_name}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{formatDateTime(purchase.created_at)}</dd>
            </div>
            <div>
              <dt>Recorded by</dt>
              <dd>{purchase.created_by_name ?? '—'}</dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd>
                <span className={`${styles.pill} ${statusClass(purchase.payment_status)}`}>{PAYMENT_STATUS_LABEL[purchase.payment_status]}</span>
              </dd>
            </div>
          </dl>
          {purchase.note && <p className={styles.detailNote}>{purchase.note}</p>}

          <h3 className={styles.detailHeading}>Items</h3>
          <ul className={styles.itemList}>
            {purchase.items.map((item) => (
              <li key={item.purchase_item_id} className={styles.itemRow}>
                <div>
                  <p className={styles.itemName}>{item.product_name}</p>
                  <p className={styles.itemSub}>
                    {Number(item.quantity)} × {moneyText(item.unit_price)}
                    {Number(item.line_discount_percent) > 0 && ` − ${percentText(item.line_discount_percent)}%`}
                  </p>
                  {item.batch_number && (
                    <p className={styles.itemSub}>
                      Batch {item.batch_number}
                      {item.expiry_date && `, expires ${item.expiry_date}`}
                    </p>
                  )}
                </div>
                <span className={styles.mono}>{moneyText(item.line_total)}</span>
              </li>
            ))}
          </ul>

          <dl className={styles.totalsBox}>
            <div className={styles.totalRow}>
              <dt>Subtotal</dt>
              <dd>{moneyText(purchase.subtotal)}</dd>
            </div>
            {toHundredths(purchase.discount_amount) > 0 && (
              <div className={styles.totalRow}>
                <dt>Discount</dt>
                <dd>− {moneyText(purchase.discount_amount)}</dd>
              </div>
            )}
            {Number(purchase.tax_percent) > 0 && (
              <div className={styles.totalRow}>
                <dt>VAT ({percentText(purchase.tax_percent)}%)</dt>
                <dd>{moneyText(purchase.tax_amount)}</dd>
              </div>
            )}
            {toHundredths(purchase.shipping_charge) > 0 && (
              <div className={styles.totalRow}>
                <dt>Shipping</dt>
                <dd>{moneyText(purchase.shipping_charge)}</dd>
              </div>
            )}
            <div className={`${styles.totalRow} ${styles.grandTotal}`}>
              <dt>Total</dt>
              <dd>{moneyText(purchase.total_amount)}</dd>
            </div>
            <div className={styles.totalRow}>
              <dt>Paid</dt>
              <dd>{moneyText(purchase.paid_amount)}</dd>
            </div>
            <div className={hasDue ? `${styles.totalRow} ${styles.dueText}` : styles.totalRow}>
              <dt>Due</dt>
              <dd>{moneyText(purchase.due_amount)}</dd>
            </div>
          </dl>
        </>
      )}
    </Drawer>
  )
}

function statusClass(status: Purchase['payment_status']): string {
  if (status === 'PAID') return styles.pillPaid
  if (status === 'PARTIALLY_PAID') return styles.pillPart
  return styles.pillDue
}
