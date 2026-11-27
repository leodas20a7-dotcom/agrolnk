import React, { useState } from 'react';
import { X, Building2, CheckCircle2, ShieldCheck, Scale, ThermometerSnowflake, FileText, ArrowRight, Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { provideWarehouseQuote, confirmProduceInward, declineWarehouseQuote } from '../../utils/warehouses';
import { sendNotification } from '../../utils/notifications';
import { toast } from '../../context/ToastContext';

export default function WarehouseInwardModal({
  receipt,
  mode = 'quote', // 'quote' | 'inward'
  chambers = [],
  isOpen,
  onClose,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);

  const configuredChambers = Array.isArray(chambers)
    ? chambers
        .map((ch) => {
          const name = typeof ch === 'string' ? ch.trim() : String(ch?.name || '').trim();
          if (!name) return null;
          const details = typeof ch === 'object' && ch ? [ch.capacity, ch.temp].filter(Boolean).join(' • ') : '';
          return {
            value: name,
            label: details ? `${name} (${details})` : name,
          };
        })
        .filter(Boolean)
    : [];

  const existingReceiptChamber = String(receipt?.chamber || '').trim();
  const chamberOptions =
    existingReceiptChamber && !configuredChambers.some((opt) => opt.value.toLowerCase() === existingReceiptChamber.toLowerCase())
      ? [{ value: existingReceiptChamber, label: existingReceiptChamber }, ...configuredChambers]
      : configuredChambers;

  const matchedDefaultChamber =
    chamberOptions.find((opt) => opt.value.toLowerCase() === existingReceiptChamber.toLowerCase())?.value ||
    existingReceiptChamber ||
    chamberOptions[0]?.value ||
    'Chamber A1 - Cold Storage';

  // Quote mode state
  const [quotedRatePerTonne, setQuotedRatePerTonne] = useState(
    receipt?.quotedRatePerTonne || receipt?.monthlyRatePerTonne || 350
  );
  const [assignedChamber, setAssignedChamber] = useState(matchedDefaultChamber);
  const [notes, setNotes] = useState('');
  const [showDeclineBox, setShowDeclineBox] = useState(false);
  const [declineReason, setDeclineReason] = useState('Warehouse is currently full');
  const [declineCustomNote, setDeclineCustomNote] = useState('');

  // Inward mode state (Gate weighbridge & Assayer check)
  const [actualWeight, setActualWeight] = useState(receipt?.totalQuantity || 1000);
  const [assayerGrade, setAssayerGrade] = useState(receipt?.grade || 'A');
  const [moisture, setMoisture] = useState('11.5');
  const [chamberBay, setChamberBay] = useState(matchedDefaultChamber);
  const [collectedGatePayment, setCollectedGatePayment] = useState(true);

  if (!isOpen || !receipt) return null;

  const totalQty = Number(receipt.totalQuantity || receipt.quantity || 1000);
  const computedMonthlyRent = Math.round(((mode === 'inward' ? Number(actualWeight) : totalQty) / 1000) * Number(quotedRatePerTonne || 350));
  const durationDays = Number(receipt.storageDays || receipt.assayedQuality?.storageDays || 30);
  const computedDurationRent = Math.round(computedMonthlyRent * (durationDays / 30));
  const warehouseFacilitationFee = Math.round(computedDurationRent * 0.0025 * 100) / 100;
  const netWarehousePayout = Math.round((computedDurationRent - warehouseFacilitationFee) * 100) / 100;
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
      toast.success('Warehouse storage quote sent to depositor!');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error sending warehouse quote:', err);
      toast.error(err?.message || 'Failed to send storage quote.');
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
      toast.success('Produce inward confirmed & Electronic Warehouse Receipt (WHR) generated!');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error confirming produce inward:', err);
      toast.error(err?.message || 'Failed to confirm produce inward.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineRequest = async () => {
    const finalReason = [declineReason, declineCustomNote.trim()].filter(Boolean).join(' — ') || 'Warehouse cannot accept this batch right now';
    setLoading(true);
    try {
      const declined = await declineWarehouseQuote(receipt.id, finalReason);
      if (!declined) {
        throw new Error('Could not decline request.');
      }
      if (receipt.farmerId) {
        await sendNotification({
          recipientId: receipt.farmerId,
          title: 'Storage Request Declined',
          message: `Your storage request ${receipt.receiptNumber || ''} (${receipt.commodity || 'produce'}) could not be accepted: ${finalReason}. Please choose another warehouse.`,
          type: 'warning',
          link: 'farmer-inventory',
        }).catch(() => {});
      }
      toast.success('Request declined and farmer notified.');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error declining storage request:', err);
      toast.error(err?.message || 'Failed to decline request.');
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
                {mode === 'quote' ? 'Send Storage Price' : 'Confirm Arrival & Store Batch'}
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
              <div className="p-4 rounded-2xl bg-[#F2FBF6] border border-[#10B981]/30 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#566861] tracking-wider block">
                      Quoted Storage Rent ({durationDays} Days)
                    </span>
                    <span className="text-xl font-extrabold text-[#0B3326] font-heading">
                      ₹{computedDurationRent.toLocaleString('en-IN')}
                      <span className="text-xs font-medium text-[#566861]">
                        {' '}(₹{computedMonthlyRent.toLocaleString('en-IN')} / mo)
                      </span>
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#10B981] bg-white px-2.5 py-1 rounded-xl border border-[#10B981]/30 shrink-0">
                    ₹{ratePerKg} / kg / mo
                  </span>
                </div>

                <div className="pt-2 border-t border-[#10B981]/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[#566861]">
                    Platform Fee (−0.25%): <strong className="text-rose-700">−₹{warehouseFacilitationFee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </span>
                  <span className="font-bold text-[#065F46]">
                    Your Net Payout: ₹{netWarehousePayout.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Assign Chamber */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                  Assigned Storage Chamber / Room
                </label>
                {chamberOptions.length > 0 ? (
                  <select
                    value={assignedChamber}
                    onChange={(e) => setAssignedChamber(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E5EDE8] bg-white text-xs font-semibold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    required
                  >
                    {chamberOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={assignedChamber}
                    onChange={(e) => setAssignedChamber(e.target.value)}
                    placeholder="e.g. Chamber A1 - Cold Storage"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] text-xs font-semibold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    required
                  />
                )}
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

              {/* Quick Decline / Can't Store Box */}
              {showDeclineBox && (
                <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-900">
                      Why can&apos;t you store this batch? (Sent to farmer)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDeclineBox(false)}
                      className="text-[11px] font-semibold text-red-700 hover:underline cursor-pointer"
                    >
                      Back
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Warehouse is currently full',
                      'Crop or temperature not supported',
                      'Quantity not suitable',
                      'Closed for maintenance',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDeclineReason(preset)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer transition ${
                          declineReason === preset
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white text-red-900 border-red-200 hover:bg-red-100/60'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={declineCustomNote}
                    onChange={(e) => setDeclineCustomNote(e.target.value)}
                    placeholder="Optional short note for the farmer..."
                    className="w-full px-3.5 py-2 rounded-xl border border-red-200 bg-white text-xs text-[#14211D] focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      loading={loading}
                      onClick={handleDeclineRequest}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer"
                    >
                      Send Reply &amp; Decline
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 sm:p-6 pt-3 border-t border-[#E5EDE8] shrink-0 bg-[#F8FAF8] flex items-center justify-between gap-3 flex-wrap">
              {!showDeclineBox ? (
                <button
                  type="button"
                  onClick={() => setShowDeclineBox(true)}
                  disabled={loading}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition cursor-pointer"
                >
                  Can&apos;t Store / Decline
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2.5 ml-auto">
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
            </div>
          </form>
        ) : (
          /* Mode === 'inward' (Physical gate arrival & Assayer grading) */
          <form onSubmit={handleConfirmInward} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-emerald-900">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-[11px] leading-relaxed">
                  Truck arrived at your gate. Enter the actual weight, moisture, and quality grade to store this batch.
                </span>
              </div>

              {/* Actual Weight at Gate */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                  Actual Weight at Gate ({receipt.unit || 'kg'}) <span className="text-red-500">*</span>
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

              {/* Moisture & Quality Grade */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                    Moisture (%)
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
                    Quality Grade
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
                  Assigned Chamber / Room
                </label>
                {chamberOptions.length > 0 ? (
                  <select
                    value={chamberBay}
                    onChange={(e) => setChamberBay(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] bg-white text-xs font-semibold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    required
                  >
                    {chamberOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={chamberBay}
                    onChange={(e) => setChamberBay(e.target.value)}
                    placeholder="Chamber A1 - Bay 4"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] text-xs font-semibold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    required
                  />
                )}
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
                Confirm Arrival & Store Batch
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
