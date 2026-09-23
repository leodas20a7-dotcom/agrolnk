import React, { useState } from 'react';
import { X, Landmark, ShieldCheck, ArrowRight, AlertCircle, Calendar, Percent, CheckCircle2, Sparkles, ChevronDown } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { createFinancingRequest } from '../../utils/financing';

export default function FinancingRequestModal({
  order,
  listing,
  availableOrders = [],
  currentUser,
  onClose,
  onSuccess,
}) {
  const [selectedOrderKey, setSelectedOrderKey] = useState(
    order?.id || order?.orderNumber || (availableOrders.length > 0 ? (availableOrders[0].id || availableOrders[0].orderNumber) : 'general')
  );

  const activeChosenOrder = availableOrders.find(
    (o) => o.id === selectedOrderKey || o.orderNumber === selectedOrderKey
  ) || order || listing || null;

  const targetItem = activeChosenOrder || {};
  const user = currentUser || {
    id: targetItem.farmerId || '',
    name: targetItem.farmerName || 'Applicant',
    role: targetItem.farmerId || targetItem.farmerName ? 'farmer' : 'buyer',
  };

  const kycStatus = user.kycStatus || user.verificationStatus || user.kyc_status || 'pending';
  const isKycVerified = kycStatus === 'verified';

  const isBuyer = user.role === 'buyer';
  const totalValue = Number(
    targetItem?.totalAmount ||
    targetItem?.transactionValue ||
    (Number(targetItem?.price || 0) * Number(targetItem?.quantity || 1)) ||
    50000
  );

  const [requestedAmount, setRequestedAmount] = useState(
    Math.round(totalValue * 0.8) || 25000
  );
  const [repaymentOption, setRepaymentOption] = useState('30_day_settlement');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePresetAmount = (amt) => {
    setRequestedAmount(amt);
    setError('');
  };

  const handleOrderChange = (key) => {
    setSelectedOrderKey(key);
    if (key === 'general') {
      setRequestedAmount(25000);
    } else {
      const match = availableOrders.find((o) => o.id === key || o.orderNumber === key);
      if (match) {
        const val = Number(match.totalAmount || 50000);
        setRequestedAmount(Math.round(val * 0.8));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requestedAmount || Number(requestedAmount) <= 0) {
      setError('Please enter a valid credit amount.');
      return;
    }

    setIsSubmitting(true);

    try {
      const isGeneral = selectedOrderKey === 'general' || !activeChosenOrder;
      const requestPayload = {
        applicantId: user.id || user.email || 'applicant_credit',
        applicantName: user.name || (isBuyer ? 'Buyer Partner' : 'Farmer Partner'),
        applicantRole: user.role || (isBuyer ? 'buyer' : 'farmer'),
        applicantKycStatus: kycStatus,
        orderId: isGeneral ? null : (targetItem.id || null),
        orderNumber: isGeneral
          ? `#CAP-${Math.floor(1000 + Math.random() * 9000)}`
          : (targetItem.orderNumber || (targetItem.id ? `#LOT-${String(targetItem.id).slice(0, 6).toUpperCase()}` : '#FIN-CREDIT')),
        commodity: isGeneral ? 'Working Capital Liquidity' : (targetItem.commodity || 'Agricultural Produce'),
        variety: targetItem.variety || 'Standard Lot',
        grade: targetItem.grade || 'A',
        quantity: Number(targetItem.quantity || 100),
        unit: targetItem.unit || 'kg',
        transactionValue: totalValue,
        requestedAmount: Number(requestedAmount),
        purpose: isBuyer ? 'trade_credit' : 'working_capital',
        purposeLabel: isBuyer ? 'Trade Credit' : 'Working Capital Credit',
        repaymentOption,
        repaymentLabel: repaymentOption === '60_day_extended' ? '60 Days Net' : '30 Days Net',
        notes: isGeneral ? 'Direct pre-harvest / working capital advance request' : '',
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
                {isBuyer ? 'Apply for Trade Credit' : 'Need Working Capital Loan?'}
              </h3>
              <span className="text-xs text-[#566861]">
                Partner Institutional NBFCs • 30–60 Days Net Repayment
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

        {/* KYC Verification Required Warning Banner */}
        {!isKycVerified && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-amber-950 block">
                Verify Your KYC First to Receive Credit Approvals
              </span>
              <p className="text-[11px] text-amber-800/90 leading-relaxed">
                Your account KYC is currently pending. Financial institutions and NBFCs will only consider and review your application after your KYC is verified by the platform admin.
              </p>
            </div>
          </div>
        )}

        {/* Order Selector (if multiple available or opening general modal) */}
        {availableOrders.length > 0 && !order && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0B3326]">
              Select Linked Produce Lot or Purpose
            </label>
            <div className="relative">
              <select
                value={selectedOrderKey}
                onChange={(e) => handleOrderChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-bold text-[#0B3326] appearance-none focus:outline-none focus:ring-2 focus:ring-[#10B981] pr-8 cursor-pointer"
              >
                {availableOrders.map((ord) => (
                  <option key={ord.id || ord.orderNumber} value={ord.id || ord.orderNumber}>
                    {ord.orderNumber}: {ord.commodity} ({ord.quantity} {ord.unit}) - ₹{Number(ord.totalAmount || 0).toLocaleString('en-IN')}
                  </option>
                ))}
                <option value="general">🌾 General Farm Working Capital / Input Liquidity</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#566861] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Produce Summary Card (if linked to order) */}
        {activeChosenOrder && (
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
              <span className="text-[10px] text-[#566861] block font-medium">Trade Value</span>
              <span className="text-base font-extrabold text-[#0B3326]">
                ₹{totalValue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Requested Amount Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#0B3326]">
                Loan Amount Needed (₹)
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
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-white border border-[#E5EDE8] text-base font-bold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                placeholder="Enter required loan amount"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 pt-1 flex-wrap">
              <span className="text-[11px] text-[#566861]">Quick:</span>
              <button
                type="button"
                onClick={() => handlePresetAmount(10000)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#EBF5F0] text-[#0B3326] hover:bg-[#10B981] hover:text-white transition-colors cursor-pointer"
              >
                ₹10,000
              </button>
              <button
                type="button"
                onClick={() => handlePresetAmount(25000)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#EBF5F0] text-[#0B3326] hover:bg-[#10B981] hover:text-white transition-colors cursor-pointer"
              >
                ₹25,000
              </button>
              <button
                type="button"
                onClick={() => handlePresetAmount(Math.round(totalValue * 0.8))}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#0B3326] text-white hover:bg-[#10B981] transition-colors cursor-pointer"
              >
                80% (₹{Math.round(totalValue * 0.8).toLocaleString('en-IN')})
              </button>
            </div>
          </div>

          {/* Preferred Cycle */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0B3326] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#10B981]" />
              Preferred Repayment Cycle
            </label>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRepaymentOption('30_day_settlement')}
                className={`p-2.5 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                  repaymentOption === '30_day_settlement'
                    ? 'border-[#10B981] bg-[#F2FBF6] text-[#0B3326] ring-1 ring-[#10B981]'
                    : 'border-[#E5EDE8] bg-white text-[#566861] hover:bg-[#F8FAF8]'
                }`}
              >
                <div className="font-bold">30 Days Net</div>
                <div className="text-[10px] text-[#566861] mt-0.5">Standard Cycle</div>
              </button>

              <button
                type="button"
                onClick={() => setRepaymentOption('60_day_extended')}
                className={`p-2.5 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                  repaymentOption === '60_day_extended'
                    ? 'border-[#10B981] bg-[#F2FBF6] text-[#0B3326] ring-1 ring-[#10B981]'
                    : 'border-[#E5EDE8] bg-white text-[#566861] hover:bg-[#F8FAF8]'
                }`}
              >
                <div className="font-bold">60 Days Net</div>
                <div className="text-[10px] text-[#566861] mt-0.5">Extended Cycle</div>
              </button>
            </div>
          </div>

          {/* Institutional Note */}
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-emerald-950 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
            <span>
              Direct institutional credit from approved partner NBFCs (e.g. Samunnati, NABARD Desk). Interest terms determined upon underwriting review.
            </span>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5EDE8]">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              className="text-xs font-semibold py-2 px-4 cursor-pointer"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="accent"
              size="md"
              disabled={isSubmitting}
              icon={ArrowRight}
              iconPosition="right"
              className="font-bold text-xs py-2 px-5 shadow-xs cursor-pointer"
            >
              {isSubmitting ? 'Submitting Request...' : 'Send Loan Application'}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}
