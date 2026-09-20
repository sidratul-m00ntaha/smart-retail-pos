import { useEffect, useState } from "react";
import type { Supplier, SupplierInput } from "../../../types/purchasing";

interface Props {
  open: boolean;
  editing: Supplier | null;
  onClose: () => void;
  onSave: (data: SupplierInput) => Promise<void>;
}

const EMPTY: SupplierInput = { Name: "", Phone: "", Email: "", Address: "", Status: "Active" };

export default function SupplierDrawer({ open, editing, onClose, onSave }: Props) {
  const [form, setForm] = useState<SupplierInput>(EMPTY);
  const [errors, setErrors] = useState<{ Name?: boolean; Phone?: boolean }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? { Name: editing.Name, Phone: editing.Phone, Email: editing.Email ?? "", Address: editing.Address ?? "", Status: editing.Status }
          : EMPTY
      );
      setErrors({});
    }
  }, [open, editing]);

  if (!open) return null;

  async function handleSave() {
    const nextErrors = { Name: !form.Name.trim(), Phone: !form.Phone.trim() };
    setErrors(nextErrors);
    if (nextErrors.Name || nextErrors.Phone) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="drawer show">
        <div className="drawer-head">
          <h3>{editing ? "Edit supplier" : "Add supplier"}</h3>
          <button className="drawer-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="drawer-body">
          <div className={`form-row ${errors.Name ? "has-error" : ""}`}>
            <label>Supplier name <span className="req">*</span></label>
            <input
              value={form.Name}
              placeholder="e.g. ABC Traders"
              onChange={(e) => setForm({ ...form, Name: e.target.value })}
            />
            {errors.Name && <p className="form-error">Enter a supplier name.</p>}
          </div>
          <div className="form-2col">
            <div className={`form-row ${errors.Phone ? "has-error" : ""}`}>
              <label>Phone <span className="req">*</span></label>
              <input
                value={form.Phone}
                placeholder="017XX-XXXXXX"
                onChange={(e) => setForm({ ...form, Phone: e.target.value })}
              />
              {errors.Phone && <p className="form-error">Enter a phone number.</p>}
            </div>
            <div className="form-row">
              <label>Email</label>
              <input
                value={form.Email}
                placeholder="optional"
                onChange={(e) => setForm({ ...form, Email: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row">
            <label>Address</label>
            <input
              value={form.Address}
              placeholder="optional"
              onChange={(e) => setForm({ ...form, Address: e.target.value })}
            />
          </div>
          <div className="toggle-row">
            <div>
              <p className="t-label">Active</p>
              <p className="t-sub">{form.Status === "Active" ? "Selectable for new purchases" : "Hidden from new purchases · history kept"}</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={form.Status === "Active"}
                onChange={(e) => setForm({ ...form, Status: e.target.checked ? "Active" : "Inactive" })}
              />
              <span className="slider" />
            </label>
          </div>
        </div>
        <div className="drawer-foot">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save supplier"}
          </button>
        </div>
      </div>
    </>
  );
}
