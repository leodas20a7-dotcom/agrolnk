import React from 'react';
import {
  MapPin,
  ShieldCheck,
  User,
  Calendar,
  Tag,
  Package,
  Landmark,
  CreditCard,
  ArrowRight,
  Truck,
  Navigation,
  CheckCircle2
} from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import OrderStatus from './OrderStatus';
import FinancingStatusBadge from '../financing/FinancingStatusBadge';
import DeliveryStatusBadge from '../delivery/DeliveryStatusBadge';
import DeliveryTimeline from '../delivery/DeliveryTimeline';
import CommissionBreakdownPill from '../admin/CommissionBreakdownPill';
import InspectionStatusBadge from '../inspection/InspectionStatusBadge';
import { getFinancingRequestForOrder } from '../../utils/financing';
import { getDeliveryForOrder } from '../../utils/deliveries';
import { getInspectionForOrder } from '../../utils/inspection';
import { ClipboardCheck } from 'lucide-react';

export default function OrderSummary({
  order,
  viewerRole = 'farmer',
  onRequestFinancing,
  onViewFinancing,
  onArrangeDelivery,
  onViewDelivery,
  onConfirmReceipt,
  onInspectQuality,
}) {
  const [existingFinancing, setExistingFinancing] = React.useState(null);
  const [existingDelivery, setExistingDelivery] = React.useState(null);
  const [existingInspection, setExistingInspection] = React.useState(null);

  React.useEffect(() => {
    let isMounted = true;
    const loadLinkedData = async () => {
      if (!order?.orderNumber && !order?.id) return;
      try {
        const [fin, dlv, insp] = await Promise.all([
          getFinancingRequestForOrder(order.orderNumber || order.id),
          getDeliveryForOrder(order.orderNumber || order.id),
          getInspectionForOrder(order.orderNumber || order.id),
        ]);
        if (isMounted) {
          setExistingFinancing(fin);
          setExistingDelivery(dlv);
          setExistingInspection(insp);
        }
      } catch (err) {
        console.warn('Error fetching linked order data:', err);
      }
    };
    loadLinkedData();
    return () => {
      isMounted = false;
    };
  }, [order?.id, order?.orderNumber]);

  if (!order) return null;

  const isBuyer = viewerRole === 'buyer';

  const pickupStr = typeof order.pickupLocation === 'object'
    ? `${order.pickupLocation?.district || order.district || 'Salem'}, ${order.pickupLocation?.state || order.state || 'Tamil Nadu'}`
    : order.district ? `${order.district}, ${order.state || 'India'}` : 'Origin Farmgate';

  const destStr = typeof order.deliveryLocation === 'object'
    ? `${order.deliveryLocation?.district || 'Chennai'}, ${order.deliveryLocation?.state || 'Tamil Nadu'}`
    : 'Destination Wholesale Terminal';

  const isFinanced = Boolean(
    existingFinancing ||
    order.paymentMode === 'trade_credit' ||
    order.escrowStatus === 'financing_pending' ||
    order.financingRequestId
  );

  const financedAmount = existingFinancing?.approvedAmount || existingFinancing?.requestedAmount || order.financingAmount || Math.round(Number(order.totalAmount || 0) * 0.8);
  const buyerMargin = Math.max(0, Number(order.totalAmount || 0) - financedAmount);

  return (
    <div className="space-y-5 text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] gap-3">
        <div>
          <span className="text-xs text-[#566861] block">Order Identifier</span>
          <span className="text-xl font-extrabold text-[#0B3326] font-heading">
            {order.orderNumber}
          </span>
        </div>
        
        <div className="flex items-center gap-2.5">
          {/* Trade Credit Status Badge */}
          {isFinanced ? (
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
              existingFinancing?.status === 'approved'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-blue-50 text-blue-800 border-blue-300'
            }`}>
              <Landmark className="w-3.5 h-3.5 text-blue-600" />
              <span>
                {existingFinancing?.status === 'approved' ? 'NBFC Credit Approved ✓' : 'NBFC Credit • Under Review'}
              </span>
            </span>
          ) : existingDelivery ? (
            <DeliveryStatusBadge status={existingDelivery.status} size="md" />
          ) : (
            <OrderStatus status={order.status} size="md" />
          )}
        </div>
      </div>

      {/* Produce Specifications */}
      <div className="p-5 rounded-2xl bg-white border border-[#E5EDE8] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-[#0B3326] font-heading">
                {order.commodity || 'Produce Lot'}
              </h3>
              <Badge variant="dark" size="sm">
                Grade {order.grade || 'A'}
              </Badge>
            </div>
            <span className="text-xs text-[#566861]">
              Variety: {order.variety || 'Standard Lot'}
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs text-[#566861] block font-medium">Order Total</span>
            <span className="text-2xl font-extrabold text-[#0B3326] font-heading">
              ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Quantities & Price Breakdown */}
        <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-center text-xs">
          <div>
            <span className="text-[10px] text-[#566861] block font-medium">Quantity</span>
            <span className="font-bold text-[#14211D]">
              {Number(order.quantity || 0).toLocaleString('en-IN')} {order.unit || 'kg'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[#566861] block font-medium">Price / {order.unit || 'kg'}</span>
            <span className="font-bold text-[#0B3326]">
              ₹{Number(order.pricePerUnit || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[#566861] block font-medium">Payment Mode</span>
            <span className={`font-bold ${isFinanced ? 'text-blue-700' : 'text-[#10B981]'}`}>
              {isFinanced ? 'Trade Credit (NBFC)' : '100% Escrow'}
            </span>
          </div>
        </div>

        {/* Counterparty & Location Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
            <span className="text-[10px] text-[#566861] block font-bold uppercase tracking-wider mb-1">
              {viewerRole === 'farmer' ? 'Buyer Information' : 'Seller Information'}
            </span>
            <div className="flex items-center gap-2 font-bold text-[#14211D]">
              <User className="w-3.5 h-3.5 text-[#10B981]" />
              <span>
                {viewerRole === 'farmer'
                  ? order.buyerName || 'Wholesale Buyer'
                  : order.farmerName || 'Verified Producer'}
              </span>
            </div>
            <span className="text-[11px] text-[#566861] block mt-0.5">
              Verified Agrolnk Trading Partner
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
            <span className="text-[10px] text-[#566861] block font-bold uppercase tracking-wider mb-1">
              Logistics Route
            </span>
            <div className="flex items-center gap-1.5 font-bold text-[#14211D]">
              <MapPin className="w-3.5 h-3.5 text-[#10B981]" />
              <span>
                {pickupStr} → {destStr}
              </span>
            </div>
            <span className="text-[11px] text-[#566861] block mt-0.5">
              Direct corridor transit
            </span>
          </div>
        </div>

        {/* 0.50% Platform Take-Rate Breakdown (0.25% Buyer + 0.25% Seller) */}
        <CommissionBreakdownPill 
          orderAmount={Number(order.totalAmount || 0)} 
          role={viewerRole} 
        />

        {/* Dedicated Quality Assay & Inspection Card */}
        {(() => {
          const isPostDispatchOrDelivered =
            order.status === 'completed' ||
            order.status === 'delivered' ||
            (existingDelivery && ['picked_up', 'in_transit', 'delivered', 'completed'].includes(existingDelivery.status));

          // If not requested and the truck has already departed/delivered, don't show the pre-dispatch request card
          if (!existingInspection && isPostDispatchOrDelivered) {
            return null;
          }

          return (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/70 via-[#F8FAF8] to-white border border-amber-200/80 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-amber-700" />
                    <span className="text-xs font-bold text-[#0B3326]">
                      Quality Verification & Assay Desk
                    </span>
                    {existingInspection ? (
                      <InspectionStatusBadge status={existingInspection.status} size="sm" />
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        Pre-Dispatch Optional
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#566861]">
                    {existingInspection?.status === 'requested' && (
                      'Inspection requested! Admin will dispatch a certified assayer to test moisture % and grade before dispatch.'
                    )}
                    {existingInspection?.status === 'passed' && (
                      `Assay Certified by ${existingInspection.inspectorName || 'Inspector'} • Grade: ${existingInspection.grade || 'A'} • Moisture: ${existingInspection.moisture || '10.5'}% • Ready to continue delivery.`
                    )}
                    {existingInspection?.status === 'disputed' && (
                      `Quality discrepancy reported. Moisture: ${existingInspection.moisture}% • In Admin arbitration.`
                    )}
                    {!existingInspection && (
                      'Buyer can request pre-dispatch quality verification. Admin will send an inspector and provide the certified assay report before delivery.'
                    )}
                  </p>
                </div>

                {isBuyer && (existingInspection || !isPostDispatchOrDelivered) && (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => {
                      if (onInspectQuality) {
                        onInspectQuality(order);
                      }
                    }}
                    icon={ClipboardCheck}
                    iconPosition="left"
                    className="text-xs font-bold py-2 px-4 shadow-xs shrink-0 cursor-pointer"
                  >
                    {!existingInspection
                      ? 'Request Quality Check'
                      : existingInspection.status === 'requested'
                      ? 'View Request Status'
                      : 'View Assay Report'}
                  </Button>
                )}
              </div>
            </div>
          );
        })()}

        {/* Section: In-Order Logistics & Delivery Status (Single Unified Timeline) */}
        {existingDelivery ? (() => {
          const effectiveDeliveryStatus =
            order.status === 'completed'
              ? 'completed'
              : order.status === 'delivered' && existingDelivery.status !== 'completed'
              ? 'delivered'
              : existingDelivery.status;

          return (
            <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#10B981]" />
                  <span className="text-xs font-bold text-[#0B3326]">
                    Delivery {existingDelivery.deliveryNumber}
                  </span>
                  <DeliveryStatusBadge status={effectiveDeliveryStatus} size="sm" />
                </div>

                {onViewDelivery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDelivery({ ...existingDelivery, status: effectiveDeliveryStatus })}
                    icon={ArrowRight}
                    iconPosition="right"
                    className="text-xs font-bold text-[#0B3326] cursor-pointer"
                  >
                    Track Dispatch
                  </Button>
                )}
              </div>

              {/* Mini Delivery Timeline */}
              <div className="pt-2 border-t border-[#E5EDE8] space-y-2.5">
                <DeliveryTimeline currentStatus={effectiveDeliveryStatus} delivery={existingDelivery} />
                
                {existingDelivery.vehicleNumber && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 text-left">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-[#0B3326]">
                        Carrier / Vehicle: <strong className="font-mono font-bold">{existingDelivery.vehicleNumber}</strong>
                        {existingDelivery.transporterName ? ` (${existingDelivery.transporterName})` : ''}
                      </span>
                    </div>
                    {existingDelivery.driverPhone && (
                      <span className="text-[11px] text-[#566861]">
                        Driver: <strong>{existingDelivery.driverName || 'Driver'}</strong> ({existingDelivery.driverPhone})
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Buyer Confirm Receipt Button if Delivered */}
              {isBuyer && effectiveDeliveryStatus === 'delivered' && onConfirmReceipt && (
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-[#0B3326] font-semibold">
                    Produce delivered at your facility. Please confirm receipt.
                  </span>
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => onConfirmReceipt(existingDelivery)}
                    icon={CheckCircle2}
                    iconPosition="left"
                    className="text-xs font-bold py-2 shadow-xs cursor-pointer"
                  >
                    Confirm Receipt
                  </Button>
                </div>
              )}
            </div>
          );
        })() : (
          (order.status === 'confirmed' || order.status === 'ready_for_delivery') && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#EFF6FF] via-[#F2FBF6] to-white border border-[#93C5FD]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5 text-xs">
                <span className="font-bold text-[#1E40AF] flex items-center gap-1.5">
                  <Truck className="w-4 h-4" />
                  {viewerRole === 'farmer' ? 'Arrange Freight Dispatch' : 'Delivery Dispatch Pending'}
                </span>
                <span className="text-[#566861] block">
                  {viewerRole === 'farmer'
                    ? `Pickup: ${pickupStr} → Destination: ${destStr}`
                    : 'Farmer is scheduling vehicle pickup for this confirmed order.'}
                </span>
              </div>

              {viewerRole === 'farmer' && onArrangeDelivery && (
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => onArrangeDelivery(order)}
                  icon={Truck}
                  iconPosition="left"
                  className="font-bold text-xs py-2 px-4 shadow-xs shrink-0 cursor-pointer"
                >
                  Arrange Delivery
                </Button>
              )}
            </div>
          )
        )}

        {/* Transaction-Linked Trade Credit Facility Breakdown (When order is financed) */}
        {isFinanced && (
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 text-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Landmark className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <span className="font-bold text-blue-950 block">Trade Credit (NBFC)</span>
                  <span className="text-[11px] text-blue-700">
                    Application {existingFinancing?.requestNumber || order.financingRequestNumber || '#FIN-CREDIT'}
                  </span>
                </div>
              </div>

              {existingFinancing ? (
                <FinancingStatusBadge status={existingFinancing.status} size="sm" />
              ) : (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  Under Review
                </span>
              )}
            </div>

            {/* Concise Financial Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center bg-white p-2.5 rounded-xl border border-blue-100">
              <div>
                <span className="text-[10px] text-[#566861] block font-medium">NBFC Loan</span>
                <span className="font-extrabold text-blue-700 text-xs block mt-0.5">
                  ₹{financedAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#566861] block font-medium">Margin Paid</span>
                <span className="font-extrabold text-[#0B3326] text-xs block mt-0.5">
                  ₹{buyerMargin.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#566861] block font-medium">Repayment</span>
                <span className="font-bold text-[#14211D] text-xs block mt-0.5">
                  30 Days Net
                </span>
              </div>
            </div>

            {onViewFinancing && (
              <div className="flex justify-end pt-0.5">
                <Button
                  variant={isBuyer && existingFinancing?.status === 'approved' && !existingFinancing?.marginPaid ? "accent" : "secondary"}
                  size="sm"
                  onClick={() => onViewFinancing(existingFinancing || { id: order.financingRequestId, orderNumber: order.orderNumber, applicantRole: 'buyer' })}
                  icon={isBuyer && existingFinancing?.status === 'approved' && !existingFinancing?.marginPaid ? CreditCard : ArrowRight}
                  iconPosition={isBuyer && existingFinancing?.status === 'approved' && !existingFinancing?.marginPaid ? "left" : "right"}
                  className={`text-xs font-bold cursor-pointer ${
                    isBuyer && existingFinancing?.status === 'approved' && !existingFinancing?.marginPaid
                      ? 'shadow-xs'
                      : 'border-blue-200 text-blue-900 bg-white hover:bg-blue-50'
                  }`}
                >
                  {isBuyer && existingFinancing?.status === 'approved' && !existingFinancing?.marginPaid
                    ? `Pay Margin (₹${buyerMargin.toLocaleString('en-IN')}) & Secure Escrow`
                    : 'View Credit Desk'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Escrow Guarantee Pill */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[#EBF5F0] border border-[#10B981]/25 text-xs text-[#0B3326]">
          <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
          <span>
            {viewerRole === 'farmer'
              ? 'Buyer has deposited 100% of payment into escrow. Payout will be released upon verified delivery.'
              : 'Your payment is safely protected in escrow. Funds will only be released to the farmer after verified delivery.'}
          </span>
        </div>
      </div>
    </div>
  );
}
