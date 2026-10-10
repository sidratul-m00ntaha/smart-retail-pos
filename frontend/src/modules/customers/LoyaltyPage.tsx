// frontend/src/modules/customers/LoyaltyPage.tsx
import { useEffect, useState } from "react";
import { listLoyaltyTiers, createLoyaltyTier, updateLoyaltyTier, type LoyaltyTier } from "../../services/customers";
import styles from "./customers.module.css";

export default function LoyaltyPage() {
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null);
  const [name, setName] = useState("");
  const [requiredPoints, setRequiredPoints] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadTiers = async () => {
    try {
      const data = await listLoyaltyTiers();
      setTiers(data);
    } catch {
      setMessage({ type: "error", text: "Failed to load loyalty tiers." });
    }
  };

  useEffect(() => {
    let isCurrent = true;
    listLoyaltyTiers()
      .then((data) => {
        if (isCurrent) setTiers(data);
      })
      .catch(() => {
        if (isCurrent) setMessage({ type: "error", text: "Failed to load loyalty tiers." });
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const payload = {
        name,
        required_points: Number(requiredPoints),
        discount_percent: Number(discountPercent),
      };

      if (editingTier) {
        await updateLoyaltyTier(editingTier.loyalty_tier_id, payload);
        setMessage({ type: "success", text: "Tier updated successfully!" });
      } else {
        await createLoyaltyTier(payload);
        setMessage({ type: "success", text: "Tier created successfully!" });
      }

      // Reset form and reload
      setEditingTier(null);
      setName("");
      setRequiredPoints("");
      setDiscountPercent("");
      await loadTiers();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save tier." });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tier: LoyaltyTier) => {
    setEditingTier(tier);
    setName(tier.name);
    setRequiredPoints(tier.required_points.toString());
    setDiscountPercent(tier.discount_percent.toString());
  };

  const handleCancel = () => {
    setEditingTier(null);
    setName("");
    setRequiredPoints("");
    setDiscountPercent("");
  };

  return (
    <div>
      <h2 className={styles.heading}>Loyalty Program Configuration</h2>

      {/* Form */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>{editingTier ? "Edit Tier" : "Add New Tier"}</h3>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Tier Name</label>
            <input
              className={`${styles.input} ${styles.w150}`}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Silver"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Required Points</label>
            <input
              className={`${styles.input} ${styles.w120}`}
              type="number"
              min="0"
              value={requiredPoints}
              onChange={e => setRequiredPoints(e.target.value)}
              placeholder="e.g., 100"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Discount (%)</label>
            <input
              className={`${styles.input} ${styles.w120}`}
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={discountPercent}
              onChange={e => setDiscountPercent(e.target.value)}
              placeholder="e.g., 5"
              required
            />
          </div>

          <div className={styles.buttons}>
            <button type="submit" className={styles.primaryButton} disabled={loading}>
              {loading ? "Saving..." : (editingTier ? "Update Tier" : "Add Tier")}
            </button>
            {editingTier && (
              <button type="button" className={styles.secondaryButton} onClick={handleCancel}>
                Cancel
              </button>
            )}
          </div>
        </form>

        {message && (
          <p className={message.type === "success" ? styles.messageOk : styles.messageError}>
            {message.text}
          </p>
        )}
      </div>

      {/* Tiers Table */}
      <h3 className={styles.subheading}>Current Loyalty Tiers</h3>
      {tiers.length === 0 ? (
        <p className={styles.empty}>No loyalty tiers configured yet.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tier Name</th>
                <th>Required Points</th>
                <th>Discount (%)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map(tier => (
                <tr key={tier.loyalty_tier_id}>
                  <td className={styles.strong}>{tier.name}</td>
                  <td>{tier.required_points} points</td>
                  <td>{tier.discount_percent}%</td>
                  <td>
                    <button type="button" className={styles.smallButton} onClick={() => handleEdit(tier)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
