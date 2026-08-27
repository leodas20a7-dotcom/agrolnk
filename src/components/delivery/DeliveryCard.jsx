import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import DeliveryStatusBadge from './DeliveryStatusBadge';
import {
  Truck,
  ArrowRight,
  MapPin,
  Calendar,
  Package,
  User,
  CheckCircle2,
  Navigation,
  ShieldCheck
} from 'lucide-react';

export default function DeliveryCard({
  delivery,
  viewerRole = 'farmer', // 'farmer' | 'buyer' | 'transporter'
  onView,
  onAccept,
  onConfirmReceipt,
}) {
  const isAvailableJob = delivery.status === 'transport_requested';
  const isDelivered = delivery.status === 'delivered';
  const isTransporter = viewerRole === 'transporter';

  const pickupStr = typeof delivery.pickupLocation === 'object'
    ? `${delivery.pickupLocation?.district || 'Salem'}, ${delivery.pickupLocation?.state || 'Tamil Nadu'}`
    : delivery.pickupLocation;

  const destStr = typeof delivery.deliveryLocation === 'object'
    ? `${delivery.deliveryLocation?.district || 'Chennai'}, ${delivery.deliveryLocation?.state || 'Tamil Nadu'}`
    : delivery.deliveryLocation;

  return (
    <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-4 text-left flex flex-col justify-between">
      <div className="space-y-4">
        {/* Top Header: Delivery Number, Linked Order & Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center">
              <Truck className="w-4 h-4 text-[#10B981]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-[#0B3326] font-heading">
                  {delivery.deliveryNumber}
                </span>
                <Badge variant="dark" size="sm">
                  {delivery.orderNumber}
                </Badge>
              </div>
            </div>
          </div>

          <DeliveryStatusBadge status={delivery.status} />
        </div>

        {/* Commodity & Volume */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8]">
          <div>
            <h4 className="text-base font-bold text-[#14211D]">
              {delivery.commodity}
            </h4>
            <span className="text-xs text-[#566861]">
              Grade {delivery.grade || 'A'} • {delivery.variety || 'Standard Lot'}
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs text-[#566861] block font-medium">Load Volume</span>
            <span className="text-lg font-extrabold text-[#0B3326] font-heading">
              {delivery.quantity} {delivery.unit}
            </span>
          </div>
        </div>

        {/* Route: Origin -> Destination */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
              <div className="w-0.5 h-6 bg-[#E5EDE8]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#0B3326]" />
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
                    Origin Pickup
                  </span>
                  <span className="font-bold text-[#14211D]">
                    {pickupStr}
                  </span>
                </div>
                <span className="text-[11px] text-[#566861] flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#10B981]" />
                  {delivery.preferredPickupDate || 'Immediate'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
                  Delivery Destination
                </span>
                <span className="font-bold text-[#14211D]">
                  {destStr}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Driver / Transporter Badge if Assigned */}
        {delivery.transporterName && (
          <div className="p-3 rounded-xl bg-[#EBF5F0]/60 border border-[#10B981]/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-[#10B981]" />
              <span className="text-[#0B3326] font-semibold">
                Carrier: <strong>{delivery.transporterName}</strong>
              </span>
            </div>
            {delivery.vehicleNumber && (
              <Badge variant="emerald" size="sm">
                {delivery.vehicleNumber}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-[#E5EDE8] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-[#10B981] font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>GPS Handover Protocol</span>
        </div>

        <div className="flex items-center gap-2">
          {viewerRole === 'buyer' && isDelivered && onConfirmReceipt && (
            <Button
              variant="accent"
              size="sm"
              onClick={() => onConfirmReceipt(delivery)}
              icon={CheckCircle2}
              iconPosition="left"
              className="text-xs font-bold py-2 shadow-xs cursor-pointer"
            >
              Confirm Receipt
            </Button>
          )}

          {isTransporter && isAvailableJob && onAccept ? (
            <Button
              variant="accent"
              size="sm"
              onClick={() => onAccept(delivery)}
              icon={Truck}
              iconPosition="left"
              className="text-xs font-bold py-2 shadow-xs cursor-pointer"
            >
              Accept Delivery
            </Button>
          ) : (
            <Button
              variant={isTransporter ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onView(delivery)}
              icon={ArrowRight}
              iconPosition="right"
              className="text-xs font-bold py-2 cursor-pointer"
            >
              {isTransporter ? 'Manage Trip' : 'View Delivery'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
