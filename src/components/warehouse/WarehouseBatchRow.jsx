import React from 'react';
import { Building2, ThermometerSnowflake, CheckCircle2, ArrowRight, Eye, Truck } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

export default function WarehouseBatchRow({
  item,
  isDispatched = false,
  onView,
  onDispatch,
}) {
  const isColdStorage = item.chamber?.toLowerCase().includes('cold') || item.chamber?.toLowerCase().includes('chill');

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-[#10B981]/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-left">
      {/* Left: Receipt # & Commodity Details */}
      <div className="flex items-start sm:items-center gap-3.5 min-w-[260px]">
        <div className="w-11 h-11 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center shrink-0 shadow-2xs">
          {isColdStorage ? (
            <ThermometerSnowflake className="w-5 h-5 text-[#10B981]" />
          ) : isDispatched ? (
            <Truck className="w-5 h-5 text-[#10B981]" />
          ) : (
            <Building2 className="w-5 h-5 text-[#10B981]" />
          )}
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-extrabold text-[#0B3326] font-heading">
              {item.receiptNumber}
            </span>
            <Badge variant={isDispatched ? 'emerald' : 'dark'} size="sm">
              {isDispatched ? 'Gate Exit Verified' : `Grade ${item.grade || 'A'}`}
            </Badge>
          </div>

          <div className="text-xs text-[#566861] flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[#14211D]">{item.commodity}</span>
            <span>&bull;</span>
            <span className="text-[#0B3326] font-medium">Depositor: {item.farmerName}</span>
            {item.chamber && (
              <>
                <span>&bull;</span>
                <span className="text-[11px] text-[#566861]">{item.chamber}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Middle: Quantities & Assay Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 py-2 lg:py-0 border-y lg:border-y-0 lg:border-x lg:px-6 border-[#E5EDE8] text-xs">
        <div>
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">
            {isDispatched ? 'Dispatched Qty' : 'Available to Trade'}
          </span>
          <span className={`font-extrabold text-sm block ${!isDispatched && item.availableQuantity > 0 ? 'text-[#10B981]' : 'text-[#0B3326]'}`}>
            {isDispatched ? `${item.totalQuantity} ${item.unit}` : `${item.availableQuantity} ${item.unit}`}
          </span>
        </div>

        {!isDispatched && (
          <div>
            <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">Locked / Listed</span>
            <span className={`font-bold text-sm block ${item.lockedQuantity > 0 ? 'text-[#D97706]' : 'text-[#566861]'}`}>
              {item.lockedQuantity || 0} {item.unit}
            </span>
          </div>
        )}

        <div>
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">
            {isDispatched ? 'Date Dispatched' : 'Total Batch'}
          </span>
          <span className="font-medium text-xs text-[#566861] block">
            {isDispatched
              ? new Date(item.updatedAt || item.depositedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : `${item.totalQuantity} ${item.unit}`}
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-between lg:justify-end gap-2 shrink-0 flex-wrap">
        {!isDispatched && item.availableQuantity === 0 && onDispatch && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onDispatch(item)}
            className="text-xs font-semibold py-1.5 px-2.5 text-[#D97706] hover:text-[#B45309] border-[#FDE68A] bg-[#FEF3C7]/40 cursor-pointer"
          >
            Mark Dispatched
          </Button>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onView(item)}
          icon={ArrowRight}
          iconPosition="right"
          className="text-xs font-bold py-1.5 px-3 cursor-pointer hover:bg-[#F2FBF6] hover:border-[#10B981]"
        >
          {isDispatched ? 'Audit Receipt' : 'View Receipt'}
        </Button>
      </div>
    </div>
  );
}
