import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, Search, Trash2, FileEdit, FileText } from "lucide-react";
import { useListInvoices, useDeleteInvoice, getListInvoicesQueryKey, getGetNextInvoiceNumberQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

function formatRs(amount: number) {
  return `Rs. ${Number(amount).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function InvoicesPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useListInvoices(
    search ? { search } : undefined,
    { query: { queryKey: getListInvoicesQueryKey(search ? { search } : undefined) } }
  );

  const deleteMutation = useDeleteInvoice({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetNextInvoiceNumberQueryKey() });
        setDeleteId(null);
      },
    },
  });

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Invoices</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? "Loading..." : `${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Button
            onClick={() => navigate("/invoices/new")}
            className="gap-2"
            data-testid="button-new-invoice"
          >
            <Plus className="w-4 h-4" />
            New Invoice
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by invoice number or customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>

        {/* Table */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_80px] gap-4 px-4 py-3 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <div>Invoice No.</div>
            <div>Customer</div>
            <div>Date</div>
            <div className="text-right">Amount</div>
            <div></div>
          </div>

          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_80px] gap-4 px-4 py-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20 ml-auto" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-10 h-10 text-muted-foreground mb-3 opacity-40" />
              <p className="text-sm font-medium text-muted-foreground">
                {search ? "No invoices match your search" : "No invoices yet"}
              </p>
              {!search && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1"
                  onClick={() => navigate("/invoices/new")}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create your first invoice
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="grid grid-cols-[1fr_1fr_1fr_1fr_80px] gap-4 px-4 py-3 hover:bg-muted/30 transition-colors group cursor-pointer"
                  onClick={() => navigate(`/invoices/${inv.id}/edit`)}
                  data-testid={`row-invoice-${inv.id}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{inv.invoiceNumber}</span>
                    {inv.isDraft && (
                      <Badge variant="secondary" className="text-xs py-0 px-1.5" data-testid={`badge-draft-${inv.id}`}>
                        Draft
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-foreground truncate">{inv.customerName || "—"}</div>
                  <div className="text-sm text-muted-foreground">{formatDate(inv.date)}</div>
                  <div className="text-sm font-medium text-foreground text-right">{formatRs(inv.grandTotal)}</div>
                  <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                      onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${inv.id}/edit`); }}
                      data-testid={`button-edit-invoice-${inv.id}`}
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(inv.id); }}
                      data-testid={`button-delete-invoice-${inv.id}`}
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

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this invoice. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                if (deleteId) deleteMutation.mutate({ id: deleteId });
              }}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
