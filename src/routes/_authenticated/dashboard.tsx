/**
 * dashboard.tsx
 * Statistics cards, a sales chart, the low-stock list and recent sales.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Boxes, Package, Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StockBadge } from "@/components/StockBadge";
import { fetchProducts, fetchSales, formatDate, formatNaira } from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | SmartStock Inventory" },
      {
        name: "description",
        content:
          "Track total products, stock quantity, sales revenue and low-stock alerts in the SmartStock admin dashboard.",
      },
      { property: "og:title", content: "SmartStock Dashboard" },
      {
        property: "og:description",
        content: "Live inventory statistics, sales chart and low-stock alerts.",
      },
    ],
  }),
  component: DashboardPage,
});

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Package;
  tone: string;
}) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 truncate font-display text-2xl font-semibold">{value}</p>
        </div>
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}

function DashboardPage() {
  const products = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const sales = useQuery({ queryKey: ["sales"], queryFn: fetchSales });

  const productList = products.data ?? [];
  const saleList = sales.data ?? [];

  const totalProducts = productList.length;
  const totalStock = productList.reduce((sum, p) => sum + p.quantity, 0);
  const totalSales = saleList.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const lowStock = productList.filter((p) => p.quantity <= 10);

  // Revenue grouped by day for the chart (last 7 days with sales).
  const chartData = Object.values(
    saleList.reduce<Record<string, { day: string; amount: number }>>((acc, sale) => {
      const day = new Date(sale.created_at).toLocaleDateString("en-NG", {
        day: "2-digit",
        month: "short",
      });
      acc[day] = { day, amount: (acc[day]?.amount ?? 0) + Number(sale.total_amount) };
      return acc;
    }, {}),
  ).slice(-7);

  return (
    <AppShell title="Dashboard" subtitle="Overview of your inventory and sales">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Products"
          value={String(totalProducts)}
          icon={Package}
          tone="bg-primary/12 text-primary"
        />
        <StatCard
          label="Total Stock"
          value={totalStock.toLocaleString()}
          icon={Boxes}
          tone="bg-chart-2/15 text-chart-2"
        />
        <StatCard
          label="Total Sales"
          value={formatNaira(totalSales)}
          icon={Wallet}
          tone="bg-success/12 text-success"
        />
        <StatCard
          label="Low Stock"
          value={String(lowStock.length)}
          icon={AlertTriangle}
          tone="bg-warning/20 text-warning-foreground"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="surface-card p-5 lg:col-span-2">
          <h2 className="text-base font-semibold">Sales by day</h2>
          <p className="text-sm text-muted-foreground">Total revenue recorded per day</p>
          <div className="mt-4 h-64">
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    width={70}
                    tickFormatter={(v: number) => formatNaira(v)}
                  />
                  <Tooltip
                    formatter={(v: number) => formatNaira(v)}
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "0.75rem",
                    }}
                  />
                  <Bar dataKey="amount" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="surface-card p-5">
          <h2 className="text-base font-semibold">Low stock alerts</h2>
          <p className="text-sm text-muted-foreground">10 units or fewer</p>
          <ul className="mt-4 space-y-3">
            {lowStock.length === 0 && (
              <li className="text-sm text-muted-foreground">All products are well stocked.</li>
            )}
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.quantity} left</p>
                </div>
                <StockBadge quantity={p.quantity} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="surface-card mt-6 overflow-hidden">
        <div className="p-5 pb-3">
          <h2 className="text-base font-semibold">Recent sales</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Qty</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {saleList.slice(0, 6).map((sale) => (
                <tr key={sale.id} className="border-t border-border">
                  <td className="px-5 py-3 font-medium">{sale.products?.name ?? "—"}</td>
                  <td className="px-5 py-3">{sale.customer_name}</td>
                  <td className="px-5 py-3">{sale.quantity}</td>
                  <td className="px-5 py-3">{formatNaira(Number(sale.total_amount))}</td>
                  <td className="px-5 py-3 text-muted-foreground">{formatDate(sale.created_at)}</td>
                </tr>
              ))}
              {saleList.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-muted-foreground">
                    No sales yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface-card mt-6 overflow-hidden">
        <div className="p-5 pb-3">
          <h2 className="text-base font-semibold">Inventory</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Quantity</th>
                <th className="px-5 py-3">Price</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {productList.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-5 py-3 font-medium">{p.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{p.category}</td>
                  <td className="px-5 py-3">{p.quantity}</td>
                  <td className="px-5 py-3">{formatNaira(Number(p.price))}</td>
                  <td className="px-5 py-3">
                    <StockBadge quantity={p.quantity} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
