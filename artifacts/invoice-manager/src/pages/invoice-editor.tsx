import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { Plus, Trash2, ChevronDown, Printer, Download, ArrowLeft, Save } from "lucide-react";
import {
  useGetNextInvoiceNumber,
  useGetInvoice,
  useCreateInvoice,
  useUpdateInvoice,
  useListCustomers,
  useListProducts,
  getListInvoicesQueryKey,
  getGetInvoiceQueryKey,
  getGetNextInvoiceNumberQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { InvoicePreview } from "@/components/invoice-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ItemRow {
  key: string;
  itemName: string;
  qty: number;
  price: number;
  discountEnabled: boolean;
  discount: number;
}

function makeKey() {
  return Math.random().toString(36).slice(2);
}

function formatDate(d: Date) {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function lineTotal(item: ItemRow) {
  return item.qty * item.price * (1 - item.discount / 100);
}

export default function InvoiceEditorPage({ mode }: { mode: "new" | "edit" }) {
  const params = useParams<{ id: string }>();
  const id = mode === "edit" ? parseInt(params.id ?? "0") : null;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState(formatDate(new Date()));
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [items, setItems] = useState<ItemRow[]>([
    { key: makeKey(), itemName: "", qty: 1, price: 0, discountEnabled: false, discount: 0 },
  ]);
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);

  // Auto-save draft state
  const [draftId, setDraftId] = useState<number | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);
  const isFirstLoad = useRef(true);

  // API data
  const { data: nextNumber, isLoading: loadingNextNum } = useGetNextInvoiceNumber({
    query: { queryKey: getGetNextInvoiceNumberQueryKey(), enabled: mode === "new" },
  });

  const { data: existingInvoice, isLoading: loadingExisting } = useGetInvoice(
    id!,
    { query: { queryKey: getGetInvoiceQueryKey(id!), enabled: mode === "edit" && !!id } }
  );

  const { data: customers = [] } = useListCustomers();
  const { data: products = [] } = useListProducts();

  const createMutation = useCreateInvoice({
    mutation: {
      onSuccess: (inv) => {
        queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
        return inv;
      },
    },
  });

  const updateMutation = useUpdateInvoice({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      },
    },
  });

  // Initialize form from existing invoice
  useEffect(() => {
    if (mode === "edit" && existingInvoice && !initialized.current) {
      initialized.current = true;
      setInvoiceNumber(existingInvoice.invoiceNumber);
      setDate(existingInvoice.date);
      setCustomerName(existingInvoice.customerName);
      setCustomerAddress(existingInvoice.customerAddress);
      if (existingInvoice.items.length > 0) {
        setItems(
          existingInvoice.items.map((item) => ({
            key: makeKey(),
            itemName: item.itemName,
            qty: Number(item.qty),
            price: Number(item.price),
            discountEnabled: Number(item.discount) > 0,
            discount: Number(item.discount),
          }))
        );
      }
    }
  }, [existingInvoice, mode]);

  // Set next number on new
  useEffect(() => {
    if (mode === "new" && nextNumber && !invoiceNumber) {
      setInvoiceNumber(nextNumber.invoiceNumber);
    }
  }, [nextNumber, mode, invoiceNumber]);

  // Build payload
  function buildPayload(isDraft: boolean) {
    return {
      invoiceNumber,
      date,
      customerName,
      customerAddress,
      isDraft,
      items: items.map((item) => ({
        itemName: item.itemName,
        qty: item.qty,
        price: item.price,
        discount: item.discountEnabled ? item.discount : 0,
      })),
    };
  }

  // Debounced auto-save as draft (fires 1.5s after last change)
  function scheduleAutoSave() {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      performAutoSave();
    }, 1000);
  }

  function performAutoSave() {
    if (!invoiceNumber.trim() || !date || !customerName.trim()) return;
    setAutoSaveStatus("saving");
    const payload = buildPayload(true);

    if (mode === "edit" && id) {
      updateMutation.mutate(
        { id, data: payload },
        {
          onSuccess: () => setAutoSaveStatus("saved"),
          onError: () => setAutoSaveStatus("idle"),
        }
      );
    } else if (draftId) {
      updateMutation.mutate(
        { id: draftId, data: payload },
        {
          onSuccess: () => setAutoSaveStatus("saved"),
          onError: () => setAutoSaveStatus("idle"),
        }
      );
    } else {
      createMutation.mutate(
        { data: payload },
        {
          onSuccess: (inv) => {
            setDraftId(inv.id);
            setAutoSaveStatus("saved");
            queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
          },
          onError: () => setAutoSaveStatus("idle"),
        }
      );
    }
  }

  // Trigger auto-save whenever form changes (skip on initial render / load)
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (!initialized.current && mode === "edit") return;
    setAutoSaveStatus("idle");
    scheduleAutoSave();
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceNumber, date, customerName, customerAddress, items]);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { key: makeKey(), itemName: "", qty: 1, price: 0, discountEnabled: false, discount: 0 },
    ]);
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function updateItem(key: string, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  function handleSave(isDraft: boolean) {
    if (!invoiceNumber.trim() || !date || !customerName.trim()) {
      toast({ title: "Missing fields", description: "Invoice number, date and customer name are required.", variant: "destructive" });
      return;
    }
    const payload = buildPayload(isDraft);
    const targetId = mode === "edit" ? id : draftId;

    if (targetId) {
      updateMutation.mutate(
        { id: targetId, data: payload },
        {
          onSuccess: (inv) => {
            queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
            if (id) queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(id) });
            toast({ title: isDraft ? "Draft saved" : "Invoice saved", description: `${inv.invoiceNumber} has been ${isDraft ? "saved as draft" : "saved"}.` });
            navigate("/invoices");
          },
          onError: () => {
            toast({ title: "Error", description: "Failed to save invoice.", variant: "destructive" });
          },
        }
      );
    } else {
      createMutation.mutate(
        { data: payload },
        {
          onSuccess: (inv) => {
            queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
            toast({ title: isDraft ? "Draft saved" : "Invoice saved", description: `${inv.invoiceNumber} has been ${isDraft ? "saved as draft" : "saved"}.` });
            navigate("/invoices");
          },
          onError: () => {
            toast({ title: "Error", description: "Failed to save invoice.", variant: "destructive" });
          },
        }
      );
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleDownloadPDF() {
    // Open a print dialog focused on the invoice preview using print-specific CSS
    const previewEl = document.getElementById("invoice-preview-panel");
    if (!previewEl) { window.print(); return; }
    const printWindow = window.open("", "_blank", "width=800,height=1000");
    if (!printWindow) { window.print(); return; }
    const styles = Array.from(document.styleSheets)
      .flatMap((sheet) => {
        try { return Array.from(sheet.cssRules).map((r) => r.cssText); } catch { return []; }
      })
      .join("\n");
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Invoice</title><style>${styles}\nbody{margin:0;background:white;}</style></head><body>${previewEl.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  }

  const subtotal = items.reduce((acc, item) => acc + item.qty * item.price, 0);
  const grandTotal = items.reduce((acc, item) => acc + lineTotal(item), 0);

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isLoadingForm = (mode === "edit" && loadingExisting) || (mode === "new" && loadingNextNum);

  const previewItems = items.map((item) => ({
    itemName: item.itemName,
    qty: item.qty,
    price: item.price,
    discount: item.discountEnabled ? item.discount : 0,
  }));

  return (
    <Layout>
      <div className="flex h-screen overflow-hidden flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/invoices")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-sm font-semibold text-foreground">
              {mode === "new" ? "New Invoice" : `Edit ${invoiceNumber || "Invoice"}`}
            </h1>
            {/* Auto-save indicator */}
            <span className="text-xs text-muted-foreground">
              {autoSaveStatus === "saving" && "Saving draft..."}
              {autoSaveStatus === "saved" && "Draft saved"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handlePrint}
              data-testid="button-print"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleDownloadPDF}
              data-testid="button-download-pdf"
            >
              <Download className="w-3.5 h-3.5" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => handleSave(true)}
              disabled={isPending}
              data-testid="button-save-draft"
            >
              <Save className="w-3.5 h-3.5" />
              {isPending ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              size="sm"
              onClick={() => handleSave(false)}
              disabled={isPending}
              data-testid="button-save-invoice"
            >
              {isPending ? "Saving..." : mode === "new" ? "Save Invoice" : "Update Invoice"}
            </Button>
          </div>
        </div>

        {/* Body: split panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT: Form */}
          <ScrollArea className="w-full lg:w-[440px] flex-shrink-0 border-r border-border bg-background">
            <div className="p-6 space-y-6">
              {/* Invoice Details */}
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Invoice Details</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="invoice-number" className="text-xs">Invoice No.</Label>
                    {isLoadingForm ? (
                      <Skeleton className="h-9 w-full" />
                    ) : (
                      <Input
                        id="invoice-number"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        data-testid="input-invoice-number"
                      />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="invoice-date" className="text-xs">Date</Label>
                    <Input
                      id="invoice-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      data-testid="input-invoice-date"
                    />
                  </div>
                </div>
              </div>

              {/* Customer */}
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Customer</h2>
                <div className="space-y-3">
                  {customers.length > 0 && (
                    <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-normal text-sm"
                          data-testid="button-select-customer"
                        >
                          {customerName || "Select saved customer..."}
                          <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[380px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search customers..." />
                          <CommandList>
                            <CommandEmpty>No customers found.</CommandEmpty>
                            <CommandGroup>
                              {customers.map((c) => (
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
                                    <div className="font-medium">{c.name}</div>
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
                    <Label htmlFor="customer-name" className="text-xs">Name</Label>
                    <Input
                      id="customer-name"
                      placeholder="Customer name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      data-testid="input-customer-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-address" className="text-xs">Address</Label>
                    <Input
                      id="customer-address"
                      placeholder="Customer address"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      data-testid="input-customer-address"
                    />
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Items</h2>
                  <button
                    className="flex items-center gap-1 text-xs font-medium text-foreground hover:text-primary"
                    onClick={addItem}
                    data-testid="button-add-item"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
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

                {/* Totals */}
                <div className="mt-4 pt-4 border-t border-border space-y-1.5">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span>Rs. {Math.round(subtotal).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-foreground">
                    <span>Grand Total</span>
                    <span>Rs. {Math.round(grandTotal).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* RIGHT: Preview */}
          <div className="hidden lg:flex flex-1 bg-muted/40 overflow-auto items-start justify-center p-8">
            <div className="w-full max-w-[550px]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Preview</span>
                <span className="text-xs text-muted-foreground">A4 Format</span>
              </div>
              <div id="invoice-preview-panel">
                <InvoicePreview
                  invoiceNumber={invoiceNumber}
                  date={date}
                  customerName={customerName}
                  customerAddress={customerAddress}
                  items={previewItems}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

interface ItemRowCardProps {
  item: ItemRow;
  index: number;
  products: Array<{ id: number; name: string; defaultPrice: number }>;
  onUpdate: (patch: Partial<ItemRow>) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function ItemRowCard({ item, index, products, onUpdate, onRemove, canRemove }: ItemRowCardProps) {
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);

  return (
    <div className="border border-border rounded-lg p-3 space-y-2 bg-card" data-testid={`item-row-${index}`}>
      <div className="flex items-start gap-2">
        {/* Item name with product picker */}
        <div className="flex-1">
          {products.length > 0 ? (
            <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Input
                    placeholder="Item name"
                    value={item.itemName}
                    onChange={(e) => onUpdate({ itemName: e.target.value })}
                    className="pr-7 text-sm"
                    data-testid={`input-item-name-${index}`}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setProductPopoverOpen(true)}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search products..." />
                  <CommandList>
                    <CommandEmpty>No products found.</CommandEmpty>
                    <CommandGroup>
                      {products.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={p.name}
                          onSelect={() => {
                            onUpdate({ itemName: p.name, price: Number(p.defaultPrice) });
                            setProductPopoverOpen(false);
                          }}
                          data-testid={`option-product-${p.id}-item-${index}`}
                        >
                          <div className="flex justify-between w-full">
                            <span>{p.name}</span>
                            <span className="text-xs text-muted-foreground">Rs. {Number(p.defaultPrice).toLocaleString()}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : (
            <Input
              placeholder="Item name"
              value={item.itemName}
              onChange={(e) => onUpdate({ itemName: e.target.value })}
              className="text-sm"
              data-testid={`input-item-name-${index}`}
            />
          )}
        </div>
        {canRemove && (
          <button
            className="p-1.5 mt-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex-shrink-0"
            onClick={onRemove}
            data-testid={`button-remove-item-${index}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Qty</label>
          <Input
            type="number"
            min="1"
            step="1"
            value={item.qty}
            onChange={(e) => onUpdate({ qty: parseFloat(e.target.value) || 1 })}
            className="text-sm"
            data-testid={`input-item-qty-${index}`}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Price (Rs.)</label>
          <Input
            type="number"
            min="0"
            step="1"
            value={item.price}
            onChange={(e) => onUpdate({ price: parseFloat(e.target.value) || 0 })}
            className="text-sm"
            data-testid={`input-item-price-${index}`}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id={`discount-${item.key}`}
          checked={item.discountEnabled}
          onCheckedChange={(checked) => onUpdate({ discountEnabled: checked, discount: checked ? item.discount : 0 })}
          data-testid={`toggle-discount-${index}`}
        />
        <label htmlFor={`discount-${item.key}`} className="text-xs text-muted-foreground cursor-pointer">
          Discount
        </label>
        {item.discountEnabled && (
          <div className="flex items-center gap-1 ml-auto">
            <Input
              type="number"
              min="0"
              max="100"
              step="1"
              value={item.discount}
              onChange={(e) => onUpdate({ discount: parseFloat(e.target.value) || 0 })}
              className="w-20 h-7 text-sm"
              data-testid={`input-item-discount-${index}`}
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        )}
        <span className={cn("text-xs font-medium text-foreground", item.discountEnabled ? "" : "ml-auto")}>
          Rs. {Math.round(lineTotal(item)).toLocaleString()}
        </span>
      </div>
    </div>
  );
}
