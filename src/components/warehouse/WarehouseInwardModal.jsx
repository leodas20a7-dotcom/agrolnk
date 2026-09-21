import React, { useState } from 'react';
import { X, Building2, CheckCircle2, ShieldCheck, Scale, ThermometerSnowflake, FileText, ArrowRight, Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { provideWarehouseQuote, confirmProduceInward, declineWarehouseQuote } from '../../utils/warehouses';

export default function WarehouseInwardModal({
  receipt,
  mode = 'quote', // 'quote' | 'inward'
  isOpen,
  onClose,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);

  // Quote mode state
  const [quotedRatePerTonne, setQuotedRatePerTonne] = useState(
    receipt?.quotedRatePerTonne || receipt?.monthlyRatePerTonne || 350
  );
  const [assignedChamber, setAssignedChamber] = useState(
    receipt?.chamber || 'Chamber A1 - Cold Storage'
  );
  const [notes, setNotes] = useState('');

  // Inward mode state (Gate weighbridge & Assayer check)
  const [actualWeight, setActualWeight] = useState(receipt?.totalQuantity || 1000);
  const [assayerGrade, setAssayerGrade] = useState(receipt?.grade || 'A');
  const [moisture, setMoisture] = useState('11.5');
  const [chamberBay, setChamberBay] = useState(receipt?.chamber || 'Chamber A1 - Bay 4');
  const [collectedGatePayment, setCollectedGatePayment] = useState(true);

  if (!isOpen || !receipt) return null;

  const totalQty = Number(receipt.totalQuantity || receipt.quantity || 1000);
  const computedMonthlyRent = Math.round(((mode === 'inward' ? Number(actualWeight) : totalQty) / 1000) * Number(quotedRatePerTonne || 350));
  const ratePerKg = Number((Number(quotedRatePerTonne || 350) / 1000).toFixed(2));

  const handleSendQuote = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await provideWarehouseQuote(receipt.id, {
        quotedRatePerTonne: Number(quotedRatePerTonne),
        quotedMonthlyRent: computedMonthlyRent,
        chamber: assignedChamber,
        notes: notes || `Standard storage fee ₹${quotedRatePerTonne}/T/mo applied.`,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error sending warehouse quote:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmInward = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await confirmProduceInward(receipt.id, {
        actualWeight: Number(actualWeight),
        assayerGrade,
        moisture,
        chamberBay,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error confirming produce inward:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full max-h-[calc(100dvh-2rem)] flex flex-col border border-[#E5EDE8] shadow-2xl text-left my-auto animate-in zoom-in-95 duration-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-[#E5EDE8] shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center">
              {mode === 'quote' ? (
                <Sparkles className="w-5 h-5 text-[#34D399]" />
              ) : (
                <Scale className="w-5 h-5 text-[#34D399]" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0B3326] font-heading">
                {mode === 'quote' ? 'Review & Quote Storage Fee' : 'Confirm Gate Inward & Issue eNWR'}
              </h3>
              <span className="text-xs text-[#566861]">
                {receipt.receiptNumber} • Depositor: {receipt.farmerName || 'Farmer'}
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

        {/* Form Body */}
        {mode === 'quote' ? (
          <form onSubmit={handleSendQuote} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Depositor Produce Summary */}
              <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2">
                <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
                  Requested Produce Lot
                </span>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-[#0B3326]">
                    {receipt.commodity} ({receipt.variety || 'Standard'})
                  </span>
                  <Badge variant="dark" size="sm">
                    Grade {receipt.grade || 'A'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 text-[#566861]">
                  <div>Requested Qty: <strong className="text-[#14211D]">{totalQty.toLocaleString('en-IN')} {receipt.unit || 'kg'}</strong></div>
                  <div>Duration: <strong className="text-[#14211D]">{receipt.storageDays || 60} Days</strong></div>
                </div>
              </div>

              {/* Set Rate Quota */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                  Storage Rent Fee Quote (₹/Tonne/Month) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#566861]">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={quotedRatePerTonne}
                    onChange={(e) => setQuotedRatePerTonne(e.target.value)}
                    className="w-full pl-8 pr-28 py-3 rounded-2xl bg-white border border-[#E5EDE8] text-sm font-extrabold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#566861]">
                    / Tonne / Mo
                  </span>
                </div>
              </div>

              {/* Live Rent Computation Display */}
              <div className="p-4 rounded-2xl bg-[#F2FBF6] border border-[#10B981]/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#566861] tracking-wider block">
                    Calculated Monthly Rent for Farmer
                  </span>
                  <span className="text-xl font-extrabold text-[#0B3326] font-heading">
                    ₹{computedMonthlyRent.toLocaleString('en-IN')}
                    <span className="text-xs font-medium text-[#566861]"> / month</span>
                  </span>
                </div>
                <span className="text-xs font-bold text-[#10B981] bg-white px-2.5 py-1 rounded-xl border border-[#10B981]/30">
                  ₹{ratePerKg} / kg / mo
                </span>
              </div>

              {/* Assign Chamber */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                  Assigned Storage Chamber / Cell
                </label>
                <input
                  type="text"
                  value={assignedChamber}
                  onChange={(e) => setAssignedChamber(e.target.value)}
                  placeholder="e.g. Chamber A1 - Cold Storage"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] text-xs font-semibold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  required
                />
              </div>

              {/* Operator Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                  Remarks / Operator Message (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Space reserved in Bay 4. Bring weighing slip upon arrival."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 sm:p-6 pt-3 border-t border-[#E5EDE8] shrink-0 bg-[#F8FAF8] flex items-center justify-end gap-3">
              <Button type="button" variant="secondary" size="sm" onClick={onClose} className="font-semibold text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                icon={ArrowRight}
                iconPosition="right"
                className="font-extrabold text-xs shadow-md"
              >
                Send Price Quote to Farmer
              </Button>
            </div>
          </form>
        ) : (
          /* Mode === 'inward' (Physical gate arrival & Assayer grading) */
          <form onSubmit={handleConfirmInward} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-emerald-900">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-[11px] leading-relaxed">
                  Physical lot arrived at warehouse gate. Record weighbridge readings and assayer moisture test to issue legal <strong>e-NWR</strong>.
                </span>
              </div>

              {/* Weighbridge Net Weight */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                  Weighbridge Net Weight ({receipt.unit || 'kg'}) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={actualWeight}
                    onChange={(e) => setActualWeight(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E5EDE8] text-sm font-extrabold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#566861]">
                    {receipt.unit || 'kg'} Verified
                  </span>
                </div>
              </div>

              {/* Assayer Moisture & Grade */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                    Moisture Content (%)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    max="50"
                    step="0.1"
                    value={moisture}
                    onChange={(e) => setMoisture(e.target.value)}
                    placeholder="11.5"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                    Assayed Grade
                  </label>
                  <select
                    value={assayerGrade}
                    onChange={(e) => setAssayerGrade(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] bg-white text-xs font-bold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  >
                    <option value="A">Grade A (Premium)</option>
                    <option value="B">Grade B (Standard)</option>
                    <option value="Export">Export Grade</option>
                  </select>
                </div>
              </div>

              {/* Chamber & Bay Allocation */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                  Assigned Chamber & Bay Location
                </label>
                <input
                  type="text"
                  value={chamberBay}
                  onChange={(e) => setChamberBay(e.target.value)}
                  placeholder="Chamber A1 - Bay 4"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] text-xs font-semibold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  required
                />
              </div>

              {/* Payment Mode & Collection Status Card */}
              <div className="p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#566861] uppercase tracking-wider">
                    Initial Rent & Tariff Status:
                  </span>
                  <span className="text-xs font-extrabold text-[#0B3326]">
                    ₹{computedMonthlyRent.toLocaleString('en-IN')} / mo
                  </span>
                </div>

                {receipt.initialPaymentStatus === 'paid' ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-900 text-xs">
                    <span className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Advance Rent Paid via Razorpay
                    </span>
                    <span className="font-extrabold text-emerald-700">₹{computedMonthlyRent} Verified</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between text-[#0B3326] text-xs">
                    <span className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                      Monthly Storage Rent (Razorpay Online)
                    </span>
                    <span className="font-extrabold text-[#0B3326]">₹{computedMonthlyRent} / mo</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 sm:p-6 pt-3 border-t border-[#E5EDE8] shrink-0 bg-[#F8FAF8] flex items-center justify-end gap-3">
              <Button type="button" variant="secondary" size="sm" onClick={onClose} className="font-semibold text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                icon={CheckCircle2}
                iconPosition="left"
                className="font-extrabold text-xs shadow-md"
              >
                Confirm Inward & Issue Official e-NWR
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
