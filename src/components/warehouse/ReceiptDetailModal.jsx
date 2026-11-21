import React from 'react';
import {
  X,
  Building2,
  Package,
  Calendar,
  ShieldCheck,
  Award,
  Sparkles,
  Landmark,
  FileText,
  User,
  MapPin,
  Lock,
  ArrowRight,
  CheckCircle2,
  Layers
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import ReceiptDownloadButton from '../ui/ReceiptDownloadButton';
import { buildStorageRentReceipt, hasStorageRentPaid } from '../../utils/paymentReceipt';

export default function ReceiptDetailModal({
  inventory,
  currentUser,
  onClose,
  onList,
  onPayRent,
  onRequestFinancing,
}) {
  if (!inventory) return null;

  const normalizedStatus = String(inventory.status || '').toLowerCase();
  const isIssuedEnwr = ['stored', 'partially_listed', 'released'].includes(normalizedStatus);
  const canPayRentInModal = isIssuedEnwr || ['quote_accepted', 'awaiting_payment'].includes(normalizedStatus);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs p-2 sm:p-6 flex items-center justify-center">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full p-3.5 sm:p-8 border border-[#E5EDE8] shadow-2xl space-y-3 sm:space-y-6 text-left max-h-[94dvh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 relative">
        
        {/* Top Official Header with WDRA Accreditation */}
        <div className="flex items-start sm:items-center justify-between gap-2 pb-2.5 sm:pb-3 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#0B3326] text-white flex items-center justify-center shrink-0">
              <Award className="w-4 h-4 sm:w-5 sm:h-5 text-[#34D399]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-xl font-extrabold text-[#0B3326] font-heading leading-tight">
                  {isIssuedEnwr ? 'Electronic Negotiable Warehouse Receipt' : 'Storage Deposit Request'}
                </h3>
              </div>
              <span className="text-[11px] sm:text-xs text-[#10B981] font-bold block leading-snug">
                {inventory.receiptNumber} • {isIssuedEnwr ? 'WDRA Accredited Electronic Title' : 'Pre-Deposit Booking (e-NWR issued after arrival & assay)'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 sm:p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Official Certificate Box */}
        <div className="p-3 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#F8FAF8] to-[#EBF5F0]/50 border-2 border-[#10B981]/30 space-y-2.5 sm:space-y-5 relative overflow-hidden">
          <div className="absolute right-3 -top-3 sm:right-4 sm:-top-8 text-[#10B981]/10 font-mono text-5xl sm:text-8xl font-black select-none pointer-events-none">
            {isIssuedEnwr ? 'e-NWR' : 'DRAFT'}
          </div>

          {/* Certificate Top Line */}
          <div className="grid grid-cols-2 items-start gap-2 relative z-10">
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
                Beneficiary Depositor
              </span>
              <span className="text-sm sm:text-base font-extrabold text-[#0B3326] font-heading truncate block">
                {inventory.farmerName || 'Depositor / Farmer'}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[9px] sm:text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
                Deposit Timestamp
              </span>
              <span className="text-[11px] sm:text-xs font-semibold text-[#14211D]">
                {(() => {
                  try {
                    const d = inventory.depositedAt ? new Date(inventory.depositedAt) : new Date();
                    return isNaN(d.getTime()) ? 'Recent Deposit' : d.toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });
                  } catch {
                    return 'Recent Deposit';
                  }
                })()}
              </span>
            </div>
          </div>

          {/* Commodity & Volume Metric */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-[#E5EDE8] shadow-xs relative z-10">
            <div className="col-span-2 sm:col-span-1 pb-2 sm:pb-0 border-b sm:border-b-0 border-[#E5EDE8]/70">
              <span className="text-[9px] sm:text-[10px] text-[#566861] block font-bold uppercase tracking-wider">
                Commodity Lot
              </span>
              <span className="text-sm font-bold text-[#0B3326] block">
                {inventory.commodity}
              </span>
              <span className="text-[11px] text-[#566861]">
                {inventory.variety} (Grade {inventory.grade})
              </span>
            </div>

            <div>
              <span className="text-[9px] sm:text-[10px] text-[#566861] block font-bold uppercase tracking-wider">
                Total Volume
              </span>
              <span className="text-base sm:text-xl font-extrabold text-[#0B3326] font-heading block">
                {inventory.totalQuantity} {inventory.unit}
              </span>
              <div className="flex flex-col gap-0.5 mt-0.5">
                <span className="text-[10px] sm:text-[11px] text-[#10B981] font-semibold">
                  ✓ {inventory.availableQuantity} {inventory.unit} Available
                </span>
                {inventory.lockedQuantity > 0 && (
                  <span className="text-[10px] text-[#D97706] font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    {inventory.lockedQuantity} {inventory.unit} in active listing
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-[9px] sm:text-[10px] text-[#566861] block font-bold uppercase tracking-wider">
                Assessed Value
              </span>
              <span className="text-base sm:text-xl font-extrabold text-[#0B3326] font-heading block">
                ₹{Number(inventory.estimatedValue || 0).toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] sm:text-[11px] text-[#566861]">
                Fee: ₹{inventory.storageFeeMonthly}/mo
              </span>
            </div>
          </div>

          {/* NABL Quality Assay Certification */}
          <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-[#E5EDE8] space-y-2 sm:space-y-2.5 relative z-10">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-bold text-[#0B3326] flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#10B981]" /> NABL Assay
              </span>
              <Badge variant="emerald" size="sm">
                Certified Grade {inventory.grade || 'A'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-xs">
              {inventory.assayedQuality && Object.entries(inventory.assayedQuality).map(([k, v]) => (
                <div key={k} className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] min-w-0">
                  <span className="text-[9px] sm:text-[10px] text-[#566861] block uppercase capitalize truncate">
                    {k}
                  </span>
                  <span className="font-bold text-[#14211D] text-[11px] sm:text-xs truncate block">
                    {String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Storage Vault & Chamber Location */}
          <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-[#E5EDE8] space-y-1.5 sm:space-y-2 relative z-10 text-xs">
            <span className="text-[9px] sm:text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
              Physical Holding Facility & Payment Terms
            </span>
            <div className="flex items-center gap-2 font-bold text-[#0B3326] text-xs sm:text-sm">
              <Building2 className="w-4 h-4 text-[#10B981] shrink-0" />
              <span className="truncate">{inventory.warehouseName}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] sm:text-[11px] text-[#566861] gap-1 pt-1 border-t border-[#E5EDE8]/60">
              <span>Storage Cell: <strong>{inventory.chamber}</strong></span>
              <span className="text-[#10B981] font-semibold">Rent Payment: Direct Online via Razorpay / UPI</span>
            </div>
          </div>
        </div>

        {/* Action Button Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-xs text-[#566861]">
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            <span>
              {isIssuedEnwr
                ? 'Digital e-NWR legal title registered on blockchain escrow'
                : 'Official e-NWR title will be issued after warehouse arrival, assay & rent settlement'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasStorageRentPaid(inventory) && (
              <ReceiptDownloadButton
                size="md"
                title="Download storage rent payment receipt"
                buildReceipt={() => buildStorageRentReceipt(inventory)}
              />
            )}
            {onPayRent && canPayRentInModal && (
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  onClose();
                  onPayRent(inventory);
                }}
                className="font-bold py-2.5 px-4 cursor-pointer text-xs border-[#E5EDE8] hover:border-[#10B981]"
              >
                Pay Storage Rent
              </Button>
            )}

            {isIssuedEnwr && inventory.availableQuantity > 0 && onList && (
              <Button
                variant="accent"
                size="md"
                onClick={() => {
                  onClose();
                  onList(inventory);
                }}
                icon={Sparkles}
                iconPosition="left"
                className="font-bold py-2.5 px-5 shadow-xs cursor-pointer text-xs"
              >
                Sell from Warehouse
              </Button>
            )}

            {isIssuedEnwr && onRequestFinancing && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  onClose();
                  onRequestFinancing(inventory);
                }}
                icon={Landmark}
                iconPosition="left"
                className="font-bold py-2.5 px-4 cursor-pointer text-xs"
              >
                e-NWR Financing
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
