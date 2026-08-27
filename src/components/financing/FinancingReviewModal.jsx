import React, { useState } from 'react';
import {
  X,
  Landmark,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  FileText,
  Tag,
  AlertCircle
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import FinancingStatusBadge from './FinancingStatusBadge';
import { updateFinancingStatus } from '../../utils/financing';

export default function FinancingReviewModal({
  request,
  viewerRole = 'financier', // 'financier' | 'farmer' | 'buyer'
  onClose,
  onStatusUpdated,
}) {
  const [approvedAmount, setApprovedAmount] = useState(
    request ? (request.approvedAmount || request.requestedAmount) : 0
  );
  const [reviewNotes, setReviewNotes] = useState(request?.reviewNotes || '');
  const [isUpdating, setIsUpdating] = useState(false);

  React.useEffect(() => {
    if (request) {
      setApprovedAmount(request.approvedAmount || request.requestedAmount || 0);
      setReviewNotes(request.reviewNotes || '');
    }
  }, [request]);

  if (!request) return null;

  const isFinancier = viewerRole === 'financier';

  const handleStatusChange = (newStatus) => {
    setIsUpdating(true);
    try {
      const updated = updateFinancingStatus(
        request.id,
        newStatus,
        newStatus === 'approved' ? approvedAmount : null,
        reviewNotes
      );
      setIsUpdating(false);
      onStatusUpdated?.(updated);
      onClose();
    } catch (err) {
      console.error('Failed to update financing status:', err);
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-4 sm:p-6 flex min-h-full items-start justify-center">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-[#E5EDE8] shadow-2xl space-y-6 text-left my-6 animate-in fade-in zoom-in-95 duration-200 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center">
              <Landmark className="w-5 h-5 text-[#34D399]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-[#0B3326] font-heading">
                  Funding Application {request.requestNumber}
                </h3>
                <FinancingStatusBadge status={request.status} />
              </div>
              <span className="text-xs text-[#566861]">
                Applied on {new Date(request.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
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

        {/* Key Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Applicant Info */}
          <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-1.5">
            <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
              Applicant Details
            </span>
            <div className="flex items-center gap-2 font-bold text-[#14211D] text-sm">
              <User className="w-4 h-4 text-[#10B981]" />
              <span>{request.applicantName}</span>
              <Badge variant="emerald" size="sm">
                <span className="capitalize">{request.applicantRole}</span>
              </Badge>
            </div>
            <span className="text-xs text-[#566861] block">
              Verified AGRAMAZ Trading Participant
            </span>
          </div>

          {/* Linked Transaction ID */}
          <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-1.5">
            <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
              Linked Exchange Agreement
            </span>
            <div className="flex items-center gap-2 font-bold text-[#14211D] text-sm">
              <FileText className="w-4 h-4 text-[#10B981]" />
              <span>Order {request.orderNumber}</span>
            </div>
            <span className="text-xs text-[#10B981] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Escrow Collateralized
            </span>
          </div>

        </div>

        {/* Commodity & Financial Underwriting Breakdown */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5EDE8] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-[#0B3326] font-heading">
                  {request.commodity}
                </h4>
                <Badge variant="dark" size="sm">
                  Grade {request.grade}
                </Badge>
              </div>
              <span className="text-xs text-[#566861]">
                Lot Volume: {request.quantity} {request.unit} • Variety: {request.variety || 'Standard'}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-[#566861] block font-medium">
                Total Transaction Value
              </span>
              <span className="text-xl font-extrabold text-[#0B3326] font-heading">
                ₹{request.transactionValue?.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Requested vs Approved Comparison */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-center text-xs">
            <div>
              <span className="text-[10px] text-[#566861] block font-medium">Requested Funding</span>
              <span className="text-sm font-extrabold text-[#0B3326]">
                ₹{request.requestedAmount?.toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#566861] block font-medium">Loan-to-Value (LTV)</span>
              <span className="text-sm font-bold text-[#10B981]">
                {request.transactionValue ? Math.round((request.requestedAmount / request.transactionValue) * 100) : 70}%
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] text-[#566861] block font-medium">Settlement Terms</span>
              <span className="text-xs font-semibold text-[#14211D] block truncate">
                {request.repaymentLabel || 'Auto Escrow Release'}
              </span>
            </div>
          </div>

          {/* Purpose & Notes */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-[#566861]">
              <Tag className="w-3.5 h-3.5 text-[#10B981]" />
              <span>
                Financing Purpose: <strong className="text-[#14211D]">{request.purposeLabel}</strong>
              </span>
            </div>

            {request.notes && (
              <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs text-[#566861]">
                <strong className="text-[#14211D] block mb-0.5">Applicant Notes:</strong>
                <p>{request.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Financier Underwriting Controls (Only for Financier role) */}
        {isFinancier && (
          <div className="p-5 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#34D399] uppercase tracking-wider block">
                  Financier Underwriting Desk
                </span>
                <span className="text-xs text-white/80">
                  Assess liquidity request against verified lot value and escrow collateral.
                </span>
              </div>
            </div>

            {/* Approved Amount Field */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/90 block">
                  Approved Amount (₹)
                </label>
                <input
                  type="number"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(Number(e.target.value))}
                  max={request.transactionValue}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#34D399]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/90 block">
                  Underwriting Memo / Conditions
                </label>
                <input
                  type="text"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Optional review memo"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#34D399]"
                />
              </div>
            </div>

            {/* 3-Column Split Underwriting Decision Action Bar */}
            <div className="pt-3 border-t border-[#14624A] grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <Button
                variant="secondary"
                size="md"
                disabled={isUpdating || request.status === 'under_review'}
                onClick={() => handleStatusChange('under_review')}
                icon={Clock}
                iconPosition="left"
                className={`w-full justify-center text-xs font-bold py-2.5 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white cursor-pointer ${
                  request.status === 'under_review' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {request.status === 'under_review' ? 'Under Review' : 'Mark Under Review'}
              </Button>

              <Button
                variant="danger"
                size="md"
                disabled={isUpdating || request.status === 'rejected'}
                onClick={() => handleStatusChange('rejected')}
                icon={XCircle}
                iconPosition="left"
                className="w-full justify-center text-xs font-bold py-2.5 bg-rose-600/90 hover:bg-rose-600 text-white cursor-pointer shadow-xs"
              >
                Reject Request
              </Button>

              <Button
                variant="accent"
                size="md"
                disabled={isUpdating || !approvedAmount}
                onClick={() => handleStatusChange('approved')}
                icon={CheckCircle2}
                iconPosition="left"
                className="w-full justify-center text-xs font-bold py-2.5 shadow-md cursor-pointer truncate"
              >
                {isUpdating
                  ? 'Updating...'
                  : `Approve (₹${Number(approvedAmount || 0).toLocaleString('en-IN')})`}
              </Button>
            </div>
          </div>
        )}

        {/* Read-Only Status Banner for Applicant View */}
        {!isFinancier && (
          <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              <span className="text-[#566861]">
                {request.status === 'approved' && `Funding of ₹${request.approvedAmount?.toLocaleString('en-IN')} is approved and earmarked.`}
                {request.status === 'under_review' && 'Institutional financier is evaluating your order collateral.'}
                {request.status === 'pending' && 'Application submitted to verified AGRAMAZ trade finance network.'}
                {request.status === 'rejected' && 'Application declined. You may adjust requested amount and reapply.'}
              </span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="text-xs font-bold"
            >
              Close
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
