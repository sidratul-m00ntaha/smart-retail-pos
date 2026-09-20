// import type { Purchase } from "../../../types/purchasing";

// interface Props {
//   purchases: Purchase[];
//   search: string;
//   onSearchChange: (v: string) => void;
//   onNewPurchase: () => void;
// }

// export default function PurchasesTab({ purchases, search, onSearchChange, onNewPurchase }: Props) {
//   const rows = purchases.filter(
//     (p) =>
//       !search ||
//       p.PurchaseNo.toLowerCase().includes(search.toLowerCase()) ||
//       (p.SupplierName ?? "").toLowerCase().includes(search.toLowerCase())
//   );

//   return (
//     <div>
//       <div className="toolbar">
//         <div className="search-field">
//           <span className="field-icon">🔍</span>
//           <input placeholder="Search purchase no. or supplier" value={search} onChange={(e) => onSearchChange(e.target.value)} />
//         </div>
//         <div className="spacer" />
//         <button className="btn-primary" onClick={onNewPurchase}>+ New purchase</button>
//       </div>

//       <div className="table-card">
//         <table>
//           <thead>
//             <tr>
//               <th>Purchase no.</th><th>Supplier</th><th>Date</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th>
//             </tr>
//           </thead>
//           <tbody>
//             {rows.length === 0 && (
//               <tr className="empty-row"><td colSpan={7}>No purchases match this search.</td></tr>
//             )}
//             {rows.map((p) => (
//               <tr key={p.PurchaseID}>
//                 <td className="mono">{p.PurchaseNo}</td>
//                 <td>{p.SupplierName}</td>
//                 <td className="mono">{new Date(p.PurchaseDate).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" })}</td>
//                 <td className="mono">Tk {p.Total.toLocaleString()}</td>
//                 <td className="mono">Tk {p.Paid.toLocaleString()}</td>
//                 <td className="mono">Tk {p.Due.toLocaleString()}</td>
//                 <td><span className={`pill ${p.Status}`}>{p.Status}</span></td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }



import type { Purchase } from "../../../types/purchasing";

interface Props {
  purchases: Purchase[];
  search: string;
  onSearchChange: (v: string) => void;
  onNewPurchase: () => void;
}

export default function PurchasesTab({
  purchases,
  search,
  onSearchChange,
  onNewPurchase,
}: Props) {
  const rows = purchases.filter(
    (p) =>
      !search ||
      p.PurchaseNo.toLowerCase().includes(
        search.toLowerCase()
      ) ||
      (p.SupplierName ?? "")
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="toolbar">

        <div className="search-field">
          <span
            className="field-icon"
            aria-hidden="true"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>

          <input
            placeholder="Search purchase no. or supplier"
            value={search}
            onChange={(e) =>
              onSearchChange(e.target.value)
            }
          />
        </div>

        <div className="spacer" />

        <button
          type="button"
          className="btn-primary"
          onClick={onNewPurchase}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>

          New purchase
        </button>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Purchase no.</th>
              <th>Supplier</th>
              <th>Date</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Due</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr className="empty-row">
                <td colSpan={7}>
                  No purchases match this search.
                </td>
              </tr>
            )}

            {rows.map((p) => (
              <tr key={p.PurchaseID}>
                <td className="mono">
                  {p.PurchaseNo}
                </td>

                <td>
                  {p.SupplierName}
                </td>

                <td className="mono">
                  {new Date(
                    p.PurchaseDate
                  ).toLocaleDateString(
                    undefined,
                    {
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                    }
                  )}
                </td>

                <td className="mono">
                  Tk {p.Total.toLocaleString()}
                </td>

                <td className="mono">
                  Tk {p.Paid.toLocaleString()}
                </td>

                <td className="mono">
                  Tk {p.Due.toLocaleString()}
                </td>

                <td>
                  <span
                    className={`pill ${p.Status}`}
                  >
                    {p.Status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}