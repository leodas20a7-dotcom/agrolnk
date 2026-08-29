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
import { getFinancingRequestForOrder } from '../../utils/financing';
import { getDeliveryForOrder } from '../../utils/deliveries';

export default function OrderSummary({
  order,
  viewerRole = 'farmer',
  onRequestFinancing,
  onViewFinancing,
  onArrangeDelivery,
  onViewDelivery,
  onConfirmReceipt,
}) {
  if (!order) return null;

  const isBuyer = viewerRole === 'buyer';
  const existingFinancing = getFinancingRequestForOrder(order.orderNumber);
  const existingDelivery = getDeliveryForOrder(order.orderNumber);

  const pickupStr = typeof order.pickupLocation === 'object'
    ? `${order.pickupLocation?.district || order.district || 'Salem'}, ${order.pickupLocation?.state || order.state || 'Tamil Nadu'}`
    : order.district ? `${order.district}, ${order.state || 'India'}` : 'Origin Farmgate';

  const destStr = typeof order.deliveryLocation === 'object'
    ? `${order.deliveryLocation?.district || 'Chennai'}, ${order.deliveryLocation?.state || 'Tamil Nadu'}`
    : 'Destination Wholesale Terminal';

  return (
    <div className="space-y-5 text-left">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8]">
        <div>
          <span className="text-xs text-[#566861] block">Order Identifier</span>
          <span className="text-xl font-extrabold text-[#0B3326] font-heading">
            {order.orderNumber}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {existingDelivery && (
            <DeliveryStatusBadge status={existingDelivery.status} size="sm" />
          )}
          <OrderStatus status={order.status} size="md" />
        </div>
      </div>

      {/* Produce Specifications */}
      <div className="p-5 rounded-2xl bg-white border border-[#E5EDE8] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-[#0B3326] font-heading">
                {order.commodity}
              </h3>
              <Badge variant="dark" size="sm">
                Grade {order.grade}
              </Badge>
            </div>
            <span className="text-xs text-[#566861]">
              Variety: {order.variety || 'Standard Lot'}
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs text-[#566861] block font-medium">Order Total</span>
            <span className="text-2xl font-extrabold text-[#0B3326] font-heading">
              ₹{order.totalAmount?.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Quantities & Price Breakdown */}
        <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-center text-xs">
          <div>
            <span className="text-[10px] text-[#566861] block font-medium">Quantity</span>
            <span className="font-bold text-[#14211D]">
              {order.quantity} {order.unit}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[#566861] block font-medium">Price / {order.unit}</span>
            <span className="font-bold text-[#0B3326]">
              ₹{order.pricePerUnit}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[#566861] block font-medium">Payment Mode</span>
            <span className="font-bold text-[#10B981]">
              100% Escrow
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

        {/* Section: In-Order Logistics & Delivery Status */}
        {existingDelivery ? (
          <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#10B981]" />
                <span className="text-xs font-bold text-[#0B3326]">
                  Linked Delivery {existingDelivery.deliveryNumber}
                </span>
                <DeliveryStatusBadge status={existingDelivery.status} size="sm" />
              </div>

              {onViewDelivery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewDelivery(existingDelivery)}
                  icon={ArrowRight}
                  iconPosition="right"
                  className="text-xs font-bold text-[#0B3326] cursor-pointer"
                >
                  Track Dispatch
                </Button>
              )}
            </div>

            {/* Embed Mini Delivery Timeline */}
            <div className="pt-2 border-t border-[#E5EDE8]">
              <DeliveryTimeline currentStatus={existingDelivery.status} delivery={existingDelivery} />
            </div>

            {/* Buyer Confirm Receipt Button if Delivered */}
            {isBuyer && existingDelivery.status === 'delivered' && onConfirmReceipt && (
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
        ) : (
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

        {/* Transaction-Linked Financing Callout Inside the Order */}
        {existingFinancing ? (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#EBF5F0] to-[#F2FBF6] border border-[#10B981]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-[#10B981]" />
                <span className="text-xs font-bold text-[#0B3326]">
                  Linked Financing Application {existingFinancing.requestNumber}
                </span>
                <FinancingStatusBadge status={existingFinancing.status} size="sm" />
              </div>
              <span className="text-xs text-[#566861] block">
                {existingFinancing.status === 'approved'
                  ? `Approved Facility: ₹${(existingFinancing.approvedAmount || existingFinancing.requestedAmount).toLocaleString('en-IN')}`
                  : `Requested: ₹${existingFinancing.requestedAmount.toLocaleString('en-IN')} (${existingFinancing.purposeLabel})`}
              </span>
            </div>

            {onViewFinancing && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onViewFinancing(existingFinancing)}
                icon={ArrowRight}
                iconPosition="right"
                className="text-xs font-bold bg-white cursor-pointer"
              >
                View Financing
              </Button>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FEF3C7]/60 to-[#F2FBF6] border border-[#FDE68A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[#0B3326] flex items-center gap-1.5">
                {isBuyer ? <CreditCard className="w-4 h-4 text-[#D97706]" /> : <Landmark className="w-4 h-4 text-[#10B981]" />}
                {isBuyer ? 'Need credit support?' : 'Need immediate liquidity?'}
              </span>
              <span className="text-xs text-[#566861] block">
                {isBuyer
                  ? 'Obtain 30-day settlement trade credit for this order.'
                  : 'Get working capital advance up to 85% for this confirmed produce transaction.'}
              </span>
            </div>

            {onRequestFinancing && (
              <Button
                variant="accent"
                size="sm"
                onClick={() => onRequestFinancing(order)}
                icon={ArrowRight}
                iconPosition="right"
                className="font-bold text-xs py-2 px-4 shadow-xs shrink-0 cursor-pointer"
              >
                {isBuyer ? 'Request Credit' : 'Explore Financing'}
              </Button>
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
