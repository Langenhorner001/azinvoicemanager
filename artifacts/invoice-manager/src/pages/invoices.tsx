import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Plus, Search, Trash2, FileEdit, FileText, X, SlidersHorizontal } from "lucide-react";
import { useListInvoices, useDeleteInvoice, getListInvoicesQueryKey, getGetNextInvoiceNumberQueryKey } from "@workspace/api-client-react";
import type { InvoiceStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type InvoiceStatusType = "draft" | "unpaid" | "paid" | "overdue";

function StatusBadge({ status }: { status: InvoiceStatusType }) {
  const config: Record<InvoiceStatusType, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-gray-100 text-gray-600 border-gray-200" },
    unpaid: { label: "Unpaid", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    paid: { label: "Paid", className: "bg-green-50 text-green-700 border-green-200" },
    overdue: { label: "Overdue", className: "bg-red-50 text-red-700 border-red-200" },
  };
  const { label, className } = config[status] ?? config.draft;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}
      data-testid={`badge-status-${status}`}
    >
      {label}
    </span>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 text-xs font-medium">
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 hover:text-primary/70 transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

function getSearchParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

export default function InvoicesPage() {
  const [, navigate] = useLocation();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState(() => getSearchParams().get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatusType | "">(() => {
    const s = getSearchParams().get("status");
    return (s as InvoiceStatusType | "") ?? "";
  });
  const [dateFrom, setDateFrom] = useState(() => getSearchParams().get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(() => getSearchParams().get("dateTo") ?? "");

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const newSearch = params.toString();
    const newUrl = newSearch ? `?${newSearch}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [search, statusFilter, dateFrom, dateTo]);

  const apiParams: Record<string, string> = {};
  if (search) apiParams.search = search;
  if (statusFilter) apiParams.status = statusFilter;
  if (dateFrom) apiParams.dateFrom = dateFrom;
  if (dateTo) apiParams.dateTo = dateTo;

  const hasParams = Object.keys(apiParams).length > 0;

  const { data: invoices = [], isLoading } = useListInvoices(
    hasParams ? (apiParams as Parameters<typeof useListInvoices>[0]) : undefined,
    { query: { queryKey: getListInvoicesQueryKey(hasParams ? (apiParams as Parameters<typeof useListInvoices>[0]) : undefined) } }
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

  const outstandingTotal = invoices
    .filter((inv) => inv.status === "unpaid" || inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.grandTotal, 0);
  const overdueCount = invoices.filter((inv) => inv.status === "overdue").length;

  const hasActiveFilters = !!(search || statusFilter || dateFrom || dateTo);

  function clearAllFilters() {
    setSearch("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
  }

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

        {/* Summary cards */}
        {!isLoading && invoices.length > 0 && !hasActiveFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {(["draft", "unpaid", "paid", "overdue"] as InvoiceStatusType[]).map((s) => {
              const count = invoices.filter((inv) => inv.status === s).length;
              const total = invoices
                .filter((inv) => inv.status === s)
                .reduce((sum, inv) => sum + inv.grandTotal, 0);
              const colorMap: Record<InvoiceStatusType, string> = {
                draft: "border-gray-200 bg-gray-50",
                unpaid: "border-yellow-200 bg-yellow-50",
                paid: "border-green-200 bg-green-50",
                overdue: "border-red-200 bg-red-50",
              };
              const textMap: Record<InvoiceStatusType, string> = {
                draft: "text-gray-700",
                unpaid: "text-yellow-700",
                paid: "text-green-700",
                overdue: "text-red-700",
              };
              return (
                <button
                  key={s}
                  className={`rounded-lg border p-3 text-left transition-opacity hover:opacity-80 cursor-pointer ${colorMap[s]}`}
                  onClick={() => setStatusFilter(s)}
                  data-testid={`card-status-${s}`}
                >
                  <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${textMap[s]}`}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </div>
                  <div className={`text-lg font-bold ${textMap[s]}`}>{count}</div>
                  {count > 0 && (
                    <div className={`text-xs mt-0.5 ${textMap[s]} opacity-80`}>
                      {formatRs(total)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Outstanding alert */}
        {!isLoading && overdueCount > 0 && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 flex items-center justify-between">
            <span className="text-sm text-red-700 font-medium">
              {overdueCount} overdue invoice{overdueCount !== 1 ? "s" : ""} — {formatRs(outstandingTotal)} total outstanding
            </span>
          </div>
        )}

        {/* Search and filters */}
        <div className="space-y-3 mb-4">
          {/* Row 1: search + filter controls */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by invoice number or customer name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search"
              />
            </div>

            <div className="flex gap-2">
              {/* Status filter */}
              <Select
                value={statusFilter || "all"}
                onValueChange={(val) => setStatusFilter(val === "all" ? "" : val as InvoiceStatusType)}
              >
                <SelectTrigger className="w-[130px]" data-testid="select-status-filter">
                  <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>

              {/* Date from */}
              <div className="flex flex-col justify-center">
                <Input
                  type="date"
                  className="w-[145px] text-sm"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  data-testid="input-date-from"
                  title="From date"
                />
              </div>

              {/* Date to */}
              <div className="flex flex-col justify-center">
                <Input
                  type="date"
                  className="w-[145px] text-sm"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  data-testid="input-date-to"
                  title="To date"
                />
              </div>
            </div>
          </div>

          {/* Row 2: active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2" data-testid="active-filters">
              <span className="text-xs text-muted-foreground font-medium">Active filters:</span>
              {search && (
                <FilterChip
                  label={`Search: "${search}"`}
                  onRemove={() => setSearch("")}
                />
              )}
              {statusFilter && (
                <FilterChip
                  label={`Status: ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`}
                  onRemove={() => setStatusFilter("")}
                />
              )}
              {dateFrom && (
                <FilterChip
                  label={`From: ${formatDate(dateFrom)}`}
                  onRemove={() => setDateFrom("")}
                />
              )}
              {dateTo && (
                <FilterChip
                  label={`To: ${formatDate(dateTo)}`}
                  onRemove={() => setDateTo("")}
                />
              )}
              <button
                className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
                onClick={clearAllFilters}
                data-testid="button-clear-filters"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_1fr_1fr_120px_1fr_80px] gap-4 px-4 py-3 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <div>Invoice No.</div>
            <div>Customer</div>
            <div>Date</div>
            <div>Status</div>
            <div className="text-right">Amount</div>
            <div></div>
          </div>

          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_120px_1fr_80px] gap-4 px-4 py-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20 ml-auto" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-10 h-10 text-muted-foreground mb-3 opacity-40" />
              <p className="text-sm font-medium text-muted-foreground">
                {search || hasActiveFilters ? "No invoices match your filters" : "No invoices yet"}
              </p>
              {!search && !hasActiveFilters && (
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
              {(search || hasActiveFilters) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-muted-foreground"
                  onClick={clearAllFilters}
                >
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="grid grid-cols-[1fr_1fr_1fr_120px_1fr_80px] gap-4 px-4 py-3 hover:bg-muted/30 transition-colors group cursor-pointer"
                  onClick={() => navigate(`/invoices/${inv.id}/edit`)}
                  data-testid={`row-invoice-${inv.id}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{inv.invoiceNumber}</span>
                  </div>
                  <div className="text-sm text-foreground truncate">{inv.customerName || "—"}</div>
                  <div className="text-sm text-muted-foreground">{formatDate(inv.date)}</div>
                  <div>
                    <StatusBadge status={(inv.status as InvoiceStatusType) ?? "draft"} />
                  </div>
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
