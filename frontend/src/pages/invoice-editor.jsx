import { useState, useEffect, useRef, useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useLocation, useParams } from 'wouter';
import { Plus, Trash2, Printer, Download, ArrowLeft, ChevronDown } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import { Layout } from '@/components/layout';
import { InvoicePreview } from '@/components/invoice-preview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

function makeKey() {
  return Math.random().toString(36).slice(2);
}

function formatDate(d) {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function lineTotal(item) {
  const gross = item.qty * item.price;
  if (!item.discountEnabled || item.discount <= 0) return gross;
  if (item.discountType === 'amount') return Math.max(0, gross - item.discount);
  return gross * (1 - item.discount / 100);
}

function addDays(dateStr, days) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export default function InvoiceEditorPage({ mode }) {
  const params = useParams();
  const id = mode === 'edit' ? parseInt(params.id || '0') : null;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const today = formatDate(new Date());
  const [date, setDate] = useState(today);
  const [dueDate, setDueDate] = useState(addDays(today, 30));
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [status, setStatus] = useState('draft');
  const [items, setItems] = useState([
    { key: makeKey(), itemName: '', qty: 1, price: 0, discountEnabled: false, discount: 0, discountType: 'percent' },
  ]);
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);

  const [draftId, setDraftId] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle');
  const autoSaveTimer = useRef(null);
  const initialized = useRef(false);
  const isFirstLoad = useRef(true);

  const { data: nextNumber, isLoading: loadingNextNum } = useQuery({
    queryKey: ['invoices', 'next-number'],
    queryFn: api.getNextInvoiceNumber,
    enabled: mode === 'new',
    staleTime: 0,
  });

  const { data: existingInvoice, isLoading: loadingExisting } = useQuery({
    queryKey: ['invoices', id],
    queryFn: () => api.getInvoice(id),
    enabled: mode === 'edit' && !!id,
  });

  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: api.listCustomers });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: api.listProducts });

  const createMutation = useMutation({
    mutationFn: (data) => api.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id: invId, data }) => api.updateInvoice(invId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  useEffect(() => {
    if (mode === 'edit' && existingInvoice && !initialized.current) {
      initialized.current = true;
      setInvoiceNumber(existingInvoice.invoiceNumber);
      setDate(existingInvoice.date);
      setDueDate(existingInvoice.dueDate || addDays(existingInvoice.date, 30));
      setCustomerName(existingInvoice.customerName);
      setCustomerAddress(existingInvoice.customerAddress);
      setStatus(existingInvoice.status || 'draft');
      if (existingInvoice.items && existingInvoice.items.length > 0) {
        setItems(existingInvoice.items.map(item => ({
          key: makeKey(),
          itemName: item.itemName,
          qty: Number(item.qty),
          price: Number(item.price),
          discountEnabled: Number(item.discount) > 0,
          discount: Number(item.discount),
          discountType: item.discountType === 'amount' ? 'amount' : 'percent',
        })));
      }
    }
  }, [existingInvoice, mode]);

  useEffect(() => {
    if (mode === 'new' && nextNumber && !invoiceNumber) {
      setInvoiceNumber(nextNumber.invoiceNumber);
    }
  }, [nextNumber, mode, invoiceNumber]);

  function buildPayload(isDraft, overrideStatus) {
    const resolvedStatus = overrideStatus || status;
    return {
      invoiceNumber,
      date,
      dueDate,
      customerName,
      customerAddress,
      isDraft,
      status: resolvedStatus,
      items: items.map(item => ({
        itemName: item.itemName,
        qty: item.qty,
        price: item.price,
        discount: item.discountEnabled ? item.discount : 0,
        discountType: item.discountType,
      })),
    };
  }

  function scheduleAutoSave() {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { performAutoSave(); }, 1000);
  }

  function performAutoSave() {
    if (!invoiceNumber.trim() || !date || !customerName.trim()) return;
    setAutoSaveStatus('saving');
    const autoStatus = mode === 'new' ? 'draft' : status;
    const payload = buildPayload(mode === 'new', autoStatus);

    if (mode === 'edit' && id) {
      updateMutation.mutate({ id, data: payload }, {
        onSuccess: () => setAutoSaveStatus('saved'),
        onError: () => setAutoSaveStatus('idle'),
      });
    } else if (draftId) {
      updateMutation.mutate({ id: draftId, data: { ...payload, isDraft: true, status: 'draft' } }, {
        onSuccess: () => setAutoSaveStatus('saved'),
        onError: () => setAutoSaveStatus('idle'),
      });
    } else {
      createMutation.mutate({ ...payload, isDraft: true, status: 'draft' }, {
        onSuccess: (inv) => {
          setDraftId(inv.id);
          setAutoSaveStatus('saved');
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
        },
        onError: () => setAutoSaveStatus('idle'),
      });
    }
  }

  useEffect(() => {
    if (isFirstLoad.current) { isFirstLoad.current = false; return; }
    if (!initialized.current && mode === 'edit') return;
    setAutoSaveStatus('idle');
    scheduleAutoSave();
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceNumber, date, dueDate, customerName, customerAddress, items]);

  function addItem() {
    setItems(prev => [...prev, { key: makeKey(), itemName: '', qty: 1, price: 0, discountEnabled: false, discount: 0, discountType: 'percent' }]);
  }

  function removeItem(key) {
    setItems(prev => prev.filter(i => i.key !== key));
  }

  function updateItem(key, patch) {
    setItems(prev => prev.map(i => i.key === key ? { ...i, ...patch } : i));
  }

  function handleSave(isDraft) {
    if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null; }
    if (!invoiceNumber.trim() || !date || !customerName.trim()) {
      toast({ title: 'Missing fields', description: 'Invoice number, date and customer name are required.', variant: 'destructive' });
      return;
    }
    const resolvedStatus = isDraft ? 'draft' : (status === 'draft' ? 'unpaid' : status);
    const payload = buildPayload(isDraft, resolvedStatus);
    const targetId = mode === 'edit' ? id : draftId;

    if (targetId) {
      updateMutation.mutate({ id: targetId, data: payload }, {
        onSuccess: (inv) => {
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
          toast({ title: isDraft ? 'Draft saved' : 'Invoice saved', description: `${inv.invoiceNumber} has been ${isDraft ? 'saved as draft' : 'saved'}.` });
          navigate('/invoices');
        },
        onError: () => toast({ title: 'Error', description: 'Failed to save invoice.', variant: 'destructive' }),
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: (inv) => {
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
          toast({ title: isDraft ? 'Draft saved' : 'Invoice saved', description: `${inv.invoiceNumber} has been ${isDraft ? 'saved as draft' : 'saved'}.` });
          navigate('/invoices');
        },
        onError: () => toast({ title: 'Error', description: 'Failed to save invoice.', variant: 'destructive' }),
      });
    }
  }

  function handlePrint() { window.print(); }

  const handleDownloadPDF = useCallback(async () => {
    const previewEl = document.getElementById('invoice-preview-panel');
    const sectionEl = document.getElementById('invoice-preview-section');
    if (!previewEl) return;

    const wasHidden = sectionEl && getComputedStyle(sectionEl).display === 'none';
    if (wasHidden && sectionEl) {
      sectionEl.style.display = 'flex';
      sectionEl.style.visibility = 'visible';
    }

    try {
      const canvas = await html2canvas(previewEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
      const fileName = invoiceNumber ? `invoice-${invoiceNumber.replace(/\s+/g, '-')}.pdf` : 'invoice.pdf';
      pdf.save(fileName);
    } catch {
      window.print();
    } finally {
      if (wasHidden && sectionEl) {
        sectionEl.style.display = '';
        sectionEl.style.visibility = '';
      }
    }
  }, [invoiceNumber]);

  const subtotal = items.reduce((acc, item) => acc + item.qty * item.price, 0);
  const grandTotal = items.reduce((acc, item) => acc + lineTotal(item), 0);

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isLoadingForm = (mode === 'edit' && loadingExisting) || (mode === 'new' && loadingNextNum);

  const previewItems = items.map(item => ({
    itemName: item.itemName,
    qty: item.qty,
    price: item.price,
    discount: item.discountEnabled ? item.discount : 0,
    discountType: item.discountType,
  }));

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-background sticky top-0 z-10 flex-wrap gap-y-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/invoices')} data-testid="button-back">
            <ArrowLeft size={16} />
          </Button>
          <h1 className="text-lg font-semibold flex-1 min-w-0 truncate">
            {mode === 'new' ? 'New Invoice' : `Edit ${invoiceNumber || 'Invoice'}`}
          </h1>
          <span className="text-xs text-muted-foreground shrink-0">
            {autoSaveStatus === 'saving' && 'Saving draft...'}
            {autoSaveStatus === 'saved' && 'Draft saved'}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handlePrint} data-testid="button-print">
              <Printer size={13} /> Print
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleDownloadPDF} data-testid="button-download-pdf">
              <Download size={13} /> PDF
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => handleSave(true)} disabled={isPending} data-testid="button-save-draft">
              {isPending ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button size="sm" className="h-8" onClick={() => handleSave(false)} disabled={isPending} data-testid="button-save-invoice">
              {isPending ? 'Saving...' : mode === 'new' ? 'Save Invoice' : 'Update Invoice'}
            </Button>
          </div>
        </div>

        {/* Body: split panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT: Form */}
          <ScrollArea className="flex-1 min-w-0">
            <div className="p-6 space-y-6 max-w-2xl">
              {/* Invoice Details */}
              <section className="space-y-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Invoice Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Invoice No.</Label>
                    {isLoadingForm ? <Skeleton className="h-9" /> : (
                      <Input
                        value={invoiceNumber}
                        onChange={e => setInvoiceNumber(e.target.value)}
                        data-testid="input-invoice-number"
                      />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Invoice Date</Label>
                    <Input
                      type="date"
                      value={date}
                      onChange={e => {
                        setDate(e.target.value);
                        setDueDate(addDays(e.target.value, 30));
                      }}
                      data-testid="input-invoice-date"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      Due Date
                      <span className="text-[10px] text-muted-foreground font-normal">(Net-30 default)</span>
                    </Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      data-testid="input-invoice-due-date"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="w-full" data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              {/* Customer */}
              <section className="space-y-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Customer</h2>
                {customers.length > 0 && (
                  <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between font-normal h-9 text-sm" data-testid="button-select-customer">
                        {customerName || 'Select saved customer...'}
                        <ChevronDown size={14} className="text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search customers..." />
                        <CommandList>
                          <CommandEmpty>No customers found.</CommandEmpty>
                          <CommandGroup>
                            {customers.map(c => (
                              <CommandItem
                                key={c.id}
                                value={c.name}
                                onSelect={() => {
                                  setCustomerName(c.name);
                                  setCustomerAddress(c.address);
                                  setCustomerPopoverOpen(false);
                                }}
                                data-testid={`option-customer-${c.id}`}
                              >
                                <div>
                                  <div className="text-sm font-medium">{c.name}</div>
                                  {c.address && <div className="text-xs text-muted-foreground">{c.address}</div>}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input
                    placeholder="Customer name"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    data-testid="input-customer-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Input
                    placeholder="Customer address"
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                    data-testid="input-customer-address"
                  />
                </div>
              </section>

              {/* Items */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Items</h2>
                  <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={addItem} data-testid="button-add-item">
                    <Plus size={12} /> Add
                  </Button>
                </div>
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <ItemRowCard
                      key={item.key}
                      item={item}
                      index={index}
                      products={products}
                      onUpdate={(patch) => updateItem(item.key, patch)}
                      onRemove={() => removeItem(item.key)}
                      canRemove={items.length > 1}
                    />
                  ))}
                </div>
              </section>

              {/* Totals */}
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>Rs. {Math.round(subtotal).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold">
                  <span>Grand Total</span>
                  <span>Rs. {Math.round(grandTotal).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* RIGHT: Preview */}
          <div
            id="invoice-preview-section"
            className="hidden lg:flex w-[420px] shrink-0 flex-col border-l border-border bg-muted/20 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preview</span>
              <span className="text-xs text-muted-foreground">A4 Format</span>
            </div>
            <ScrollArea className="flex-1 p-4">
              <InvoicePreview
                invoiceNumber={invoiceNumber}
                date={date}
                dueDate={dueDate}
                customerName={customerName}
                customerAddress={customerAddress}
                items={previewItems}
              />
            </ScrollArea>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function ItemRowCard({ item, index, products, onUpdate, onRemove, canRemove }) {
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);

  return (
    <div className="border border-border rounded-lg p-3 space-y-2.5 bg-card">
      {/* Item name + remove */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          {products.length > 0 ? (
            <>
              <Input
                placeholder="Item name"
                value={item.itemName}
                onChange={e => onUpdate({ itemName: e.target.value })}
                className="pr-8 text-sm h-8"
                data-testid={`input-item-name-${index}`}
              />
              <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label="Select product"
                  >
                    <ChevronDown size={13} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search products..." />
                    <CommandList>
                      <CommandEmpty>No products found.</CommandEmpty>
                      <CommandGroup>
                        {products.map(p => (
                          <CommandItem
                            key={p.id}
                            value={p.name}
                            onSelect={() => {
                              onUpdate({ itemName: p.name, price: Number(p.defaultPrice) });
                              setProductPopoverOpen(false);
                            }}
                            data-testid={`option-product-${p.id}`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-sm">{p.name}</span>
                              <span className="text-xs text-muted-foreground">Rs. {Number(p.defaultPrice).toLocaleString()}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </>
          ) : (
            <Input
              placeholder="Item name"
              value={item.itemName}
              onChange={e => onUpdate({ itemName: e.target.value })}
              className="text-sm h-8"
              data-testid={`input-item-name-${index}`}
            />
          )}
        </div>
        {canRemove && (
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={onRemove} data-testid={`button-remove-item-${index}`}>
            <Trash2 size={13} />
          </Button>
        )}
      </div>

      {/* Qty / Price / Total */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Qty</Label>
          <Input
            type="number"
            min="0"
            value={item.qty}
            onChange={e => onUpdate({ qty: parseFloat(e.target.value) || 0 })}
            className="text-sm h-8"
            data-testid={`input-item-qty-${index}`}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Price</Label>
          <Input
            type="number"
            min="0"
            value={item.price}
            onChange={e => onUpdate({ price: parseFloat(e.target.value) || 0 })}
            className="text-sm h-8"
            data-testid={`input-item-price-${index}`}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Total</Label>
          <div className="h-8 flex items-center px-3 rounded-md border border-border bg-muted/40 text-sm font-medium">
            {Math.round(lineTotal(item)).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Discount toggle */}
      <div className="space-y-2">
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => onUpdate({ discountEnabled: !item.discountEnabled, discount: item.discountEnabled ? 0 : item.discount })}
          data-testid={`button-toggle-discount-${index}`}
        >
          <ChevronDown
            size={12}
            className={cn('transition-transform', item.discountEnabled ? 'rotate-180' : '')}
          />
          Discount
        </button>

        {item.discountEnabled && (
          <div className="flex items-center gap-2">
            {/* Type toggle */}
            <div className="flex items-center border border-border rounded-md overflow-hidden text-xs h-7">
              <button
                className={cn(
                  'px-2 py-1 font-medium transition-colors',
                  item.discountType === 'percent' ? 'bg-foreground text-background' : 'bg-background text-muted-foreground hover:bg-muted'
                )}
                onClick={() => onUpdate({ discountType: 'percent' })}
                data-testid={`button-discount-type-percent-${index}`}
              >
                %
              </button>
              <button
                className={cn(
                  'px-2 py-1 font-medium border-l border-border transition-colors',
                  item.discountType === 'amount' ? 'bg-foreground text-background' : 'bg-background text-muted-foreground hover:bg-muted'
                )}
                onClick={() => onUpdate({ discountType: 'amount' })}
                data-testid={`button-discount-type-amount-${index}`}
              >
                Rs.
              </button>
            </div>
            <Input
              type="number"
              min="0"
              value={item.discount}
              onChange={e => onUpdate({ discount: parseFloat(e.target.value) || 0 })}
              className="w-24 text-sm h-7"
              data-testid={`input-item-discount-${index}`}
            />
            <span className="text-xs text-muted-foreground">
              {item.discountType === 'percent' ? '%' : 'off'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
