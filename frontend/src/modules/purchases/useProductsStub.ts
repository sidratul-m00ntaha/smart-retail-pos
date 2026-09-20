// // STUB for Module 2's product list/lookup. Tries GET /api/products first;
// // if that route doesn't exist yet, falls back to a small hard-coded list so
// // the purchase drawer still works. Once Module 2 ships, this file can be
// // deleted and its two call sites (PurchaseDrawer.tsx) switched to whatever
// // hook Module 2 provides.
// import { useEffect, useState } from "react";
// // import api from "../../services/api";
// import { apiRequest } from "../../services/api";

// import type { ProductLite } from "../../types/purchasing";

// const FALLBACK_PRODUCTS: ProductLite[] = [
//   { ProductID: 1, Name: "Rice 5kg", PurchasePrice: 480 },
//   { ProductID: 2, Name: "Cooking oil 1L", PurchasePrice: 150 },
//   { ProductID: 3, Name: "Milk 1L", PurchasePrice: 65 },
//   { ProductID: 4, Name: "Biscuit pack", PurchasePrice: 45 },
//   { ProductID: 5, Name: "Cola 500ml", PurchasePrice: 35 },
//   { ProductID: 6, Name: "Soap bar", PurchasePrice: 40 },
//   { ProductID: 7, Name: "Toothpaste", PurchasePrice: 95 },
//   { ProductID: 8, Name: "Detergent 1kg", PurchasePrice: 170 },
// ];

// export function useProductsStub() {
//   const [products, setProducts] = useState<ProductLite[]>(FALLBACK_PRODUCTS);

//   useEffect(() => {
//     apiRequest
//       .get<ProductLite[]>("/api/products")
//       .then((r) => {
//         if (r.data?.length) setProducts(r.data);
//       })
//       .catch(() => {
//         // Module 2's endpoint isn't up yet — keep the fallback list.
//       });
//   }, []);

//   return products;
// }

// STUB for Module 2's product list/lookup. Tries GET /api/products first;
// if that route doesn't exist yet, falls back to a small hard-coded list so
// the purchase drawer still works. Once Module 2 ships, this file can be
// deleted and its two call sites (PurchaseDrawer.tsx) switched to whatever
// hook Module 2 provides.
import { useEffect, useState } from "react";
// import api from "../../services/api";
import { apiRequest } from "../../services/api";

import type { ProductLite } from "../../types/purchasing";

const FALLBACK_PRODUCTS: ProductLite[] = [
  { ProductID: 1, Name: "Rice 5kg", PurchasePrice: 480 },
  { ProductID: 2, Name: "Cooking oil 1L", PurchasePrice: 150 },
  { ProductID: 3, Name: "Milk 1L", PurchasePrice: 65 },
  { ProductID: 4, Name: "Biscuit pack", PurchasePrice: 45 },
  { ProductID: 5, Name: "Cola 500ml", PurchasePrice: 35 },
  { ProductID: 6, Name: "Soap bar", PurchasePrice: 40 },
  { ProductID: 7, Name: "Toothpaste", PurchasePrice: 95 },
  { ProductID: 8, Name: "Detergent 1kg", PurchasePrice: 170 },
];

export function useProductsStub() {
  const [products, setProducts] = useState<ProductLite[]>(FALLBACK_PRODUCTS);

  useEffect(() => {
    apiRequest<ProductLite[]>("/api/products")
      .then((data) => {
        if (data?.length) setProducts(data);
      })
      .catch(() => {
        // Module 2's endpoint isn't up yet — keep the fallback list.
      });
  }, []);

  return products;
}
