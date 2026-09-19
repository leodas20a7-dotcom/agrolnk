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
  const isBuyer = viewerRole === 'buyer';
  const isFinancier = viewerRole === 'financier';
  const isMarginSettled = Boolean(request.marginPaid || request.escrowFunded || request.status === 'disbursed');
  const marginAmount = Math.max(0, Number(request.transactionValue || 0) - displayAmount);
  const needsMarginPayment = isBuyer && isApproved && !isMarginSettled;

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
            {isFinancier && request.applicantRole && (
              <Badge variant={request.applicantRole === 'farmer' ? 'emerald' : 'blue'} size="sm">
                <span className="capitalize">{request.applicantRole}</span>
              </Badge>
            )}
          </div>

          <div className="text-xs text-[#566861] flex items-center gap-1.5 flex-wrap">
            {isFinancier && request.applicantName && (
              <>
                <span className="font-bold text-[#14211D]">{request.applicantName}</span>
                <span>&bull;</span>
              </>
            )}
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
        {request.status === 'repaid' || request.status === 'settled' ? (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Repaid & Settled ✓</span>
          </span>
        ) : isMarginSettled ? (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
            Escrow Secured ✓
          </span>
        ) : (
          <FinancingStatusBadge status={request.status} applicantKycStatus={request.applicantKycStatus} size="sm" />
        )}

        <Button
          variant={
            needsMarginPayment
              ? 'accent'
              : !isFinancier && request.status === 'offer_received'
              ? 'accent'
              : isFinancier && (request.status === 'pending' || request.status === 'under_review' || request.status === 'borrower_accepted')
              ? 'accent'
              : 'secondary'
          }
          size="sm"
          onClick={() => onView(request)}
          icon={ArrowRight}
          iconPosition="right"
          className="text-xs font-bold py-2 border-[#E5EDE8] hover:border-[#10B981] cursor-pointer"
        >
          {request.status === 'repaid' || request.status === 'settled'
            ? 'View Details'
            : !isFinancier && request.status === 'offer_received'
            ? 'Review & Accept Offer'
            : needsMarginPayment
            ? `Pay Margin (₹${Number(marginAmount).toLocaleString('en-IN')})`
            : isFinancier
            ? (request.status === 'borrower_accepted'
                ? 'Disburse to Escrow'
                : request.status === 'offer_received'
                ? 'Offer Sent (Awaiting)'
                : request.status === 'approved' || request.status === 'disbursed'
                ? 'Active Loan'
                : request.status === 'rejected'
                ? 'Declined'
                : 'Structure Quote')
            : 'View Details'}
        </Button>
      </div>
    </div>
  );
}
