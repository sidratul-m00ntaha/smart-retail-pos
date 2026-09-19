import { useEffect, useState } from "react";
import { useProductsStub } from "../useProductsStub";
import type { ProductLite, PurchaseInput, Supplier } from "../../../types/purchasing";

interface Props {
  open: boolean;
  suppliers: Supplier[];
  onClose: () => void;
  onSave: (data: PurchaseInput) => Promise<void>;
}

interface Line {
  lid: number;
  productId: number;
  qty: number;
  price: number;
}

const VAT_OPTIONS = [
  { label: "Standard VAT — 15%", value: 0.15 },
  { label: "Reduced VAT — 5%", value: 0.05 },
  { label: "Zero VAT — 0%", value: 0 },
];

function makeLine(lid: number, products: ProductLite[]): Line {
  const p = products[0];
  return { lid, productId: p?.ProductID ?? 0, qty: 1, price: p?.PurchasePrice ?? 0 };
}

export default function PurchaseDrawer({ open, suppliers, onClose, onSave }: Props) {
  const products = useProductsStub();
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [lines, setLines] = useState<Line[]>([]);
  const [lineCounter, setLineCounter] = useState(0);
  const [discount, setDiscount] = useState("");
  const [vatRate, setVatRate] = useState(0.05);
  const [paid, setPaid] = useState("");
  const [errors, setErrors] = useState<{ supplier?: boolean; lines?: boolean; paid?: boolean }>({});
  const [saving, setSaving] = useState(false);

  const activeSuppliers = suppliers.filter((s) => s.Status === "Active");

  useEffect(() => {
    if (open && products.length) {
      setSupplierId("");
      setDiscount("");
      setVatRate(0.05);
      setPaid("");
      setErrors({});
      setLines([makeLine(0, products)]);
      setLineCounter(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const discountVal = Math.min(parseFloat(discount) || 0, subtotal);
  const taxable = subtotal - discountVal;
  const vat = Math.round(taxable * vatRate);
  const total = taxable + vat;
  const paidVal = parseFloat(paid) || 0;
  const paidOver = paidVal > total;
  const due = total - paidVal;

  function addLine() {
    setLines((prev) => [...prev, makeLine(lineCounter, products)]);
    setLineCounter((c) => c + 1);
  }
  function removeLine(lid: number) {
    setLines((prev) => prev.filter((l) => l.lid !== lid));
  }
  function updateLine(lid: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.lid === lid ? { ...l, ...patch } : l)));
  }
  function onProductChange(lid: number, productId: number) {
    const p = products.find((pp) => pp.ProductID === productId);
    updateLine(lid, { productId, price: p?.PurchasePrice ?? 0 });
  }

  async function handleSave() {
    const validLines = lines.filter((l) => l.qty > 0 && l.price > 0);
    const nextErrors = {
      supplier: !supplierId,
      lines: validLines.length === 0,
      paid: paidOver,
    };
    setErrors(nextErrors);
    if (nextErrors.supplier || nextErrors.lines || nextErrors.paid) return;

    setSaving(true);
    try {
      await onSave({
        SupplierID: supplierId as number,
        Items: validLines.map((l) => ({ ProductID: l.productId, Quantity: l.qty, UnitPrice: l.price })),
        Discount: discountVal,
        VATRate: vatRate,
        Paid: paidVal,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="drawer wide show">
        <div className="drawer-head">
          <h3>New purchase</h3>
          <button className="drawer-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="drawer-body">
          <div className={`form-row ${errors.supplier ? "has-error" : ""}`}>
            <label>Supplier <span className="req">*</span></label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Select…</option>
              {activeSuppliers.map((s) => (
                <option key={s.SupplierID} value={s.SupplierID}>{s.Name}</option>
              ))}
            </select>
            {errors.supplier && <p className="form-error">Select a supplier.</p>}
          </div>

          <label style={{ fontSize: 12.5, fontWeight: 500, display: "block", marginBottom: 6 }}>
            Line items <span className="req">*</span>
          </label>
          <table className="lines-table">
            <thead>
              <tr>
                <th style={{ width: "38%" }}>Product</th>
                <th style={{ width: "16%" }}>Qty</th>
                <th style={{ width: "22%" }}>Unit price</th>
                <th style={{ width: "18%" }}>Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.lid}>
                  <td>
                    <select value={l.productId} onChange={(e) => onProductChange(l.lid, Number(e.target.value))}>
                      {products.map((p) => (
                        <option key={p.ProductID} value={p.ProductID}>{p.Name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      value={l.qty}
                      onChange={(e) => updateLine(l.lid, { qty: parseFloat(e.target.value) || 0 })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={l.price}
                      onChange={(e) => updateLine(l.lid, { price: parseFloat(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="line-total">Tk {(l.qty * l.price).toLocaleString()}</td>
                  <td>
                    <button className="rm-line" onClick={() => removeLine(l.lid)} aria-label="Remove line">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="add-line-btn" onClick={addLine}>+ Add line item</button>
          {errors.lines && (
            <p className="form-error" style={{ margin: "-10px 0 14px" }}>
              Add at least one line with a positive quantity and unit price.
            </p>
          )}

          <div className="form-2col">
            <div className="form-row">
              <label>Discount amount (Tk)</label>
              <input type="number" value={discount} placeholder="0" onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div className="form-row">
              <label>Tax / VAT rate</label>
              <select value={vatRate} onChange={(e) => setVatRate(parseFloat(e.target.value))}>
                {VAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="totals-box">
            <div className="t-row"><span>Subtotal</span><span>Tk {subtotal.toLocaleString()}</span></div>
            <div className="t-row"><span>Discount</span><span>-Tk {discountVal.toLocaleString()}</span></div>
            <div className="t-row"><span>VAT</span><span>Tk {vat.toLocaleString()}</span></div>
            <div className="t-row grand"><span>Grand total</span><span>Tk {total.toLocaleString()}</span></div>
          </div>

          <div className={`form-row ${errors.paid ? "has-error" : ""}`}>
            <label>Paid amount (Tk)</label>
            <input type="number" value={paid} placeholder="0" onChange={(e) => setPaid(e.target.value)} />
            {errors.paid && <p className="form-error">Paid amount can't exceed the grand total.</p>}
          </div>
          <div className={`preview-box ${paidOver ? "err" : ""}`}>
            {paidOver
              ? `Paid amount can't exceed the grand total of Tk ${total.toLocaleString()}.`
              : `Supplier due after this purchase: Tk ${due.toLocaleString()}.`}
          </div>
        </div>
        <div className="drawer-foot">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Confirm purchase"}
          </button>
        </div>
      </div>
    </>
  );
}
