import React, { useState } from 'react';
import { X, Landmark, ShieldCheck, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { createFinancingRequest } from '../../utils/financing';

export default function FinancingRequestModal({
  order,
  currentUser,
  onClose,
  onSuccess,
}) {
  const user = currentUser || {
    id: 'usr_farmer_01',
    name: 'Sakthi Vel',
    role: 'farmer',
  };

  const isBuyer = user.role === 'buyer';
  const totalValue = Number(order?.totalAmount || order?.transactionValue || 21000);

  const [requestedAmount, setRequestedAmount] = useState(
    Math.round(totalValue * 0.7) // Default 70% of transaction value
  );
  const [purpose, setPurpose] = useState(
    isBuyer ? 'trade_credit' : 'working_capital'
  );
  const [repaymentOption, setRepaymentOption] = useState(
    isBuyer ? '30_day_settlement' : 'auto_escrow_deduction'
  );
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const purposeOptions = isBuyer
    ? [
        { id: 'trade_credit', label: 'Auction / Purchase Trade Settlement Credit' },
        { id: 'working_capital', label: 'Procurement Working Capital' },
        { id: 'inventory_holding', label: 'Wholesale Storage & Inventory Holding' },
      ]
    : [
        { id: 'working_capital', label: 'Working Capital & Operational Liquidity' },
        { id: 'input_procurement', label: 'Input Procurement (Seeds, Fertilizer & Fuel)' },
        { id: 'harvest_logistics', label: 'Harvest, Packaging & Transport Logistics' },
        { id: 'inventory_holding', label: 'Post-Harvest Holding & Cold Storage' },
      ];

  const repaymentOptions = [
    { id: 'auto_escrow_deduction', label: 'Auto-deduction on Agrolnk escrow payout' },
    { id: '30_day_settlement', label: '30-day post-delivery settlement' },
    { id: 'harvest_cycle', label: 'Seasonal harvest cycle rollover' },
  ];

  const handlePreset = (percentage) => {
    setRequestedAmount(Math.round(totalValue * percentage));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requestedAmount || Number(requestedAmount) <= 0) {
      setError('Please enter a valid financing amount.');
      return;
    }
    if (Number(requestedAmount) > totalValue) {
      setError(`Financing request cannot exceed transaction value (₹${totalValue.toLocaleString('en-IN')}).`);
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedPurposeObj = purposeOptions.find((p) => p.id === purpose);
      const selectedRepaymentObj = repaymentOptions.find((r) => r.id === repaymentOption);

      const requestPayload = {
        applicantId: user.id,
        applicantName: user.name,
        applicantRole: user.role,
        orderId: order.id,
        orderNumber: order.orderNumber,
        commodity: order.commodity,
        variety: order.variety || 'Standard Lot',
        grade: order.grade || 'A',
        quantity: order.quantity,
        unit: order.unit || 'kg',
        transactionValue: totalValue,
        requestedAmount: Number(requestedAmount),
        purpose,
        purposeLabel: selectedPurposeObj?.label || 'Working Capital',
        repaymentOption,
        repaymentLabel: selectedRepaymentObj?.label || 'Auto-deduction on escrow release',
        notes: notes.trim(),
      };

      const created = await createFinancingRequest(requestPayload);
      setIsSubmitting(false);
      onSuccess?.(created);
      onClose();
    } catch (err) {
      console.error('Failed to create financing request:', err);
      setError('An error occurred while submitting the request.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-4 sm:p-6 flex min-h-full items-start justify-center">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-[#E5EDE8] shadow-2xl space-y-6 text-left my-6 animate-in fade-in zoom-in-95 duration-200 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0B3326] text-white flex items-center justify-center">
              <Landmark className="w-5 h-5 text-[#34D399]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0B3326] font-heading">
                {isBuyer ? 'Request Trade Credit' : 'Request Liquidity Financing'}
              </h3>
              <span className="text-xs text-[#566861]">
                Transaction-linked agricultural funding
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

        {/* Linked Transaction Card Summary */}
        <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#566861] uppercase tracking-wider">
              Linked Transaction
            </span>
            <Badge variant="dark" size="sm">
              {order?.orderNumber}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-bold text-[#14211D]">
                {order?.commodity}
              </h4>
              <span className="text-xs text-[#566861]">
                {order?.quantity} {order?.unit || 'kg'} • Grade {order?.grade || 'A'}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-[#566861] block font-medium">
                Transaction Value
              </span>
              <span className="text-xl font-extrabold text-[#0B3326] font-heading">
                ₹{totalValue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Requested Amount Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider">
                Requested Funding Amount (₹)
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
                placeholder="Enter requested amount"
                className="w-full pl-9 pr-4 py-3 rounded-2xl bg-white border border-[#E5EDE8] text-base font-bold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981] shadow-xs"
              />
            </div>

            {/* Quick Percentage Presets */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-[#566861] font-medium">Quick Select:</span>
              <button
                type="button"
                onClick={() => handlePreset(0.5)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#EBF5F0] text-[#0B3326] hover:bg-[#10B981] hover:text-white transition-colors cursor-pointer"
              >
                50% (₹{(totalValue * 0.5).toLocaleString('en-IN')})
              </button>
              <button
                type="button"
                onClick={() => handlePreset(0.7)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#EBF5F0] text-[#0B3326] hover:bg-[#10B981] hover:text-white transition-colors cursor-pointer"
              >
                70% (₹{(totalValue * 0.7).toLocaleString('en-IN')})
              </button>
              <button
                type="button"
                onClick={() => handlePreset(0.85)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#EBF5F0] text-[#0B3326] hover:bg-[#10B981] hover:text-white transition-colors cursor-pointer"
              >
                85% (₹{(totalValue * 0.85).toLocaleString('en-IN')})
              </button>
            </div>
          </div>

          {/* Purpose Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
              Financing Purpose
            </label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] shadow-xs cursor-pointer"
            >
              {purposeOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Repayment / Settlement Option */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
              Repayment / Settlement Mode
            </label>
            <select
              value={repaymentOption}
              onChange={(e) => setRepaymentOption(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] shadow-xs cursor-pointer"
            >
              {repaymentOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
              Additional Information (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g. Dispatch schedule, input requirements, or supplier info..."
              className="w-full p-3.5 rounded-2xl bg-white border border-[#E5EDE8] text-xs font-medium text-[#14211D] placeholder:text-[#566861]/60 focus:outline-none focus:ring-2 focus:ring-[#10B981] shadow-xs resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Trust Banner */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#EBF5F0] border border-[#10B981]/25 text-xs text-[#0B3326]">
            <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
            <span>
              This request is backed by verified Agrolnk order {order?.orderNumber}. No independent collateral required.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#E5EDE8] flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onClose}
              className="text-xs text-[#566861]"
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
              className="font-bold py-2.5 px-6 shadow-xs cursor-pointer"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
}
