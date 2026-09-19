/**
 * inventory.ts
 * Shared types, helpers and data-access functions for SmartStock.
 * Everything that talks to the database lives here so pages stay simple.
 */
import { supabase } from "@/integrations/supabase/client";

export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  quantity: number;
  supplier: string;
  created_at: string;
};

export type Sale = {
  id: string;
  product_id: string;
  quantity: number;
  selling_price: number;
  total_amount: number;
  customer_name: string;
  created_at: string;
  products?: { name: string; sku: string } | null;
};

export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";

/** Business rule: >10 = In Stock, 1-10 = Low Stock, 0 = Out of Stock. */
export function getStockStatus(quantity: number): StockStatus {
  if (quantity <= 0) return "Out of Stock";
  if (quantity <= 10) return "Low Stock";
  return "In Stock";
}

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function formatNaira(value: number): string {
  return nairaFormatter.format(value || 0);
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ---------------- Products ---------------- */

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
}

export type ProductInput = Omit<Product, "id" | "created_at">;

export async function createProduct(input: ProductInput) {
  const { error } = await supabase.from("products").insert(input);
  if (error) throw new Error(error.message);
}

export async function updateProduct(id: string, input: ProductInput) {
  const { error } = await supabase.from("products").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------------- Sales ---------------- */

export async function fetchSales(): Promise<Sale[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("*, products(name, sku)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Sale[];
}

export type SaleInput = {
  product_id: string;
  quantity: number;
  selling_price: number;
  customer_name: string;
};

/**
 * Records a sale. The database trigger checks stock, blocks overselling,
 * reduces the product quantity and calculates the total amount.
 */
export async function createSale(input: SaleInput) {
  const { error } = await supabase.from("sales").insert(input);
  if (error) throw new Error(error.message);
}

export async function deleteSale(id: string) {
  const { error } = await supabase.from("sales").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
