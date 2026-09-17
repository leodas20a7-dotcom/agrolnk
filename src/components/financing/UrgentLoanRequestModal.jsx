import React, { useState } from 'react';
import {
  X,
  Landmark,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Calendar,
  Sparkles,
  HelpCircle,
  Banknote,
  Tractor,
  Sprout,
  Users,
  Zap,
  Package,
  HeartHandshake
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { createFinancingRequest } from '../../utils/financing';

const REASON_PRESETS = [
  { id: 'crop_inputs', label: 'Seeds & Fertilizer', icon: Sprout },
  { id: 'tractor_equipment', label: 'Tractor / Equipment', icon: Tractor },
  { id: 'labor_wages', label: 'Labor & Harvesting Wages', icon: Users },
  { id: 'irrigation_power', label: 'Irrigation & Electricity', icon: Zap },
  { id: 'post_harvest', label: 'Storage & Transport', icon: Package },
  { id: 'emergency_needs', label: 'Urgent Farm / Cash Emergency', icon: HeartHandshake },
];

export default function UrgentLoanRequestModal({
  currentUser,
  onClose,
  onSuccess,
}) {
  const user = currentUser || {
    id: '',
    name: 'Farmer Partner',
    role: 'farmer',
  };

  const isBuyer = user.role === 'buyer';

  const [requestedAmount, setRequestedAmount] = useState(25000);
  const [selectedReasonId, setSelectedReasonId] = useState('crop_inputs');
  const [customReasonText, setCustomReasonText] = useState('');
  const [repaymentOption, setRepaymentOption] = useState('30_day_settlement');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedReasonObj = REASON_PRESETS.find((r) => r.id === selectedReasonId);
  const reasonLabel = selectedReasonObj ? selectedReasonObj.label : 'General Working Capital';

  const handleAmountPreset = (amt) => {
    setRequestedAmount(amt);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requestedAmount || Number(requestedAmount) <= 0) {
      setError('Please enter a valid amount needed.');
      return;
    }
    if (Number(requestedAmount) < 1000) {
      setError('Minimum loan request amount is ₹1,000.');
      return;
    }

    setIsSubmitting(true);

    try {
      const fullReason = customReasonText.trim()
        ? `${reasonLabel} (${customReasonText.trim()})`
        : reasonLabel;

      const requestPayload = {
        applicantId: user.id || user.email || 'farmer_applicant',
        applicantName: user.name || (isBuyer ? 'Buyer Partner' : 'Farmer Partner'),
        applicantRole: user.role || 'farmer',
        orderId: null,
        orderNumber: `#URG-${Math.floor(1000 + Math.random() * 9000)}`,
        commodity: `Urgent Credit: ${reasonLabel}`,
        variety: 'Working Capital',
        grade: 'A',
        quantity: 1,
        unit: 'lot',
        transactionValue: Number(requestedAmount),
        requestedAmount: Number(requestedAmount),
        purpose: 'working_capital',
        purposeLabel: fullReason,
        repaymentOption,
        repaymentLabel: repaymentOption === '90_day_extended' ? '90 Days Net' : repaymentOption === '60_day_extended' ? '60 Days Net' : '30 Days Net',
        notes: customReasonText.trim() || 'Direct urgent liquidity request for financial institution review.',
      };

      const created = await createFinancingRequest(requestPayload);
      
      try {
        window.dispatchEvent(new CustomEvent('agrolnk_financing_updated', { detail: created }));
      } catch (e) {}

      setIsSubmitting(false);
      onSuccess?.(created);
      onClose();
    } catch (err) {
      console.error('Failed to submit urgent loan request:', err);
      setError('An error occurred while transmitting request. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-4 sm:p-6 flex min-h-full items-start sm:items-center justify-center">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-[#E5EDE8] shadow-2xl space-y-5 text-left my-auto animate-in zoom-in-95 duration-150 relative">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center shadow-xs shrink-0">
              <Banknote className="w-5 h-5 text-[#34D399]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-[#0B3326] font-heading">
                Need Money? (Urgent Loan Request)
              </h3>
              <p className="text-xs text-[#566861]">
                Ask for money urgently for any farm or personal reason. Sent directly to partner financial institutions.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Request Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 1. Amount Needed */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
              1. How Much Money Do You Need? (₹)
            </label>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-extrabold text-[#0B3326]">
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
                className="w-full pl-9 pr-4 py-3 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] text-lg font-extrabold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:bg-white transition-all"
                placeholder="Enter amount (e.g. 25000)"
              />
            </div>

            {/* Quick Amount Chips */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-[11px] text-[#566861] font-medium">Quick Amount:</span>
              {[10000, 25000, 50000, 100000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleAmountPreset(amt)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    Number(requestedAmount) === amt
                      ? 'bg-[#0B3326] text-white shadow-xs'
                      : 'bg-[#EBF5F0] text-[#0B3326] hover:bg-[#10B981] hover:text-white'
                  }`}
                >
                  ₹{amt.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Reason / Purpose for Needing Money */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
              2. Why Do You Need This Money? (Reason / Purpose)
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {REASON_PRESETS.map((reason) => {
                const Icon = reason.icon;
                const isSelected = selectedReasonId === reason.id;
                return (
                  <button
                    key={reason.id}
                    type="button"
                    onClick={() => setSelectedReasonId(reason.id)}
                    className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#10B981] bg-[#F2FBF6] ring-2 ring-[#10B981]/20 shadow-xs'
                        : 'border-[#E5EDE8] bg-white hover:bg-[#F8FAF8]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-[#10B981]' : 'text-[#566861]'}`} />
                    <span className={`text-[11px] font-bold leading-tight ${isSelected ? 'text-[#0B3326]' : 'text-[#566861]'}`}>
                      {reason.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Notes / Specific Requirement */}
            <input
              type="text"
              value={customReasonText}
              onChange={(e) => setCustomReasonText(e.target.value)}
              placeholder="Add specific detail or notes (optional)..."
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E5EDE8] text-xs text-[#14211D] focus:outline-none focus:ring-1 focus:ring-[#10B981] mt-1"
            />
          </div>

          {/* 3. Preferred Repayment Cycle */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#10B981]" />
              3. Preferred Repayment Tenure
            </label>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: '30_day_settlement', label: '30 Days Net', desc: 'Standard' },
                { id: '60_day_extended', label: '60 Days Net', desc: 'Extended' },
                { id: '90_day_extended', label: '90 Days Net', desc: 'Harvest Cycle' },
              ].map((cycle) => (
                <button
                  key={cycle.id}
                  type="button"
                  onClick={() => setRepaymentOption(cycle.id)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    repaymentOption === cycle.id
                      ? 'border-[#10B981] bg-[#F2FBF6] text-[#0B3326] ring-1 ring-[#10B981]'
                      : 'border-[#E5EDE8] bg-white text-[#566861] hover:bg-[#F8FAF8]'
                  }`}
                >
                  <span className="font-bold text-xs block">{cycle.label}</span>
                  <span className="text-[10px] text-[#566861]">{cycle.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Payout Account Confirmation */}
          <div className="p-3.5 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-white/80 font-medium">Payout Bank Account:</span>
              <span className="text-[#34D399] font-bold">Verified Account</span>
            </div>
            <div className="font-mono text-[11px] text-white/90">
              State Bank of India • A/C: •••• 4821 (IFSC: SBIN0001234)
            </div>
            <p className="text-[10px] text-[#A7F3D0] pt-1">
              Disbursed directly upon institution approval. Repayment auto-deducted on trade completion or via direct UPI.
            </p>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E5EDE8]">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              className="text-xs font-semibold py-2.5 px-4 cursor-pointer"
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
              className="font-bold text-xs py-2.5 px-5 shadow-md cursor-pointer justify-center"
            >
              {isSubmitting ? 'Sending Request...' : `Send ₹${Number(requestedAmount || 0).toLocaleString('en-IN')} Request to Institution`}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
}
