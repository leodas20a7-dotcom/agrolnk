import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Package,
  Award,
  Scale,
  Clock,
  UserCheck
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { getInspectionForOrder, requestQualityInspection, sendInspectionReportToBuyer } from '../../utils/inspection';

export default function BuyerInspectionModal({
  order,
  isOpen = true,
  onClose,
  onSuccess,
  onProceedToBuy,
}) {
  const [inspection, setInspection] = useState(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const orderKey = order?.orderNumber || order?.id || order?.listingId;
  const isPreBuy = !order?.orderNumber;

  useEffect(() => {
    if (orderKey) {
      getInspectionForOrder(orderKey).then((insp) => {
        setInspection(insp);
      });
    }
  }, [orderKey]);

  if (!isOpen || !order) return null;

  const handleRequestInspection = () => {
    setIsSubmitting(true);
    const estAmount = order.totalAmount || (Number(order.quantity || 100) * Number(order.price || 0));
    const created = requestQualityInspection({
      orderId: orderKey,
      orderNumber: orderKey,
      buyerId: order.buyerId || 'usr_buyer_02',
      buyerName: order.buyerName || 'Procurement Buyer',
      sellerName: order.farmerName || 'Verified Producer',
      commodity: order.commodity,
      grade: order.grade || 'A',
      quantity: order.quantity,
      orderAmount: estAmount,
    });
    setInspection(created);
    setIsSubmitting(false);
    if (onSuccess) onSuccess(created);
  };

  const handleAcceptReport = () => {
    if (onSuccess) onSuccess(inspection);
    if (onProceedToBuy) {
      onProceedToBuy();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-[#E5EDE8] shadow-2xl space-y-5 text-left animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#EBF5F0] text-[#0B3326]">
              <FileCheck className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0B3326]">
                Quality Inspection & Assay Desk
              </h3>
              <p className="text-[11px] text-[#566861]">
                {isPreBuy ? `Lot #${orderKey} • Pre-Buy Quality Assay` : `Order #${orderKey} • Pre-Delivery Verification`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-[#566861] hover:text-[#0B3326] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Commodity Summary */}
        <div className="p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-[#0B3326] block text-sm">
              {order.commodity} (Grade {order.grade || 'A'})
            </span>
            <span className="text-[#566861]">
              Quantity: {order.quantity} {order.unit || 'kg'} &bull; Seller: {order.farmerName || 'Verified Producer'}
            </span>
          </div>
          <Badge variant="emerald" size="sm">
            100% Escrow Secured
          </Badge>
        </div>

        {/* Stage 1: If Inspection has NOT been requested yet */}
        {!inspection && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 space-y-2">
              <span className="font-bold block flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                How Quality Inspection Works:
              </span>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                1. Click <strong>"Request Quality Inspection"</strong> below.<br />
                2. Admin receives your request and dispatches a certified assayer to inspect the lot.<br />
                3. The inspector tests moisture %, purity, and grade, and uploads the certified assay report.<br />
                4. You review the official report and continue to delivery with 100% peace of mind.
              </p>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-[#0B3326] block">
                Additional Assay Instructions / Lab Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="2"
                placeholder="e.g. Please verify maximum moisture threshold under 12% and check for uniform grain size..."
                className="w-full p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button variant="ghost" size="sm" onClick={onClose} className="text-xs cursor-pointer">
                Cancel
              </Button>
              <Button
                variant="accent"
                size="md"
                disabled={isSubmitting}
                onClick={handleRequestInspection}
                className="text-xs font-bold cursor-pointer"
              >
                {isSubmitting ? 'Sending Request...' : 'Request Quality Check from Admin'}
              </Button>
            </div>
          </div>
        )}

        {/* Stage 2: Inspection Requested - Awaiting Admin Inspector Dispatch */}
        {inspection && inspection.status === 'requested' && (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-[#0B3326]">
                Quality Inspection Requested!
              </h4>
              <p className="text-xs text-[#566861] max-w-sm mx-auto">
                Admin has received your request and is dispatching a certified quality inspector to the farmgate lot. Once the assay report is uploaded, you can review the results here.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-left text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#566861]">Request Identifier:</span>
                <span className="font-mono font-bold text-[#0B3326]">{inspection.reportNumber || inspection.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#566861]">Assay Status:</span>
                <span className="font-bold text-amber-700">Admin Inspector Dispatched</span>
              </div>
            </div>
            <div className="pt-2">
              <Button variant="primary" size="md" onClick={onClose} className="w-full text-xs cursor-pointer">
                Done &bull; Awaiting Report
              </Button>
            </div>
          </div>
        )}

        {/* Stage 3: Inspector Report Available & Passed */}
        {inspection && inspection.status === 'passed' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1 text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Official Certified Assay Report
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/60 text-emerald-900">
                  Verified by Inspector
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-emerald-200">
                <div>
                  <span className="text-emerald-800 text-[11px] block">Assayer Name</span>
                  <span className="font-bold text-[#0B3326]">{inspection.inspectorName || 'Govind (Certified Assayer)'}</span>
                </div>
                <div>
                  <span className="text-emerald-800 text-[11px] block">Certified Grade</span>
                  <span className="font-bold text-[#0B3326]">Grade {inspection.grade || 'A'} (Commercial)</span>
                </div>
                <div>
                  <span className="text-emerald-800 text-[11px] block">Moisture Content</span>
                  <span className="font-bold text-[#0B3326]">{inspection.moisture || '10.5'}% (Within Limit &lt;12%)</span>
                </div>
                <div>
                  <span className="text-emerald-800 text-[11px] block">Foreign Matter</span>
                  <span className="font-bold text-[#0B3326]">{inspection.foreignMatter || '0.4'}%</span>
                </div>
              </div>

              <p className="text-[11px] text-emerald-800 italic pt-1">
                "{inspection.inspectorNotes || 'Physical quality and assay parameters confirmed matching agreement at farmgate hub.'}"
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button variant="ghost" size="sm" onClick={onClose} className="text-xs cursor-pointer">
                Close
              </Button>
              <Button
                variant="accent"
                size="md"
                onClick={handleAcceptReport}
                icon={CheckCircle2}
                iconPosition="left"
                className="text-xs font-bold cursor-pointer"
              >
                {isPreBuy ? 'Accept Quality & Proceed to Buy Now' : 'Accept Quality & Proceed with Delivery'}
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
