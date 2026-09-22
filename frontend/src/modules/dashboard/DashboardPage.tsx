import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import styles from './DashboardPage.module.css'
import { ApiError } from '../../services/api'
import { getDashboardData } from '../../services/dashboard.service'
import type { DashboardData } from '../../services/dashboard.service'

const TEAL = '#1F5D4E'
const AMBER = '#E2A63B'
const GRAY = '#C7CCC4'

type Range = 'week' | 'month' | 'quarter'

/**
 * Labels for a bucketed series. "week" is always 7 days and "quarter" is
 * always 3 months, but "month" splits into 4 or 5 seven-day slices depending
 * on the calendar (see dashboard_service.py's _month_buckets) - so month
 * labels are generated from however many values actually came back, not a
 * fixed-length array.
 */
function labelsFor(range: Range, values: number[]): string[] {
  if (range === 'week') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  if (range === 'quarter') return ['2 months ago', 'Last month', 'This month']
  return values.map((_, i) => `W${i + 1}`)
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<Range>('month')

  const salesCanvas = useRef<HTMLCanvasElement>(null)
  const paymentCanvas = useRef<HTMLCanvasElement>(null)
  const pvsCanvas = useRef<HTMLCanvasElement>(null)
  const loyaltyCanvas = useRef<HTMLCanvasElement>(null)
  const salesChart = useRef<Chart | null>(null)

  function load() {
    // setIsLoading(true)
    getDashboardData()
      .then((d) => { setData(d); setError(null) })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load the dashboard.'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    load()
    // Real numbers only change when a sale/purchase/etc. actually happens
    // elsewhere in the app, so a light poll keeps this screen current for
    // someone who leaves it open, without needing a push/event system.
    const interval = window.setInterval(load, 60_000)
    return () => window.clearInterval(interval)
  }, [])

  // Sales-over-time line chart, updates in place when the range tab changes.
  useEffect(() => {
    if (!data || !salesCanvas.current) return
    const values = data.sales_over_time[range]
    const labels = labelsFor(range, values)
    if (salesChart.current) {
      salesChart.current.data.labels = labels
      salesChart.current.data.datasets[0].data = values
      salesChart.current.update()
      return
    }
    salesChart.current = new Chart(salesCanvas.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{ data: values, borderColor: TEAL, backgroundColor: 'rgba(31,93,78,0.08)', fill: true, tension: 0.35, pointRadius: 3, pointBackgroundColor: TEAL }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { grid: { color: '#EDEFE9' }, ticks: { callback: (v) => `Tk ${v}k` } }, x: { grid: { display: false } } },
      },
    })
    return () => { salesChart.current?.destroy(); salesChart.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  useEffect(() => {
    if (!salesChart.current || !data) return
    const values = data.sales_over_time[range]
    salesChart.current.data.labels = labelsFor(range, values)
    salesChart.current.data.datasets[0].data = values
    salesChart.current.update()
  }, [range, data])

  useEffect(() => {
    if (!data || !paymentCanvas.current) return
    const chart = new Chart(paymentCanvas.current, {
      type: 'doughnut',
      data: {
        labels: data.sales_by_payment_method.map((m) => m.label),
        datasets: [{ data: data.sales_by_payment_method.map((m) => m.value), backgroundColor: [TEAL, AMBER, GRAY], borderWidth: 0 }],
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 14 } } } },
    })
    return () => chart.destroy()
  }, [data])

  useEffect(() => {
    if (!data || !pvsCanvas.current) return
    const chart = new Chart(pvsCanvas.current, {
      type: 'bar',
      data: {
        labels: data.purchases_vs_sales.labels,
        datasets: [
          { label: 'Purchases', data: data.purchases_vs_sales.purchases, backgroundColor: GRAY, borderRadius: 4 },
          { label: 'Sales', data: data.purchases_vs_sales.sales, backgroundColor: TEAL, borderRadius: 4 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 14 } } },
        scales: { y: { grid: { color: '#EDEFE9' }, ticks: { callback: (v) => `Tk ${v}k` } }, x: { grid: { display: false } } },
      },
    })
    return () => chart.destroy()
  }, [data])

  useEffect(() => {
    if (!data || !loyaltyCanvas.current) return
    const chart = new Chart(loyaltyCanvas.current, {
      type: 'doughnut',
      data: {
        labels: data.loyalty_distribution.map((l) => l.label),
        datasets: [{ data: data.loyalty_distribution.map((l) => l.value), backgroundColor: [GRAY, AMBER, TEAL], borderWidth: 0 }],
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 14 } } } },
    })
    return () => chart.destroy()
  }, [data])

  if (isLoading) return <p>Loading…</p>
  if (error) return <p>{error}</p>
  if (!data) return null

  return (
    <section>
      <div className={styles.alerts}>
        <div className={`${styles.alertChip} ${styles.warn}`}><span className={styles.n}>{data.alerts.low_stock}</span>&nbsp;low stock</div>
        <div className={`${styles.alertChip} ${styles.bad}`}><span className={styles.n}>{data.alerts.out_of_stock}</span>&nbsp;out of stock</div>
        <div className={`${styles.alertChip} ${styles.warn}`}><span className={styles.n}>{data.alerts.expiring_within_30}</span>&nbsp;expiring within 30 days</div>
      </div>

      <div className={styles.metrics}>
        <div className={styles.metricCard}>
          <p className={styles.mLabel}>Today's sales</p>
          <p className={styles.mValue}>Tk {data.metrics.todays_sales.toLocaleString()}</p>
          <p className={styles.mSub}>{data.metrics.transactions} transactions</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.mLabel}>Transactions</p>
          <p className={styles.mValue}>{data.metrics.transactions}</p>
          <p className={styles.mSub}>{data.metrics.items_sold} items sold</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.mLabel}>Items sold</p>
          <p className={styles.mValue}>{data.metrics.items_sold}</p>
          <p className={styles.mSub}>{data.metrics.transactions > 0 ? `avg Tk ${Math.round(data.metrics.todays_sales / data.metrics.transactions)} / sale` : 'no sales yet today'}</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.mLabel}>Customer due</p>
          <p className={styles.mValue}>Tk {data.metrics.customer_due.toLocaleString()}</p>
          <p className={styles.mSub}>outstanding</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.mLabel}>Supplier due</p>
          <p className={styles.mValue}>Tk {data.metrics.supplier_due.toLocaleString()}</p>
          <p className={styles.mSub}>payable</p>
        </div>
      </div>

      <div className={styles.chartsRowA}>
        <div className={styles.card}>
          <div className={styles.sectionHead}>
            <h3>Sales over time</h3>
            <div className={styles.rangeTabs}>
              {(['week', 'month', 'quarter'] as Range[]).map((r) => (
                <button key={r} className={`${styles.rangeTab} ${range === r ? styles.active : ''}`} onClick={() => setRange(r)}>
                  {r === 'week' ? 'This week' : r === 'month' ? 'This month' : 'This quarter'}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.chartWrap}><canvas ref={salesCanvas} /></div>
        </div>
        <div className={styles.card}>
          <div className={styles.sectionHead}><h3>Sales by payment method</h3></div>
          {data.sales_by_payment_method.length === 0 ? (
            <p className={styles.mSub}>No payments recorded this month yet.</p>
          ) : (
            <div className={styles.chartWrap}><canvas ref={paymentCanvas} /></div>
          )}
        </div>
      </div>

      <div className={styles.chartsRowB}>
        <div className={styles.card}>
          <div className={styles.sectionHead}><h3>Top-selling products</h3></div>
          {data.top_products.length === 0 ? (
            <p className={styles.mSub}>No sales recorded this month yet.</p>
          ) : (
            <div className={styles.topProductsList}>
              {data.top_products.map((p, i) => (
                <div className={styles.tpRow} key={p.name}>
                  <span className={styles.tpRank}>{i + 1}</span>
                  <div className={styles.tpBarWrap}>
                    <p className={styles.tpName}><span>{p.name}</span><span>{p.units_sold} units</span></p>
                    <div className={styles.tpBarTrack}><div className={styles.tpBarFill} style={{ width: `${p.percent_of_top}%` }} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={styles.card}>
          <div className={styles.sectionHead}><h3>Purchases vs. sales</h3></div>
          <div className={`${styles.chartWrap} ${styles.small}`}><canvas ref={pvsCanvas} /></div>
        </div>
        <div className={styles.card}>
          <div className={styles.sectionHead}><h3>Loyalty tier distribution</h3></div>
          {data.loyalty_distribution.length === 0 ? (
            <p className={styles.mSub}>No loyalty tiers set up yet.</p>
          ) : (
            <div className={`${styles.chartWrap} ${styles.small}`}><canvas ref={loyaltyCanvas} /></div>
          )}
        </div>
      </div>
    </section>
  )
}
