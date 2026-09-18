import React, { useState, useEffect } from 'react';
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
  XCircle,
  Zap,
  Lock
} from 'lucide-react';
import { underwriteLoan, updateFinancingStatus } from '../../utils/financing';
import { initiateFinancierEscrowDisbursement } from '../../utils/razorpayRouteClient';

export default function InstitutionalUnderwriteModal({
  isOpen,
  onClose,
  request,
  onUpdated,
  currentUser,
}) {
  const [approvedAmount, setApprovedAmount] = useState(50000);
  const [interestRate, setInterestRate] = useState(0.85);
  const [tenorDays, setTenorDays] = useState(30);
  const [riskRating, setRiskRating] = useState('Low (Tier 1)');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (request) {
      setApprovedAmount(request.approvedAmount || request.requestedAmount || 50000);
      setInterestRate(request.interestRate || 0.85);
      setTenorDays(request.tenorDays || 30);
      setRiskRating(request.riskRating || 'Low (Tier 1)');
      setReviewNotes(request.notes || '');
      setActionSuccess(null);
      setError('');
      setIsSubmitting(false);
    }
  }, [request, isOpen]);

  const activeRequest = request || {};
  const totalValue = activeRequest.transactionValue || approvedAmount || 1;
  const ltv = Number(((approvedAmount / totalValue) * 100).toFixed(1));
  const estimatedInterestReturn = Math.round(
    approvedAmount * (interestRate / 100) * (tenorDays / 30)
  );
  const totalSettlementReturn = approvedAmount + estimatedInterestReturn;

  const handleApprove = (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Launch Razorpay Route Escrow Capital Disbursement Gateway
    initiateFinancierEscrowDisbursement({
      request,
      approvedAmount: Number(approvedAmount),
      financierUser: currentUser,
      onSuccess: async (paymentData) => {
        try {
          await underwriteLoan(request.id, {
            status: 'approved',
            approvedAmount: Number(approvedAmount),
            interestRate: Number(interestRate),
            tenorDays: Number(tenorDays),
            riskRating,
            reviewNotes: reviewNotes || `Loan disbursed to escrow via Razorpay Route. UTR: ${paymentData?.bankUtr || 'UTR-ESCROW-PAID'}.`,
            bankUtr: paymentData?.bankUtr,
            razorpayPaymentId: paymentData?.razorpay_payment_id,
          });

          setActionSuccess(
            `₹${Number(approvedAmount).toLocaleString('en-IN')} disbursed into Escrow via Razorpay Route! (UTR: ${paymentData?.bankUtr})`
          );

          setTimeout(() => {
            onUpdated?.();
            onClose();
            setActionSuccess(null);
            setIsSubmitting(false);
          }, 1500);
        } catch (err) {
          console.error('Error underwriting after payment:', err);
          setError('Failed to record approved underwriting status.');
          setIsSubmitting(false);
        }
      },
      onFailure: (err) => {
        setIsSubmitting(false);
        if (err.message && !err.message.includes('closed')) {
          setError(err.message || 'Escrow disbursement failed. Please try again.');
        }
      },
    });
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

  if (!request) return null;

  const isRepaid = request.status === 'repaid' || request.status === 'settled';
  const isApproved = request.status === 'approved' || request.status === 'disbursed';
  const isPending = !isRepaid && !isApproved && request.status !== 'rejected';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isRepaid
          ? `Loan Cleared & Repaid — ${request.requestNumber}`
          : isApproved
          ? `Active Loan Details — ${request.requestNumber}`
          : `Approve Loan — ${request.requestNumber}`
      }
      subtitle={`Applicant: ${request.applicantName} (${request.applicantRole?.toUpperCase() || 'USER'}) • Order ${request.orderNumber || 'Working Capital'}`}
      icon={isRepaid ? CheckCircle2 : Landmark}
      iconColor={isRepaid ? 'text-emerald-600' : 'text-[#10B981]'}
      iconBg={isRepaid ? 'bg-emerald-50' : 'bg-[#EBF5F0]'}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6 text-left">
        {actionSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Read-Only Banner for Repaid Loan */}
        {isRepaid && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Loan Fully Cleared & Settled</span>
            </div>
            <p className="text-xs text-emerald-700 leading-relaxed">
              The borrower has fully repaid the principal amount along with interest returns via {request.repaymentMethod ? request.repaymentMethod.toUpperCase() : 'Razorpay Gateway'}. No further action is required.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 text-xs text-center">
              <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-[#566861] block font-medium">Principal Repaid</span>
                <span className="font-extrabold text-[#0B3326] text-xs sm:text-sm">
                  ₹{(Number(request.repaymentPrincipal) || Number(request.approvedAmount) || Number(request.requestedAmount) || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-[#566861] block font-semibold">Interest Profit</span>
                <span className="font-extrabold text-emerald-700 text-xs sm:text-sm">
                  +₹{(Number(request.repaymentInterest) || Math.round((Number(request.approvedAmount) || Number(request.requestedAmount) || 0) * 0.012)).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-[#566861] block font-medium">Total Settled</span>
                <span className="font-extrabold text-[#0B3326] text-xs sm:text-sm">
                  ₹{(Number(request.repaymentAmount) || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-[#566861] block font-medium">Repaid Date</span>
                <span className="font-bold text-[#14211D] text-xs">
                  {request.repaidAt ? new Date(request.repaidAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Verified'}
                </span>
              </div>
            </div>
            {request.repaymentTransactionId && (
              <div className="text-[11px] text-emerald-800 font-mono pt-1">
                Transaction Ref: <b>{request.repaymentTransactionId}</b>
              </div>
            )}
          </div>
        )}

        {/* Read-Only Banner for Approved Active Loan */}
        {isApproved && (
          <div className="p-4 rounded-2xl bg-[#EBF5F0] border border-[#10B981]/30 text-[#0B3326] space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-[#0B3326]">
              <ShieldCheck className="w-5 h-5 text-[#10B981] shrink-0" />
              <span>Active Loan Facility Disbursed</span>
            </div>
            <p className="text-xs text-[#566861] leading-relaxed">
              This loan of ₹{(Number(request.approvedAmount) || 0).toLocaleString('en-IN')} was approved at {request.interestRate || 0.85}%/month with a tenor of {request.tenorDays || 30} days. Repayment is scheduled upon trade completion.
            </p>
          </div>
        )}

        {/* Top Summary Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
            <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
              Item / Reason
            </span>
            <span className="font-bold text-[#14211D] text-xs block mt-0.5 truncate">
              {request.commodity || request.purpose || 'Agricultural'}
            </span>
            <span className="text-[11px] text-[#566861]">
              Value: ₹{totalValue.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
            <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
              Trust Rating
            </span>
            <span className="font-bold text-[#10B981] text-sm block mt-0.5">
              {request.creditScore || 780} / 900
            </span>
            <span className="text-[11px] text-[#566861]">
              Verified History
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
            <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
              Requested Amount
            </span>
            <span className="font-bold text-[#0B3326] text-sm block mt-0.5">
              ₹{Number(request.requestedAmount || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-[#10B981] font-semibold">
              {request.repaymentLabel || 'Direct Bank/UPI'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
            <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
              Loan Coverage
            </span>
            <span className="font-bold text-[#14211D] text-sm block mt-0.5">
              {ltv}%
            </span>
            <span className="text-[11px] text-[#566861]">
              Safe Limit
            </span>
          </div>
        </div>

        {/* Pending Loan Form */}
        {isPending ? (
          <form onSubmit={handleApprove} className="space-y-6">
            {/* Credit Structuring Controls */}
            <div className="p-5 rounded-2xl bg-white border border-[#E5EDE8] space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B3326]">
                Loan Amount & Terms
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Approved Amount */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#14211D] flex items-center justify-between">
                    <span>Amount to Send (₹)</span>
                    <span className="text-[10px] text-[#10B981]">{ltv}% of total</span>
                  </label>
                  <input
                    type="number"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(Number(e.target.value))}
                    max={totalValue * 0.95}
                    min={1000}
                    className="w-full px-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    required
                  />
                </div>

                {/* Interest Rate Monthly */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#14211D] flex items-center justify-between">
                    <span>Monthly Profit Rate (%)</span>
                    <span className="text-[10px] text-[#10B981] font-semibold">/ month</span>
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    min={0.1}
                    max={5.0}
                    className="w-full px-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    required
                  />
                </div>

                {/* Tenor Days */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#14211D] flex items-center justify-between">
                    <span>Duration (Days)</span>
                    <span className="text-[10px] text-[#566861]">Repayment</span>
                  </label>
                  <select
                    value={tenorDays}
                    onChange={(e) => setTenorDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  >
                    <option value={15}>15 Days</option>
                    <option value={30}>30 Days (1 Month)</option>
                    <option value={45}>45 Days (1.5 Months)</option>
                    <option value={60}>60 Days (2 Months)</option>
                    <option value={90}>90 Days (3 Months)</option>
                  </select>
                </div>
              </div>

              {/* Underwriting Yield Simulation */}
              <div className="p-3.5 rounded-xl bg-[#EBF5F0] border border-[#10B981]/20 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-[#566861] block font-medium">Money Sent</span>
                  <span className="font-bold text-[#0B3326] text-xs sm:text-sm">
                    ₹{approvedAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#566861] block font-semibold">Profit to Earn</span>
                  <span className="font-bold text-emerald-700 text-xs sm:text-sm">
                    +₹{estimatedInterestReturn.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#566861] block font-bold">Total to Collect</span>
                  <span className="font-bold text-[#0B3326] text-xs sm:text-sm">
                    ₹{totalSettlementReturn.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Risk & Review Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#14211D] block">
                Approval Notes (Optional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Approved for trade working capital."
                className="w-full p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              />
            </div>

            {/* Institutional Note */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#061B14] text-white text-xs">
              <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
              <span className="text-[#DCFCE7]/90 text-[11px] leading-relaxed">
                Approving this will transfer funds to the applicant and create a repayment schedule with interest.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-[#E5EDE8] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleReject}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-colors cursor-pointer w-full sm:w-auto text-center"
              >
                <XCircle className="w-4 h-4" /> Decline Request
              </button>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="justify-center w-full sm:w-auto text-xs"
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
                  className="font-bold cursor-pointer justify-center w-full sm:w-auto text-xs"
                >
                  {isSubmitting ? 'Transferring Money...' : `Approve & Transfer ₹${approvedAmount.toLocaleString('en-IN')}`}
                </Button>
              </div>
            </div>
          </form>
        ) : (
          /* Read-Only Footer */
          <div className="pt-3 border-t border-[#E5EDE8] flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="px-5 text-xs font-bold"
            >
              Close
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
