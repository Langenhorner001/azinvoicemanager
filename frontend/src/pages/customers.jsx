import { useState } from 'react';
import { Plus, Pencil, Trash2, Users, FileText, ChevronRight } from 'lucide-react';
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
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';

function formatRs(amount) {
  return `Rs. ${Number(amount).toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

const STATUS_CONFIG = {
  draft:   { label: 'Draft',   className: 'bg-gray-100 text-gray-600 border border-gray-200' },
  unpaid:  { label: 'Unpaid',  className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  paid:    { label: 'Paid',    className: 'bg-green-50 text-green-700 border border-green-200' },
  overdue: { label: 'Overdue', className: 'bg-red-50 text-red-700 border border-red-200' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', cfg.className)}>
      {cfg.label}
    </span>
  );
}

function CustomerInvoiceSheet({ customer, open, onClose }) {
  const [, navigate] = useLocation();
  const { data: allInvoices = [], isLoading } = useQuery({
    queryKey: ['invoices', { search: customer?.name }],
    queryFn: () => api.listInvoices({ search: customer?.name }),
    enabled: open && !!customer?.name,
  });

  // Filter exact customer name matches
  const invoices = allInvoices.filter(
    inv => inv.customerName?.toLowerCase() === customer?.name?.toLowerCase()
  );

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.grandTotal, 0);
  const totalOutstanding = invoices.filter(i => ['unpaid', 'overdue'].includes(i.status)).reduce((s, i) => s + i.grandTotal, 0);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col" side="right">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Users size={16} className="text-muted-foreground" />
            {customer?.name}
          </SheetTitle>
          {customer?.address && (
            <p className="text-sm text-muted-foreground">{customer.address}</p>
          )}
        </SheetHeader>

        {/* Summary */}
        {!isLoading && invoices.length > 0 && (
          <div className="grid grid-cols-3 gap-3 px-5 py-4 border-b border-border">
            <div className="text-center">
              <div className="text-lg font-bold">{invoices.length}</div>
              <div className="text-xs text-muted-foreground">Invoices</div>
            </div>
            <div className="text-center">
              <div className="text-base font-bold text-green-700">{formatRs(totalPaid)}</div>
              <div className="text-xs text-muted-foreground">Collected</div>
            </div>
            <div className="text-center">
              <div className="text-base font-bold text-yellow-700">{formatRs(totalOutstanding)}</div>
              <div className="text-xs text-muted-foreground">Outstanding</div>
            </div>
          </div>
        )}

        {/* Invoice list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-5">
              <FileText size={28} className="text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No invoices for this customer yet.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-2"
                onClick={() => { onClose(); navigate('/invoices/new'); }}
              >
                <Plus size={13} /> New Invoice
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {invoices.map(inv => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 cursor-pointer transition-colors group"
                  onClick={() => { onClose(); navigate(`/invoices/${inv.id}/edit`); }}
                  data-testid={`customer-invoice-${inv.id}`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium">{inv.invoiceNumber}</span>
                      <StatusBadge status={inv.status} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{formatDate(inv.date)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{formatRs(inv.grandTotal)}</span>
                    <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {invoices.length > 0 && (
          <div className="px-5 py-4 border-t border-border">
            <Button
              className="w-full gap-2"
              onClick={() => { onClose(); navigate('/invoices/new'); }}
            >
              <Plus size={14} /> New Invoice for {customer?.name?.split(' ')[0]}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: api.listCustomers,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', address: '' });
  const [deleteId, setDeleteId] = useState(null);
  const [historyCustomer, setHistoryCustomer] = useState(null);

  const createMutation = useMutation({
    mutationFn: (data) => api.createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDialogOpen(false);
      setForm({ name: '', address: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDialogOpen(false);
      setEditId(null);
      setForm({ name: '', address: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDeleteId(null);
    },
  });

  function openCreate() {
    setEditId(null);
    setForm({ name: '', address: '' });
    setDialogOpen(true);
  }

  function openEdit(e, id, name, address) {
    e.stopPropagation();
    setEditId(id);
    setForm({ name, address });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) return;
    if (editId !== null) {
      updateMutation.mutate({ id: editId, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {isLoading ? 'Loading...' : `${customers.length} customer${customers.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Button className="gap-2" onClick={openCreate} data-testid="button-add-customer">
            <Plus size={16} /> Add Customer
          </Button>
        </div>

        {/* List */}
        <div className="border border-border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-4 py-3">
                  <Skeleton className="h-4 w-3/4 mb-1" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={32} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">No customers yet</p>
              <Button variant="outline" className="mt-4" onClick={openCreate}>
                Add your first customer
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 group transition-colors cursor-pointer"
                  onClick={() => setHistoryCustomer(customer)}
                  data-testid={`row-customer-${customer.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{customer.name}</span>
                    </div>
                    {customer.address && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">{customer.address}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mr-1 flex items-center gap-1">
                      <FileText size={11} /> History
                    </span>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => openEdit(e, customer.id, customer.name, customer.address)}
                      data-testid={`button-edit-customer-${customer.id}`}
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(customer.id); }}
                      data-testid={`button-delete-customer-${customer.id}`}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground text-center">Click on a customer to view their invoice history</p>
      </div>

      {/* Invoice history sheet */}
      <CustomerInvoiceSheet
        customer={historyCustomer}
        open={!!historyCustomer}
        onClose={() => setHistoryCustomer(null)}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="customer-name">Name</Label>
              <Input
                id="customer-name"
                placeholder="Customer name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                data-testid="input-customer-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-address">Address</Label>
              <Input
                id="customer-address"
                placeholder="Address (optional)"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                data-testid="input-customer-address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-customer">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !form.name.trim()} data-testid="button-submit-customer">
              {isPending ? 'Saving...' : editId ? 'Update' : 'Add Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this customer. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) deleteMutation.mutate(deleteId); }}
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
