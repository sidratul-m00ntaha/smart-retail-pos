// frontend/src/modules/customers/LoyaltyPage.tsx
import { useEffect, useState } from "react";
import { listLoyaltyTiers, createLoyaltyTier, updateLoyaltyTier, type LoyaltyTier } from "../../services/customers";

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
    <div style={{ padding: "20px" }}>
      <h2>Loyalty Program Configuration</h2>

      {/* Form */}
      <div style={{ backgroundColor: "#f9f9f9", padding: "20px", borderRadius: "8px", marginBottom: "30px" }}>
        <h3>{editingTier ? "Edit Tier" : "Add New Tier"}</h3>
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ marginBottom: "5px", fontSize: "14px", fontWeight: "bold" }}>Tier Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g., Silver" 
              required 
              style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc", width: "150px" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ marginBottom: "5px", fontSize: "14px", fontWeight: "bold" }}>Required Points</label>
            <input 
              type="number" 
              min="0"
              value={requiredPoints} 
              onChange={e => setRequiredPoints(e.target.value)} 
              placeholder="e.g., 100" 
              required 
              style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc", width: "120px" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ marginBottom: "5px", fontSize: "14px", fontWeight: "bold" }}>Discount (%)</label>
            <input 
              type="number" 
              step="0.1" 
              min="0" 
              max="100"
              value={discountPercent} 
              onChange={e => setDiscountPercent(e.target.value)} 
              placeholder="e.g., 5" 
              required 
              style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc", width: "120px" }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                padding: "9px 20px", 
                backgroundColor: loading ? "#ccc" : "#007bff", 
                color: "white", 
                border: "none", 
                borderRadius: "4px", 
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: "bold"
              }}
            >
              {loading ? "Saving..." : (editingTier ? "Update Tier" : "Add Tier")}
            </button>
            {editingTier && (
              <button 
                type="button" 
                onClick={handleCancel}
                style={{ 
                  padding: "9px 20px", 
                  backgroundColor: "#6c757d", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "4px", 
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {message && (
          <p style={{ 
            marginTop: "15px", 
            color: message.type === "success" ? "green" : "red", 
            fontWeight: "bold" 
          }}>
            {message.text}
          </p>
        )}
      </div>

      {/* Tiers Table */}
      <h3>Current Loyalty Tiers</h3>
      {tiers.length === 0 ? (
        <p style={{ color: "#666" }}>No loyalty tiers configured yet.</p>
      ) : (
        <table border={1} cellPadding="10" style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
          <thead>
            <tr style={{ backgroundColor: "#f4f4f4" }}>
              <th>Tier Name</th>
              <th>Required Points</th>
              <th>Discount (%)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map(tier => (
              <tr key={tier.loyalty_tier_id}>
                <td style={{ fontWeight: "bold" }}>{tier.name}</td>
                <td>{tier.required_points} points</td>
                <td>{tier.discount_percent}%</td>
                <td>
                  <button 
                    onClick={() => handleEdit(tier)}
                    style={{ 
                      padding: "5px 10px", 
                      backgroundColor: "#ffc107", 
                      color: "black", 
                      border: "none", 
                      borderRadius: "4px", 
                      cursor: "pointer",
                      fontWeight: "bold"
                    }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}