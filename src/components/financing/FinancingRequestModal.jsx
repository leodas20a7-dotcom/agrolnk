import React, { useState } from 'react';
import { X, Landmark, ShieldCheck, ArrowRight, AlertCircle, CheckCircle2, Building2, Sparkles } from 'lucide-react';
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
        { id: 'trade_credit', label: 'Procurement Trade Credit & Purchase Settlement (NBFC Supported)' },
        { id: 'working_capital', label: 'Wholesale Trade Working Capital Facility' },
        { id: 'inventory_holding', label: 'Warehouse Inbound Inventory & Transit Financing' },
      ]
    : [
        { id: 'working_capital', label: 'Working Capital & Operational Liquidity' },
        { id: 'input_procurement', label: 'Input Procurement (Seeds, Fertilizer & Fuel)' },
        { id: 'harvest_logistics', label: 'Harvest, Packaging & Transport Logistics' },
        { id: 'inventory_holding', label: 'Post-Harvest Holding & Cold Storage' },
      ];

  const repaymentOptions = [
    { id: '30_day_settlement', label: '30-Day Post-Delivery Net Settlement (Recommended)' },
    { id: '60_day_extended', label: '60-Day Extended Trade Credit Window' },
    { id: 'auto_escrow_deduction', label: 'Auto-deduction on Agrolnk escrow release' },
    { id: 'harvest_cycle', label: 'Seasonal trade cycle repayment' },
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
        applicantId: user.id || user.email || 'buyer_trade',
        applicantName: user.name || 'Agrolnk Buyer Partner',
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
        purpose,
        purposeLabel: selectedPurposeObj?.label || 'Trade Credit',
        repaymentOption,
        repaymentLabel: selectedRepaymentObj?.label || '30-Day Settlement',
        notes: notes.trim(),
      };

      const created = await createFinancingRequest(requestPayload);
      
      // Notify other windows/tabs & desk
      try {
        window.dispatchEvent(new CustomEvent('agrolnk_financing_updated', { detail: created }));
      } catch (e) {
        // ignore
      }

      setIsSubmitting(false);
      onSuccess?.(created);
      onClose();
    } catch (err) {
      console.error('Failed to create financing request:', err);
      setError('An error occurred while submitting the request. Please try again.');
      setIsSubmitting(false);
    }
  };

  const itemRefNumber = targetItem?.orderNumber || (targetItem?.id ? `Lot #${String(targetItem.id).slice(0, 8)}` : 'Active Trade Lot');

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
                {isBuyer ? 'Institutional Trade Credit & Financing' : 'Request Liquidity Financing'}
              </h3>
              <span className="text-xs text-[#566861]">
                NBFC & Institutional agricultural credit support
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
            <span className="text-[11px] font-bold text-[#566861] uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#10B981]" />
              Linked Procurement Lot
            </span>
            <Badge variant="dark" size="sm">
              {itemRefNumber}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-bold text-[#14211D]">
                {targetItem?.commodity || 'Produce Lot'}
              </h4>
              <span className="text-xs text-[#566861]">
                {targetItem?.quantity} {targetItem?.unit || 'kg'} • Grade {targetItem?.grade || 'A'}
                {targetItem?.farmerName ? ` • Seller: ${targetItem.farmerName}` : ''}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-[#566861] block font-medium">
                Lot / Order Value
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
              This application is reviewed and underwritten by registered Agrolnk Institutional NBFCs. Direct escrow disbursement upon seller dispatch.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#E5EDE8] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onClose}
              className="text-xs text-[#566861] justify-center w-full sm:w-auto"
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
              className="font-bold py-2.5 px-6 shadow-xs cursor-pointer justify-center w-full sm:w-auto"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
}
