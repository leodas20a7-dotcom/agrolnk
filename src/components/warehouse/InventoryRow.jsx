import React from 'react';
import { Building2, ThermometerSnowflake, Sparkles, Receipt, Eye } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { calculateStorageRentalDues } from '../../utils/warehouses';

export default function InventoryRow({
  inventory,
  onView,
  onList,
  onRequestFinancing,
  onPayRent,
}) {
  const isColdStorage =
    inventory.warehouseName?.toLowerCase().includes('cold') ||
    inventory.chamber?.toLowerCase().includes('cold');

  const dues = calculateStorageRentalDues(inventory);
  const isStored = inventory.status === 'stored' || inventory.status === 'partially_listed';

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-[#10B981]/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-left">
      {/* Left: Receipt # & Commodity */}
      <div className="flex items-start sm:items-center gap-3.5 min-w-[240px]">
        <div className="w-11 h-11 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center shrink-0 shadow-2xs">
          {isColdStorage ? (
            <ThermometerSnowflake className="w-5 h-5 text-[#10B981]" />
          ) : (
            <Building2 className="w-5 h-5 text-[#10B981]" />
          )}
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-extrabold text-[#0B3326] font-heading">
              {inventory.receiptNumber}
            </span>
            <Badge variant="dark" size="sm">
              Grade {inventory.grade || 'A'}
            </Badge>
            <Badge
              variant={
                inventory.status === 'stored'
                  ? 'emerald'
                  : inventory.status === 'partially_listed'
                  ? 'blue'
                  : inventory.status === 'listed'
                  ? 'purple'
                  : 'dark'
              }
              size="sm"
            >
              {inventory.status === 'stored' && 'In Storage'}
              {inventory.status === 'partially_listed' && 'Partially Listed'}
              {inventory.status === 'listed' && '100% Listed'}
              {inventory.status === 'released' && 'Released'}
            </Badge>
          </div>

          <div className="text-xs text-[#566861] flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[#14211D]">{inventory.commodity}</span>
            <span>&bull;</span>
            <span className="text-[#0B3326] font-medium">{inventory.warehouseName || 'Warehouse Hub'}</span>
            {inventory.chamber && (
              <>
                <span>&bull;</span>
                <span className="text-[11px] text-[#566861]">{inventory.chamber}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Middle: Volume & Asset Valuation */}
      <div className="grid grid-cols-3 gap-3 sm:gap-6 py-2 lg:py-0 border-y lg:border-y-0 lg:border-x lg:px-6 border-[#E5EDE8] text-xs">
        <div>
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">Available</span>
          <span className="font-extrabold text-sm text-[#0B3326]">
            {Number(inventory.availableQuantity || 0).toLocaleString('en-IN')} {inventory.unit || 'kg'}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">Total Batch</span>
          <span className="font-bold text-sm text-[#566861]">
            {Number(inventory.totalQuantity || 0).toLocaleString('en-IN')} {inventory.unit || 'kg'}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">Valuation</span>
          <span className="font-extrabold text-sm text-[#10B981]">
            ₹{Number(inventory.estimatedValue || 0).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-between lg:justify-end gap-2.5 shrink-0 flex-wrap">
        {dues?.amountDue > 0 && onPayRent && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPayRent(inventory)}
            className="text-xs font-semibold py-1.5 px-3 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 cursor-pointer"
          >
            Pay Rent (₹{dues.amountDue})
          </Button>
        )}

        {isStored && Number(inventory.availableQuantity) > 0 && onList && (
          <Button
            variant="accent"
            size="sm"
            onClick={() => onList(inventory)}
            icon={Sparkles}
            iconPosition="left"
            className="text-xs font-bold py-1.5 px-3 shadow-xs cursor-pointer"
          >
            List Produce
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onView(inventory)}
          icon={Eye}
          iconPosition="left"
          className="text-xs font-bold py-1.5 px-3 bg-[#F2FBF6] text-[#0B3326] hover:bg-[#E5EDE8] cursor-pointer"
        >
          Receipt
        </Button>
      </div>
    </div>
  );
}
