import React from 'react';
import {
  MapPin,
  ShieldCheck,
  User,
  Calendar,
  Package,
  Landmark,
  CreditCard,
  ArrowRight,
  Truck,
  CheckCircle2,
  ClipboardCheck,
  Receipt
} from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import OrderStatus from './OrderStatus';
import DeliveryTimeline from '../delivery/DeliveryTimeline';
import OrderReceiptModal from './OrderReceiptModal';
import { getFinancingRequestForOrder } from '../../utils/financing';
import { getDeliveryForOrder } from '../../utils/deliveries';
import { getInspectionForOrder } from '../../utils/inspection';

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
  const [showReceiptModal, setShowReceiptModal] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;
    const loadLinkedData = async () => {
      if (!order?.orderNumber && !order?.id) return;
      try {
        const [fin, dlv, insp] = await Promise.all([
          getFinancingRequestForOrder(order.orderNumber || order.id, null, viewerRole),
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

    const handleSync = () => {
      loadLinkedData();
    };

    window.addEventListener('agrolnk_financing_updated', handleSync);
    window.addEventListener('agrolnk_orders_updated', handleSync);
    window.addEventListener('agrolnk_order_updated', handleSync);
    window.addEventListener('agrolnk_deliveries_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      isMounted = false;
      window.removeEventListener('agrolnk_financing_updated', handleSync);
      window.removeEventListener('agrolnk_orders_updated', handleSync);
      window.removeEventListener('agrolnk_order_updated', handleSync);
      window.removeEventListener('agrolnk_deliveries_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [order?.id, order?.orderNumber, order?.status, viewerRole]);

  if (!order) return null;

  const isBuyer = viewerRole === 'buyer';

  const pickupStr = typeof order.pickupLocation === 'object'
    ? `${order.pickupLocation?.district || order.district || 'Salem'}, ${order.pickupLocation?.state || order.state || 'Tamil Nadu'}`
    : order.district ? `${order.district}, ${order.state || 'India'}` : 'Origin Farmgate';

  const destStr = typeof order.deliveryLocation === 'object'
    ? `${order.deliveryLocation?.district || 'Chennai'}, ${order.deliveryLocation?.state || 'Tamil Nadu'}`
    : 'Destination Wholesale Terminal';

  const isFarmerFinancing = Boolean(
    !isBuyer &&
    existingFinancing &&
    (existingFinancing.applicantRole === 'farmer' || existingFinancing.purpose === 'working_capital')
  );

  const isBuyerFinanced = Boolean(
    isBuyer &&
    (existingFinancing ||
      order.paymentMode === 'trade_credit' ||
      order.escrowStatus === 'financing_pending' ||
      order.financingRequestId)
  );

  const financedAmount = existingFinancing?.approvedAmount || existingFinancing?.requestedAmount || order.financingAmount || Math.round(Number(order.totalAmount || 0) * 0.8);
  const buyerMargin = Math.max(0, Number(order.totalAmount || 0) - financedAmount);

  const effectiveDeliveryStatus =
    order.status === 'completed'
      ? 'completed'
      : order.status === 'delivered' && existingDelivery?.status !== 'completed'
      ? 'delivered'
      : existingDelivery?.status || order.status;

  return (
    <div className="space-y-4 text-left">
      
      {/* 1. Unified Order Header & Produce Summary */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs space-y-4">
        
        {/* Top Title & Total */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E5EDE8]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-extrabold text-[#0B3326] font-heading">
                {order.commodity || 'Produce Lot'}
              </h3>
              <Badge variant="dark" size="sm">
                Grade {order.grade || 'A'}
              </Badge>
              <span className="text-xs text-[#566861] font-mono">
                #{order.orderNumber}
              </span>
            </div>
            <span className="text-xs text-[#566861] mt-0.5 block">
              Variety: <strong>{order.variety || 'Standard'}</strong> • {order.createdAt && !isNaN(new Date(order.createdAt).getTime()) ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Recent'}
            </span>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-[#566861] block tracking-wider">
              Total Amount
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-[#0B3326] font-heading">
              ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Essential 3-Column Trade Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Quantity & Unit Price */}
          <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-0.5">
            <span className="text-[10px] text-[#566861] font-bold uppercase tracking-wider block">
              Quantity & Rate
            </span>
            <span className="font-extrabold text-[#14211D] text-sm block">
              {Number(order.quantity || 0).toLocaleString('en-IN')} {order.unit || 'kg'}
            </span>
            <span className="text-[11px] text-[#566861]">
              ₹{Number(order.pricePerUnit || (order.totalAmount / (order.quantity || 1)) || 0).toLocaleString('en-IN')}/{order.unit || 'kg'}
            </span>
          </div>

          {/* Counterparty */}
          <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-0.5">
            <span className="text-[10px] text-[#566861] font-bold uppercase tracking-wider block">
              {viewerRole === 'farmer' ? 'Buyer' : 'Farmer'}
            </span>
            <span className="font-extrabold text-[#0B3326] text-sm flex items-center gap-1.5 truncate">
              <User className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
              <span className="truncate">
                {viewerRole === 'farmer' ? order.buyerName || 'Buyer' : order.farmerName || 'Farmer'}
              </span>
            </span>
            <span className="text-[11px] text-[#566861] flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 text-[#566861] shrink-0" />
              <span className="truncate">{viewerRole === 'farmer' ? destStr : pickupStr}</span>
            </span>
          </div>

          {/* Payment & Security Mode */}
          <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-0.5">
            <span className="text-[10px] text-[#566861] font-bold uppercase tracking-wider block">
              Payment Mode
            </span>
            <span className={`font-extrabold text-sm block ${isBuyer && isBuyerFinanced ? 'text-blue-700' : 'text-emerald-700'}`}>
              {isBuyer && isBuyerFinanced ? 'Trade Credit (NBFC)' : '100% Escrow Protected'}
            </span>
            <span className="text-[11px] text-[#566861] block">
              {isBuyer && isBuyerFinanced ? '30 Days Net Repayment' : 'Held safely until delivery'}
            </span>
          </div>
        </div>

        {/* Sleek Credit Facility Tag (If credit is active) */}
        {isBuyer && isBuyerFinanced && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs gap-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-700 shrink-0" />
              <span className="text-blue-950 font-semibold">
                NBFC Credit: <strong>₹{financedAmount.toLocaleString('en-IN')}</strong> • Margin Paid: ₹{buyerMargin.toLocaleString('en-IN')}
              </span>
            </div>
            {onViewFinancing && (
              <button
                type="button"
                onClick={() => onViewFinancing(existingFinancing)}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer text-left"
              >
                View Credit Terms →
              </button>
            )}
          </div>
        )}

        {/* Quality Assay Certificate Strip (If inspected) */}
        {existingInspection && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs">
            <div className="flex items-center gap-2 text-amber-950">
              <ClipboardCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Quality Assay:</strong> Grade {existingInspection.grade || 'A'} • Moisture: {existingInspection.moisture || '10.5'}% ({existingInspection.status === 'passed' ? 'Assay Certified' : 'Assay Disputed'})
              </span>
            </div>
            {isBuyer && onInspectQuality && (
              <button
                type="button"
                onClick={() => onInspectQuality(order)}
                className="text-xs font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
              >
                Report
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Simple 4-Step Logistics Progress Tracker */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs space-y-3.5 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#10B981]" />
            <span className="text-xs font-bold text-[#0B3326] uppercase tracking-wider">
              Consignment Journey
            </span>
          </div>

          {onViewDelivery && existingDelivery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDelivery({ ...existingDelivery, status: effectiveDeliveryStatus })}
              icon={ArrowRight}
              iconPosition="right"
              className="text-xs font-bold text-[#0B3326] cursor-pointer py-1 px-2.5"
            >
              Track Map
            </Button>
          )}
        </div>

        {/* 4-Step Progress Bar */}
        <DeliveryTimeline currentStatus={effectiveDeliveryStatus} delivery={existingDelivery || {}} />

        {/* Driver & Vehicle Tag */}
        {existingDelivery?.vehicleNumber && (
          <div className="p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 text-xs">
            <div className="flex items-center gap-2">
              <Truck className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
              <span className="text-[#0B3326]">
                Vehicle: <strong className="font-mono">{existingDelivery.vehicleNumber}</strong>
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

      {/* 3. Completed Order Official Settlement Receipt Banner */}
      {(order.status === 'completed' || order.escrow_status === 'released') && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0B3326] to-[#0F4A37] text-white border border-[#14624A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm text-left">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#34D399]/20 text-[#34D399] flex items-center justify-center shrink-0 border border-[#34D399]/30">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white block">
                Trade Completed & Escrow Settled
              </span>
              <p className="text-[11px] text-white/80">
                {order.bankUtr || order.bank_utr ? `Bank UTR: ${order.bankUtr || order.bank_utr}` : 'Official tax invoice and settlement receipt released.'}
              </p>
            </div>
          </div>

          <Button
            variant="accent"
            size="sm"
            onClick={() => setShowReceiptModal(true)}
            icon={Receipt}
            iconPosition="left"
            className="text-xs font-bold py-2 px-3.5 shadow-md shrink-0 cursor-pointer w-full sm:w-auto justify-center"
          >
            View Settlement Receipt
          </Button>
        </div>
      )}

      {/* 4. Farmer Simple Working Capital Option (Only before completion) */}
      {viewerRole === 'farmer' && !isFarmerFinancing && order.status !== 'cancelled' && order.status !== 'completed' && onRequestFinancing && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] gap-2.5 text-left text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#0B3326] text-[#34D399]">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-[#0B3326] block">
                Need Working Capital Credit?
              </span>
              <span className="text-[#566861]">
                Apply for credit up to ₹{Math.round(Number(order.totalAmount || 0) * 0.8).toLocaleString('en-IN')} (30–60 days)
              </span>
            </div>
          </div>

          <Button
            variant="accent"
            size="sm"
            onClick={() => onRequestFinancing(order)}
            className="text-xs font-bold py-1.5 px-3.5 shadow-xs shrink-0 cursor-pointer whitespace-nowrap"
          >
            Apply Credit
          </Button>
        </div>
      )}

      {/* Official Trade Settlement Receipt Modal */}
      {showReceiptModal && (
        <OrderReceiptModal
          isOpen={showReceiptModal}
          order={order}
          onClose={() => setShowReceiptModal(false)}
          viewerRole={viewerRole}
        />
      )}
    </div>
  );
}
