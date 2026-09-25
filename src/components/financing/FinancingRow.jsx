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
  const isApproved = request.status === 'approved' || request.status === 'disbursed';
  const displayAmount = isApproved && Number(request.approvedAmount) > 0 ? Number(request.approvedAmount) : Number(request.requestedAmount || 0);
  const isValidDate = request.createdAt && !isNaN(new Date(request.createdAt).getTime());
  const isBuyer = viewerRole === 'buyer';
  const isFinancier = viewerRole === 'financier';
  const isSettled = request.status === 'repaid' || request.status === 'settled' || request.status === 'closed';
  const isMarginSettled = Boolean(request.marginPaid || isSettled);
  const marginAmount = Math.max(0, Number(request.transactionValue || 0) - displayAmount);
  const needsMarginPayment = isBuyer && isApproved && !isMarginSettled && !isSettled;

  const orderVal = Number(request.transactionValue || 0);
  const advVal = Number(displayAmount || 0);
  const ltvRatio = orderVal > 0 ? Math.round((advVal / orderVal) * 100) : 0;

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-[#10B981]/50 hover:shadow-sm transition-all flex flex-col md:grid md:grid-cols-12 md:items-center gap-3.5 md:gap-4 text-left">
      {/* Left (Col 1-4): Request ID, Role & Borrower Details */}
      <div className="md:col-span-4 flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center shrink-0 shadow-2xs">
          <Landmark className="w-5 h-5 text-[#10B981]" />
        </div>

        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
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

          <div className="text-xs text-[#566861] flex items-center gap-1.5 flex-wrap min-w-0">
            {isFinancier && request.applicantName && (
              <>
                <span className="font-bold text-[#14211D] truncate max-w-[120px]" title={request.applicantName}>
                  {request.applicantName}
                </span>
                <span>&bull;</span>
              </>
            )}
            <span className="font-semibold text-[#14211D]">{request.commodity || 'Produce Lot'}</span>
            <span>&bull;</span>
            <span
              className="text-[#0B3326] font-medium truncate max-w-[120px] sm:max-w-[160px]"
              title={request.purposeLabel || 'Working Capital'}
            >
              {request.purposeLabel || 'Working Capital'}
            </span>
            <span>&bull;</span>
            <span className="text-[11px] text-[#566861] shrink-0">
              {isValidDate ? new Date(request.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Recent'}
            </span>
          </div>
        </div>
      </div>

      {/* Middle (Col 5-8): Evenly Fitted Financials Pod */}
      <div className="md:col-span-4 w-full">
        <div className="bg-[#F8FAF8] rounded-xl border border-[#E5EDE8] py-2 px-3.5 grid grid-cols-2 gap-3 items-center">
          {/* Order Value */}
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10px] text-[#566861] uppercase tracking-wider font-bold block truncate">
              Order Value
            </span>
            <span className="font-bold text-sm text-[#14211D] block truncate">
              ₹{Number(request.transactionValue || 0).toLocaleString('en-IN')}
            </span>
          </div>

          {/* Advance Amount + LTV */}
          <div className="space-y-0.5 border-l border-[#E5EDE8] pl-3 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] text-[#566861] uppercase tracking-wider font-bold block truncate">
                {isApproved ? 'Approved' : 'Requested'}
              </span>
              {ltvRatio > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#EBF5F0] text-[#0B3326] shrink-0">
                  {ltvRatio}% LTV
                </span>
              )}
            </div>
            <span className="font-extrabold text-sm sm:text-base text-[#10B981] block truncate">
              ₹{Number(displayAmount || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Right (Col 9-12): Status & Action Bay */}
      <div className="md:col-span-4 flex items-center justify-between md:justify-end gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
        <div className="shrink-0">
          {isSettled ? (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Repaid & Settled ✓</span>
            </span>
          ) : isMarginSettled ? (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
              Escrow Secured ✓
            </span>
          ) : (
            <FinancingStatusBadge status={request.status} applicantKycStatus={request.applicantKycStatus} size="sm" />
          )}
        </div>

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
          className="text-xs font-bold py-1.5 px-3 border-[#E5EDE8] hover:border-[#10B981] cursor-pointer shrink-0"
        >
          {request.status === 'repaid' || request.status === 'settled'
            ? 'View Details'
            : !isFinancier && request.status === 'offer_received'
            ? 'Review Offer'
            : needsMarginPayment
            ? `Pay Margin (₹${Number(marginAmount).toLocaleString('en-IN')})`
            : isFinancier
            ? (request.status === 'borrower_accepted'
                ? 'Disburse'
                : request.status === 'offer_received'
                ? 'Offer Sent'
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
