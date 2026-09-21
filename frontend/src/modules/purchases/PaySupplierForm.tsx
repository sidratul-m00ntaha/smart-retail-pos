// import { useId, useState, type FormEvent } from 'react'
// import Drawer from '../../components/ui/Drawer.tsx'
// import { ApiError } from '../../services/api.ts'
// import { createSupplierPayment } from '../../services/purchasing.service.ts'
// import type { PaymentMethod, PurchaseSummary, Supplier } from '../../types/purchasing.ts'
// import { formatMoney, PAYMENT_METHODS, parseAmount, toHundredths, toInputText } from './purchasingUtils.ts'
// import styles from './purchasing.module.css'

// type PaySupplierFormProps = {
//   /** Suppliers to choose from. Only those with a due are offered. Not needed when paying one purchase. */
//   suppliers?: Supplier[]
//   /** Pre-selects a supplier */
//   initialSupplierId?: number
//   /** Set to pay this one purchase. Otherwise the payment goes to the supplier's oldest open purchases first. */
//   purchase?: PurchaseSummary
//   onClose: () => void
//   onSaved: (message: string) => void
// }

// const NO_SUPPLIERS: Supplier[] = []

// /** Records a payment to a supplier. It can never be more than what is due (PRD 5.7). */
// export default function PaySupplierForm({
//   suppliers = NO_SUPPLIERS,
//   initialSupplierId,
//   purchase,
//   onClose,
//   onSaved,
// }: PaySupplierFormProps) {
//   const formId = useId()
//   const [supplierId, setSupplierId] = useState(initialSupplierId ? String(initialSupplierId) : '')
//   const [amountText, setAmountText] = useState('')
//   const [method, setMethod] = useState<PaymentMethod>('cash')
//   const [note, setNote] = useState('')
//   const [error, setError] = useState<string | null>(null)
//   const [saveError, setSaveError] = useState<string | null>(null)
//   const [isSaving, setIsSaving] = useState(false)

//   const payable = suppliers.filter((supplier) => toHundredths(supplier.outstanding_due) > 0)
//   const supplier = purchase ? undefined : payable.find((row) => String(row.supplier_id) === supplierId)
//   const supplierName = purchase ? purchase.supplier_name : supplier?.name
//   const due = purchase ? toHundredths(purchase.due_amount) : supplier ? toHundredths(supplier.outstanding_due) : 0
//   const amount = parseAmount(amountText)
//   const hasTarget = purchase !== undefined || supplier !== undefined

//   let preview = 'Choose a supplier to see what is due.'
//   let previewIsError = false
//   if (hasTarget) {
//     if (amount === null) {
//       preview = 'Enter an amount like 250 or 250.50.'
//     } else if (amount > due) {
//       preview = `The payment can't be more than the ${formatMoney(due)} due.`
//       previewIsError = true
//     } else if (amount > 0) {
//       preview = `Due after this payment: ${formatMoney(due - amount)}.`
//     } else {
//       preview = `${formatMoney(due)} is due.`
//     }
//   }

//   async function handleSubmit(event: FormEvent<HTMLFormElement>) {
//     event.preventDefault()
//     setSaveError(null)
//     if (!hasTarget) {
//       setError('Choose the supplier you are paying.')
//       return
//     }
//     if (amount === null || amount <= 0) {
//       setError('Enter an amount like 250 or 250.50.')
//       return
//     }
//     if (amount > due) {
//       setError(`The payment can't be more than ${formatMoney(due)}.`)
//       return
//     }
//     setError(null)

//     setIsSaving(true)
//     try {
//       await createSupplierPayment({
//         supplier_id: purchase ? purchase.supplier_id : Number(supplierId),
//         amount: toInputText(amount),
//         method,
//         purchase_id: purchase ? purchase.purchase_id : null,
//         note: note.trim() === '' ? null : note.trim(),
//       })
//       onSaved(`Paid ${formatMoney(amount)} to ${supplierName}.`)
//     } catch (err) {
//       setSaveError(err instanceof ApiError ? err.message : 'Could not record the payment.')
//       setIsSaving(false)
//     }
//   }

//   return (
//     <Drawer
//       title={purchase ? `Pay ${purchase.purchase_number}` : 'Pay supplier'}
//       onClose={onClose}
//       footer={
//         <>
//           <button type="button" className={styles.secondaryButton} onClick={onClose}>
//             Cancel
//           </button>
//           <button type="submit" form={formId} className={styles.saveButton} disabled={isSaving}>
//             {isSaving ? 'Saving…' : 'Record payment'}
//           </button>
//         </>
//       }
//     >
//       <form id={formId} onSubmit={handleSubmit} noValidate>
//         {saveError && (
//           <p className={styles.formError} role="alert">
//             {saveError}
//           </p>
//         )}

//         {purchase ? (
//           <div className={styles.summaryBox}>
//             <p className={styles.summaryTitle}>{purchase.supplier_name}</p>
//             <p className={styles.summaryLine}>
//               <span>Purchase total</span>
//               <span>{formatMoney(toHundredths(purchase.total_amount))}</span>
//             </p>
//             <p className={styles.summaryLine}>
//               <span>Due</span>
//               <span>{formatMoney(due)}</span>
//             </p>
//           </div>
//         ) : (
//           <div className={styles.formRow}>
//             <label className={styles.label} htmlFor={`${formId}-supplier`}>
//               Supplier <span className={styles.required}>*</span>
//             </label>
//             <select id={`${formId}-supplier`} value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
//               <option value="">Select…</option>
//               {payable.map((row) => (
//                 <option key={row.supplier_id} value={row.supplier_id}>
//                   {row.name} — {formatMoney(toHundredths(row.outstanding_due))} due
//                 </option>
//               ))}
//             </select>
//             {payable.length === 0 && <p className={styles.hint}>No supplier has anything due.</p>}
//           </div>
//         )}

//         <div className={error ? `${styles.formRow} ${styles.hasError}` : styles.formRow}>
//           <label className={styles.label} htmlFor={`${formId}-amount`}>
//             Amount (Tk) <span className={styles.required}>*</span>
//           </label>
//           <input
//             id={`${formId}-amount`}
//             inputMode="decimal"
//             placeholder="0.00"
//             value={amountText}
//             onChange={(event) => {
//               setAmountText(event.target.value)
//               setError(null)
//             }}
//             autoFocus
//           />
//           {error && <p className={styles.fieldError}>{error}</p>}
//           {hasTarget && due > 0 && (
//             <button type="button" className={styles.linkButton} onClick={() => setAmountText(toInputText(due))}>
//               Pay the full {formatMoney(due)}
//             </button>
//           )}
//         </div>

//         <div className={styles.formRow}>
//           <label className={styles.label} htmlFor={`${formId}-method`}>
//             Payment method
//           </label>
//           <select id={`${formId}-method`} value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
//             {PAYMENT_METHODS.map((item) => (
//               <option key={item.value} value={item.value}>
//                 {item.label}
//               </option>
//             ))}
//           </select>
//         </div>

//         <div className={styles.formRow}>
//           <label className={styles.label} htmlFor={`${formId}-note`}>
//             Note
//           </label>
//           <input
//             id={`${formId}-note`}
//             type="text"
//             placeholder="optional, e.g. cheque number"
//             maxLength={255}
//             value={note}
//             onChange={(event) => setNote(event.target.value)}
//           />
//         </div>

//         <p className={previewIsError ? `${styles.previewBox} ${styles.previewError}` : styles.previewBox} role="status">
//           {preview}
//         </p>
//         {!purchase && (
//           <p className={styles.hint}>The payment goes to this supplier's oldest unpaid purchases first.</p>
//         )}
//       </form>
//     </Drawer>
//   )
// }





















import { useId, useState, type FormEvent } from 'react'
import Drawer from '../../components/ui/Drawer.tsx'
import { ApiError } from '../../services/api.ts'
import { createSupplierPayment } from '../../services/purchasing.service.ts'
import type { PaymentMethod, PurchaseSummary, Supplier } from '../../types/purchasing.ts'
import { formatMoney, PAYMENT_METHODS, parseAmount, toHundredths, toInputText } from './purchasingUtils.ts'
import styles from './purchasing.module.css'

type PaySupplierFormProps = {
  /** Suppliers to choose from. Only those with a due are offered. Not needed when paying one purchase. */
  suppliers?: Supplier[]
  /** Pre-selects a supplier */
  initialSupplierId?: number
  /** Set to pay this one purchase. Otherwise the payment goes to the supplier's oldest open purchases first. */
  purchase?: PurchaseSummary
  onClose: () => void
  onSaved: (message: string) => void
}

const NO_SUPPLIERS: Supplier[] = []

/** Records a payment to a supplier. It can never be more than what is due (PRD 5.7). */
export default function PaySupplierForm({
  suppliers = NO_SUPPLIERS,
  initialSupplierId,
  purchase,
  onClose,
  onSaved,
}: PaySupplierFormProps) {
  const formId = useId()
  const [supplierId, setSupplierId] = useState(initialSupplierId ? String(initialSupplierId) : '')
  const [amountText, setAmountText] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const payable = suppliers.filter((supplier) => toHundredths(supplier.outstanding_due) > 0)
  const supplier = purchase ? undefined : payable.find((row) => String(row.supplier_id) === supplierId)
  const supplierName = purchase ? purchase.supplier_name : supplier?.name
  const due = purchase ? toHundredths(purchase.due_amount) : supplier ? toHundredths(supplier.outstanding_due) : 0
  const amount = parseAmount(amountText)
  const hasTarget = purchase !== undefined || supplier !== undefined

  let preview = 'Choose a supplier to see what is due.'
  let previewIsError = false
  if (hasTarget) {
    if (amount === null) {
      preview = 'Enter an amount like 250 or 250.50.'
    } else if (amount > due) {
      preview = `The payment can't be more than the ${formatMoney(due)} due.`
      previewIsError = true
    } else if (amount > 0) {
      preview = `Due after this payment: ${formatMoney(due - amount)}.`
    } else {
      preview = `${formatMoney(due)} is due.`
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveError(null)
    if (!hasTarget) {
      setError('Choose the supplier you are paying.')
      return
    }
    if (amount === null || amount <= 0) {
      setError('Enter an amount like 250 or 250.50.')
      return
    }
    if (amount > due) {
      setError(`The payment can't be more than ${formatMoney(due)}.`)
      return
    }
    setError(null)

    setIsSaving(true)
    try {
      await createSupplierPayment({
        supplier_id: purchase ? purchase.supplier_id : Number(supplierId),
        amount: toInputText(amount),
        method,
        purchase_id: purchase ? purchase.purchase_id : null,
        note: note.trim() === '' ? null : note.trim(),
      })
      onSaved(`Paid ${formatMoney(amount)} to ${supplierName}.`)
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Could not record the payment.')
      setIsSaving(false)
    }
  }

  return (
    <Drawer
      title={purchase ? `Pay ${purchase.purchase_number}` : 'Pay supplier'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={formId} className={styles.saveButton} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Record payment'}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate>
        {saveError && (
          <p className={styles.formError} role="alert">
            {saveError}
          </p>
        )}

        {purchase ? (
          <div className={styles.summaryBox}>
            <p className={styles.summaryTitle}>{purchase.supplier_name}</p>
            <p className={styles.summaryLine}>
              <span>Purchase total</span>
              <span>{formatMoney(toHundredths(purchase.total_amount))}</span>
            </p>
            <p className={styles.summaryLine}>
              <span>Due</span>
              <span>{formatMoney(due)}</span>
            </p>
          </div>
        ) : (
          <div className={styles.formRow}>
            <label className={styles.label} htmlFor={`${formId}-supplier`}>
              Supplier <span className={styles.required}>*</span>
            </label>
            <select id={`${formId}-supplier`} value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
              <option value="">Select…</option>
              {payable.map((row) => (
                <option key={row.supplier_id} value={row.supplier_id}>
                  {row.name} — {formatMoney(toHundredths(row.outstanding_due))} due
                </option>
              ))}
            </select>
            {payable.length === 0 && <p className={styles.hint}>No supplier has anything due.</p>}
          </div>
        )}

        <div className={error ? `${styles.formRow} ${styles.hasError}` : styles.formRow}>
          <label className={styles.label} htmlFor={`${formId}-amount`}>
            Amount (Tk) <span className={styles.required}>*</span>
          </label>
          <input
            id={`${formId}-amount`}
            inputMode="decimal"
            placeholder="0.00"
            value={amountText}
            onChange={(event) => {
              setAmountText(event.target.value)
              setError(null)
            }}
            autoFocus
          />
          {error && <p className={styles.fieldError}>{error}</p>}
          {hasTarget && due > 0 && (
            <button type="button" className={styles.linkButton} onClick={() => setAmountText(toInputText(due))}>
              Pay the full {formatMoney(due)}
            </button>
          )}
        </div>

        <div className={styles.formRow}>
          <label className={styles.label} htmlFor={`${formId}-method`}>
            Payment method
          </label>
          <select id={`${formId}-method`} value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formRow}>
          <label className={styles.label} htmlFor={`${formId}-note`}>
            Note
          </label>
          <input
            id={`${formId}-note`}
            type="text"
            placeholder="optional, e.g. cheque number"
            maxLength={255}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        <p className={previewIsError ? `${styles.previewBox} ${styles.previewError}` : styles.previewBox} role="status">
          {preview}
        </p>
        {!purchase && (
          <p className={styles.hint}>The payment goes to this supplier's oldest unpaid purchases first.</p>
        )}
      </form>
    </Drawer>
  )
}
