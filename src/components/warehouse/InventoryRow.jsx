import React from 'react';
import { Building2, ThermometerSnowflake, Sparkles, Receipt, Eye, Truck, Clock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { calculateStorageRentalDues, calculateMonthlyRentDeadline } from '../../utils/warehouses';

export default function InventoryRow({
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
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-[#10B981]/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-left">
      {/* Left: Receipt # & Commodity */}
      <div className="flex items-start sm:items-center gap-3.5 min-w-[240px]">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
          isStored ? 'bg-[#EBF5F0] text-[#0B3326]' : isQuoteProvided ? 'bg-blue-50 text-blue-700' : isInTransit ? 'bg-purple-50 text-purple-700' : 'bg-amber-50 text-amber-700'
        }`}>
          {isInTransit ? (
            <Truck className="w-5 h-5 text-purple-600" />
          ) : isQuoteProvided ? (
            <Sparkles className="w-5 h-5 text-blue-600" />
          ) : isQuoteRequested ? (
            <Clock className="w-5 h-5 text-amber-600" />
          ) : isColdStorage ? (
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

            {/* Dynamic Status Badge */}
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
                In Transit to Warehouse
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
            {Number(inventory.availableQuantity || inventory.totalQuantity || 0).toLocaleString('en-IN')} {inventory.unit || 'kg'}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">Monthly Storage Fee</span>
          <span className="font-bold text-sm text-[#0B3326]">
            ₹{Number(inventory.quotedMonthlyRent || inventory.storageFeeMonthly || 0).toLocaleString('en-IN')}/mo
          </span>
        </div>

        <div>
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">Valuation</span>
          <span className="font-extrabold text-sm text-[#10B981]">
            ₹{Number(inventory.estimatedValue || 0).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Right: Actions & Deadline Status */}
      <div className="flex items-center justify-between lg:justify-end gap-2.5 shrink-0 flex-wrap">
        {/* Quote Provided Action */}
        {isQuoteProvided && onReviewQuote && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onReviewQuote(inventory)}
            icon={ArrowRight}
            iconPosition="right"
            className="text-xs font-bold py-1.5 px-3 bg-[#0B3326] text-white shadow-xs cursor-pointer"
          >
            Review Quote & Send Goods
          </Button>
        )}

        {/* In-Transit indicator */}
        {isInTransit && (
          <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200 flex items-center gap-1">
            <Truck className="w-3.5 h-3.5" />
            Gate Arrival Pending
          </span>
        )}

        {/* Quote Requested indicator */}
        {isQuoteRequested && (
          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Awaiting Warehouse Quote
          </span>
        )}

        {/* Stored: Monthly deadline & Pay Rent */}
        {isStored && deadline && (
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border ${
              deadline.status === 'paid'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : deadline.status === 'due_soon'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}>
              {deadline.label}
            </span>
          </div>
        )}

        {isStored && dues?.isDue && dues?.amountDue > 0 && onPayRent && (
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
          Details
        </Button>
      </div>
    </div>
  );
}
