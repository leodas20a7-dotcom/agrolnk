import React from 'react';
import { Landmark, ArrowRight, ShieldCheck, Tag } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import FinancingStatusBadge from './FinancingStatusBadge';

export default function FinancingRow({
  request,
  viewerRole = 'farmer',
  onView,
}) {
  const isApproved = request.status === 'approved';
  const displayAmount = isApproved && Number(request.approvedAmount) > 0 ? Number(request.approvedAmount) : Number(request.requestedAmount || 0);
  const isValidDate = request.createdAt && !isNaN(new Date(request.createdAt).getTime());

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-[#10B981]/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
      {/* Left: Request ID & Commodity */}
      <div className="flex items-start sm:items-center gap-3.5 min-w-[240px]">
        <div className="w-11 h-11 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center shrink-0 shadow-2xs">
          <Landmark className="w-5 h-5 text-[#10B981]" />
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-extrabold text-[#0B3326] font-heading">
              {request.requestNumber || '#FIN-PENDING'}
            </span>
            <Badge variant="dark" size="sm">
              {request.orderNumber || (request.orderId ? `#${request.orderId}` : 'Escrow')}
            </Badge>
          </div>

          <div className="text-xs text-[#566861] flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[#14211D]">{request.commodity || 'Produce Lot'}</span>
            <span>&bull;</span>
            <span className="text-[#0B3326] font-medium">{request.purposeLabel || 'Working Capital'}</span>
            <span>&bull;</span>
            <span className="text-[11px] text-[#566861]">
              {isValidDate ? new Date(request.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Recent'}
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Financials Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-6 py-2 md:py-0 border-y md:border-y-0 md:border-x md:px-6 border-[#E5EDE8] text-xs">
        <div>
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">Order Value</span>
          <span className="font-bold text-sm text-[#566861]">
            ₹{Number(request.transactionValue || 0).toLocaleString('en-IN')}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">
            {isApproved ? 'Approved Advance' : 'Requested Advance'}
          </span>
          <span className="font-extrabold text-base text-[#10B981]">
            ₹{Number(displayAmount || 0).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Right: Status & Actions */}
      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
        <FinancingStatusBadge status={request.status} size="sm" />

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onView(request)}
          icon={ArrowRight}
          iconPosition="right"
          className="text-xs font-bold py-2 border-[#E5EDE8] hover:border-[#10B981] hover:bg-[#F2FBF6] cursor-pointer"
        >
          View Details
        </Button>
      </div>
    </div>
  );
}
