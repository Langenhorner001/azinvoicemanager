import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Plus, Search, Trash2, FileEdit, X, CheckSquare, Square, CheckCheck,
  ChevronDown,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

function formatRs(amount) {
  return `Rs. ${Number(amount).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function isDueSoon(dueDate) {
  if (!dueDate) return false;
  const diff = (new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 7;
}

const STATUS_CONFIG = {
  draft:   { label: 'Draft',   className: 'bg-gray-100 text-gray-600 border border-gray-200' },
  unpaid:  { label: 'Unpaid',  className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  paid:    { label: 'Paid',    className: 'bg-green-50 text-green-700 border border-green-200' },
  overdue: { label: 'Overdue', className: 'bg-red-50 text-red-700 border border-red-200' },
};

const STATUS_CARD_COLORS = {
  draft:   'border-gray-200 bg-gray-50',
  unpaid:  'border-yellow-200 bg-yellow-50',
  paid:    'border-green-200 bg-green-50',
  overdue: 'border-red-200 bg-red-50',
};

const STATUS_TEXT_COLORS = {
  draft:   'text-gray-700',
  unpaid:  'text-yellow-700',
  paid:    'text-green-700',
  overdue: 'text-red-700',
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', cfg.className)}>
      {cfg.label}
    </span>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium border border-border">
      {label}
      <button onClick={onRemove} className="hover:text-destructive transition-colors" aria-label="Remove filter">
        <X size={10} />
      </button>
    </span>
  );
}

function getSearchParams() {
  return new URLSearchParams(window.location.search);
}

export default function InvoicesPage() {
  const [, navigate] = useLocation();
  const [deleteId, setDeleteId] = useState(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState(() => getSearchParams().get('search') || '');
  const [statusFilter, setStatusFilter] = useState(() => getSearchParams().get('status') || '');
  const [dateFrom, setDateFrom] = useState(() => getSearchParams().get('dateFrom') || '');
  const [dateTo, setDateTo] = useState(() => getSearchParams().get('dateTo') || '');

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    const newSearch = params.toString();
    window.history.replaceState(null, '', newSearch ? `?${newSearch}` : window.location.pathname);
  }, [search, statusFilter, dateFrom, dateTo]);

  const apiParams = {};
  if (search) apiParams.search = search;
  if (statusFilter) apiParams.status = statusFilter;
  if (dateFrom) apiParams.dateFrom = dateFrom;
  if (dateTo) apiParams.dateTo = dateTo;

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', apiParams],
    queryFn: () => api.listInvoices(Object.keys(apiParams).length ? apiParams : undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteId(null);
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }) => api.bulkUpdateStatus(ids, status),
    onSuccess: (data, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setSelected(new Set());
      toast({ title: `Updated ${data.updated} invoice${data.updated !== 1 ? 's' : ''}`, description: `Marked as ${status}` });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to update invoices.', variant: 'destructive' }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => api.bulkDeleteInvoices(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setSelected(new Set());
      setBulkDeleteConfirm(false);
      toast({ title: `Deleted ${data.deleted} invoice${data.deleted !== 1 ? 's' : ''}` });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to delete invoices.', variant: 'destructive' }),
  });

  // Selection helpers
  const allIds = invoices.map(inv => inv.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
  const someSelected = selected.size > 0;

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  }

  function toggleOne(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const selectedIds = [...selected];

  const overdueCount = invoices.filter(inv => inv.status === 'overdue').length;
  const outstandingTotal = invoices
    .filter(inv => ['unpaid', 'overdue'].includes(inv.status))
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  const hasActiveFilters = !!(search || statusFilter || dateFrom || dateTo);

  function clearAllFilters() {
    setSearch(''); setStatusFilter(''); setDateFrom(''); setDateTo('');
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {isLoading ? 'Loading...' : `${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Button className="gap-2" onClick={() => navigate('/invoices/new')} data-testid="button-new-invoice">
            <Plus size={16} /> New Invoice
          </Button>
        </div>

        {/* Summary cards */}
        {!isLoading && invoices.length > 0 && !hasActiveFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['draft', 'unpaid', 'paid', 'overdue'].map((s) => {
              const count = invoices.filter(inv => inv.status === s).length;
              const total = invoices.filter(inv => inv.status === s).reduce((sum, inv) => sum + inv.grandTotal, 0);
              return (
                <button
                  key={s}
                  className={cn('text-left border rounded-lg p-3 transition-colors hover:opacity-80 cursor-pointer', STATUS_CARD_COLORS[s])}
                  onClick={() => setStatusFilter(s)}
                  data-testid={`card-status-${s}`}
                >
                  <div className={cn('text-xs font-medium capitalize mb-1', STATUS_TEXT_COLORS[s])}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </div>
                  <div className={cn('text-xl font-bold', STATUS_TEXT_COLORS[s])}>{count}</div>
                  {count > 0 && <div className={cn('text-xs mt-0.5', STATUS_TEXT_COLORS[s])}>{formatRs(total)}</div>}
                </button>
              );
            })}
          </div>
        )}

        {/* Outstanding alert */}
        {!isLoading && overdueCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {overdueCount} overdue invoice{overdueCount !== 1 ? 's' : ''} — {formatRs(outstandingTotal)} total outstanding
          </div>
        )}

        {/* Filters */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                className="pl-9 h-9 text-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter || 'all'} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-36 h-9 text-sm" data-testid="select-status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <input
                type="date"
                className="h-9 px-3 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                data-testid="input-date-from"
                title="From date"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <input
                type="date"
                className="h-9 px-3 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                data-testid="input-date-to"
                title="To date"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Active filters:</span>
              {search && <FilterChip label={`Search: "${search}"`} onRemove={() => setSearch('')} />}
              {statusFilter && <FilterChip label={`Status: ${statusFilter}`} onRemove={() => setStatusFilter('')} />}
              {dateFrom && <FilterChip label={`From: ${dateFrom}`} onRemove={() => setDateFrom('')} />}
              {dateTo && <FilterChip label={`To: ${dateTo}`} onRemove={() => setDateTo('')} />}
              <button onClick={clearAllFilters} className="text-xs text-primary underline underline-offset-2 hover:no-underline">
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Bulk Action Bar */}
        {someSelected && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-foreground text-background rounded-lg gap-3 flex-wrap animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2.5">
              <CheckCheck size={15} />
              <span className="text-sm font-medium">{selected.size} selected</span>
              <button
                className="text-xs text-background/60 hover:text-background transition-colors underline underline-offset-2"
                onClick={() => setSelected(new Set())}
                data-testid="button-clear-selection"
              >
                Clear
              </button>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="secondary" className="h-7 gap-1.5 text-xs" data-testid="button-bulk-status">
                    Set Status <ChevronDown size={12} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {['paid', 'unpaid', 'draft', 'overdue'].map(s => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: s })}
                      data-testid={`bulk-status-${s}`}
                    >
                      Mark as {s.charAt(0).toUpperCase() + s.slice(1)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 gap-1.5 text-xs bg-red-500 hover:bg-red-600"
                onClick={() => setBulkDeleteConfirm(true)}
                disabled={bulkDeleteMutation.isPending}
                data-testid="button-bulk-delete"
              >
                <Trash2 size={12} /> Delete
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[auto_1fr_1.5fr_1fr_auto_1fr_auto] items-center px-4 py-2.5 bg-muted/40 border-b border-border text-xs font-medium text-muted-foreground gap-3">
            <button
              className="flex items-center justify-center w-4 h-4"
              onClick={toggleAll}
              aria-label="Select all"
              data-testid="checkbox-select-all"
            >
              {allSelected
                ? <CheckSquare size={15} className="text-foreground" />
                : <Square size={15} />
              }
            </button>
            <span>Invoice No.</span>
            <span>Customer</span>
            <span>Date / Due</span>
            <span>Status</span>
            <span className="text-right">Amount</span>
            <span></span>
          </div>

          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 py-3"><Skeleton className="h-4 w-full" /></div>
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted-foreground text-sm">
                {hasActiveFilters ? 'No invoices match your filters' : 'No invoices yet'}
              </p>
              {!hasActiveFilters ? (
                <Button variant="outline" className="mt-4 gap-2" onClick={() => navigate('/invoices/new')}>
                  <Plus size={14} /> Create your first invoice
                </Button>
              ) : (
                <button onClick={clearAllFilters} className="mt-3 text-sm text-primary underline underline-offset-2">
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className={cn(
                    'grid grid-cols-[auto_1fr_1.5fr_1fr_auto_1fr_auto] items-center px-4 py-3 gap-3 hover:bg-muted/30 transition-colors group',
                    selected.has(inv.id) && 'bg-muted/40'
                  )}
                  data-testid={`row-invoice-${inv.id}`}
                >
                  {/* Checkbox */}
                  <button
                    className="flex items-center justify-center w-4 h-4"
                    onClick={e => { e.stopPropagation(); toggleOne(inv.id); }}
                    aria-label="Select invoice"
                    data-testid={`checkbox-invoice-${inv.id}`}
                  >
                    {selected.has(inv.id)
                      ? <CheckSquare size={15} className="text-foreground" />
                      : <Square size={15} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    }
                  </button>

                  {/* Invoice Number */}
                  <span
                    className="text-sm font-mono font-medium cursor-pointer"
                    onClick={() => navigate(`/invoices/${inv.id}/edit`)}
                  >
                    {inv.invoiceNumber}
                  </span>

                  {/* Customer */}
                  <span
                    className="text-sm truncate cursor-pointer"
                    onClick={() => navigate(`/invoices/${inv.id}/edit`)}
                  >
                    {inv.customerName || '—'}
                  </span>

                  {/* Date / Due */}
                  <div
                    className="cursor-pointer"
                    onClick={() => navigate(`/invoices/${inv.id}/edit`)}
                  >
                    <div className="text-sm text-muted-foreground">{formatDate(inv.date)}</div>
                    {inv.dueDate && inv.status !== 'paid' && inv.status !== 'draft' && (
                      <div className={cn(
                        'text-xs mt-0.5',
                        inv.status === 'overdue' ? 'text-red-600 font-medium' :
                        isDueSoon(inv.dueDate) ? 'text-yellow-600 font-medium' : 'text-muted-foreground'
                      )}>
                        Due {formatDate(inv.dueDate)}
                        {isDueSoon(inv.dueDate) && inv.status === 'unpaid' && ' ⚡'}
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <StatusBadge status={inv.status} />

                  {/* Amount */}
                  <span
                    className="text-sm font-medium text-right cursor-pointer"
                    onClick={() => navigate(`/invoices/${inv.id}/edit`)}
                  >
                    {formatRs(inv.grandTotal)}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => navigate(`/invoices/${inv.id}/edit`)}
                      data-testid={`button-edit-invoice-${inv.id}`}
                    >
                      <FileEdit size={13} />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={e => { e.stopPropagation(); setDeleteId(inv.id); }}
                      data-testid={`button-delete-invoice-${inv.id}`}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Single Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) deleteMutation.mutate(deleteId); }}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete confirm */}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} Invoice{selected.size !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {selected.size} selected invoice{selected.size !== 1 ? 's' : ''}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => bulkDeleteMutation.mutate(selectedIds)}
              data-testid="button-confirm-bulk-delete"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
