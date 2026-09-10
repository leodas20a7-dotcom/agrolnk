import React from 'react';
import { Truck, MapPin, ArrowRight, ShieldCheck, Check, Clock } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import DeliveryStatusBadge from './DeliveryStatusBadge';

export default function DeliveryRow({
  delivery,
  viewerRole = 'farmer',
  onView,
  onAccept,
  onAcceptPrice,
  onDeclinePrice,
  onConfirmReceipt,
}) {
  const isPriceOffered = delivery.status === 'price_offered';
  const isAvailableJob = delivery.status === 'transport_requested';
  const isTransporter = viewerRole === 'transporter';

  const pickupStr = typeof delivery.pickupLocation === 'object'
    ? `${delivery.pickupLocation?.district || 'Salem'}, ${delivery.pickupLocation?.state || 'Tamil Nadu'}`
    : delivery.pickupLocation || 'Farmgate';

  const destStr = typeof delivery.deliveryLocation === 'object'
    ? `${delivery.deliveryLocation?.district || 'Chennai'}, ${delivery.deliveryLocation?.state || 'Tamil Nadu'}`
    : delivery.deliveryLocation || 'Destination Hub';

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-[#10B981]/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-left">
      {/* Left: Manifest ID & Commodity */}
      <div className="flex items-start sm:items-center gap-3.5 min-w-[240px]">
        <div className="w-11 h-11 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center shrink-0 shadow-2xs">
          <Truck className="w-5 h-5 text-[#10B981]" />
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-extrabold text-[#0B3326] font-heading">
              {delivery.deliveryNumber}
            </span>
            <Badge variant="dark" size="sm">
              {delivery.orderNumber}
            </Badge>
          </div>

          <div className="text-xs text-[#566861] flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[#14211D]">{delivery.commodity}</span>
            <span>&bull;</span>
            <span className="font-medium text-[#0B3326]">{delivery.quantity} {delivery.unit}</span>
            {delivery.transporterName && (
              <>
                <span>&bull;</span>
                <span className="text-[#10B981] font-semibold">{delivery.transporterName}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Middle: Route & Freight Quote */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6 py-2 lg:py-0 border-y lg:border-y-0 lg:border-x lg:px-6 border-[#E5EDE8] text-xs">
        <div>
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">Route</span>
          <span className="font-bold text-[#14211D] block truncate max-w-[160px]">
            {pickupStr} → {destStr}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">Freight Cost</span>
          <span className="font-extrabold text-sm text-[#10B981] block">
            {delivery.freightAmount ? `₹${Number(delivery.freightAmount).toLocaleString('en-IN')}` : 'Calculating'}
          </span>
        </div>
      </div>

      {/* Right: Status & Actions */}
      <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 flex-wrap">
        <DeliveryStatusBadge status={delivery.status} size="sm" />

        {isPriceOffered && onAcceptPrice && (
          <Button
            variant="accent"
            size="sm"
            onClick={() => onAcceptPrice(delivery)}
            className="text-xs font-bold py-1.5 px-3 shadow-xs cursor-pointer"
          >
            Accept ₹{delivery.freightAmount}
          </Button>
        )}

        {isTransporter && isAvailableJob && onAccept && (
          <Button
            variant="accent"
            size="sm"
            onClick={() => onAccept(delivery)}
            icon={Truck}
            iconPosition="left"
            className="text-xs font-bold py-1.5 px-3 shadow-xs cursor-pointer"
          >
            Quote & Accept
          </Button>
        )}

        {onConfirmReceipt && delivery.status === 'delivered' && (
          <Button
            variant="accent"
            size="sm"
            onClick={() => onConfirmReceipt(delivery)}
            icon={Check}
            iconPosition="left"
            className="text-xs font-bold py-1.5 px-3 shadow-xs cursor-pointer"
          >
            Confirm Receipt
          </Button>
        )}

        <Button
          variant={isTransporter ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => onView(delivery)}
          icon={ArrowRight}
          iconPosition="right"
          className="text-xs font-bold py-2 border-[#E5EDE8] hover:border-[#10B981] hover:bg-[#F2FBF6] cursor-pointer"
        >
          {isTransporter ? 'Manage Trip' : 'Track Trip'}
        </Button>
      </div>
    </div>
  );
}
