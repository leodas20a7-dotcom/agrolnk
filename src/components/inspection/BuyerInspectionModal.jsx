import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Package,
  Award,
  Scale,
  Thermometer,
  AlertCircle
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { submitInspectionReport } from '../../utils/inspection';

export default function BuyerInspectionModal({
  order,
  isOpen,
  onClose,
  onInspectionCompleted,
}) {
  const [inspectedGrade, setInspectedGrade] = useState(order?.grade || 'A');
  const [receivedQty, setReceivedQty] = useState(order?.quantity || 100);
  const [moisture, setMoisture] = useState(11.2);
  const [foreignMatter, setForeignMatter] = useState(0.4);
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [verdict, setVerdict] = useState('approved'); // 'approved' | 'rejected_dispute'
  const [disputeReason, setDisputeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (order) {
      setInspectedGrade(order.grade || 'A');
      setReceivedQty(order.quantity || 100);
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        buyerId: order.buyerId || 'usr_buyer_02',
        buyerName: order.buyerName || 'Procurement Buyer',
        farmerName: order.farmerName || 'Producer Partner',
        commodity: order.commodity,
        orderedGrade: order.grade,
        inspectedGrade,
        orderedQuantity: order.quantity,
        receivedQuantity: Number(receivedQty),
        unit: order.unit || 'kg',
        moisturePercentage: Number(moisture),
        foreignMatterPercentage: Number(foreignMatter),
        verdict,
        disputeReason: verdict === 'rejected_dispute' ? disputeReason : null,
        inspectorNotes: inspectorNotes || (verdict === 'approved' ? 'Quality parameters match trade agreement.' : disputeReason),
      };

      const report = await submitInspectionReport(payload);
      setIsSubmitting(false);
      onInspectionCompleted?.(report, verdict === 'approved');
      onClose();
    } catch (err) {
      console.error('Inspection submission error:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-4 sm:p-6 flex min-h-full items-start justify-center">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-[#E5EDE8] shadow-2xl space-y-6 text-left my-6 animate-in fade-in zoom-in-95 duration-200 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-[#34D399]" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-[#0B3326] font-heading">
                Produce Quality Inspection
              </h3>
              <span className="text-xs text-[#566861]">
                Order {order.orderNumber} • Buyer Physical Sign-Off Gate
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

        {/* Trade Agreement Collateral Specs */}
        <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#14211D]">
                {order.commodity} ({order.variety || 'Standard'})
              </span>
              <span className="text-[11px] text-[#566861] block">
                Agreed Contract: {order.quantity} {order.unit} • Grade {order.grade}
              </span>
            </div>
            <Badge variant="emerald" size="sm">
              Escrow Secured
            </Badge>
          </div>
        </div>

        {/* Inspection Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Decision Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
              Inspection Verdict
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVerdict('approved')}
                className={`p-3.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  verdict === 'approved'
                    ? 'bg-[#EBF5F0] border-[#10B981] text-[#0B3326] ring-2 ring-[#10B981]/20'
                    : 'bg-white border-[#E5EDE8] text-[#566861] hover:bg-[#F8FAF8]'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                <span>Passed / Verified</span>
              </button>

              <button
                type="button"
                onClick={() => setVerdict('rejected_dispute')}
                className={`p-3.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  verdict === 'rejected_dispute'
                    ? 'bg-red-50 border-red-400 text-red-700 ring-2 ring-red-400/20'
                    : 'bg-white border-[#E5EDE8] text-[#566861] hover:bg-[#F8FAF8]'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span>Quality Discrepancy</span>
              </button>
            </div>
          </div>

          {/* Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#14211D] flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-[#10B981]" /> Received Weight ({order.unit || 'kg'})
              </label>
              <input
                type="number"
                value={receivedQty}
                onChange={(e) => setReceivedQty(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] text-xs font-bold text-[#14211D] focus:ring-2 focus:ring-[#10B981] focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#14211D] flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-[#10B981]" /> Confirmed Quality Grade
              </label>
              <select
                value={inspectedGrade}
                onChange={(e) => setInspectedGrade(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] text-xs font-bold text-[#14211D] focus:ring-2 focus:ring-[#10B981] focus:outline-none"
              >
                <option value="A">Grade A (Premium)</option>
                <option value="B">Grade B (Standard)</option>
                <option value="C">Grade C (Commercial)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#14211D] flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-[#10B981]" /> Moisture Content (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={moisture}
                onChange={(e) => setMoisture(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] text-xs font-bold text-[#14211D] focus:ring-2 focus:ring-[#10B981] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#14211D]">
                Foreign Matter / Dust (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={foreignMatter}
                onChange={(e) => setForeignMatter(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] text-xs font-bold text-[#14211D] focus:ring-2 focus:ring-[#10B981] focus:outline-none"
              />
            </div>
          </div>

          {/* Dispute Reason if Rejected */}
          {verdict === 'rejected_dispute' ? (
            <div className="space-y-1.5 p-3.5 rounded-2xl bg-red-50 border border-red-200">
              <label className="text-xs font-bold text-red-800 flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-red-600" /> Dispute Reason / Defect Summary
              </label>
              <textarea
                rows={2}
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="e.g. Excessive rotting observed in 20% of crates, moisture above 16% threshold..."
                className="w-full p-2.5 rounded-xl bg-white border border-red-300 text-xs text-[#14211D] placeholder:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#566861]">
                Quality Inspection Remarks (Optional)
              </label>
              <input
                type="text"
                value={inspectorNotes}
                onChange={(e) => setInspectorNotes(e.target.value)}
                placeholder="e.g. Size uniformity verified, batch accepted into cold warehouse."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] text-xs text-[#14211D] placeholder:text-[#566861]/60 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              />
            </div>
          )}

          {/* Trust Banner */}
          <div className="p-3 rounded-xl bg-[#EBF5F0] border border-[#10B981]/25 text-xs text-[#0B3326] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
            <span>
              {verdict === 'approved'
                ? 'Approving releases the escrow payout to the seller and financier.'
                : 'Filing a dispute pauses the escrow payout and escalates to AgroLnk Admin arbitration.'}
            </span>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-[#E5EDE8] flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={verdict === 'approved' ? 'accent' : 'danger'}
              size="md"
              disabled={isSubmitting}
              className="font-bold shadow-md cursor-pointer"
            >
              {isSubmitting
                ? 'Processing...'
                : verdict === 'approved'
                ? 'Verify & Release Escrow'
                : 'Submit Dispute to Admin'}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
}
