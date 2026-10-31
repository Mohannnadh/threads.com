// Builds a self-contained, print-ready HTML invoice. Customers can save it
// as PDF from the browser (File > Print > Save as PDF).

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) =>
    ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[char]
  );

const money = (amount) =>
  '₹' +
  (Number(amount) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const dateText = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

const paymentText = (order) =>
  ({
    COD: 'Cash on delivery',
    ONLINE: 'Online (Razorpay)',
    WALLET: 'Wallet',
  })[order.paymentMethod] || order.paymentMethod;

const buildInvoiceHtml = (order) => {
  const invoiceNo = `TC-${String(order._id).slice(-6).toUpperCase()}`;
  const address = order.shippingAddress || {};

  const addressLines = [
    address.name,
    address.addressLine,
    [address.city, address.state, address.postalCode]
      .filter(Boolean)
      .join(', '),
    address.country,
    address.phone ? `Phone: ${address.phone}` : '',
  ]
    .filter(Boolean)
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join('');

  const rows = (order.items || [])
    .map((item, index) => {
      const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);
      const variant = [item.size && `Size ${item.size}`, item.color]
        .filter(Boolean)
        .join(' · ');

      return `
        <tr>
          <td>${index + 1}</td>
          <td>
            ${escapeHtml(item.name)}
            ${variant ? `<small>${escapeHtml(variant)}</small>` : ''}
          </td>
          <td class="num">${item.quantity}</td>
          <td class="num">${money(item.price)}</td>
          <td class="num">${money(lineTotal)}</td>
        </tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice ${invoiceNo}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 40px;
      font-family: Arial, Helvetica, sans-serif;
      color: #111;
      font-size: 14px;
      line-height: 1.5;
    }
    header, .parties, footer { display: flex; justify-content: space-between; gap: 24px; }
    h1 { margin: 0; font-size: 26px; letter-spacing: 1px; }
    .muted { color: #666; font-size: 12px; }
    .label { color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 28px; }
    th, td { padding: 10px 8px; border-bottom: 1px solid #ddd; text-align: left; vertical-align: top; }
    th { font-size: 12px; color: #555; border-bottom-color: #111; }
    small { display: block; color: #666; font-size: 12px; }
    .num { text-align: right; white-space: nowrap; }
    .totals { margin-left: auto; width: 280px; margin-top: 16px; }
    .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
    .totals .grand { border-top: 1px solid #111; font-weight: 700; font-size: 16px; margin-top: 6px; padding-top: 10px; }
    footer { margin-top: 48px; color: #666; font-size: 12px; }
    .invoice-toolbar { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 24px; }
    .invoice-toolbar button {
      appearance: none; border: 1px solid #111; background: #fff; color: #111;
      padding: 10px 16px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer;
    }
    .invoice-toolbar button.primary { background: #111; color: #fff; }
    @media print {
      body { padding: 20px; }
      .no-print, .invoice-toolbar { display: none; }
    }
  </style>
</head>
<body>
  <div class="invoice-toolbar no-print">
    <button type="button" class="primary" onclick="downloadThisInvoice()">Download</button>
    <button type="button" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <header>
    <div>
      <h1>THREADS.COM</h1>
      <div class="muted">Invoice</div>
    </div>
    <div style="text-align:right">
      <div><strong>Invoice ${invoiceNo}</strong></div>
      <div class="muted">Order ${escapeHtml(order._id)}</div>
      <div class="muted">Placed on ${dateText(order.createdAt)}</div>
    </div>
  </header>

  <section class="parties" style="margin-top:32px">
    <div>
      <div class="label">Billed and shipped to</div>
      ${addressLines || '<div class="muted">No address on file</div>'}
    </div>
    <div>
      <div class="label">Payment</div>
      <div>${escapeHtml(paymentText(order))}</div>
      <div class="muted">Status: ${escapeHtml(order.paymentStatus)}</div>
      <div class="label" style="margin-top:12px">Order status</div>
      <div>${escapeHtml(order.orderStatus)}</div>
    </div>
  </section>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Item</th>
        <th class="num">Qty</th>
        <th class="num">Unit price</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
    <div><span>Shipping</span><span>${money(order.shippingFee)}</span></div>
    ${order.discountAmount > 0 ? `<div><span>Discount${order.couponCode ? ` (${escapeHtml(order.couponCode)})` : ''}</span><span>− ${money(order.discountAmount)}</span></div>` : ''}
    <div class="grand"><span>Total</span><span>${money(order.totalAmount)}</span></div>
  </div>

  <footer>
    <span>Thank you for shopping with Threads.com.</span>
    <span>Computer-generated invoice. No signature required.</span>
  </footer>

  <script>
    // Saves this invoice as a standalone HTML file (toolbar left out).
    function downloadThisInvoice() {
      var copy = document.documentElement.cloneNode(true);
      var toolbar = copy.querySelector('.invoice-toolbar');
      if (toolbar) toolbar.parentNode.removeChild(toolbar);

      var blob = new Blob(['<!doctype html>\\n' + copy.outerHTML], { type: 'text/html' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = 'invoice-${invoiceNo}.html';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
  </script>
</body>
</html>`;
};

module.exports = { buildInvoiceHtml };
