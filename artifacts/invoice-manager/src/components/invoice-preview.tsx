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

function formatNum(amount: number) {
  return amount.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d
      .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      .toUpperCase();
  } catch {
    return dateStr;
  }
}

function formatInvoiceNo(no: string) {
  if (!no) return "—";
  // Try to pad numeric portion to 9 digits like 000000289
  const match = no.match(/(\d+)$/);
  if (match) {
    const num = match[1].padStart(9, "0");
    return num;
  }
  return no;
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
    return { ...item, lineTotal, discountAmt };
  });

  return (
    <div
      className={cn("bg-white text-black shadow-lg w-full", className)}
      style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: "12px",
        aspectRatio: "1 / 1.414",
        padding: "44px 52px 36px",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
      data-testid="invoice-preview"
    >
      {/* Header: AZ logo + Invoice title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: "italic",
            fontWeight: 900,
            fontSize: "64px",
            lineHeight: 1,
            letterSpacing: "-0.06em",
            color: "#000",
          }}
        >
          AZ
        </div>
        <div
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 900,
            fontStyle: "italic",
            fontSize: "44px",
            lineHeight: 1,
            color: "#000",
            letterSpacing: "-0.02em",
          }}
        >
          Invoice
        </div>
      </div>

      {/* Billed to + Invoice No / Date */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "44px" }}>
        <div style={{ maxWidth: "55%" }}>
          <div style={{ fontWeight: 700, fontSize: "12px", color: "#000", marginBottom: "6px" }}>
            Billed to:
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: "13px",
              color: "#000",
              textTransform: "uppercase",
              letterSpacing: "0.02em",
            }}
          >
            {customerName || "CUSTOMER NAME"}
          </div>
          {customerAddress && (
            <div
              style={{
                color: "#222",
                marginTop: "2px",
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.02em",
              }}
            >
              {customerAddress}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right", lineHeight: 1.6 }}>
          <div style={{ color: "#000", fontSize: "12px" }}>
            Invoice No.{" "}
            <span style={{ fontWeight: 600 }}>{formatInvoiceNo(invoiceNumber)}</span>
          </div>
          <div style={{ fontWeight: 700, color: "#000", fontSize: "12px", marginTop: "2px" }}>
            {formatDate(date) || "—"}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div style={{ marginTop: "40px" }}>
        {/* Header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
            paddingBottom: "8px",
            borderBottom: "1px solid #000",
          }}
        >
          {["Item", "Quantity", "Unit Price", "Discount", "Total"].map((h, idx) => (
            <div
              key={h}
              style={{
                fontWeight: 700,
                color: "#000",
                fontSize: "12px",
                textAlign: idx === 0 ? "left" : idx === 4 ? "right" : "center",
                paddingLeft: idx === 0 ? "8px" : 0,
              }}
            >
              {h}
            </div>
          ))}
        </div>

        {computedItems.length === 0 ? (
          <div style={{ textAlign: "center", color: "#bbb", padding: "24px 0", fontSize: "11px" }}>
            No items added yet
          </div>
        ) : (
          <div>
            {computedItems.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                  padding: "12px 0",
                  borderBottom: i === computedItems.length - 1 ? "1px solid #000" : "none",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: "#000",
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    fontSize: "12px",
                    paddingLeft: "8px",
                  }}
                >
                  {item.itemName || "—"}
                </div>
                <div style={{ textAlign: "center", color: "#000", fontSize: "12px" }}>
                  {item.qty}p
                </div>
                <div style={{ textAlign: "center", color: "#000", fontSize: "12px" }}>
                  {formatNum(item.price)}
                </div>
                <div style={{ textAlign: "center", color: "#000", fontSize: "12px" }}>
                  {item.discount > 0 ? `${item.discount}` : "—"}
                </div>
                <div style={{ textAlign: "right", color: "#000", fontSize: "12px" }}>
                  {formatNum(Math.round(item.lineTotal))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Subtotal */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
            padding: "14px 0",
          }}
        >
          <div></div>
          <div></div>
          <div></div>
          <div style={{ textAlign: "center", fontWeight: 700, color: "#000", fontSize: "12px" }}>
            Subtotal
          </div>
          <div style={{ textAlign: "right", color: "#000", fontSize: "12px" }}>
            {formatNum(subtotal)}
          </div>
        </div>

        {/* Total bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
            background: "#000",
            color: "#fff",
            padding: "12px 0",
          }}
        >
          <div></div>
          <div></div>
          <div></div>
          <div
            style={{
              textAlign: "center",
              fontWeight: 700,
              fontSize: "16px",
              fontFamily: "'Playfair Display', Georgia, serif",
            }}
          >
            Total
          </div>
          <div
            style={{
              textAlign: "right",
              fontWeight: 700,
              fontSize: "16px",
              paddingRight: "8px",
              fontFamily: "'Playfair Display', Georgia, serif",
            }}
          >
            {formatNum(Math.round(grandTotal))}
          </div>
        </div>
      </div>

      {/* Footer area: Thank you + Company info */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: "40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: "72px",
            color: "#111",
            lineHeight: 0.9,
            fontWeight: 500,
            transform: "rotate(-2deg)",
            transformOrigin: "left bottom",
          }}
        >
          Thank you
        </div>
        <div style={{ textAlign: "right", lineHeight: 1.7, fontSize: "12px" }}>
          <div style={{ fontWeight: 700, color: "#000", letterSpacing: "0.04em" }}>
            AZ DISTRIBUTION
          </div>
          <div style={{ color: "#000" }}>Ph no. +92 318 4396075</div>
          <div style={{ color: "#000", letterSpacing: "0.02em" }}>
            MIRPUR AZAD KASHMIR, 12130
          </div>
        </div>
      </div>
    </div>
  );
}
