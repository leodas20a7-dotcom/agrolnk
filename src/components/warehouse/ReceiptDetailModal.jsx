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

export default function ReceiptDetailModal({
  inventory,
  currentUser,
  onClose,
  onList,
  onRequestFinancing,
}) {
  if (!inventory) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-4 sm:p-6 flex min-h-full items-start justify-center">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-[#E5EDE8] shadow-2xl space-y-6 text-left my-6 animate-in fade-in zoom-in-95 duration-200 relative">
        
        {/* Top Official Header with WDRA Accreditation */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center">
              <Award className="w-5 h-5 text-[#34D399]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-[#0B3326] font-heading">
                  Electronic Negotiable Warehouse Receipt
                </h3>
              </div>
              <span className="text-xs text-[#10B981] font-bold">
                {inventory.receiptNumber} • WDRA Accredited Electronic Title
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Official Certificate Box */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#F8FAF8] to-[#EBF5F0]/50 border-2 border-[#10B981]/30 space-y-5 relative overflow-hidden">
          <div className="absolute right-4 -top-8 text-[#10B981]/10 font-mono text-8xl font-black select-none pointer-events-none">
            e-NWR
          </div>

          {/* Certificate Top Line */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
            <div>
              <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
                Beneficiary Depositor (Owner)
              </span>
              <span className="text-base font-extrabold text-[#0B3326] font-heading">
                {inventory.farmerName || 'Sakthi Vel'}
              </span>
            </div>

            <div className="sm:text-right">
              <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
                Deposit Timestamp
              </span>
              <span className="text-xs font-semibold text-[#14211D]">
                {new Date(inventory.depositedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Commodity & Volume Metric */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs relative z-10">
            <div>
              <span className="text-[10px] text-[#566861] block font-bold uppercase tracking-wider">
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
              <span className="text-[10px] text-[#566861] block font-bold uppercase tracking-wider">
                Total Certified Volume
              </span>
              <span className="text-xl font-extrabold text-[#0B3326] font-heading block">
                {inventory.totalQuantity} {inventory.unit}
              </span>
              <div className="flex flex-col gap-0.5 mt-0.5">
                <span className="text-[11px] text-[#10B981] font-semibold">
                  ✓ {inventory.availableQuantity} {inventory.unit} Available to Trade
                </span>
                {inventory.lockedQuantity > 0 && (
                  <span className="text-[10px] text-[#D97706] font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    {inventory.lockedQuantity} {inventory.unit} in active listing/auction
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-[#566861] block font-bold uppercase tracking-wider">
                Assessed Market Value
              </span>
              <span className="text-xl font-extrabold text-[#0B3326] font-heading block">
                ₹{Number(inventory.estimatedValue || 0).toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] text-[#566861]">
                Storage Fee: ₹{inventory.storageFeeMonthly}/month
              </span>
            </div>
          </div>

          {/* NABL Quality Assay Certification */}
          <div className="p-4 rounded-2xl bg-white border border-[#E5EDE8] space-y-2.5 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0B3326] flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" /> NABL Inbound Assay Results
              </span>
              <Badge variant="emerald" size="sm">
                Certified Grade A
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {inventory.assayedQuality && Object.entries(inventory.assayedQuality).map(([k, v]) => (
                <div key={k} className="p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
                  <span className="text-[10px] text-[#566861] block uppercase capitalize">
                    {k}
                  </span>
                  <span className="font-bold text-[#14211D] text-xs">
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Storage Vault & Chamber Location */}
          <div className="p-4 rounded-2xl bg-white border border-[#E5EDE8] space-y-2 relative z-10 text-xs">
            <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
              Physical Holding Facility
            </span>
            <div className="flex items-center gap-2 font-bold text-[#0B3326]">
              <Building2 className="w-4 h-4 text-[#10B981]" />
              <span>{inventory.warehouseName}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#566861]">
              <span>Storage Cell: <strong>{inventory.chamber}</strong></span>
              <span>Valid Until: {new Date(inventory.validUntil).toLocaleDateString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Action Button Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-xs text-[#566861]">
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            <span>Digital e-NWR legal title registered on blockchain escrow</span>
          </div>

          <div className="flex items-center gap-2">
            {inventory.availableQuantity > 0 && onList && (
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

            {onRequestFinancing && (
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
