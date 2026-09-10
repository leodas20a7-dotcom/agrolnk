import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import {
  Building2,
  FileText,
  Landmark,
  Sparkles,
  ThermometerSnowflake,
  Receipt,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { calculateStorageRentalDues } from '../../utils/warehouses';

export default function InventoryCard({
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

  return (
    <Card
      hoverEffect
      className="p-5 sm:p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-4 text-left flex flex-col justify-between rounded-3xl"
    >
      <div className="space-y-4">
        {/* 1. Header: Receipt ID & Status Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center">
              {isColdStorage ? (
                <ThermometerSnowflake className="w-4 h-4 text-[#10B981]" />
              ) : (
                <Building2 className="w-4 h-4 text-[#10B981]" />
              )}
            </div>
            <div>
              <span className="text-base font-extrabold text-[#0B3326] font-heading block leading-tight">
                {inventory.receiptNumber}
              </span>
              <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-wider">
                Storage Receipt
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {dues?.isExpiringSoon && (
              <Badge variant="amber" size="sm">
                Expiring Soon
              </Badge>
            )}
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
        </div>

        {/* 2. Commodity Title, Grade & Variety */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-lg font-bold text-[#14211D] font-heading">
              {inventory.commodity}
            </h4>
            <span className="text-xs text-[#566861] font-medium block">
              {inventory.variety || 'Standard Lot'}
            </span>
          </div>

          <Badge variant="dark" size="sm">
            Grade {inventory.grade || 'A'}
          </Badge>
        </div>

        {/* 3. Clean Metrics Box: Available Volume & Valuation */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8]">
          <div>
            <span className="text-[10px] text-[#566861] block font-semibold uppercase tracking-wider">
              Available
            </span>
            <span className="text-base font-extrabold text-[#0B3326] font-heading block">
              {inventory.availableQuantity} {inventory.unit}
            </span>
            <span className="text-[10px] text-[#566861] block">
              Total: {inventory.totalQuantity} {inventory.unit}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-[#566861] block font-semibold uppercase tracking-wider">
              Est. Value
            </span>
            <span className="text-base font-extrabold text-[#0B3326] font-heading block">
              ₹{Number(inventory.estimatedValue || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-[#10B981] font-semibold block">
              WDRA Backed
            </span>
          </div>
        </div>

        {/* 4. Storage Rent & Warehouse Facility Info */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-[#566861]">
            <div className="flex items-center gap-1.5 truncate">
              <Building2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
              <span className="font-semibold text-[#14211D] truncate">
                {inventory.warehouseName}
              </span>
            </div>
            <span className="font-bold text-[#0B3326] shrink-0">
              ₹{dues?.monthlyRate || 350}/mo
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#566861] px-2.5 py-1 rounded-xl bg-[#F2FBF6] border border-[#10B981]/15">
            <div className="flex items-center gap-1 text-[#10B981] font-semibold">
              <Clock className="w-3 h-3" />
              <span>{dues?.daysRemaining} days validity left</span>
            </div>
            <span className="text-[10px] text-[#566861]">
              Auto-deduct on sale
            </span>
          </div>
        </div>
      </div>

      {/* 5. Balanced Bottom Action Bar (2-Row Action Grid) */}
      <div className="pt-3 border-t border-[#E5EDE8] space-y-2">
        {/* Row 1: Full-width Primary Action */}
        {inventory.availableQuantity > 0 && onList ? (
          <Button
            variant="accent"
            size="md"
            onClick={() => onList(inventory)}
            icon={Sparkles}
            iconPosition="left"
            className="w-full justify-center text-xs font-bold py-2.5 shadow-xs cursor-pointer"
          >
            Sell from Storage
          </Button>
        ) : (
          <div className="py-2 text-center text-xs font-medium text-[#566861] bg-[#F8FAF8] rounded-xl border border-[#E5EDE8]">
            {inventory.status === 'listed' ? '100% Listed on Market' : 'Fully Allocated'}
          </div>
        )}

        {/* Row 2: Secondary Actions Grid */}
        <div className="grid grid-cols-3 gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onView(inventory)}
            icon={FileText}
            iconPosition="left"
            className="w-full justify-center text-[11px] font-bold py-2 cursor-pointer border-[#E5EDE8] hover:border-[#10B981] hover:bg-[#F2FBF6]"
          >
            Receipt
          </Button>

          {onRequestFinancing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRequestFinancing(inventory)}
              icon={Landmark}
              iconPosition="left"
              className="w-full justify-center text-[11px] font-bold py-2 cursor-pointer border-[#E5EDE8] hover:border-[#10B981] hover:bg-[#F2FBF6]"
            >
              Loan
            </Button>
          )}

          {onPayRent && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPayRent(inventory)}
              icon={Receipt}
              iconPosition="left"
              className="w-full justify-center text-[11px] font-bold py-2 cursor-pointer border-[#E5EDE8] text-[#0B3326] hover:border-[#10B981] hover:bg-[#EBF5F0]"
            >
              Rent
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

