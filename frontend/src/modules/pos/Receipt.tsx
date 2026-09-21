import { useRef } from 'react'
import type { Sale } from '../../services/pos.service.ts'
import InvoiceDocument from '../sales/InvoiceDocument.tsx'
import InvoiceModal from '../sales/InvoiceModal.tsx'
import modalStyles from '../sales/InvoiceModal.module.css'
import type { Paisa } from './posMath.ts'

type ReceiptProps = {
  sale: Sale
  /** Cash to hand back to the customer. The server doesn't return it: it only knows what was applied to the sale. */
  change: Paisa
  onNewSale: () => void
}

/** The invoice of a completed sale, shown at the counter. Closing it is a deliberate click on "New sale". */
export default function Receipt({ sale, change, onNewSale }: ReceiptProps) {
  const newSaleRef = useRef<HTMLButtonElement>(null)
  return (
    <InvoiceModal
      label={`Invoice ${sale.invoice_number}`}
      focusRef={newSaleRef}
      actions={
        <>
          <button type="button" className={modalStyles.secondary} onClick={() => window.print()}>
            Print
          </button>
          <button type="button" className={modalStyles.primary} ref={newSaleRef} onClick={onNewSale}>
            New sale
          </button>
        </>
      }
    >
      <InvoiceDocument sale={sale} change={change} />
    </InvoiceModal>
  )
}
