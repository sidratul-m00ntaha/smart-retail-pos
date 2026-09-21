import SalesList from './SalesList.tsx'

/** Sales (PRD 5.15 and 5.19): every sale with summary figures, filters and pages. */
export default function SalesPage() {
  return <SalesList key="sales" mode="sales" />
}
