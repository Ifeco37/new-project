/**
 * sales.tsx
 * Record a sale (stock is reduced automatically and overselling is blocked),
 * list all sales, and delete a sale to return the stock.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createSale,
  deleteSale,
  fetchProducts,
  fetchSales,
  formatDate,
  formatNaira,
  type SaleInput,
} from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({
    meta: [
      { title: "Sales | SmartStock Inventory" },
      {
        name: "description",
        content:
          "Record customer sales, calculate totals automatically and keep stock quantities accurate in SmartStock.",
      },
      { property: "og:title", content: "SmartStock Sales" },
      { property: "og:description", content: "Record and review every sale in one place." },
    ],
  }),
  component: SalesPage,
});

const emptyForm: SaleInput = {
  product_id: "",
  quantity: 1,
  selling_price: 0,
  customer_name: "",
};

function SalesPage() {
  const queryClient = useQueryClient();
  const { data: sales = [], isLoading } = useQuery({ queryKey: ["sales"], queryFn: fetchSales });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SaleInput>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const selected = products.find((p) => p.id === form.product_id);

  const saveMutation = useMutation({
    mutationFn: () => createSale(form),
    onSuccess: () => {
      toast.success("Sale recorded and stock updated");
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSale(id),
    onSuccess: () => {
      toast.success("Sale deleted and stock returned");
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDeleteId(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.product_id) next["product_id"] = "Choose a product";
    if (!Number.isInteger(form.quantity) || form.quantity < 1)
      next["quantity"] = "Quantity must be at least 1";
    if (selected && form.quantity > selected.quantity)
      next["quantity"] = `Only ${selected.quantity} unit(s) in stock`;
    if (form.selling_price < 0) next["selling_price"] = "Selling price must be 0 or more";
    if (!form.customer_name.trim()) next["customer_name"] = "Customer name is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);

  return (
    <AppShell title="Sales" subtitle="Record and review sales transactions">
      <div className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Total revenue</p>
          <p className="font-display text-2xl font-semibold">{formatNaira(totalRevenue)}</p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setErrors({});
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> Record sale
        </Button>
      </div>

      <div className="surface-card mt-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Qty</th>
                <th className="px-5 py-3">Unit price</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-5 py-6 text-center text-muted-foreground">
                    Loading sales…
                  </td>
                </tr>
              )}
              {!isLoading && sales.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-6 text-center text-muted-foreground">
                    No sales recorded yet.
                  </td>
                </tr>
              )}
              {sales.map((sale) => (
                <tr key={sale.id} className="border-t border-border">
                  <td className="px-5 py-3 font-medium">{sale.products?.name ?? "—"}</td>
                  <td className="px-5 py-3">{sale.customer_name}</td>
                  <td className="px-5 py-3">{sale.quantity}</td>
                  <td className="px-5 py-3">{formatNaira(Number(sale.selling_price))}</td>
                  <td className="px-5 py-3 font-medium">
                    {formatNaira(Number(sale.total_amount))}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{formatDate(sale.created_at)}</td>
                  <td className="px-5 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete sale"
                      onClick={() => setDeleteId(sale.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record a sale</DialogTitle>
            <DialogDescription>
              Stock is reduced automatically and the total is calculated for you.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (validate()) saveMutation.mutate();
            }}
          >
            <div>
              <Label htmlFor="product">Product</Label>
              <Select
                value={form.product_id}
                onValueChange={(value) => {
                  const product = products.find((p) => p.id === value);
                  setForm({
                    ...form,
                    product_id: value,
                    selling_price: product ? Number(product.price) : form.selling_price,
                  });
                }}
              >
                <SelectTrigger id="product">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products
                    .filter((p) => p.quantity > 0)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.quantity} in stock)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors["product_id"] && (
                <p className="mt-1 text-xs text-destructive">{errors["product_id"]}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="qty">Quantity sold</Label>
                <Input
                  id="qty"
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                />
                {errors["quantity"] && (
                  <p className="mt-1 text-xs text-destructive">{errors["quantity"]}</p>
                )}
              </div>
              <div>
                <Label htmlFor="price">Selling price (₦)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.selling_price}
                  onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })}
                />
                {errors["selling_price"] && (
                  <p className="mt-1 text-xs text-destructive">{errors["selling_price"]}</p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="customer">Customer name</Label>
              <Input
                id="customer"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              />
              {errors["customer_name"] && (
                <p className="mt-1 text-xs text-destructive">{errors["customer_name"]}</p>
              )}
            </div>
            <div className="rounded-lg bg-muted px-4 py-3 text-sm">
              Total amount:{" "}
              <span className="font-semibold">
                {formatNaira(form.quantity * form.selling_price)}
              </span>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : "Record sale"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sale?</AlertDialogTitle>
            <AlertDialogDescription>
              The sold quantity will be added back to the product's stock.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
