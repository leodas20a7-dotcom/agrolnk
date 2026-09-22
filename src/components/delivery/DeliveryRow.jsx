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
  const isFarmer = viewerRole === 'farmer';
  const isBuyer = viewerRole === 'buyer';

  const pickupStr = typeof delivery.pickupLocation === 'object'
    ? `${delivery.pickupLocation?.district || 'Salem'}, ${delivery.pickupLocation?.state || 'Tamil Nadu'}`
    : delivery.pickupLocation || 'Farmgate';

  const destStr = typeof delivery.deliveryLocation === 'object'
    ? `${delivery.deliveryLocation?.district || 'Chennai'}, ${delivery.deliveryLocation?.state || 'Tamil Nadu'}`
    : delivery.deliveryLocation || 'Destination Hub';

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-[#10B981]/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-left">
      {/* Left: Manifest ID & Commodity (flex-1 min-w-0 prevents text overflow displacement) */}
      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-0 lg:pr-4">
        <div className="w-11 h-11 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center shrink-0 shadow-2xs">
          <Truck className="w-5 h-5 text-[#10B981]" />
        </div>

        <div className="space-y-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-extrabold text-[#0B3326] font-heading">
              {delivery.deliveryNumber}
            </span>
            <Badge variant="dark" size="sm" className="shrink-0">
              {delivery.orderNumber}
            </Badge>
          </div>

          <div 
            className="text-xs text-[#566861] flex items-center gap-1.5 min-w-0 truncate"
            title={`${delivery.commodity} • ${delivery.quantity} ${delivery.unit}${delivery.transporterName ? ` • ${delivery.transporterName}` : ''}`}
          >
            <span className="font-bold text-[#14211D] shrink-0">{delivery.commodity}</span>
            <span>&bull;</span>
            <span className="font-medium text-[#0B3326] shrink-0">{delivery.quantity} {delivery.unit}</span>
            {delivery.transporterName && (
              <>
                <span>&bull;</span>
                <span className="text-[#10B981] font-semibold truncate">{delivery.transporterName}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Middle: Route & Freight Quote (Evenly locked width across all rows) */}
      <div className="w-full lg:w-[320px] xl:w-[340px] shrink-0 grid grid-cols-2 gap-3 sm:gap-4 py-2.5 lg:py-0 border-y lg:border-y-0 lg:border-x border-[#E5EDE8] lg:px-5">
        <div className="min-w-0">
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block truncate">Route</span>
          <span 
            className="font-bold text-[#14211D] block truncate text-xs"
            title={`${pickupStr} → ${destStr}`}
          >
            {pickupStr} → {destStr}
          </span>
        </div>

        <div className="min-w-0">
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block truncate">Freight Cost</span>
          <span className="font-extrabold text-sm text-[#10B981] block truncate">
            {delivery.freightAmount ? `₹${Number(delivery.freightAmount).toLocaleString('en-IN')}` : 'Calculating'}
          </span>
        </div>
      </div>

      {/* Right: Status & Actions (Consistently anchored) */}
      <div className="w-full lg:w-[270px] xl:w-[290px] flex items-center justify-between lg:justify-end gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
        <div className="shrink-0">
          <DeliveryStatusBadge status={delivery.status} size="sm" />
        </div>

        {isPriceOffered && onAcceptPrice && (
          <Button
            variant="accent"
            size="sm"
            onClick={() => onAcceptPrice(delivery)}
            className="text-xs font-bold py-1.5 px-3 shadow-xs cursor-pointer whitespace-nowrap"
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
            className="text-xs font-bold py-1.5 px-3 shadow-xs cursor-pointer whitespace-nowrap"
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
            className="text-xs font-bold py-1.5 px-3 shadow-xs cursor-pointer whitespace-nowrap"
          >
            Confirm Receipt
          </Button>
        )}

        <Button
          variant={isTransporter && !isAvailableJob ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => onView(delivery)}
          icon={ArrowRight}
          iconPosition="right"
          className="text-xs font-bold py-2 cursor-pointer whitespace-nowrap"
        >
          {isFarmer
            ? 'View Details'
            : isBuyer
            ? 'Track Trip'
            : isTransporter && (delivery.status === 'assigned' || delivery.status === 'picked_up' || delivery.status === 'in_transit')
            ? 'Manage Trip'
            : isAvailableJob
            ? 'View Route'
            : 'View Details'}
        </Button>
      </div>
    </div>
  );
}
