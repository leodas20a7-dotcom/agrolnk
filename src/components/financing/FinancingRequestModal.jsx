import React, { useState } from 'react';
import { X, Landmark, ShieldCheck, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { createFinancingRequest } from '../../utils/financing';

export default function FinancingRequestModal({
  order,
  listing,
  currentUser,
  onClose,
  onSuccess,
}) {
  const user = currentUser || {
    id: '',
    name: 'Applicant',
    role: 'buyer',
  };

  const isBuyer = user.role === 'buyer';
  const targetItem = order || listing || {};
  const totalValue = Number(
    targetItem?.totalAmount ||
    targetItem?.transactionValue ||
    (Number(targetItem?.price || 0) * Number(targetItem?.quantity || 1)) ||
    25000
  );

  const [requestedAmount, setRequestedAmount] = useState(
    Math.round(totalValue * 0.8) // Default 80%
  );
  const [repaymentOption, setRepaymentOption] = useState('30_day_settlement');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePreset = (percentage) => {
    setRequestedAmount(Math.round(totalValue * percentage));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requestedAmount || Number(requestedAmount) <= 0) {
      setError('Please enter a valid credit amount.');
      return;
    }
    if (Number(requestedAmount) > totalValue) {
      setError(`Credit request cannot exceed total value (₹${totalValue.toLocaleString('en-IN')}).`);
      return;
    }

    setIsSubmitting(true);

    try {
      const requestPayload = {
        applicantId: user.id || user.email || 'buyer_trade',
        applicantName: user.name || 'Agrolnk Partner',
        applicantRole: user.role || 'buyer',
        orderId: targetItem.id || null,
        orderNumber: targetItem.orderNumber || (targetItem.id ? `#LOT-${String(targetItem.id).slice(0, 6).toUpperCase()}` : '#FIN-BUY'),
        commodity: targetItem.commodity || 'Agricultural Produce',
        variety: targetItem.variety || 'Standard Lot',
        grade: targetItem.grade || 'A',
        quantity: Number(targetItem.quantity || 100),
        unit: targetItem.unit || 'kg',
        transactionValue: totalValue,
        requestedAmount: Number(requestedAmount),
        purpose: isBuyer ? 'trade_credit' : 'working_capital',
        purposeLabel: isBuyer ? 'Trade Credit' : 'Working Capital',
        repaymentOption: isBuyer ? repaymentOption : 'auto_escrow_settlement',
        repaymentLabel: isBuyer
          ? (repaymentOption === '60_day_extended' ? '60 Days Net' : '30 Days Net')
          : 'Auto-Settled on Delivery (Escrow)',
        notes: '',
      };

      const created = await createFinancingRequest(requestPayload);
      
      try {
        window.dispatchEvent(new CustomEvent('agrolnk_financing_updated', { detail: created }));
      } catch (e) {}

      setIsSubmitting(false);
      onSuccess?.(created);
      onClose();
    } catch (err) {
      console.error('Failed to create financing request:', err);
      setError('An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-4 sm:p-6 flex min-h-full items-start sm:items-center justify-center">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#E5EDE8] shadow-2xl space-y-5 text-left my-auto animate-in zoom-in-95 duration-150 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0B3326] text-white flex items-center justify-center">
              <Landmark className="w-5 h-5 text-[#34D399]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0B3326]">
                {isBuyer ? 'Apply for Trade Credit' : 'Apply for PO Advance'}
              </h3>
              <span className="text-xs text-[#566861]">
                {isBuyer ? 'Quick NBFC buyer credit up to 80%' : 'Instant advance for harvesting, packing & transport'}
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

        {/* Produce Summary */}
        <div className="p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-[#14211D]">
              {targetItem?.commodity || 'Produce Lot'}
            </h4>
            <span className="text-xs text-[#566861]">
              {targetItem?.quantity} {targetItem?.unit || 'kg'} • Grade {targetItem?.grade || 'A'}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-[#566861] block font-medium">Order Total</span>
            <span className="text-base font-extrabold text-[#0B3326]">
              ₹{totalValue.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Requested Amount Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#0B3326]">
                {isBuyer ? 'Credit Amount Needed (₹)' : 'Advance Amount Needed (₹)'}
              </label>
              <span className="text-xs text-[#566861]">
                Max: ₹{totalValue.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#566861]">
                ₹
              </span>
              <input
                type="number"
                value={requestedAmount}
                onChange={(e) => {
                  setRequestedAmount(e.target.value);
                  setError('');
                }}
                min={1000}
                max={totalValue}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-white border border-[#E5EDE8] text-base font-bold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              />
            </div>

            {/* Quick Percentage Presets */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[11px] text-[#566861]">Preset:</span>
              <button
                type="button"
                onClick={() => handlePreset(0.5)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#EBF5F0] text-[#0B3326] hover:bg-[#10B981] hover:text-white transition-colors cursor-pointer"
              >
                50% (₹{(totalValue * 0.5).toLocaleString('en-IN')})
              </button>
              <button
                type="button"
                onClick={() => handlePreset(0.8)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#0B3326] text-white hover:bg-[#10B981] transition-colors cursor-pointer"
              >
                80% (₹{(totalValue * 0.8).toLocaleString('en-IN')})
              </button>
            </div>
          </div>

          {/* Repayment Option / Settlement Mechanism */}
          {isBuyer ? (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0B3326] block">
                Repayment Window
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRepaymentOption('30_day_settlement')}
                  className={`p-2.5 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                    repaymentOption === '30_day_settlement'
                      ? 'border-[#10B981] bg-[#EBF5F0] text-[#0B3326] font-bold'
                      : 'border-[#E5EDE8] bg-white text-[#566861]'
                  }`}
                >
                  30 Days Net (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => setRepaymentOption('60_day_extended')}
                  className={`p-2.5 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                    repaymentOption === '60_day_extended'
                      ? 'border-[#10B981] bg-[#EBF5F0] text-[#0B3326] font-bold'
                      : 'border-[#E5EDE8] bg-white text-[#566861]'
                  }`}
                >
                  60 Days (Extended)
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0B3326] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  Automatic Escrow Settlement
                </span>
                <Badge variant="accent" size="sm">0 Manual Repayments</Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] bg-white p-2 rounded-xl border border-[#E5EDE8]">
                <div>
                  <span className="text-[#566861] block text-[10px]">Instant Advance</span>
                  <span className="font-bold text-[#0B3326]">₹{Number(requestedAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[#566861] block text-[10px]">Nominal Fee (1%)</span>
                  <span className="font-bold text-[#566861]">₹{Math.round(Number(requestedAmount || 0) * 0.01).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[#566861] block text-[10px]">Final Escrow Payout</span>
                  <span className="font-bold text-[#10B981]">
                    ₹{Math.max(0, totalValue - Number(requestedAmount || 0) - Math.round(Number(requestedAmount || 0) * 0.01)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-[#566861] leading-relaxed">
                No monthly repayment needed. When the buyer confirms delivery, the advance and fee are automatically settled from the locked escrow deposit, and the remaining ₹{Math.max(0, totalValue - Number(requestedAmount || 0) - Math.round(Number(requestedAmount || 0) * 0.01)).toLocaleString('en-IN')} is directly credited to your account.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Simple Escrow Guarantee Pill */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#EBF5F0] text-xs text-[#0B3326]">
            <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
            <span>
              {isBuyer
                ? 'Escrow Protected. Funds disbursed directly for order settlement.'
                : 'PO Backed. Advance disbursed immediately; settled automatically upon delivery release.'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-[#E5EDE8] flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs text-[#566861]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="sm"
              disabled={isSubmitting}
              icon={ArrowRight}
              iconPosition="right"
              className="font-bold py-2 px-5 shadow-xs cursor-pointer"
            >
              {isSubmitting ? 'Submitting...' : isBuyer ? 'Apply Credit' : 'Request Advance'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
