import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import {
  Landmark,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Percent,
  Calendar,
  DollarSign,
  FileCheck,
  XCircle
} from 'lucide-react';
import { underwriteLoan, updateFinancingStatus } from '../../utils/financing';

export default function InstitutionalUnderwriteModal({
  isOpen,
  onClose,
  request,
  onUpdated,
}) {
  if (!request) return null;

  const [approvedAmount, setApprovedAmount] = useState(
    request.approvedAmount || request.requestedAmount || 50000
  );
  const [interestRate, setInterestRate] = useState(request.interestRate || 9.5);
  const [tenorDays, setTenorDays] = useState(request.tenorDays || 30);
  const [riskRating, setRiskRating] = useState(request.riskRating || 'Low (Tier 1)');
  const [reviewNotes, setReviewNotes] = useState(request.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  const totalValue = request.transactionValue || approvedAmount;
  const ltv = Number(((approvedAmount / totalValue) * 100).toFixed(1));
  const estimatedInterestReturn = Math.round(
    approvedAmount * (interestRate / 100) * (tenorDays / 365)
  );
  const totalSettlementReturn = approvedAmount + estimatedInterestReturn;

  const handleApprove = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      underwriteLoan(request.id, {
        approvedAmount: Number(approvedAmount),
        interestRate: Number(interestRate),
        tenorDays: Number(tenorDays),
        riskRating,
        reviewNotes: reviewNotes || 'Underwriting approved by institutional credit desk.',
      });

      setActionSuccess('Loan facility approved & capital earmarked from liquidity pool!');
      setTimeout(() => {
        onUpdated?.();
        onClose();
        setActionSuccess(null);
        setIsSubmitting(false);
      }, 1200);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const handleReject = () => {
    setIsSubmitting(true);
    updateFinancingStatus(request.id, 'rejected', null, reviewNotes || 'Application declined by risk policy.');
    setActionSuccess('Application marked as declined.');
    setTimeout(() => {
      onUpdated?.();
      onClose();
      setActionSuccess(null);
      setIsSubmitting(false);
    }, 1200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Credit Underwriting — ${request.requestNumber}`}
      subtitle={`Applicant: ${request.applicantName} (${request.applicantRole.toUpperCase()}) • Order ${request.orderNumber}`}
      icon={Landmark}
      iconColor="text-[#10B981]"
      iconBg="bg-[#EBF5F0]"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleApprove} className="space-y-6 text-left">
        {actionSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Top Summary Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
            <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
              Commodity Collateral
            </span>
            <span className="font-bold text-[#14211D] text-xs block mt-0.5">
              {request.commodity} ({request.grade})
            </span>
            <span className="text-[11px] text-[#566861]">
              Valued at ₹{totalValue.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
            <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
              Credit Score
            </span>
            <span className="font-bold text-[#10B981] text-sm block mt-0.5">
              {request.creditScore || 780} / 900
            </span>
            <span className="text-[11px] text-[#566861]">
              NABL Assayed Record
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
            <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
              Requested Advance
            </span>
            <span className="font-bold text-[#0B3326] text-sm block mt-0.5">
              ₹{request.requestedAmount.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-[#10B981] font-semibold">
              {request.repaymentLabel || 'Auto Escrow'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
            <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
              Current LTV
            </span>
            <span className="font-bold text-[#14211D] text-sm block mt-0.5">
              {ltv}%
            </span>
            <span className="text-[11px] text-[#566861]">
              Max Permitted: 85%
            </span>
          </div>
        </div>

        {/* Credit Structuring Controls */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5EDE8] space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B3326]">
            Loan Structuring & Terms
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Approved Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#14211D] flex items-center justify-between">
                <span>Facility Amount (₹)</span>
                <span className="text-[10px] text-[#10B981]">{ltv}% LTV</span>
              </label>
              <input
                type="number"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(Number(e.target.value))}
                max={totalValue * 0.85}
                min={1000}
                className="w-full px-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                required
              />
            </div>

            {/* Interest Rate APR */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#14211D] flex items-center justify-between">
                <span>Interest Rate (APR %)</span>
                <span className="text-[10px] text-[#566861]">p.a.</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                min={5}
                max={24}
                className="w-full px-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                required
              />
            </div>

            {/* Tenor Days */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#14211D] flex items-center justify-between">
                <span>Tenor (Days)</span>
                <span className="text-[10px] text-[#566861]">Maturity</span>
              </label>
              <select
                value={tenorDays}
                onChange={(e) => setTenorDays(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              >
                <option value={15}>15 Days (Spot Dispatch)</option>
                <option value={30}>30 Days (Standard Escrow)</option>
                <option value={45}>45 Days (Extended Harvest)</option>
                <option value={60}>60 Days (Cold Storage Hold)</option>
                <option value={90}>90 Days (Quarterly Trade)</option>
              </select>
            </div>
          </div>

          {/* Underwriting Yield Simulation */}
          <div className="p-3.5 rounded-xl bg-[#EBF5F0] border border-[#10B981]/20 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <span className="text-[10px] text-[#566861] block">Principal Disbursed</span>
              <span className="font-bold text-[#0B3326] text-xs sm:text-sm">
                ₹{approvedAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#566861] block">Est. Interest Yield</span>
              <span className="font-bold text-[#10B981] text-xs sm:text-sm">
                +₹{estimatedInterestReturn.toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#566861] block">Total Escrow Return</span>
              <span className="font-bold text-[#0B3326] text-xs sm:text-sm">
                ₹{totalSettlementReturn.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Risk & Review Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#14211D] block">
            Underwriter Audit & Covenant Notes
          </label>
          <textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Verified NABL moisture content < 12%, warehouse receipt lock registered."
            className="w-full p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
          />
        </div>

        {/* Institutional Escrow Pledge Lock Banner */}
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[#061B14] text-white text-xs">
          <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
          <span className="text-[#DCFCE7]/90 text-[11px] leading-relaxed">
            By approving, an automated legal lien is placed on Escrow Agreement <b>{request.orderNumber}</b>. Repayment will auto-deduct upon buyer receipt.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-[#E5EDE8] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReject}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
          >
            <XCircle className="w-4 h-4" /> Reject Facility
          </button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="sm"
              icon={CheckCircle2}
              iconPosition="right"
              disabled={isSubmitting}
              className="font-bold cursor-pointer"
            >
              {isSubmitting ? 'Processing...' : `Approve ₹${approvedAmount.toLocaleString('en-IN')}`}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
