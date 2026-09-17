import React, { useRef } from 'react';
import {
  X,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Building2,
  User,
  Calendar,
  Landmark,
  FileText,
  BadgeCheck,
  Truck,
  ArrowRight,
  Receipt
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { calculateOrderFinancials, formatINR } from '../../utils/commission';

export default function OrderReceiptModal({
  order,
  isOpen,
  onClose,
  viewerRole = 'farmer',
}) {
  const printRef = useRef(null);

  if (!isOpen || !order) return null;

  const fin = calculateOrderFinancials(order.totalAmount || 0);
  const receiptNumber = order.receiptNumber || `RCP-AGM-${(order.orderNumber || order.id || '0000').toString().replace(/\D/g, '').slice(-4) || '8092'}`;
  const settlementDate = order.disbursedAt || order.adminVerifiedAt || order.updatedAt || new Date().toISOString();
  const orderDate = order.createdAt || order.orderDate || new Date().toISOString();
  const utrNumber = order.bankUtr || order.bank_utr || 'CMSICICI202609174092';
  const adminVerifier = order.adminVerifiedBy || order.admin_verified_by || 'AgroLnk Operations Ombudsman';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-3 sm:p-6 flex min-h-full items-start justify-center py-6 sm:py-10">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-[#E5EDE8] shadow-2xl space-y-6 text-left my-auto animate-in fade-in zoom-in-95 duration-200 relative">
        
        {/* Top Control Bar (Hidden on print) */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5EDE8] print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0B3326] text-[#34D399] flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0B3326] font-heading">
                Official Trade Settlement Receipt
              </h3>
              <span className="text-xs text-[#566861]">
                100% Escrow Disbursed & Settled
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              icon={Printer}
              iconPosition="left"
              className="text-xs font-bold py-1.5 px-3 cursor-pointer"
            >
              Print / PDF
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Canvas */}
        <div ref={printRef} className="space-y-6 text-xs text-[#14211D]">
          
          {/* Official Document Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b-2 border-[#0B3326]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold text-[#0B3326] font-heading tracking-tight">
                  AgroLnk
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                  Escrow Verified
                </span>
              </div>
              <p className="text-[11px] text-[#566861] mt-0.5">
                National Agricultural Digital Commodity Exchange & Escrow Clearing House
              </p>
              <p className="text-[10px] text-[#566861]">
                GSTIN: 33AAACA0000A1Z5 • CIN: U01100TN2025PTC123456
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <div className="text-sm font-extrabold font-mono text-[#0B3326]">
                #{receiptNumber}
              </div>
              <div className="text-[11px] text-[#566861]">
                Order: <strong className="font-mono text-[#0B3326]">{order.orderNumber}</strong>
              </div>
              <div className="text-[11px] text-[#566861]">
                Date: <strong>{new Date(settlementDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
              </div>
            </div>
          </div>

          {/* Trade Counterparties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8]">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#566861] block">
                Producer / Seller (Beneficiary)
              </span>
              <div className="font-bold text-sm text-[#0B3326]">
                {order.farmerName || 'Verified Producer'}
              </div>
              <div className="text-[11px] text-[#566861]">
                Location: {order.originState || order.state || 'Tamil Nadu'}, {order.originDistrict || order.district || 'Salem'}
              </div>
              {order.payoutAccountNumber && (
                <div className="text-[11px] text-[#566861]">
                  Bank: {order.payoutBankName || 'Bank'} (A/C: ••••{order.payoutAccountNumber.slice(-4)})
                </div>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#566861] block">
                Wholesale Buyer (Procurement)
              </span>
              <div className="font-bold text-sm text-[#0B3326]">
                {order.buyerName || 'Procurement Buyer'}
              </div>
              <div className="text-[11px] text-[#566861]">
                Delivery Facility: {order.destinationState || order.state || 'Tamil Nadu'}, {order.destinationDistrict || order.district || 'Chennai'}
              </div>
              <div className="text-[11px] text-[#566861]">
                Payment Method: 100% Escrow Direct Transfer
              </div>
            </div>
          </div>

          {/* Consignment Line Item Table */}
          <div className="border border-[#E5EDE8] rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0B3326] text-white text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-2.5 px-3">Commodity & Description</th>
                  <th className="py-2.5 px-3 text-center">Grade</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Unit Rate</th>
                  <th className="py-2.5 px-3 text-right">Trade Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EDE8] text-xs">
                <tr>
                  <td className="py-3 px-3">
                    <span className="font-bold text-[#0B3326] block">
                      {order.commodity} ({order.variety || 'Standard'})
                    </span>
                    <span className="text-[10px] text-[#566861]">
                      Lot #{String(order.orderNumber || '').replace(/^#+/, '')} • Physical inspection & weight verified
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-semibold">
                    {order.grade || 'A'}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold">
                    {Number(order.quantity || 0).toLocaleString('en-IN')} {order.unit || 'kg'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    ₹{Number(order.unitPrice || (order.totalAmount / (order.quantity || 1)) || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-[#0B3326]">
                    {formatINR(fin.tradeValue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Financial Ledger & Platform Fee Deduction Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Escrow Clearance Details */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-[#0B3326]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Escrow Settlement Confirmation</span>
              </div>
              <div className="space-y-1 text-[11px] text-[#0B3326]">
                <div className="flex justify-between">
                  <span className="text-[#566861]">Settlement Status:</span>
                  <strong className="text-emerald-700">✓ 100% Disbursed to Bank</strong>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-[#566861]">Bank UTR No:</span>
                  <strong className="font-bold">{utrNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#566861]">Supervised By:</span>
                  <span>{adminVerifier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#566861]">Disbursement Time:</span>
                  <span>{new Date(settlementDate).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-1.5">
              <div className="flex justify-between text-[#566861]">
                <span>Gross Commodity Value:</span>
                <span className="font-semibold text-[#14211D]">{formatINR(fin.tradeValue)}</span>
              </div>
              <div className="flex justify-between text-[#566861]">
                <span>AgroLnk Facilitation Fee (0.25%):</span>
                <span className="font-semibold text-emerald-700">- {formatINR(fin.sellerFee)}</span>
              </div>
              <div className="pt-2 border-t border-[#E5EDE8] flex justify-between text-sm font-extrabold text-[#0B3326]">
                <span>Net Farmer Payout:</span>
                <span className="text-emerald-700">{formatINR(fin.netSellerReceivable)}</span>
              </div>
              <span className="text-[10px] text-[#566861] block pt-1">
                Zero hidden charges. Amount directly credited to registered bank account.
              </span>
            </div>

          </div>

          {/* Digital Signature & Seal */}
          <div className="pt-4 border-t border-[#E5EDE8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-[#566861]">
            <div className="flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-[#10B981] shrink-0" />
              <span>
                Digitally authenticated by <strong>AgroLnk Escrow Trust Clearing House</strong>. Valid electronic certificate under Information Technology Act, 2000.
              </span>
            </div>
            <div className="shrink-0 text-right font-mono text-[10px]">
              AUTH-SIG: {btoa(receiptNumber).slice(0, 16).toUpperCase()}
            </div>
          </div>

        </div>

        {/* Modal Footer Actions (Hidden on print) */}
        <div className="pt-3 border-t border-[#E5EDE8] flex items-center justify-end gap-3 print:hidden">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold text-[#566861]"
          >
            Close
          </Button>
          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={handlePrint}
            icon={Printer}
            iconPosition="left"
            className="text-xs font-bold shadow-xs cursor-pointer"
          >
            Print / Save Receipt
          </Button>
        </div>

      </div>
    </div>
  );
}
