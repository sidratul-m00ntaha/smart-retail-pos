// import type { Supplier, SupplierStatus } from "../../../types/purchasing";

// interface Props {
//   suppliers: Supplier[];
//   search: string;
//   status: SupplierStatus | "All";
//   onSearchChange: (v: string) => void;
//   onStatusChange: (v: SupplierStatus | "All") => void;
//   onAdd: () => void;
//   onEdit: (s: Supplier) => void;
//   onPay: (s: Supplier) => void;
// }

// function initials(name: string) {
//   return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
// }

// export default function SuppliersTab({ suppliers, search, status, onSearchChange, onStatusChange, onAdd, onEdit, onPay }: Props) {
//   const rows = suppliers.filter((s) => {
//     const matchSearch = !search || s.Name.toLowerCase().includes(search.toLowerCase());
//     const matchStatus = status === "All" || s.Status === status;
//     return matchSearch && matchStatus;
//   });

//   return (
//     <div>
//       <div className="toolbar">
//         <div className="search-field">
//           <span className="field-icon">🔍</span>
//           <input placeholder="Search suppliers" value={search} onChange={(e) => onSearchChange(e.target.value)} />
//         </div>
//         <div className="status-tabs">
//           {(["All", "Active", "Inactive"] as const).map((s) => (
//             <button key={s} className={`status-tab ${status === s ? "active" : ""}`} onClick={() => onStatusChange(s)}>
//               {s}
//             </button>
//           ))}
//         </div>
//         <div className="spacer" />
//         <button className="btn-primary" onClick={onAdd}>+ Add supplier</button>
//       </div>

//       <div className="table-card">
//         <table>
//           <thead>
//             <tr>
//               <th>Supplier</th><th>Total purchases</th><th>Total paid</th><th>Outstanding due</th><th>Status</th><th></th>
//             </tr>
//           </thead>
//           <tbody>
//             {rows.length === 0 && (
//               <tr className="empty-row"><td colSpan={6}>No suppliers match these filters.</td></tr>
//             )}
//             {rows.map((s) => {
//               const paidAmt = s.TotalPurchases - s.Due;
//               const dueClass = s.Due === 0 ? "zero" : s.Due >= s.TotalPurchases * 0.3 ? "high" : "";
//               return (
//                 <tr key={s.SupplierID} onClick={() => onEdit(s)} style={{ cursor: "pointer" }}>
//                   <td>
//                     <div className="s-cell">
//                       <div className="s-avatar">{initials(s.Name)}</div>
//                       <div><p className="s-name">{s.Name}</p><p className="s-sub">{s.Phone}</p></div>
//                     </div>
//                   </td>
//                   <td className="mono">Tk {s.TotalPurchases.toLocaleString()}</td>
//                   <td className="mono">Tk {paidAmt.toLocaleString()}</td>
//                   <td className={`mono due-cell ${dueClass}`}>Tk {s.Due.toLocaleString()}</td>
//                   <td><span className={`pill ${s.Status}`}>{s.Status}</span></td>
//                   <td onClick={(e) => e.stopPropagation()}>
//                     <div className="row-actions">
//                       <button className="icon-btn-sm" aria-label="Edit" onClick={() => onEdit(s)}>✎</button>
//                       <button className="icon-btn-sm" aria-label="Pay supplier" disabled={s.Due === 0} onClick={() => onPay(s)}>Tk</button>
//                     </div>
//                   </td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }






import type {
  Supplier,
  SupplierStatus,
} from "../../../types/purchasing";

interface Props {
  suppliers: Supplier[];
  search: string;
  status: SupplierStatus | "All";
  onSearchChange: (v: string) => void;
  onStatusChange: (v: SupplierStatus | "All") => void;
  onAdd: () => void;
  onEdit: (s: Supplier) => void;
  onPay: (s: Supplier) => void;
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function SuppliersTab({
  suppliers,
  search,
  status,
  onSearchChange,
  onStatusChange,
  onAdd,
  onEdit,
  onPay,
}: Props) {
  const rows = suppliers.filter((s) => {
    const matchSearch =
      !search ||
      s.Name.toLowerCase().includes(
        search.toLowerCase()
      );

    const matchStatus =
      status === "All" || s.Status === status;

    return matchSearch && matchStatus;
  });

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
            placeholder="Search suppliers"
            value={search}
            onChange={(e) =>
              onSearchChange(e.target.value)
            }
          />
        </div>

        <div className="status-tabs">
          {(
            ["All", "Active", "Inactive"] as const
          ).map((s) => (
            <button
              key={s}
              type="button"
              className={`status-tab ${
                status === s ? "active" : ""
              }`}
              onClick={() =>
                onStatusChange(s)
              }
            >
              {s}
            </button>
          ))}
        </div>

        <div className="spacer" />

        <button
          type="button"
          className="btn-primary"
          onClick={onAdd}
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

          Add supplier
        </button>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Total purchases</th>
              <th>Total paid</th>
              <th>Outstanding due</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr className="empty-row">
                <td colSpan={6}>
                  No suppliers match these filters.
                </td>
              </tr>
            )}

            {rows.map((s) => {
              const paidAmt =
                s.TotalPurchases - s.Due;

              const dueClass =
                s.Due === 0
                  ? "zero"
                  : s.Due >=
                      s.TotalPurchases * 0.3
                    ? "high"
                    : "";

              return (
                <tr
                  key={s.SupplierID}
                  onClick={() => onEdit(s)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <div className="s-cell">
                      <div className="s-avatar">
                        {initials(s.Name)}
                      </div>

                      <div>
                        <p className="s-name">
                          {s.Name}
                        </p>

                        <p className="s-sub">
                          {s.Phone}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="mono">
                    Tk{" "}
                    {s.TotalPurchases.toLocaleString()}
                  </td>

                  <td className="mono">
                    Tk{" "}
                    {paidAmt.toLocaleString()}
                  </td>

                  <td
                    className={`mono due-cell ${dueClass}`}
                  >
                    Tk {s.Due.toLocaleString()}
                  </td>

                  <td>
                    <span
                      className={`pill ${s.Status}`}
                    >
                      {s.Status}
                    </span>
                  </td>

                  <td
                    onClick={(e) =>
                      e.stopPropagation()
                    }
                  >
                    <div className="row-actions">

                      <button
                        type="button"
                        className="icon-btn-sm"
                        aria-label="Edit supplier"
                        onClick={() =>
                          onEdit(s)
                        }
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        className="icon-btn-sm"
                        aria-label="Pay supplier"
                        disabled={s.Due === 0}
                        onClick={() =>
                          onPay(s)
                        }
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <rect
                            x="3"
                            y="6"
                            width="18"
                            height="12"
                            rx="2"
                          />
                          <path d="M3 10h18" />
                          <path d="M7 15h4" />
                        </svg>
                      </button>

                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}