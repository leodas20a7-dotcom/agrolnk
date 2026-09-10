import React from 'react';
import { Building2, ShieldCheck, Lock, FileCheck, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

export default function CollateralRow({
  item,
  onOfferAdvance,
}) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-[#10B981]/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-left">
      {/* Left: Receipt ID & Commodity */}
      <div className="flex items-start sm:items-center gap-3.5 min-w-[240px]">
        <div className="w-11 h-11 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center shrink-0 shadow-2xs">
          <Building2 className="w-5 h-5 text-[#10B981]" />
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-extrabold text-[#0B3326] font-heading">
              {item.receiptNumber}
            </span>
            <Badge variant="emerald" size="sm">
              WDRA Certified
            </Badge>
          </div>

          <div className="text-xs text-[#566861] flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[#14211D]">{item.commodity} ({item.variety || 'Standard'})</span>
            <span>&bull;</span>
            <span className="text-[#566861]">Owner: <b className="text-[#14211D]">{item.farmerName}</b></span>
            <span>&bull;</span>
            <span className="text-[#0B3326] font-medium">{item.warehouseName}</span>
            {item.chamber && (
              <>
                <span>&bull;</span>
                <span className="text-[11px] text-[#566861]">{item.chamber}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Middle: Volume, Valuation & Lab Assay */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 py-2 lg:py-0 border-y lg:border-y-0 lg:border-x lg:px-6 border-[#E5EDE8] text-xs">
        <div>
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">Stored Quantity</span>
          <span className="font-extrabold text-sm text-[#0B3326]">
            {Number(item.totalQuantity || 0).toLocaleString('en-IN')} {item.unit || 'kg'}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">Assayed Valuation</span>
          <span className="font-extrabold text-sm text-[#10B981]">
            ₹{Number(item.estimatedValue || 0).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 flex flex-col justify-center">
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">Quality Assay</span>
          <span className="text-[11px] font-bold text-[#0B3326] flex items-center gap-1">
            <FileCheck className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
            <span>{item.assayedQuality?.assayStatus || 'NABL Grade A'}</span>
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#10B981] font-bold">
          <Lock className="w-3.5 h-3.5" />
          <span>Lien Ready</span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onOfferAdvance?.(item)}
          icon={ArrowRight}
          iconPosition="right"
          className="text-xs font-bold py-2 border-[#E5EDE8] hover:border-[#10B981] hover:bg-[#F2FBF6] cursor-pointer"
        >
          Offer Advance
        </Button>
      </div>
    </div>
  );
}
