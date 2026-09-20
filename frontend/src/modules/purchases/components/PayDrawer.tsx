import { useEffect, useState } from "react";
import type { PaymentMethod, Supplier, SupplierPaymentInput } from "../../../types/purchasing";

interface Props {
  open: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onSave: (data: SupplierPaymentInput) => Promise<void>;
}

export default function PayDrawer({ open, supplier, onClose, onSave }: Props) {
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount("");
      setMethod("Cash");
      setError(false);
    }
  }, [open, supplier]);

  if (!open || !supplier) return null;

  const amt = parseFloat(amount) || 0;
  const overLimit = amt > supplier.Due;

  let previewText = "Enter an amount to preview the new balance.";
  if (amt > 0) {
    previewText = overLimit
      ? `Payment can't exceed the outstanding due of Tk ${supplier.Due.toLocaleString()}.`
      : `New due after this payment: Tk ${(supplier.Due - amt).toLocaleString()}.`;
  }

  async function handleSave() {
    if (amt <= 0 || amt > supplier!.Due) {
      setError(true);
      return;
    }
    setSaving(true);
    try {
      await onSave({ Amount: amt, Method: method });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="drawer show">
        <div className="drawer-head">
          <h3>Pay supplier</h3>
          <button className="drawer-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="drawer-body">
          <div className="summary-box">
            <div className="summary-row"><span>{supplier.Name}</span><span /></div>
            <div className="summary-row"><span>Outstanding due</span><span>Tk {supplier.Due.toLocaleString()}</span></div>
          </div>
          <div className={`form-row ${error ? "has-error" : ""}`}>
            <label>Payment amount (Tk) <span className="req">*</span></label>
            <input
              type="number"
              value={amount}
              placeholder="0"
              onChange={(e) => { setAmount(e.target.value); setError(false); }}
            />
            {error && <p className="form-error">Enter an amount up to the outstanding due.</p>}
          </div>
          <div className="form-row">
            <label>Payment method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              <option>Cash</option>
              <option>Bank</option>
              <option>Digital</option>
            </select>
          </div>
          <div className={`preview-box ${overLimit ? "err" : ""}`}>{previewText}</div>
        </div>
        <div className="drawer-foot">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Record payment"}
          </button>
        </div>
      </div>
    </>
  );
}
