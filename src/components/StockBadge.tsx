import { getStockStatus } from "@/lib/inventory";

/** Small coloured pill showing In Stock / Low Stock / Out of Stock. */
export function StockBadge({ quantity }: { quantity: number }) {
  const status = getStockStatus(quantity);
  const styles: Record<string, string> = {
    "In Stock": "bg-success/12 text-success border-success/25",
    "Low Stock": "bg-warning/15 text-warning-foreground border-warning/40",
    "Out of Stock": "bg-destructive/12 text-destructive border-destructive/25",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${styles[status]}`}
    >
      {status}
    </span>
  );
}
