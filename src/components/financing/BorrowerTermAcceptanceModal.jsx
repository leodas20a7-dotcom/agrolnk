import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import {
  Landmark,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Percent,
  Clock,
  ArrowRight,
  XCircle,
  AlertCircle,
  Lock,
  Tag
} from 'lucide-react';
import { acceptFinancierOffer, updateFinancingStatus } from '../../utils/financing';

export default function BorrowerTermAcceptanceModal({
  isOpen,
  onClose,
  request,
  onUpdated,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [error, setError] = useState('');

  if (!request) return null;

  const principal = Number(request.offeredAmount || request.approvedAmount || request.requestedAmount || 50000);
  const rate = Number(request.interestRate || 0.85);
  const tenor = Number(request.tenorDays || 30);
  const estimatedInterest = Math.round(principal * (rate / 100) * (tenor / 30));
  const totalRepayment = principal + estimatedInterest;
  const institutionName = request.financierName || 'Institutional Lender';

  const dueDate = new Date(Date.now() + tenor * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const handleAccept = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await acceptFinancierOffer(
        request,
        `Terms confirmed by borrower. Accepted ${institutionName} offer: ₹${principal.toLocaleString('en-IN')} @ ${rate}%/mo.`
      );
      setActionSuccess(`Loan terms accepted! ${institutionName} has been locked as your lender and notified to disburse.`);
      setTimeout(() => {
        onUpdated?.();
        onClose?.();
        setActionSuccess(null);
        setIsSubmitting(false);
      }, 1500);
    } catch (err) {
      console.error('Error accepting loan terms:', err);
      setError('Failed to confirm loan terms. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setIsSubmitting(true);
    try {
      await updateFinancingStatus(
        request,
        'rejected',
        'Borrower declined lender term-sheet offer.'
      );
      setActionSuccess('Offer declined.');
      setTimeout(() => {
        onUpdated?.();
        onClose?.();
        setActionSuccess(null);
        setIsSubmitting(false);
      }, 1200);
    } catch (err) {
      console.error('Error declining loan terms:', err);
      setError('Failed to decline offer.');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review Loan Terms & Confirm Lender"
      subtitle={`Term-Sheet Quote provided by ${institutionName}`}
      icon={Landmark}
      iconColor="text-[#10B981]"
      iconBg="bg-[#EBF5F0]"
      maxWidth="max-w-lg"
    >
      <div className="space-y-5 text-left">
        {actionSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Institution Badge & Produce summary */}
        <div className="p-4 rounded-2xl bg-[#061B14] text-white border border-[#14624A] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-[#34D399]" />
              <span className="font-extrabold text-sm text-white">{institutionName}</span>
            </div>
            <Badge variant="emerald" size="sm">Verified Lender</Badge>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-emerald-200/80">
            <span>Linked Lot: <b className="text-white">{request.commodity || 'Produce Lot'}</b></span>
            <span>Request: <b className="text-white">{request.requestNumber || '#FIN'}</b></span>
          </div>
        </div>

        {/* Key Term-Sheet Numbers */}
        <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3 text-xs">
          <span className="text-[11px] font-bold text-[#566861] uppercase tracking-wider block">
            Loan Terms Breakdown
          </span>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#E5EDE8]">
              <span className="text-[#566861] font-medium">Offered Advance Capital</span>
              <span className="font-extrabold text-base text-[#0B3326]">
                ₹{principal.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-white border border-[#E5EDE8]">
                <span className="text-[10px] text-[#566861] block font-semibold">Monthly Interest</span>
                <span className="font-bold text-[#10B981] text-sm">{rate}% / month</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-[#E5EDE8]">
                <span className="text-[10px] text-[#566861] block font-semibold">Duration (Tenor)</span>
                <span className="font-bold text-[#0B3326] text-sm">{tenor} Days</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
              <div>
                <span className="font-bold block text-xs">Total Amount on Due Date ({dueDate})</span>
                <span className="text-[10px] text-emerald-800">Principal (₹{principal.toLocaleString('en-IN')}) + Interest (₹{estimatedInterest.toLocaleString('en-IN')})</span>
              </div>
              <span className="font-extrabold text-base text-[#0B3326]">
                ₹{totalRepayment.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[#566861] pt-1">
            <Lock className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Accepting this offer locks this lender exclusively and initiates escrow payment.</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-2 border-t border-[#E5EDE8] flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleDecline}
            disabled={isSubmitting}
            className="text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50"
          >
            Decline Offer
          </Button>

          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={handleAccept}
            disabled={isSubmitting}
            icon={CheckCircle2}
            iconPosition="left"
            className="font-bold text-xs py-2 px-4 shadow-sm cursor-pointer"
          >
            {isSubmitting ? 'Confirming...' : `Accept Loan Terms & Lock Lender`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
