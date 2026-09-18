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
  CheckCircle2,
  Truck,
  ArrowRight
} from 'lucide-react';
import { calculateStorageRentalDues, calculateMonthlyRentDeadline } from '../../utils/warehouses';

export default function InventoryCard({
  inventory,
  onView,
  onList,
  onRequestFinancing,
  onPayRent,
  onReviewQuote,
}) {
  if (!inventory) return null;

  const isColdStorage =
    Boolean(inventory?.warehouseName?.toLowerCase()?.includes('cold')) ||
    Boolean(inventory?.chamber?.toLowerCase()?.includes('cold'));

  const dues = calculateStorageRentalDues(inventory);
  const deadline = calculateMonthlyRentDeadline(inventory);
  const isStored = inventory?.status === 'stored' || inventory?.status === 'partially_listed';
  const isQuoteProvided = inventory?.status === 'quote_provided';
  const isQuoteRequested = inventory?.status === 'quote_requested';
  const isInTransit = inventory?.status === 'in_transit';

  return (
    <Card
      hoverEffect
      className="p-5 sm:p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-4 text-left flex flex-col justify-between rounded-3xl"
    >
      <div className="space-y-4">
        {/* 1. Header: Receipt ID & Status Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isStored ? 'bg-[#EBF5F0] text-[#0B3326]' : isQuoteProvided ? 'bg-blue-50 text-blue-700' : isInTransit ? 'bg-purple-50 text-purple-700' : 'bg-amber-50 text-amber-700'
            }`}>
              {isInTransit ? (
                <Truck className="w-4 h-4 text-purple-600" />
              ) : isQuoteProvided ? (
                <Sparkles className="w-4 h-4 text-blue-600" />
              ) : isQuoteRequested ? (
                <Clock className="w-4 h-4 text-amber-600" />
              ) : isColdStorage ? (
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
            {isStored && (
              <Badge variant="emerald" size="sm">
                In Storage
              </Badge>
            )}
            {isQuoteRequested && (
              <Badge variant="yellow" size="sm">
                Waiting for Quote
              </Badge>
            )}
            {isQuoteProvided && (
              <Badge variant="blue" size="sm">
                Quote: ₹{inventory.quotedMonthlyRent || inventory.storageFeeMonthly}/mo
              </Badge>
            )}
            {isInTransit && (
              <Badge variant="purple" size="sm">
                In Transit
              </Badge>
            )}
            {inventory.status === 'partially_listed' && (
              <Badge variant="blue" size="sm">
                Partially Listed
              </Badge>
            )}
            {inventory.status === 'listed' && (
              <Badge variant="purple" size="sm">
                100% Listed
              </Badge>
            )}
            {inventory.status === 'rejected' && (
              <Badge variant="red" size="sm">
                Declined
              </Badge>
            )}
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
              {inventory.availableQuantity || inventory.totalQuantity} {inventory.unit}
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
              ₹{Number(inventory.quotedMonthlyRent || inventory.storageFeeMonthly || dues?.monthlyRate || 350).toLocaleString('en-IN')}/mo
            </span>
          </div>

          {/* Deadline / Cycle Indicator */}
          {isStored && deadline && (
            <div className="flex items-center justify-between text-[11px] text-[#566861] px-2.5 py-1 rounded-xl bg-[#F2FBF6] border border-[#10B981]/15">
              <div className="flex items-center gap-1 text-[#10B981] font-semibold">
                <Clock className="w-3 h-3" />
                <span>{deadline.label}</span>
              </div>
              <span className="text-[10px] text-[#566861]">
                Auto-deduct on sale
              </span>
            </div>
          )}

          {isQuoteProvided && (
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
              <span className="font-bold">Tariff Quoted by Admin</span>
              <span className="font-extrabold text-blue-700">₹{inventory.quotedMonthlyRent}/mo</span>
            </div>
          )}

          {isQuoteRequested && (
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Awaiting warehouse admin tariff quote</span>
            </div>
          )}

          {isInTransit && (
            <div className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" />
              <span>Goods in transit • Awaiting gate weighbridge</span>
            </div>
          )}
        </div>
      </div>

      {/* 5. Bottom Action Bar */}
      <div className="pt-3 border-t border-[#E5EDE8] space-y-2">
        {isQuoteProvided && onReviewQuote ? (
          <Button
            variant="primary"
            size="md"
            onClick={() => onReviewQuote(inventory)}
            icon={ArrowRight}
            iconPosition="right"
            className="w-full justify-center text-xs font-bold py-2.5 shadow-xs cursor-pointer bg-[#0B3326] text-white"
          >
            Review Quote & Send Goods
          </Button>
        ) : isStored && inventory.availableQuantity > 0 && onList ? (
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
        ) : isStored ? (
          <div className="py-2 text-center text-xs font-medium text-[#566861] bg-[#F8FAF8] rounded-xl border border-[#E5EDE8]">
            {inventory.status === 'listed' ? '100% Listed on Market' : 'In Safe Storage'}
          </div>
        ) : (
          <div className="py-2 text-center text-xs font-medium text-[#566861] bg-[#F8FAF8] rounded-xl border border-[#E5EDE8]">
            {isInTransit ? 'Awaiting Gate Inward' : 'Quote Pending'}
          </div>
        )}

        {/* Row 2: Secondary Actions */}
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

          {isStored && onRequestFinancing && (
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

          {isStored && onPayRent && (
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
