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
  Lock,
  ArrowRight
} from 'lucide-react';
import { submitFinancierOffer, disburseAcceptedLoan, updateFinancingStatus, getLiquidityPool } from '../../utils/financing';
import { initiateFinancierEscrowDisbursement } from '../../utils/razorpayRouteClient';
import { getResolvedUserKycStatus, fetchCurrentProfile } from '../../utils/auth';

export default function InstitutionalUnderwriteModal({
  isOpen,
  onClose,
  request,
  onUpdated,
  currentUser,
  isVerified: propIsVerified,
}) {
  const [liveKycStatus, setLiveKycStatus] = useState(() => {
    if (propIsVerified !== undefined) return propIsVerified ? 'verified' : 'pending';
    if (currentUser?.kycStatus === 'verified' || currentUser?.verificationStatus === 'verified') return 'verified';
    return getResolvedUserKycStatus(currentUser);
  });

  const isVerified = propIsVerified !== undefined
    ? Boolean(propIsVerified)
    : liveKycStatus === 'verified' ||
      currentUser?.kycStatus === 'verified' ||
      currentUser?.verificationStatus === 'verified' ||
      getResolvedUserKycStatus(currentUser) === 'verified';

  useEffect(() => {
    if (propIsVerified !== undefined) {
      setLiveKycStatus(propIsVerified ? 'verified' : 'pending');
      return;
    }
    const checkKyc = async () => {
      if (currentUser?.kycStatus === 'verified' || currentUser?.verificationStatus === 'verified') {
        setLiveKycStatus('verified');
        return;
      }
      const status = getResolvedUserKycStatus(currentUser);
      setLiveKycStatus(status);
      try {
        const profile = await fetchCurrentProfile();
        if (profile?.kycStatus) {
          setLiveKycStatus(profile.kycStatus);
        }
      } catch {}
    };
    if (isOpen) {
      checkKyc();
    }
  }, [isOpen, propIsVerified, currentUser]);

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
      setApprovedAmount(request.offeredAmount || request.approvedAmount || request.requestedAmount || 50000);
      setInterestRate(request.interestRate || 0.85);
      setTenorDays(request.tenorDays || 30);
      setRiskRating(request.riskRating || 'Low (Tier 1)');
      setReviewNotes(request.offerNotes || request.reviewNotes || request.notes || '');
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

  const isAcceptedByBorrower = request?.status === 'borrower_accepted';
  const isOfferPending = request?.status === 'offer_received';
  const isRepaid = request?.status === 'repaid' || request?.status === 'settled';
  const isDisbursed = request?.status === 'disbursed' || request?.status === 'approved';
  const isPending = !isRepaid && !isDisbursed && !isAcceptedByBorrower && request?.status !== 'rejected';

  // Lending Balance Validation
  const pool = getLiquidityPool(currentUser?.id || currentUser?.email || 'default');
  const availableBalance = Math.max(0, Number(pool?.availableLiquidity || 0));
  const isBalanceZero = availableBalance <= 0;
  const isBalanceInsufficient = availableBalance < Number(approvedAmount);

  const handleSendOffer = async (e) => {
    e?.preventDefault();
    setError('');

    if (!isVerified) {
      setError('Institutional verification must be completed by Admin before sending loan offers.');
      return;
    }

    if (isBalanceZero) {
      setError('Cannot send quote: Your available lending balance is ₹0. Please deploy lending capital to your pool on the dashboard first.');
      return;
    }

    setIsSubmitting(true);

    try {
      await submitFinancierOffer(request, {
        offeredAmount: Number(approvedAmount),
        interestRate: Number(interestRate),
        tenorDays: Number(tenorDays),
        reviewNotes: reviewNotes || `Term-sheet offer sent: ₹${Number(approvedAmount).toLocaleString('en-IN')} @ ${interestRate}%/mo for ${tenorDays} days.`,
        financierId: currentUser?.id || currentUser?.email || 'default',
        financierName: currentUser?.name || currentUser?.company_name || 'Financial Institution',
        financierEmail: currentUser?.email || null,
      });

      setActionSuccess(
        `Term-sheet offer for ₹${Number(approvedAmount).toLocaleString('en-IN')} sent to borrower for confirmation!`
      );

      setTimeout(() => {
        onUpdated?.('offer_received');
        onClose();
        setActionSuccess(null);
        setIsSubmitting(false);
      }, 1200);
    } catch (err) {
      console.error('Error submitting offer:', err);
      setError('Failed to send term-sheet offer.');
      setIsSubmitting(false);
    }
  };

  const handleDisburseEscrow = (e) => {
    e.preventDefault();
    setError('');

    if (!isVerified) {
      setError('Institutional verification must be completed by Admin before disbursing capital into Escrow.');
      return;
    }

    if (isBalanceInsufficient) {
      setError(
        isBalanceZero
          ? 'Your available lending balance is ₹0. You cannot disburse funds until you add lending balance.'
          : `Insufficient Lending Balance: You have ₹${availableBalance.toLocaleString('en-IN')} available, but ₹${Number(approvedAmount).toLocaleString('en-IN')} is required to disburse.`
      );
      return;
    }

    setIsSubmitting(true);

    // Launch Razorpay Route Escrow Capital Disbursement Gateway
    initiateFinancierEscrowDisbursement({
      request,
      approvedAmount: Number(approvedAmount),
      financierUser: currentUser,
      onSuccess: async (paymentData) => {
        try {
          await disburseAcceptedLoan(request, {
            approvedAmount: Number(approvedAmount),
            bankUtr: paymentData?.bankUtr,
            razorpayPaymentId: paymentData?.razorpay_payment_id,
            financierId: currentUser?.id || currentUser?.email || 'default',
            financierName: currentUser?.name || currentUser?.company_name || 'Financial Institution',
            financierEmail: currentUser?.email || null,
          });

          setActionSuccess(
            `₹${Number(approvedAmount).toLocaleString('en-IN')} disbursed into Escrow via Razorpay Route! (UTR: ${paymentData?.bankUtr})`
          );

          setTimeout(() => {
            onUpdated?.('approved');
            onClose();
            setActionSuccess(null);
            setIsSubmitting(false);
          }, 1200);
        } catch (err) {
          console.error('Error recording disbursement:', err);
          setError('Failed to record disbursement status.');
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

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await updateFinancingStatus(request, 'rejected', reviewNotes || 'Application declined by risk policy.');
      setActionSuccess('Application marked as declined.');
      setTimeout(() => {
        onUpdated?.();
        onClose();
        setActionSuccess(null);
        setIsSubmitting(false);
      }, 1200);
    } catch (err) {
      console.error('Error rejecting loan:', err);
      setError('Failed to reject loan application.');
      setIsSubmitting(false);
    }
  };

  if (!request) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isRepaid
          ? `Loan Cleared & Repaid — ${request.requestNumber}`
          : isAcceptedByBorrower
          ? `Borrower Accepted Terms! — Disburse to Escrow`
          : isDisbursed
          ? `Active Loan Details — ${request.requestNumber}`
          : isOfferPending
          ? `Term-Sheet Sent — Awaiting Borrower Confirmation`
          : `Structure Term-Sheet Offer — ${request.requestNumber}`
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
              The borrower has fully repaid the principal amount along with interest returns via {request.repaymentMethod ? request.repaymentMethod.toUpperCase() : 'Razorpay Gateway'}. Recovered funds have been returned to your available liquidity pool.
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

        {/* Banner for Borrower-Accepted Loan (Ready for Escrow Disbursement) */}
        {isAcceptedByBorrower && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Borrower Confirmed Terms — Ready for Escrow Disbursement</span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              The borrower ({request.applicantName}) has officially accepted your term-sheet (₹{approvedAmount.toLocaleString('en-IN')} @ {interestRate}%/month for {tenorDays} days). Click below to disburse the capital into Escrow via Razorpay Route.
            </p>
          </div>
        )}

        {/* Read-Only Banner for Approved Active Loan */}
        {isDisbursed && (
          <div className="p-4 rounded-2xl bg-[#EBF5F0] border border-[#10B981]/30 text-[#0B3326] space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-[#0B3326]">
              <ShieldCheck className="w-5 h-5 text-[#10B981] shrink-0" />
              <span>Active Loan Facility Disbursed to Escrow</span>
            </div>
            <p className="text-xs text-[#566861] leading-relaxed">
              This loan of ₹{(Number(request.approvedAmount) || 0).toLocaleString('en-IN')} is active at {request.interestRate || 0.85}%/month with a tenor of {request.tenorDays || 30} days. Repayment will settle automatically upon trade maturity.
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

        {/* Pending Loan or Borrower-Accepted Form */}
        {isPending || isAcceptedByBorrower ? (
          <form onSubmit={isAcceptedByBorrower ? handleDisburseEscrow : handleSendOffer} className="space-y-6">
            {/* Credit Structuring Controls */}
            <div className="p-5 rounded-2xl bg-white border border-[#E5EDE8] space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B3326]">
                {isAcceptedByBorrower ? 'Agreed Loan Terms' : 'Structure Term-Sheet Offer'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Approved Amount */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#14211D] flex items-center justify-between">
                    <span>Offered Amount (₹)</span>
                    <span className="text-[10px] text-[#10B981]">{ltv}% of total</span>
                  </label>
                  <input
                    type="number"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(Number(e.target.value))}
                    max={totalValue * 0.95}
                    min={1000}
                    disabled={isAcceptedByBorrower}
                    className="w-full px-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] disabled:opacity-80"
                    required
                  />
                </div>

                {/* Interest Rate Monthly */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#14211D] flex items-center justify-between">
                    <span>Monthly Rate (%)</span>
                    <span className="text-[10px] text-[#10B981] font-semibold">/ month</span>
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    min={0.1}
                    max={5.0}
                    disabled={isAcceptedByBorrower}
                    className="w-full px-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] disabled:opacity-80"
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
                    disabled={isAcceptedByBorrower}
                    className="w-full px-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] disabled:opacity-80"
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
                  <span className="text-[10px] text-[#566861] block font-medium">Capital to Disburse</span>
                  <span className="font-bold text-[#0B3326] text-xs sm:text-sm">
                    ₹{approvedAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#566861] block font-semibold">Profit Return</span>
                  <span className="font-bold text-emerald-700 text-xs sm:text-sm">
                    +₹{estimatedInterestReturn.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#566861] block font-bold">Total Collection</span>
                  <span className="font-bold text-[#0B3326] text-xs sm:text-sm">
                    ₹{totalSettlementReturn.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Risk & Review Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#14211D] block">
                Offer Notes (Sent to Borrower)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={2}
                disabled={isAcceptedByBorrower}
                placeholder="e.g. Competitive agri-working capital loan terms."
                className="w-full p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] disabled:opacity-80"
              />
            </div>

            {/* Available Lending Balance Banner */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs">
              <span className="text-[#566861] font-medium">Your Available Lending Balance:</span>
              <span className={`font-extrabold ${isBalanceZero ? 'text-red-600' : 'text-[#0B3326]'}`}>
                ₹{availableBalance.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Insufficient Balance Alert */}
            {((isAcceptedByBorrower && isBalanceInsufficient) || isBalanceZero) && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {isBalanceZero
                    ? 'Your available lending balance is ₹0. Please add lending balance on your dashboard before disbursing or quoting loans.'
                    : `Insufficient balance: You have ₹${availableBalance.toLocaleString('en-IN')} available, but ₹${Number(approvedAmount).toLocaleString('en-IN')} is required.`}
                </span>
              </div>
            )}

            {/* Institutional Note */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#061B14] text-white text-xs">
              <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
              <span className="text-[#DCFCE7]/90 text-[11px] leading-relaxed">
                {isAcceptedByBorrower
                  ? 'Borrower has confirmed this loan. Clicking below will open the payment gateway and disburse capital into Escrow.'
                  : 'Submitting this offer will notify the borrower to review and accept your quoted terms before any funds move.'}
              </span>
            </div>

            {/* Institutional KYC Locked Banner */}
            {!isVerified && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold block">Institutional Verification Required</span>
                  <span className="text-[11px] text-amber-800">
                    Your institutional account is pending verification. Loan quotes and capital disbursements activate upon compliance approval.
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 border-t border-[#E5EDE8] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleReject}
                disabled={isSubmitting || !isVerified}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-colors cursor-pointer w-full sm:w-auto text-center disabled:opacity-50 disabled:cursor-not-allowed"
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
                  icon={isAcceptedByBorrower ? Zap : CheckCircle2}
                  iconPosition="right"
                  disabled={isSubmitting || !isVerified || (isAcceptedByBorrower && isBalanceInsufficient) || isBalanceZero}
                  className="font-bold cursor-pointer justify-center w-full sm:w-auto text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? (isAcceptedByBorrower ? 'Disbursing...' : 'Sending Quote...')
                    : isAcceptedByBorrower
                    ? `Disburse ₹${approvedAmount.toLocaleString('en-IN')} to Escrow`
                    : `Send Term-Sheet to Borrower (₹${approvedAmount.toLocaleString('en-IN')})`}
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
