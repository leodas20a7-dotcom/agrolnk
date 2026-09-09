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
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-start sm:items-center justify-center animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUpdating) {
          onClose?.();
        }
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] flex flex-col border border-[#E5EDE8] shadow-2xl text-left my-auto animate-in zoom-in-95 duration-150 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Pinned Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-[#E5EDE8] shrink-0 bg-white z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Landmark className="w-5 h-5 text-[#34D399]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-extrabold text-[#0B3326] font-heading">
                  Funding Application {request.requestNumber || ''}
                </h3>
                <FinancingStatusBadge status={request.status} />
              </div>
              <span className="text-xs text-[#566861]">
                Applied on {request.createdAt && !isNaN(new Date(request.createdAt).getTime())
                  ? new Date(request.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                  : 'Pending Review'}
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

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">

        {/* Key Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Applicant Info */}
          <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-1.5">
            <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
              Applicant Details
            </span>
            <div className="flex items-center gap-2 font-bold text-[#14211D] text-sm">
              <User className="w-4 h-4 text-[#10B981]" />
              <span>{request.applicantName || 'Verified Participant'}</span>
              <Badge variant="emerald" size="sm">
                <span className="capitalize">{request.applicantRole || 'Member'}</span>
              </Badge>
            </div>
            <span className="text-xs text-[#566861] block">
              Verified Agrolnk Trading Participant
            </span>
          </div>

          {/* Linked Transaction ID */}
          <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-1.5">
            <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
              Linked Exchange Agreement
            </span>
            <div className="flex items-center gap-2 font-bold text-[#14211D] text-sm">
              <FileText className="w-4 h-4 text-[#10B981]" />
              <span>{request.orderNumber ? `Order ${request.orderNumber}` : (request.orderId ? `Order #${request.orderId}` : 'Trade Collateral')}</span>
            </div>
            <span className="text-xs text-[#10B981] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Escrow Collateralized
            </span>
          </div>

        </div>

        {/* Commodity & Financial Underwriting Breakdown - Hidden until Approved for Applicant View */}
        {!isFinancier && request.status !== 'approved' ? (
          <div className="p-6 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] text-center space-y-3.5 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center mx-auto shadow-xs">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-[#0B3326] font-heading">
                Funding Application Under Review
              </h4>
              <p className="text-xs text-[#566861] max-w-md mx-auto leading-relaxed">
                Your trade credit request has been submitted to institutional financiers for evaluation. The sanctioned credit amount, approved loan-to-value (LTV) ratio, and settlement breakdown will be unlocked and displayed here immediately upon approval.
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF5F0] text-[11px] font-semibold text-[#10B981] border border-[#DCFCE7]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% Escrow Collateral Backed</span>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-white border border-[#E5EDE8] space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-[#0B3326] font-heading">
                    {request.commodity || 'Produce Lot'}
                  </h4>
                  <Badge variant="dark" size="sm">
                    Grade {request.grade || 'A'}
                  </Badge>
                </div>
                <span className="text-xs text-[#566861]">
                  Lot Volume: {Number(request.quantity || 0).toLocaleString('en-IN')} {request.unit || 'kg'} • Variety: {request.variety || 'Standard'}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-[#566861] block font-medium">
                  Total Transaction Value
                </span>
                <span className="text-xl font-extrabold text-[#0B3326] font-heading">
                  ₹{Number(request.transactionValue || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Requested vs Approved Comparison */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-center text-xs">
              <div>
                <span className="text-[10px] text-[#566861] block font-medium">
                  {request.status === 'approved' ? 'Approved Funding' : 'Requested Funding'}
                </span>
                <span className="text-sm font-extrabold text-[#0B3326]">
                  ₹{Number((request.status === 'approved' ? request.approvedAmount : request.requestedAmount) || request.requestedAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#566861] block font-medium">Loan-to-Value (LTV)</span>
                <span className="text-sm font-bold text-[#10B981]">
                  {Number(request.transactionValue) > 0 && Number(request.requestedAmount || request.approvedAmount) > 0
                    ? Math.round((Number(request.approvedAmount || request.requestedAmount) / Number(request.transactionValue)) * 100)
                    : 0}%
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
                  Financing Purpose: <strong className="text-[#14211D]">{request.purposeLabel || request.purpose || 'Working Capital Advance'}</strong>
                </span>
              </div>

              {request.reviewNotes && (
                <div className="p-3 rounded-xl bg-[#EBF5F0] border border-[#10B981]/30 text-xs text-[#0B3326]">
                  <strong className="text-[#0B3326] block mb-0.5">Financier Memo:</strong>
                  <p>{request.reviewNotes}</p>
                </div>
              )}

              {request.notes && (
                <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs text-[#566861]">
                  <strong className="text-[#14211D] block mb-0.5">Applicant Notes:</strong>
                  <p>{request.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

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
                  max={Number(request.transactionValue || 0)}
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

        </div>
      </div>
    </div>
  );
}
