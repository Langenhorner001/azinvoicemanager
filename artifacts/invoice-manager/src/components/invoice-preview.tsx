import { cn } from "@/lib/utils";

interface InvoiceItem {
  itemName: string;
  qty: number;
  price: number;
  discount: number;
}

interface InvoicePreviewProps {
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerAddress: string;
  items: InvoiceItem[];
  className?: string;
}

function formatRs(amount: number) {
  return `Rs. ${amount.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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

export function InvoicePreview({
  invoiceNumber,
  date,
  customerName,
  customerAddress,
  items,
  className,
}: InvoicePreviewProps) {
  let subtotal = 0;
  let grandTotal = 0;

  const computedItems = items.map((item) => {
    const lineSubtotal = item.qty * item.price;
    const discountAmt = lineSubtotal * (item.discount / 100);
    const lineTotal = lineSubtotal - discountAmt;
    subtotal += lineSubtotal;
    grandTotal += lineTotal;
    return { ...item, lineTotal };
  });

  return (
    <div
      className={cn(
        "bg-white text-black shadow-lg w-full",
        className
      )}
      style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px" }}
      data-testid="invoice-preview"
    >
      {/* Header */}
      <div className="flex justify-between items-start p-6 pb-4">
        <div
          className="w-10 h-10 border-2 border-black flex items-center justify-center flex-shrink-0"
          style={{ borderRadius: 0 }}
        >
          <span style={{ fontWeight: 700, fontSize: "13px", letterSpacing: "-0.03em", color: "#000" }}>AZ</span>
        </div>
        <div className="text-right">
          <div style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.03em", color: "#000", fontFamily: "Georgia, serif" }}>
            Invoice
          </div>
          <div style={{ marginTop: "4px", lineHeight: "1.6" }}>
            <div><span style={{ color: "#888", fontSize: "9px", letterSpacing: "0.08em" }}>NO.</span> <span style={{ fontWeight: 600 }}>{invoiceNumber || "—"}</span></div>
            <div><span style={{ color: "#888", fontSize: "9px", letterSpacing: "0.08em" }}>DATE.</span> <span style={{ fontWeight: 600 }}>{formatDate(date) || "—"}</span></div>
          </div>
        </div>
      </div>

      {/* Billed To */}
      <div className="px-6 pb-4">
        <div style={{ fontSize: "8px", letterSpacing: "0.12em", color: "#888", marginBottom: "4px" }}>BILLED TO</div>
        <div style={{ fontWeight: 700, fontSize: "12px", color: "#000" }}>{customerName || "Customer Name"}</div>
        {customerAddress && (
          <div style={{ color: "#555", marginTop: "1px" }}>{customerAddress}</div>
        )}
      </div>

      {/* Items Table */}
      <div className="px-6">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 50px 60px 40px 64px",
            borderBottom: "1.5px solid #000",
            paddingBottom: "4px",
            marginBottom: "2px",
          }}
        >
          {["ITEM", "QTY", "PRICE", "DISC", "TOTAL"].map((h) => (
            <div
              key={h}
              style={{
                fontSize: "8px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "#000",
                textAlign: h === "ITEM" ? "left" : "right",
              }}
            >
              {h}
            </div>
          ))}
        </div>

        {computedItems.length === 0 ? (
          <div style={{ textAlign: "center", color: "#aaa", padding: "16px 0", fontSize: "10px" }}>
            No items added yet
          </div>
        ) : (
          <div>
            {computedItems.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 50px 60px 40px 64px",
                  padding: "4px 0",
                  borderBottom: "0.5px solid #eee",
                }}
              >
                <div style={{ color: "#222" }}>{item.itemName || "—"}</div>
                <div style={{ textAlign: "right", color: "#444" }}>{item.qty}</div>
                <div style={{ textAlign: "right", color: "#444" }}>Rs. {item.price.toLocaleString()}</div>
                <div style={{ textAlign: "right", color: "#444" }}>
                  {item.discount > 0 ? `${item.discount}%` : "—"}
                </div>
                <div style={{ textAlign: "right", fontWeight: 500, color: "#222" }}>
                  Rs. {Math.round(item.lineTotal).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Subtotal */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "16px", marginTop: "8px", paddingBottom: "6px" }}>
          <span style={{ color: "#666" }}>Subtotal</span>
          <span style={{ fontWeight: 500 }}>{formatRs(subtotal)}</span>
        </div>

        {/* Grand Total bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#111",
            color: "#fff",
            padding: "6px 10px",
            marginBottom: "0",
          }}
        >
          <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em" }}>GRAND TOTAL</span>
          <span style={{ fontWeight: 700, fontSize: "12px" }}>{formatRs(grandTotal)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pt-5 pb-6 flex justify-between items-end">
        <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: "28px", color: "#222", lineHeight: 1 }}>
          Thank you
        </div>
        <div style={{ textAlign: "right", lineHeight: "1.7" }}>
          <div style={{ fontWeight: 700, fontSize: "11px", color: "#000" }}>AZ Distribution</div>
          <div style={{ color: "#666" }}>+92 318 4396075</div>
          <div style={{ color: "#666" }}>Mirpur Azad Kashmir, 12130</div>
        </div>
      </div>
    </div>
  );
}
