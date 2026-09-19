// // import type { NavSection } from '../../types/navigation.ts'
// // import PurchasesPage from './PurchasesPage.tsx'


// // // Owned by Module 3. When a page is built, import it and add `page: YourPage` to its entry.
// // // See docs/frontend-guide.md
// // export const purchasingSection: NavSection = {
// //   label: 'Purchasing',
// //   icon: 'purchasing',
// //   owner: 'Module 3 – Suppliers & Purchasing',
// //   // items: [
// //   //   { label: 'Purchases', path: '/purchases', permission: 'purchases.manage' },
// //   //   { label: 'Suppliers', path: '/suppliers', permission: 'suppliers.manage' },
// //   //   { label: 'Supplier Payments', path: '/purchases/payments', permission: 'purchases.manage' },
// //   // ],
// //   items: [
// //   {
// //     label: 'Purchases',
// //     path: '/purchases',
// //     permission: 'purchases.manage',
// //     page: PurchasesPage,
// //   },
// //   { label: 'Suppliers', path: '/suppliers', permission: 'suppliers.manage' },
// //   {
// //     label: 'Supplier Payments',
// //     path: '/purchases/payments',
// //     permission: 'purchases.manage',
// //   },
// // ],
// // }


// import type { NavSection } from '../../types/navigation.ts'
// import PurchasesPage from './PurchasesPage.tsx'
// import SupplierPaymentsPage from './SupplierPaymentsPage.tsx'
// import SuppliersPage from './SuppliersPage.tsx'

// // Owned by Module 3. When a page is built, import it and add `page: YourPage` to its entry.
// // See docs/frontend-guide.md
// export const purchasingSection: NavSection = {
//   label: 'Purchasing',
//   icon: 'purchasing',
//   owner: 'Module 3 – Suppliers & Purchasing',
//   items: [
//     {
//       label: 'Purchases',
//       path: '/purchases',
//       permission: 'purchases.manage',
//       page: PurchasesPage,
//     },
//     {
//       label: 'Suppliers',
//       path: '/suppliers',
//       permission: 'suppliers.manage',
//       page: SuppliersPage,
//     },
//     {
//       label: 'Supplier Payments',
//       path: '/purchases/payments',
//       permission: 'purchases.manage',
//       page: SupplierPaymentsPage,
//     },
//   ],
// }





import type { NavSection } from "../../types/navigation.ts";
import PurchasingPage from "./PurchasesPage.tsx";

// Module 3 – Suppliers & Purchasing
// Purchasing is one page.
// Suppliers and Purchases are tabs inside the page.
// Supplier payment is handled from the supplier row action.
export const purchasingSection: NavSection = {
  label: "Purchasing",
  icon: "purchasing",
  owner: "Module 3 – Suppliers & Purchasing",
  items: [
    {
      label: "Purchasing",
      path: "/purchases",
      permission: "purchases.manage",
      page: PurchasingPage,
    },
  ],
};