import { useEffect, useMemo, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import styles from './ReportsPage.module.css'
import { ApiError } from '../../services/api'
import {
  getSalesReport, getPurchaseReport, getInventoryReport, getExpiryReport, getCustomerReport,
} from '../../services/report.service'
import type {
  SalesReport, PurchaseReport, InventoryReport, ExpiryRow, CustomerReport,
} from '../../services/report.service'

const TEAL = '#1F5D4E'
const AMBER = '#E2A63B'
const GRAY = '#C7CCC4'

type Tab = 'sales' | 'purchases' | 'inventory' | 'expiry' | 'customers'
type SalesRange = 'today' | 'yesterday' | 'week' | 'month' | 'custom'

function ExportCsv({ label }: { label: string }) {
  return (
    <button className={styles.btnExport} onClick={() => window.print()}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 19h16" /></svg>
      {label}
    </button>
  )
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('sales')

  return (
    <section>
      <div className={styles.pageTabs}>
        {(['sales', 'purchases', 'inventory', 'expiry', 'customers'] as Tab[]).map((t) => (
          <button key={t} className={`${styles.pageTab} ${tab === t ? styles.active : ''}`} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === 'sales' && <SalesPanel />}
      {tab === 'purchases' && <PurchasesPanel />}
      {tab === 'inventory' && <InventoryPanel />}
      {tab === 'expiry' && <ExpiryPanel />}
      {tab === 'customers' && <CustomersPanel />}
    </section>
  )
}

// ---------------- Sales ----------------
function SalesPanel() {
  const [range, setRange] = useState<SalesRange>('today')
  const [data, setData] = useState<SalesReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    getSalesReport(range).then(setData).catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load the sales report.'))
  }, [range])

  useEffect(() => {
    if (!data || !canvasRef.current) return
    if (chartRef.current) {
      chartRef.current.data.labels = data.chart.labels
      chartRef.current.data.datasets[0].data = data.chart.data
      chartRef.current.update()
      return
    }
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: { labels: data.chart.labels, datasets: [{ data: data.chart.data, borderColor: TEAL, backgroundColor: 'rgba(31,93,78,0.08)', fill: true, tension: 0.35, pointRadius: 3, pointBackgroundColor: TEAL }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#EDEFE9' }, ticks: { callback: (v) => `Tk ${v}k` } }, x: { grid: { display: false } } } },
    })
    return () => { chartRef.current?.destroy(); chartRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  if (error) return <p>{error}</p>
  if (!data) return <p>Loading…</p>

  const totalPayments = data.payment_methods.reduce((s, p) => s + p.value, 0)
  const colors = [TEAL, AMBER, GRAY]

  return (
    <div>
      <div className={styles.toolbar}>
        <div className={styles.rangeTabs}>
          {(['today', 'yesterday', 'week', 'month', 'custom'] as SalesRange[]).map((r) => (
            <button key={r} className={`${styles.rangeTab} ${range === r ? styles.active : ''}`} onClick={() => setRange(r)}>
              {r[0].toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
        <div className={styles.spacer} />
        <ExportCsv label="Export CSV" />
      </div>

      <div className={styles.metrics}>
        <div className={styles.metricCard}><p className={styles.mLabel}>Total sales</p><p className={styles.mValue}>Tk {data.total_sales.toLocaleString()}</p><p className={styles.mSub}>{data.transactions} transactions</p></div>
        <div className={styles.metricCard}><p className={styles.mLabel}>Transactions</p><p className={styles.mValue}>{data.transactions}</p><p className={styles.mSub}>{data.items_sold} items sold</p></div>
        <div className={styles.metricCard}><p className={styles.mLabel}>Avg transaction value</p><p className={styles.mValue}>Tk {data.avg_transaction_value}</p><p className={styles.mSub}>per sale</p></div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <h3>Sales over time</h3>
          <div className={styles.chartWrap}><canvas ref={canvasRef} /></div>
        </div>
        <div className={styles.card}>
          <h3>Payment methods</h3>
          {data.payment_methods.map((p, i) => (
            <div className={styles.pmRow} key={p.label}>
              <span className={styles.pmLabel}>{p.label}</span>
              <div className={styles.pmTrack}><div className={styles.pmFill} style={{ width: `${Math.round((p.value / totalPayments) * 100)}%`, background: colors[i % colors.length] }} /></div>
              <span className={styles.pmValue}>Tk {p.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <h3>Top products</h3>
        <div className={styles.tableCard}>
          <table>
            <thead><tr><th>#</th><th>Product</th><th>Units sold</th><th>Revenue</th></tr></thead>
            <tbody>
              {data.top_products.map((p, i) => (
                <tr key={p.name}>
                  <td className={styles.rank}>{i + 1}</td>
                  <td>{p.name}</td>
                  <td className={styles.mono}>{p.units_sold}</td>
                  <td className={styles.mono}>Tk {(p.units_sold * p.price).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ---------------- Purchases ----------------
function PurchasesPanel() {
  const [data, setData] = useState<PurchaseReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPurchaseReport().then(setData).catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load the purchase report.'))
  }, [])

  if (error) return <p>{error}</p>
  if (!data) return <p>Loading…</p>

  return (
    <div>
      <div className={styles.toolbar}>
        <p className={styles.hint}>Purchasing activity across all suppliers.</p>
        <div className={styles.spacer} />
        <ExportCsv label="Export CSV" />
      </div>
      <div className={styles.metrics}>
        <div className={styles.metricCard}><p className={styles.mLabel}>Total purchases</p><p className={styles.mValue}>Tk {data.total_purchases.toLocaleString()}</p></div>
        <div className={styles.metricCard}><p className={styles.mLabel}>Supplier outstanding</p><p className={styles.mValue}>Tk {data.supplier_outstanding.toLocaleString()}</p></div>
        <div className={styles.metricCard}><p className={styles.mLabel}>Suppliers</p><p className={styles.mValue}>{data.purchases_by_supplier.length}</p></div>
      </div>
      <div className={styles.card}>
        <h3>Purchases by supplier</h3>
        <div className={styles.tableCard}>
          <table>
            <thead><tr><th>Supplier</th><th>Total purchases</th></tr></thead>
            <tbody>
              {data.purchases_by_supplier.map((s) => (
                <tr key={s.label}><td>{s.label}</td><td className={styles.mono}>Tk {s.value.toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className={styles.hint} style={{ marginTop: 12 }}>
        Full purchase history (per-purchase paid/due/status) becomes available once Module 3 (Suppliers &amp; Purchasing) has real data.
      </p>
    </div>
  )
}

// ---------------- Inventory ----------------
function InventoryPanel() {
  const [data, setData] = useState<InventoryReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getInventoryReport().then(setData).catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load the inventory report.'))
  }, [])

  if (error) return <p>{error}</p>
  if (!data) return <p>Loading…</p>

  return (
    <div>
      <div className={styles.toolbar}>
        <p className={styles.hint}>Stock position and recent movement.</p>
        <div className={styles.spacer} />
        <ExportCsv label="Export CSV" />
      </div>
      <div className={`${styles.metrics} ${styles.four}`}>
        <div className={styles.metricCard}><p className={styles.mLabel}>Total products</p><p className={styles.mValue}>{data.total_products}</p></div>
        <div className={styles.metricCard}><p className={styles.mLabel}>Low stock</p><p className={styles.mValue}>{data.low_stock}</p></div>
        <div className={styles.metricCard}><p className={styles.mLabel}>Out of stock</p><p className={styles.mValue}>{data.out_of_stock}</p></div>
        <div className={styles.metricCard}><p className={styles.mLabel}>Stock value</p><p className={styles.mValue}>Tk {data.total_stock_value.toLocaleString()}</p></div>
      </div>
      <div className={styles.card}>
        <h3>Current stock</h3>
        <div className={styles.tableCard}>
          <table>
            <thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Reorder level</th><th>Status</th></tr></thead>
            <tbody>
              {data.current_stock.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td><td>{row.category}</td>
                  <td className={styles.mono}>{row.stock}</td><td className={styles.mono}>{row.reorder_level}</td>
                  <td><span className={`${styles.statusPill} ${styles[row.status === 'OK' ? 'OK' : row.status === 'Low' ? 'Low' : 'Out']}`}>{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className={`${styles.card} ${styles.sectionGap}`}>
        <h3>Recent stock movements</h3>
        <div className={styles.tableCard}>
          <table>
            <thead><tr><th>Date</th><th>Product</th><th>Type</th><th>Qty in</th><th>Qty out</th><th>Balance</th><th>Reference</th></tr></thead>
            <tbody>
              {data.recent_movements.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-soft)', padding: '24px 16px' }}>
                  Stock movement history becomes available once Module 4 (Inventory) has real data.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ---------------- Expiry ----------------
function ExpiryPanel() {
  const [rows, setRows] = useState<ExpiryRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [level, setLevel] = useState<'All' | ExpiryRow['level']>('All')

  useEffect(() => {
    getExpiryReport().then(setRows).catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load expiry data.'))
  }, [])

  const filtered = useMemo(() => (level === 'All' ? rows : rows.filter((r) => r.level === level)), [rows, level])

  if (error) return <p>{error}</p>

  const tagLabel: Record<ExpiryRow['level'], string> = { Expired: 'Expired', Within7: 'Within 7 days', Within30: 'Within 30 days' }

  return (
    <div>
      <div className={styles.alertFilterChips}>
        {(['All', 'Expired', 'Within7', 'Within30'] as const).map((l) => (
          <button key={l} className={`${styles.afChip} ${level === l ? styles.active : ''}`} onClick={() => setLevel(l)}>
            {l === 'All' ? 'All' : tagLabel[l]}
          </button>
        ))}
      </div>
      <div className={styles.expiryGrid}>
        {filtered.length === 0 && <p className={styles.hint}>Nothing at this alert level.</p>}
        {filtered.map((row, i) => (
          <div className={`${styles.expiryCard} ${styles[row.level]}`} key={i}>
            <div className={styles.ecTop}>
              <div>
                <p className={styles.ecName}>{row.product_name}</p>
                <p className={styles.ecBatch}>{row.batch ?? '—'}</p>
              </div>
              <span className={`${styles.ecTag} ${styles[row.level]}`}>{tagLabel[row.level]}</span>
            </div>
            <div className={styles.ecMeta}><span>{row.quantity} units</span><span>{row.expiry_date}</span></div>
          </div>
        ))}
      </div>
      <p className={styles.hint} style={{ marginTop: 12 }}>Batch/expiry data becomes real once Module 4 (Inventory &amp; Expiry) has real data.</p>
    </div>
  )
}

// ---------------- Customers ----------------
function CustomersPanel() {
  const [data, setData] = useState<CustomerReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    getCustomerReport().then(setData).catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load customer data.'))
  }, [])

  useEffect(() => {
    if (!data || !canvasRef.current) return
    const chart = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: { labels: data.loyalty_distribution.map((l) => l.label), datasets: [{ data: data.loyalty_distribution.map((l) => l.value), backgroundColor: [GRAY, AMBER, TEAL], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 14 } } } },
    })
    return () => chart.destroy()
  }, [data])

  if (error) return <p>{error}</p>
  if (!data) return <p>Loading…</p>

  return (
    <div>
      <div className={styles.toolbar}>
        <p className={styles.hint}>Spending, dues, and loyalty standing.</p>
        <div className={styles.spacer} />
        <ExportCsv label="Export CSV" />
      </div>
      <div className={styles.metrics}>
        <div className={styles.metricCard}><p className={styles.mLabel}>Customer due</p><p className={styles.mValue}>Tk {data.customer_due_total.toLocaleString()}</p></div>
        <div className={styles.metricCard}><p className={styles.mLabel}>Top customers tracked</p><p className={styles.mValue}>{data.top_customers.length}</p></div>
        <div className={styles.metricCard}><p className={styles.mLabel}>Loyalty tiers</p><p className={styles.mValue}>{data.loyalty_distribution.length}</p></div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <h3>Top customers by spend</h3>
          <div className={styles.tableCard}>
            <table>
              <thead><tr><th>#</th><th>Customer</th><th>Tier</th><th>Total spent</th></tr></thead>
              <tbody>
                {data.top_customers.map((c) => (
                  <tr key={c.name}>
                    <td className={styles.rank}>{c.rank}</td><td>{c.name}</td>
                    <td><span className={`${styles.tierPill} ${styles[c.tier as 'Regular' | 'Silver' | 'Gold']}`}>{c.tier}</span></td>
                    <td className={styles.mono}>Tk {c.total_spent.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className={styles.card}>
          <h3>Loyalty tier distribution</h3>
          <div className={`${styles.chartWrap} ${styles.small}`}><canvas ref={canvasRef} /></div>
        </div>
      </div>

      <div className={styles.card}>
        <h3>Outstanding customer due</h3>
        <div className={styles.tableCard}>
          <table>
            <thead><tr><th>Customer</th><th>Credit limit</th><th>Outstanding due</th></tr></thead>
            <tbody>
              {data.customer_due_rows.map((r) => (
                <tr key={r.name}><td>{r.name}</td><td className={styles.mono}>Tk {r.credit_limit.toLocaleString()}</td><td className={styles.mono}>Tk {r.outstanding_due.toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
