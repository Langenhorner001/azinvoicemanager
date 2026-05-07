import { cn } from '@/lib/utils';

function formatNum(amount) {
  return Number(amount).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  } catch {
    return dateStr;
  }
}

function formatInvoiceNo(no) {
  if (!no) return '—';
  const match = no.match(/(\d+)$/);
  if (match) {
    return match[1].padStart(9, '0');
  }
  return no;
}

export function InvoicePreview({ invoiceNumber, date, dueDate, customerName, customerAddress, items, className }) {
  let subtotal = 0;
  let grandTotal = 0;

  const computedItems = (items || []).map((item) => {
    const lineSubtotal = item.qty * item.price;
    const isAmount = item.discountType === 'amount';
    const discountAmt = isAmount ? item.discount : lineSubtotal * (item.discount / 100);
    const lineTotal = Math.max(0, lineSubtotal - discountAmt);
    subtotal += lineSubtotal;
    grandTotal += lineTotal;
    return { ...item, lineTotal, discountAmt, isAmount };
  });

  return (
    <div
      id="invoice-preview-panel"
      className={cn(
        'bg-white text-black w-full aspect-[1/1.414] flex flex-col text-[10px] leading-tight overflow-hidden',
        className
      )}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Header: AZ logo + Invoice title */}
      <div className="flex items-center justify-between px-8 pt-7 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <img
            src="/az-logo.png"
            alt="AZ"
            className="w-14 h-14 object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div
            className="w-14 h-14 bg-black text-white font-bold text-xl items-center justify-center rounded hidden"
            aria-hidden
          >
            AZ
          </div>
        </div>
        <div className="text-right">
          <img
            src="/az-invoice-text.png"
            alt="Invoice"
            className="h-9 object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <div
            className="hidden"
            style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontStyle: 'italic', fontWeight: 700 }}
            aria-hidden
          >
            Invoice
          </div>
        </div>
      </div>

      {/* Billed to + Invoice No / Date */}
      <div className="flex items-start justify-between px-8 py-4">
        <div>
          <div className="text-gray-500 uppercase tracking-widest text-[8px] mb-1">Billed to:</div>
          <div className="font-bold text-[11px] uppercase">{customerName || 'CUSTOMER NAME'}</div>
          {customerAddress && (
            <div className="text-gray-600 text-[9px] mt-0.5 whitespace-pre-line">{customerAddress}</div>
          )}
        </div>
        <div className="text-right">
          <div className="text-gray-500 text-[8px]">
            Invoice No.{' '}
            <span className="text-black font-semibold">{formatInvoiceNo(invoiceNumber)}</span>
          </div>
          <div className="text-black font-medium text-[9px] mt-0.5">{formatDate(date) || '—'}</div>
          {dueDate && (
            <div className="text-gray-500 text-[8px] mt-0.5">
              Due: <span className="text-black">{formatDate(dueDate)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="flex-1 px-8">
        {/* Header row */}
        <div className="grid grid-cols-5 border-b border-gray-300 pb-1 mb-1">
          {['Item', 'Quantity', 'Unit Price', 'Discount', 'Total'].map((h, idx) => (
            <div
              key={h}
              className={cn(
                'text-[8px] uppercase tracking-widest text-gray-500 font-medium',
                idx > 0 ? 'text-right' : ''
              )}
            >
              {h}
            </div>
          ))}
        </div>

        {computedItems.length === 0 ? (
          <div className="py-4 text-center text-gray-400 text-[9px]">No items added yet</div>
        ) : (
          <div className="space-y-1">
            {computedItems.map((item, i) => (
              <div key={i} className="grid grid-cols-5 py-0.5">
                <div className="text-[9px] truncate">{item.itemName || '—'}</div>
                <div className="text-[9px] text-right">{item.qty}p</div>
                <div className="text-[9px] text-right">{formatNum(item.price)}</div>
                <div className="text-[9px] text-right">
                  {item.discount > 0
                    ? item.isAmount
                      ? `Rs. ${formatNum(item.discount)}`
                      : `${item.discount}%`
                    : '—'}
                </div>
                <div className="text-[9px] text-right font-medium">{formatNum(Math.round(item.lineTotal))}</div>
              </div>
            ))}
          </div>
        )}

        {/* Subtotal */}
        <div className="flex justify-between items-center border-t border-gray-200 mt-2 pt-1.5">
          <span className="text-[9px] text-gray-500">Subtotal</span>
          <span className="text-[9px] font-medium">{formatNum(subtotal)}</span>
        </div>
      </div>

      {/* Total bar */}
      <div className="mx-8 mt-2 bg-black text-white flex items-center justify-between px-4 py-2 rounded-sm">
        <span className="text-[9px] uppercase tracking-widest font-semibold">Total</span>
        <span className="text-sm font-bold">{formatNum(Math.round(grandTotal))}</span>
      </div>

      {/* Footer area: Thank you + Company info */}
      <div className="flex items-end justify-between px-8 py-4 mt-auto">
        <div>
          <img
            src="/az-thank-you.png"
            alt="Thank you"
            className="h-10 object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <div
            className="hidden font-cursive text-2xl text-gray-700"
            aria-hidden
          >
            Thank you
          </div>
        </div>
        <div className="text-right text-[8px] text-gray-500">
          <div className="font-semibold text-black text-[9px]">AZ DISTRIBUTION</div>
          <div>Ph no. +92 318 4396075</div>
          <div>MIRPUR AZAD KASHMIR, 12130</div>
        </div>
      </div>
    </div>
  );
}
