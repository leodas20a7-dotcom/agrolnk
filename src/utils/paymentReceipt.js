// AgrowLink Unified Payment Receipt Generator
// Zero-dependency, XSS-safe printable receipt (Print / Save as PDF via the browser print dialog).

const RECEIPT_TITLES = {
  escrow_deposit: 'Escrow Deposit Receipt',
  seller_payout: 'Seller Payout Receipt',
  storage_rent: 'Storage Rent Receipt',
  freight_deposit: 'Freight Escrow Receipt',
  freight_settlement: 'Freight Settlement Receipt',
  loan_disbursement: 'Loan Disbursement Receipt',
  loan_repayment: 'Loan Clearance Receipt',
  inspection_fee: 'Lab Inspection Fee Receipt',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatReceiptAmount(value) {
  return `₹${toNumber(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatReceiptDate(value) {
  const d = value ? new Date(value) : new Date();
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function maskAccount(value) {
  const raw = String(value || '').trim();
  if (!raw || raw === '—') return '';
  if (raw.length <= 4) return raw;
  return `XXXX${raw.slice(-4)}`;
}

function round2(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

function sanitizeFilePart(value) {
  return String(value || 'receipt').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
}

function formatPaymentMode(mode) {
  const m = String(mode || '').toLowerCase();
  if (!m || m === 'direct') return 'Razorpay Gateway';
  if (m.includes('van')) return 'Escrow Virtual Account (NEFT / RTGS)';
  if (m.includes('trade_credit')) return 'Trade Credit Facility';
  if (m.includes('razorpay')) return 'Razorpay Gateway';
  if (m.includes('upi')) return 'UPI';
  return String(mode);
}

function buildReceiptHtml(config) {
  const title = config.title || RECEIPT_TITLES[config.type] || 'Payment Receipt';
  const references = (config.references || []).filter((r) => r && r.value !== undefined && r.value !== null && String(r.value).trim() !== '');
  const lineItems = (config.lineItems || []).filter((li) => li && li.label);
  const parties = [config.payer, config.payee].filter((p) => p && p.name);

  const partiesHtml = parties
    .map(
      (p) => `
        <div class="party">
          <div class="label">${escapeHtml(p.label || '')}</div>
          <div class="name">${escapeHtml(p.name)}</div>
          ${p.detail ? `<div class="detail">${escapeHtml(p.detail)}</div>` : ''}
        </div>`
    )
    .join('');

  const referencesHtml = references
    .map(
      (r) => `
        <div class="ref">
          <span class="ref-label">${escapeHtml(r.label)}</span>
          <span class="ref-value">${escapeHtml(r.value)}</span>
        </div>`
    )
    .join('');

  const lineItemsHtml = lineItems
    .map(
      (li) => `
        <tr>
          <td>${escapeHtml(li.label)}${li.note ? `<div class="note">${escapeHtml(li.note)}</div>` : ''}</td>
          <td class="amt ${li.negative ? 'neg' : ''}">${li.negative ? '− ' : ''}${escapeHtml(formatReceiptAmount(Math.abs(toNumber(li.amount))))}</td>
        </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)} — ${escapeHtml(config.receiptNumber || '')}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #14211D; background: #ffffff; }
  .sheet { max-width: 720px; margin: 0 auto; border: 1px solid #E5EDE8; border-radius: 16px; overflow: hidden; }
  .head { background: #0B3326; color: #ffffff; padding: 24px 28px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
  .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.3px; }
  .brand-sub { font-size: 11px; color: #A7F3D0; margin-top: 2px; text-transform: uppercase; letter-spacing: 1px; }
  .doc { text-align: right; }
  .doc-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #34D399; }
  .doc-num { font-family: 'Courier New', monospace; font-size: 12px; margin-top: 4px; }
  .doc-date { font-size: 11px; color: #D1FAE5; margin-top: 2px; }
  .body { padding: 24px 28px; }
  .status { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
  .parties { display: grid; grid-template-columns: repeat(${Math.max(parties.length, 1)}, 1fr); gap: 16px; margin: 18px 0; }
  .party { padding: 14px; border: 1px solid #E5EDE8; border-radius: 12px; background: #F8FAF8; }
  .label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #566861; }
  .name { font-size: 14px; font-weight: 700; margin-top: 4px; }
  .detail { font-size: 11px; color: #566861; margin-top: 3px; }
  .refs { border: 1px solid #E5EDE8; border-radius: 12px; padding: 6px 14px; margin-bottom: 18px; }
  .ref { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px dashed #E5EDE8; font-size: 12px; }
  .ref:last-child { border-bottom: none; }
  .ref-label { color: #566861; }
  .ref-value { font-family: 'Courier New', monospace; font-weight: 700; text-align: right; word-break: break-all; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #566861; padding: 8px 0; border-bottom: 1px solid #E5EDE8; }
  th.amt { text-align: right; }
  td { padding: 10px 0; border-bottom: 1px solid #F1F5F3; vertical-align: top; }
  td.amt { text-align: right; font-family: 'Courier New', monospace; font-weight: 700; white-space: nowrap; }
  td.neg { color: #B45309; }
  .note { font-size: 11px; color: #566861; margin-top: 2px; }
  .total { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding: 14px 16px; border-radius: 12px; background: #ECFDF5; border: 1px solid #A7F3D0; }
  .total-label { font-size: 13px; font-weight: 700; color: #065F46; }
  .total-amt { font-size: 20px; font-weight: 800; color: #047857; font-family: 'Courier New', monospace; }
  .meta { margin-top: 18px; font-size: 11px; color: #566861; line-height: 1.6; }
  .foot { padding: 14px 28px; background: #F8FAF8; border-top: 1px solid #E5EDE8; font-size: 10px; color: #566861; text-align: center; }
  @media print {
    body { padding: 0; }
    .sheet { border: none; border-radius: 0; }
    .head, .status, .total { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div>
        <div class="brand">AgrowLink</div>
        <div class="brand-sub">A Fairer Agri Marketplace</div>
      </div>
      <div class="doc">
        <div class="doc-title">${escapeHtml(title)}</div>
        <div class="doc-num">${escapeHtml(config.receiptNumber || '')}</div>
        <div class="doc-date">${escapeHtml(formatReceiptDate(config.date))}</div>
      </div>
    </div>
    <div class="body">
      <span class="status">${escapeHtml(config.status || 'Paid')}</span>
      ${parties.length ? `<div class="parties">${partiesHtml}</div>` : ''}
      ${references.length ? `<div class="refs">${referencesHtml}</div>` : ''}
      ${
        lineItems.length
          ? `<table>
              <thead><tr><th>Description</th><th class="amt">Amount</th></tr></thead>
              <tbody>${lineItemsHtml}</tbody>
            </table>`
          : ''
      }
      <div class="total">
        <span class="total-label">${escapeHtml(config.total?.label || 'Total')}</span>
        <span class="total-amt">${escapeHtml(formatReceiptAmount(config.total?.amount))}</span>
      </div>
      <div class="meta">
        ${config.paymentMode ? `<div><strong>Payment Mode:</strong> ${escapeHtml(config.paymentMode)}</div>` : ''}
        ${config.notes ? `<div>${escapeHtml(config.notes)}</div>` : ''}
      </div>
    </div>
    <div class="foot">
      This is a computer-generated AgrowLink transaction receipt and does not require a signature.
      Generated on ${escapeHtml(formatReceiptDate(new Date()))}.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Render a receipt into a hidden iframe and open the browser print dialog (Print / Save as PDF).
 */
export function downloadPaymentReceipt(config) {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !config) return false;

  const html = buildReceiptHtml(config);
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return false;
  }

  doc.open();
  doc.write(html);
  doc.close();
  try {
    doc.title = `${sanitizeFilePart(config.title || RECEIPT_TITLES[config.type] || 'Receipt')}_${sanitizeFilePart(config.receiptNumber)}`;
  } catch {}

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1000);
  };

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.error('Receipt print error:', err);
    }
    cleanup();
  }, 250);

  return true;
}

// ---------------------------------------------------------------------------
// Receipt builders (accept mapped camelCase objects, tolerate snake_case)
// ---------------------------------------------------------------------------

function pick(obj, ...keys) {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

function orderBasics(order) {
  const orderNumber = pick(order, 'orderNumber', 'order_number', 'id') || '—';
  const commodity = pick(order, 'commodity') || 'Produce';
  const variety = pick(order, 'variety');
  const grade = pick(order, 'grade');
  const quantity = toNumber(pick(order, 'quantity'));
  const unit = pick(order, 'unit') || 'kg';
  const cropAmount = round2(pick(order, 'totalAmount', 'total_amount'));
  const lotLabel = `${commodity}${variety && variety !== 'None' ? ` (${variety}` : ''}${variety && variety !== 'None' && grade ? `, Grade ${grade})` : variety && variety !== 'None' ? ')' : grade ? ` (Grade ${grade})` : ''}`;
  return { orderNumber, commodity, quantity, unit, cropAmount, lotLabel };
}

export function isOrderEscrowPaid(order) {
  if (!order) return false;
  const escrow = String(pick(order, 'escrowStatus', 'escrow_status') || '');
  return ['funded', 'escrow_secured', 'held', 'released'].includes(escrow) || pick(order, 'status') === 'completed';
}

export function isOrderPayoutReleased(order) {
  if (!order) return false;
  return (
    pick(order, 'status') === 'completed' ||
    pick(order, 'escrowStatus', 'escrow_status') === 'released' ||
    pick(order, 'adminVerificationStatus', 'admin_verification_status') === 'approved'
  );
}

export function buildOrderEscrowReceipt(order) {
  const { orderNumber, quantity, unit, cropAmount, lotLabel } = orderBasics(order);
  const buyerFee = round2(pick(order, 'buyerFeeAmount', 'buyer_fee_amount') ?? cropAmount * 0.0025);
  const freight = round2(pick(order, 'freightAmount', 'freight_amount'));
  const freightFee = round2(pick(order, 'freightFeeAmount', 'freight_fee_amount') ?? freight * 0.0025);
  const computedTotal = round2(cropAmount + buyerFee + freight + (freight > 0 ? freightFee : 0));
  const storedGrand = round2(pick(order, 'grandTotalAmount', 'grand_total_amount'));
  const total = storedGrand > computedTotal ? storedGrand : computedTotal;

  const lineItems = [
    { label: `${lotLabel}`, note: `${quantity.toLocaleString('en-IN')} ${unit}`, amount: cropAmount },
    { label: 'AgrowLink Buyer Platform Fee (0.25%)', amount: buyerFee },
  ];
  if (freight > 0) {
    lineItems.push({ label: 'Freight / Transport Charges', amount: freight });
    lineItems.push({ label: 'Freight Platform Fee (0.25%)', amount: freightFee });
  }

  return {
    type: 'escrow_deposit',
    receiptNumber: `RCPT-ESC-${String(orderNumber).replace(/^#/, '')}`,
    date: pick(order, 'updatedAt', 'updated_at', 'createdAt', 'created_at'),
    status: pick(order, 'escrowStatus', 'escrow_status') === 'released' ? 'Paid · Released to Seller' : 'Paid · Held in Escrow',
    payer: { label: 'Paid By (Buyer)', name: pick(order, 'buyerCompany', 'buyerName', 'buyer_name') || 'Buyer' },
    payee: { label: 'Paid To', name: 'AgrowLink Escrow Nodal Account', detail: `On behalf of ${pick(order, 'farmerName', 'farmer_name') || 'Seller'}` },
    references: [
      { label: 'Order Number', value: orderNumber },
      { label: 'Payment Reference / UTR', value: pick(order, 'bankUtr', 'bank_utr', 'paymentId', 'payment_id') },
    ],
    lineItems,
    total: { label: 'Total Amount Paid', amount: total },
    paymentMode: formatPaymentMode(pick(order, 'paymentMode', 'payment_mode')),
    notes: 'Funds are held securely in AgrowLink escrow until delivery is confirmed and verified.',
  };
}

export function buildSellerPayoutReceipt(order) {
  const { orderNumber, quantity, unit, cropAmount, lotLabel } = orderBasics(order);
  const sellerFee = round2(pick(order, 'sellerFeeAmount', 'seller_fee_amount') ?? cropAmount * 0.0025);
  const storedNet = round2(pick(order, 'netSellerAmount', 'net_seller_amount'));
  const net = storedNet > 0 ? storedNet : round2(cropAmount - sellerFee);
  const bankName = pick(order, 'payoutBankName', 'payout_bank_name');
  const account = maskAccount(pick(order, 'payoutAccountNumber', 'payout_account_number'));
  const ifsc = pick(order, 'payoutIfsc', 'payout_ifsc');

  return {
    type: 'seller_payout',
    receiptNumber: `RCPT-PAY-${String(orderNumber).replace(/^#/, '')}`,
    date: pick(order, 'disbursedAt', 'disbursed_at', 'adminVerifiedAt', 'admin_verified_at', 'updatedAt', 'updated_at'),
    status: 'Settled to Bank',
    payer: { label: 'Paid By', name: 'AgrowLink Escrow Nodal Account', detail: `Buyer: ${pick(order, 'buyerCompany', 'buyerName', 'buyer_name') || 'Buyer'}` },
    payee: {
      label: 'Paid To (Seller)',
      name: pick(order, 'farmerName', 'farmer_name') || 'Seller',
      detail: [bankName && bankName !== 'Bank Account' ? bankName : '', account ? `A/C ${account}` : '', ifsc && ifsc !== '—' ? `IFSC ${ifsc}` : '']
        .filter(Boolean)
        .join(' · '),
    },
    references: [
      { label: 'Order Number', value: orderNumber },
      { label: 'Bank Settlement UTR', value: pick(order, 'bankUtr', 'bank_utr') },
    ],
    lineItems: [
      { label: `Gross Sale Value — ${lotLabel}`, note: `${quantity.toLocaleString('en-IN')} ${unit}`, amount: cropAmount },
      { label: 'AgrowLink Seller Platform Fee (0.25%)', amount: sellerFee, negative: true },
    ],
    total: { label: 'Net Amount Settled', amount: net },
    paymentMode: 'Bank Transfer (Escrow Release)',
    notes: 'Escrow released after delivery confirmation and AgrowLink verification.',
  };
}

/**
 * Resolve the correct order receipt for the viewer:
 * sellers (farmer / fpo / seller) get a payout receipt once escrow is released,
 * buyers get an escrow deposit receipt once payment is secured. Returns null when not applicable.
 */
export function getOrderReceiptForRole(order, viewerRole = 'buyer') {
  if (!order) return null;
  const role = String(viewerRole || '').toLowerCase();
  const isSellerView = ['farmer', 'fpo', 'seller'].includes(role);
  if (isSellerView) {
    return isOrderPayoutReleased(order) ? buildSellerPayoutReceipt(order) : null;
  }
  return isOrderEscrowPaid(order) ? buildOrderEscrowReceipt(order) : null;
}

export function canDownloadOrderReceipt(order, viewerRole = 'buyer') {
  const role = String(viewerRole || '').toLowerCase();
  if (['farmer', 'fpo', 'seller'].includes(role)) return isOrderPayoutReleased(order);
  return isOrderEscrowPaid(order);
}

export function getLatestRentPayment(inventory) {
  const history = Array.isArray(inventory?.rentPaymentHistory) ? inventory.rentPaymentHistory : [];
  if (history.length === 0) return null;
  return [...history].sort((a, b) => new Date(b?.paidAt || 0) - new Date(a?.paidAt || 0))[0] || null;
}

export function hasStorageRentPaid(inventory) {
  if (!inventory) return false;
  const status = String(inventory.status || '').toLowerCase();
  if (['quote_requested', 'quote_provided', 'pending_approval', 'rejected'].includes(status)) {
    return false;
  }
  return (
    (Array.isArray(inventory.rentPaymentHistory) && inventory.rentPaymentHistory.length > 0) ||
    Boolean(inventory.lastRentPaidAt) ||
    inventory.initialPaymentStatus === 'paid' ||
    inventory.rentDeadline?.status === 'paid'
  );
}

export function buildStorageRentReceipt(inventory, payment) {
  const pay = payment || getLatestRentPayment(inventory) || {};
  const amount = round2(pay.amount ?? inventory?.initialPaymentAmount ?? inventory?.storageFeeMonthly ?? inventory?.quotedMonthlyRent);
  const depositorFee = round2(pay.depositorFee ?? 0);
  const warehouseFee = round2(pay.warehouseFee ?? 0);
  const lotLabel = `${inventory?.commodity || 'Produce'}${inventory?.variety ? ` (${inventory.variety})` : ''}`;

  const lineItems = [
    {
      label: `Storage Rent — ${lotLabel}`,
      note: `${toNumber(inventory?.totalQuantity).toLocaleString('en-IN')} ${inventory?.unit || 'kg'}${pay.extendedDays ? ` · ${pay.extendedDays} days` : ''}${inventory?.chamber ? ` · ${inventory.chamber}` : ''}`,
      amount,
    },
  ];
  if (depositorFee > 0) {
    lineItems.push({ label: 'AgrowLink Depositor Facilitation Fee (0.25%)', amount: depositorFee, note: 'Included in rent paid' });
  }
  if (warehouseFee > 0) {
    lineItems.push({ label: 'AgrowLink Warehouse Facilitation Fee (0.25%)', amount: warehouseFee, note: 'Deducted from warehouse settlement' });
  }

  return {
    type: 'storage_rent',
    receiptNumber: `RCPT-RENT-${sanitizeFilePart(pay.transactionRef || pay.id || inventory?.receiptNumber || inventory?.id)}`,
    date: pay.paidAt || inventory?.lastRentPaidAt,
    status: 'Rent Paid',
    payer: { label: 'Paid By (Depositor)', name: pay.paidBy || inventory?.farmerName || 'Depositor' },
    payee: { label: 'Paid To (Warehouse)', name: inventory?.warehouseName || 'Warehouse' },
    references: [
      { label: 'e-NWR Receipt Number', value: inventory?.receiptNumber },
      { label: 'Transaction Reference', value: pay.transactionRef },
      { label: 'Storage Valid Until', value: inventory?.validUntil ? formatReceiptDate(inventory.validUntil) : '' },
      { label: 'Net Settled to Warehouse', value: pay.netWarehouseSettled ? formatReceiptAmount(pay.netWarehouseSettled) : '' },
    ],
    lineItems,
    total: { label: 'Total Rent Paid', amount },
    paymentMode: pay.paymentMethod || 'Razorpay Gateway',
    notes: pay.notes || '',
  };
}

export function isFreightPaid(delivery) {
  if (!delivery) return false;
  return ['escrow_locked', 'locked', 'released'].includes(String(delivery.freightEscrowStatus || '')) || delivery.status === 'completed';
}

export function buildFreightReceipt(delivery, viewerRole = 'buyer') {
  const base = round2(delivery?.freightBaseAmount || delivery?.freightAmount);
  const consignorFee = round2(delivery?.consignorFreightFee || base * 0.0025);
  const transporterFee = round2(delivery?.transporterCommissionFee || base * 0.0025);
  const net = round2(delivery?.transporterNetPayout || base - transporterFee);
  const isReleased = delivery?.freightEscrowStatus === 'released' || delivery?.status === 'completed';
  const isTransporterView = String(viewerRole).toLowerCase() === 'transporter';
  const route = [
    [delivery?.pickupLocation?.district, delivery?.pickupLocation?.state].filter(Boolean).join(', '),
    [delivery?.deliveryLocation?.district, delivery?.deliveryLocation?.state].filter(Boolean).join(', '),
  ]
    .filter(Boolean)
    .join(' → ');
  const deliveryNumber = delivery?.deliveryNumber || delivery?.id || '—';

  if (isTransporterView) {
    return {
      type: 'freight_settlement',
      receiptNumber: `RCPT-FRT-${sanitizeFilePart(deliveryNumber)}`,
      date: delivery?.freightDisbursedAt || delivery?.freightDepositedAt || delivery?.updatedAt,
      status: isReleased ? 'Settled to Transporter' : 'Freight Secured in Escrow',
      payer: { label: 'Paid By', name: 'AgrowLink Escrow Nodal Account', detail: `Consignor: ${delivery?.buyerName || 'Buyer'}` },
      payee: { label: 'Paid To (Transporter)', name: delivery?.transporterName || 'Transporter', detail: delivery?.vehicleNumber ? `Vehicle ${delivery.vehicleNumber}` : '' },
      references: [
        { label: 'Delivery Number', value: deliveryNumber },
        { label: 'Order Number', value: delivery?.orderNumber },
        { label: 'Route', value: route },
        { label: 'Disbursal UTR', value: delivery?.freightDisbursalUtr },
      ],
      lineItems: [
        { label: `Gross Freight — ${delivery?.commodity || 'Produce'}`, note: `${toNumber(delivery?.quantity).toLocaleString('en-IN')} ${delivery?.unit || 'kg'}`, amount: base },
        { label: 'AgrowLink Transporter Platform Fee (0.25%)', amount: transporterFee, negative: true },
      ],
      total: { label: isReleased ? 'Net Freight Settled' : 'Net Freight Payable', amount: net },
      paymentMode: 'Bank Transfer (Escrow Release)',
    };
  }

  return {
    type: 'freight_deposit',
    receiptNumber: `RCPT-FRT-${sanitizeFilePart(deliveryNumber)}`,
    date: delivery?.freightDepositedAt || delivery?.updatedAt,
    status: isReleased ? 'Paid · Released to Transporter' : 'Paid · Held in Escrow',
    payer: { label: 'Paid By', name: delivery?.buyerName || 'Buyer' },
    payee: { label: 'Paid To', name: 'AgrowLink Escrow Nodal Account', detail: `On behalf of ${delivery?.transporterName || 'Transporter'}` },
    references: [
      { label: 'Delivery Number', value: deliveryNumber },
      { label: 'Order Number', value: delivery?.orderNumber },
      { label: 'Route', value: route },
      { label: 'Payment Reference / UTR', value: delivery?.freightBankUtr },
    ],
    lineItems: [
      { label: `Freight — ${delivery?.commodity || 'Produce'}`, note: `${toNumber(delivery?.quantity).toLocaleString('en-IN')} ${delivery?.unit || 'kg'}`, amount: base },
      { label: 'Freight Platform Fee (0.25%)', amount: consignorFee },
    ],
    total: { label: 'Total Freight Paid', amount: round2(delivery?.totalFreightPayable > base ? delivery.totalFreightPayable : base + consignorFee) },
    paymentMode: formatPaymentMode(delivery?.freightPaymentMode),
  };
}

export function isLoanDisbursed(loan) {
  return Boolean(loan && (['disbursed', 'repaid', 'settled'].includes(loan.status) || loan.disbursedAt));
}

export function isLoanRepaid(loan) {
  return Boolean(loan && (['repaid', 'settled'].includes(loan.status) || loan.repaymentTransactionId || loan.repaidAt));
}

export function buildLoanDisbursementReceipt(loan) {
  const amount = round2(loan?.approvedAmount || loan?.offeredAmount || loan?.requestedAmount);
  const requestNumber = loan?.requestNumber || loan?.id || '—';
  return {
    type: 'loan_disbursement',
    receiptNumber: `RCPT-DSB-${sanitizeFilePart(requestNumber)}`,
    date: loan?.disbursedAt || loan?.updatedAt,
    status: 'Disbursed',
    payer: { label: 'Disbursed By (Lender)', name: loan?.financierName || 'Financial Institution' },
    payee: { label: 'Disbursed To (Borrower)', name: loan?.applicantName || 'Borrower', detail: loan?.applicantRole ? String(loan.applicantRole).toUpperCase() : '' },
    references: [
      { label: 'Loan Reference', value: requestNumber },
      { label: 'Linked Order', value: loan?.orderNumber },
      { label: 'Pledged e-NWR Receipt', value: loan?.receiptNumber },
      { label: 'Interest Rate', value: loan?.interestRate !== undefined ? `${loan.interestRate}% per month` : '' },
      { label: 'Tenor', value: loan?.tenorDays ? `${loan.tenorDays} days` : '' },
      { label: 'Disbursement UTR', value: loan?.bankUtr || loan?.paymentId },
    ],
    lineItems: [{ label: `Principal — ${loan?.purposeLabel || loan?.commodity || 'Trade Finance'}`, amount }],
    total: { label: 'Total Principal Disbursed', amount },
    paymentMode: 'Bank Transfer',
  };
}

export function buildLoanRepaymentReceipt(loan, override = {}) {
  const principal = round2(override.principal ?? loan?.repaymentPrincipal ?? loan?.approvedAmount);
  const interest = round2(override.interest ?? loan?.repaymentInterest ?? 0);
  const total = round2(override.totalPaid ?? loan?.repaymentAmount ?? principal + interest);
  const requestNumber = override.loanNumber || loan?.requestNumber || loan?.id || '—';
  return {
    type: 'loan_repayment',
    receiptNumber: `RCPT-RPY-${sanitizeFilePart(requestNumber)}`,
    date: override.paidAt || loan?.repaidAt || loan?.updatedAt,
    status: 'Repaid · Lien Cleared',
    payer: { label: 'Repaid By (Borrower)', name: override.borrowerName || loan?.applicantName || 'Borrower' },
    payee: { label: 'Repaid To (Lender)', name: override.institutionName || loan?.financierName || 'Financial Institution' },
    references: [
      { label: 'Loan Reference', value: requestNumber },
      { label: 'Linked Order', value: loan?.orderNumber },
      { label: 'Released e-NWR Receipt', value: loan?.receiptNumber },
      { label: 'Settlement Transaction ID', value: override.txnId || loan?.repaymentTransactionId },
    ],
    lineItems: [
      { label: 'Principal Repaid', amount: principal },
      { label: 'Interest', amount: interest },
    ],
    total: { label: 'Total Amount Repaid', amount: total },
    paymentMode: override.paymentMethod || formatPaymentMode(loan?.repaymentMethod || 'razorpay'),
    notes: 'Loan settled in full. Any pledged warehouse collateral lien has been released.',
  };
}

export function buildInspectionFeeReceipt(inspection) {
  const fee = round2(inspection?.inspectionFee || 500);
  const reportNumber = inspection?.reportNumber || inspection?.id || '—';
  return {
    type: 'inspection_fee',
    receiptNumber: `RCPT-LAB-${sanitizeFilePart(reportNumber)}`,
    date: inspection?.feePaidAt || inspection?.updatedAt,
    status: 'Fee Paid',
    payer: { label: 'Paid By (Buyer)', name: inspection?.buyerName || 'Buyer' },
    payee: { label: 'Paid To', name: inspection?.labName || 'AgrowLink Quality Assurance Lab' },
    references: [
      { label: 'Inspection Report', value: reportNumber },
      { label: 'Linked Order', value: inspection?.orderNumber },
      { label: 'Payment Reference', value: inspection?.feePaymentId },
    ],
    lineItems: [{ label: `Quality Lab Assay — ${inspection?.commodity || inspection?.cropName || 'Produce'}`, amount: fee }],
    total: { label: 'Total Fee Paid', amount: fee },
    paymentMode: inspection?.feePaymentMethod || 'Razorpay Gateway',
  };
}
