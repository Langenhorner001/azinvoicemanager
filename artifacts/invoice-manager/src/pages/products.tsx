import { useState } from "react";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import {
  useListProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

interface ProductForm {
  name: string;
  defaultPrice: string;
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading } = useListProducts();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>({ name: "", defaultPrice: "0" });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const createMutation = useCreateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setDialogOpen(false);
        setForm({ name: "", defaultPrice: "0" });
      },
    },
  });

  const updateMutation = useUpdateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setDialogOpen(false);
        setEditId(null);
        setForm({ name: "", defaultPrice: "0" });
      },
    },
  });

  const deleteMutation = useDeleteProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setDeleteId(null);
      },
    },
  });

  function openCreate() {
    setEditId(null);
    setForm({ name: "", defaultPrice: "0" });
    setDialogOpen(true);
  }

  function openEdit(id: number, name: string, defaultPrice: number) {
    setEditId(id);
    setForm({ name, defaultPrice: String(defaultPrice) });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) return;
    const payload = { name: form.name, defaultPrice: parseFloat(form.defaultPrice) || 0 };
    if (editId !== null) {
      updateMutation.mutate({ id: editId, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Products</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? "Loading..." : `${products.length} product${products.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2" data-testid="button-add-product">
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>

        {/* List */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="w-10 h-10 text-muted-foreground mb-3 opacity-40" />
              <p className="text-sm font-medium text-muted-foreground">No products yet</p>
              <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={openCreate}>
                <Plus className="w-3.5 h-3.5" />
                Add your first product
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_120px_80px] gap-4 px-4 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <div>Product Name</div>
                <div className="text-right">Default Price</div>
                <div></div>
              </div>
              {products.map((product) => (
                <div
                  key={product.id}
                  className="grid grid-cols-[1fr_120px_80px] gap-4 items-center px-4 py-3 hover:bg-muted/30 transition-colors group"
                  data-testid={`row-product-${product.id}`}
                >
                  <div className="text-sm font-medium text-foreground">{product.name}</div>
                  <div className="text-sm text-muted-foreground text-right">
                    Rs. {Number(product.defaultPrice).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(product.id, product.name, Number(product.defaultPrice))}
                      data-testid={`button-edit-product-${product.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(product.id)}
                      data-testid={`button-delete-product-${product.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="product-name">Product Name</Label>
              <Input
                id="product-name"
                placeholder="Product name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                data-testid="input-product-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-price">Default Price (Rs.)</Label>
              <Input
                id="product-price"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={form.defaultPrice}
                onChange={(e) => setForm((f) => ({ ...f, defaultPrice: e.target.value }))}
                data-testid="input-product-price"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-product">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !form.name.trim()} data-testid="button-save-product">
              {isPending ? "Saving..." : editId ? "Update" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this product. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-product">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => { if (deleteId) deleteMutation.mutate({ id: deleteId }); }}
              data-testid="button-confirm-delete-product"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
