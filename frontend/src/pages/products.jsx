import { useState } from 'react';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: api.listProducts,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', defaultPrice: '0' });
  const [deleteId, setDeleteId] = useState(null);

  const createMutation = useMutation({
    mutationFn: (data) => api.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDialogOpen(false);
      setForm({ name: '', defaultPrice: '0' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDialogOpen(false);
      setEditId(null);
      setForm({ name: '', defaultPrice: '0' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteId(null);
    },
  });

  function openCreate() {
    setEditId(null);
    setForm({ name: '', defaultPrice: '0' });
    setDialogOpen(true);
  }

  function openEdit(id, name, defaultPrice) {
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
      createMutation.mutate(payload);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Products</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {isLoading ? 'Loading...' : `${products.length} product${products.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Button className="gap-2" onClick={openCreate} data-testid="button-add-product">
            <Plus size={16} /> Add Product
          </Button>
        </div>

        {/* Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-4 py-3">
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center">
              <Package size={32} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">No products yet</p>
              <Button variant="outline" className="mt-4" onClick={openCreate}>
                Add your first product
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-2.5 bg-muted/40 border-b border-border text-xs font-medium text-muted-foreground gap-4">
                <span>Product Name</span>
                <span>Default Price</span>
                <span></span>
              </div>
              <div className="divide-y divide-border">
                {products.map((product) => (
                  <div key={product.id} className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-3 hover:bg-muted/30 group transition-colors gap-4">
                    <span className="text-sm font-medium">{product.name}</span>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      Rs. {Number(product.defaultPrice).toLocaleString()}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => openEdit(product.id, product.name, Number(product.defaultPrice))}
                        data-testid={`button-edit-product-${product.id}`}
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(product.id)}
                        data-testid={`button-delete-product-${product.id}`}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="product-name">Product Name</Label>
              <Input
                id="product-name"
                placeholder="Product name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                data-testid="input-product-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-price">Default Price (Rs.)</Label>
              <Input
                id="product-price"
                type="number"
                min="0"
                placeholder="0"
                value={form.defaultPrice}
                onChange={e => setForm(f => ({ ...f, defaultPrice: e.target.value }))}
                data-testid="input-product-price"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-product">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !form.name.trim()} data-testid="button-submit-product">
              {isPending ? 'Saving...' : editId ? 'Update' : 'Add Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this product. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) deleteMutation.mutate(deleteId); }}
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
