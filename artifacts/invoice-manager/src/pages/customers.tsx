import { useState } from "react";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import {
  useListCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  getListCustomersQueryKey,
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

interface CustomerForm {
  name: string;
  address: string;
}

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const { data: customers = [], isLoading } = useListCustomers();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<CustomerForm>({ name: "", address: "" });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const createMutation = useCreateCustomer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
        setDialogOpen(false);
        setForm({ name: "", address: "" });
      },
    },
  });

  const updateMutation = useUpdateCustomer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
        setDialogOpen(false);
        setEditId(null);
        setForm({ name: "", address: "" });
      },
    },
  });

  const deleteMutation = useDeleteCustomer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
        setDeleteId(null);
      },
    },
  });

  function openCreate() {
    setEditId(null);
    setForm({ name: "", address: "" });
    setDialogOpen(true);
  }

  function openEdit(id: number, name: string, address: string) {
    setEditId(id);
    setForm({ name, address });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) return;
    if (editId !== null) {
      updateMutation.mutate({ id: editId, data: form });
    } else {
      createMutation.mutate({ data: form });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Customers</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? "Loading..." : `${customers.length} customer${customers.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2" data-testid="button-add-customer">
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        </div>

        {/* List */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-10 h-10 text-muted-foreground mb-3 opacity-40" />
              <p className="text-sm font-medium text-muted-foreground">No customers yet</p>
              <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={openCreate}>
                <Plus className="w-3.5 h-3.5" />
                Add your first customer
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors group"
                  data-testid={`row-customer-${customer.id}`}
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">{customer.name}</div>
                    {customer.address && (
                      <div className="text-xs text-muted-foreground mt-0.5">{customer.address}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(customer.id, customer.name, customer.address)}
                      data-testid={`button-edit-customer-${customer.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(customer.id)}
                      data-testid={`button-delete-customer-${customer.id}`}
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
            <DialogTitle>{editId ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="customer-name">Name</Label>
              <Input
                id="customer-name"
                placeholder="Customer name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                data-testid="input-customer-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-address">Address</Label>
              <Input
                id="customer-address"
                placeholder="Customer address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                data-testid="input-customer-address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-customer">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !form.name.trim()} data-testid="button-save-customer">
              {isPending ? "Saving..." : editId ? "Update" : "Add Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this customer. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-customer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => { if (deleteId) deleteMutation.mutate({ id: deleteId }); }}
              data-testid="button-confirm-delete-customer"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
