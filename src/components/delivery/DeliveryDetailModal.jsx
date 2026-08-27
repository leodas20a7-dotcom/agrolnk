import React, { useState } from 'react';
import {
  X,
  Truck,
  MapPin,
  Calendar,
  ShieldCheck,
  User,
  Package,
  CheckCircle2,
  Navigation,
  Phone,
  FileText,
  AlertCircle
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import DeliveryStatusBadge from './DeliveryStatusBadge';
import DeliveryTimeline from './DeliveryTimeline';
import { acceptDeliveryJob, updateDeliveryStatus, confirmBuyerReceipt } from '../../utils/deliveries';

export default function DeliveryDetailModal({
  delivery,
  viewerRole = 'farmer', // 'farmer' | 'buyer' | 'transporter'
  currentUser,
  onClose,
  onStatusUpdated,
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!delivery) return null;

  const isTransporter = viewerRole === 'transporter';
  const isBuyer = viewerRole === 'buyer';

  const pickupStr = typeof delivery.pickupLocation === 'object'
    ? `${delivery.pickupLocation?.address || ''}, ${delivery.pickupLocation?.district || 'Salem'}, ${delivery.pickupLocation?.state || 'Tamil Nadu'}`
    : delivery.pickupLocation;

  const destStr = typeof delivery.deliveryLocation === 'object'
    ? `${delivery.deliveryLocation?.address || ''}, ${delivery.deliveryLocation?.district || 'Chennai'}, ${delivery.deliveryLocation?.state || 'Tamil Nadu'}`
    : delivery.deliveryLocation;

  const handleTransporterAction = (nextStatus) => {
    setIsUpdating(true);
    try {
      if (nextStatus === 'assigned') {
        const updated = acceptDeliveryJob(delivery.id, currentUser);
        onStatusUpdated?.(updated);
      } else {
        const updated = updateDeliveryStatus(delivery.id, nextStatus);
        onStatusUpdated?.(updated);
      }
      setIsUpdating(false);
      onClose();
    } catch (err) {
      console.error('Failed to update delivery action:', err);
      setIsUpdating(false);
    }
  };

  const handleConfirmReceipt = () => {
    setIsUpdating(true);
    try {
      const updated = confirmBuyerReceipt(delivery.id);
      onStatusUpdated?.(updated);
      setIsUpdating(false);
      onClose();
    } catch (err) {
      console.error('Failed to confirm receipt:', err);
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-4 sm:p-6 flex min-h-full items-start justify-center">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-[#E5EDE8] shadow-2xl space-y-6 text-left my-6 animate-in fade-in zoom-in-95 duration-200 relative">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center">
              <Truck className="w-5 h-5 text-[#34D399]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-[#0B3326] font-heading">
                  Dispatch {delivery.deliveryNumber}
                </h3>
                <DeliveryStatusBadge status={delivery.status} />
              </div>
              <span className="text-xs text-[#566861]">
                Linked Agreement: <strong>{delivery.orderNumber}</strong>
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

        {/* Consignment Specification Card */}
        <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-[#14211D]">
                  {delivery.commodity}
                </h4>
                <Badge variant="dark" size="sm">
                  Grade {delivery.grade || 'A'}
                </Badge>
              </div>
              <span className="text-xs text-[#566861]">
                Variety: {delivery.variety || 'Standard Lot'}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-[#566861] block font-medium">Consignment Volume</span>
              <span className="text-xl font-extrabold text-[#0B3326] font-heading">
                {delivery.quantity} {delivery.unit || 'kg'}
              </span>
            </div>
          </div>

          {delivery.notes && (
            <div className="p-2.5 rounded-xl bg-white border border-[#E5EDE8] text-xs text-[#566861]">
              <strong className="text-[#14211D]">Dispatch Notes:</strong> {delivery.notes}
            </div>
          )}
        </div>

        {/* Route Details */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5EDE8] space-y-4 text-xs">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center mt-1">
              <div className="w-3 h-3 rounded-full bg-[#10B981]" />
              <div className="w-0.5 h-12 bg-[#E5EDE8]" />
              <div className="w-3 h-3 rounded-full bg-[#0B3326]" />
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
                  Origin Farmgate / Depot Pickup
                </span>
                <span className="font-bold text-[#14211D] text-sm block">
                  {pickupStr}
                </span>
                <span className="text-[#566861] text-[11px] block mt-0.5">
                  Producer: {delivery.farmerName || 'Sakthi Vel'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
                  Buyer Delivery Destination
                </span>
                <span className="font-bold text-[#14211D] text-sm block">
                  {destStr}
                </span>
                <span className="text-[#566861] text-[11px] block mt-0.5">
                  Buyer: {delivery.buyerName || 'Ananya Agro Foods'}
                </span>
              </div>
            </div>
          </div>

          {/* Transporter Details if Assigned */}
          {delivery.transporterName && (
            <div className="pt-3 border-t border-[#E5EDE8] grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
                <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
                  Assigned Transporter
                </span>
                <span className="font-bold text-[#14211D] block mt-0.5">
                  {delivery.transporterName}
                </span>
                <span className="text-[11px] text-[#10B981] font-semibold">
                  {delivery.vehicleType || 'Commercial Freight'} • {delivery.vehicleNumber || 'TN 28 AB 4092'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
                <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
                  Driver Contact / Dispatch
                </span>
                <span className="font-bold text-[#14211D] block mt-0.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#10B981]" />
                  {delivery.driverContact || '+91 94433 77889'}
                </span>
                <span className="text-[11px] text-[#566861]">
                  GPS Geofence Verified
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 5-Step Delivery Lifecycle Timeline */}
        <div className="p-6 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3">
          <h4 className="text-xs font-bold text-[#0B3326] uppercase tracking-wider">
            Real-Time Physical Dispatch Timeline
          </h4>
          <DeliveryTimeline currentStatus={delivery.status} delivery={delivery} />
        </div>

        {/* Transporter Action Bar */}
        {isTransporter && (
          <div className="p-5 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-0.5 text-xs">
              <span className="font-bold text-[#34D399] uppercase tracking-wider block">
                Transporter Control Station
              </span>
              <span className="text-white/80">
                {delivery.status === 'transport_requested' && 'Accept this freight load and assign your vehicle.'}
                {delivery.status === 'assigned' && 'Confirm arrival and lot loading at the farmgate.'}
                {delivery.status === 'picked_up' && 'Start active transit along the delivery corridor.'}
                {delivery.status === 'in_transit' && 'Confirm produce drop-off at buyer destination.'}
                {delivery.status === 'delivered' && 'Delivered. Awaiting buyer quality check & confirmation.'}
                {delivery.status === 'completed' && 'Trip fully settled & freight payment released.'}
              </span>
            </div>

            <div className="shrink-0 w-full sm:w-auto">
              {delivery.status === 'transport_requested' && (
                <Button
                  variant="accent"
                  size="md"
                  disabled={isUpdating}
                  onClick={() => handleTransporterAction('assigned')}
                  icon={Truck}
                  iconPosition="left"
                  className="w-full sm:w-auto font-bold py-2.5 px-5 shadow-xs cursor-pointer"
                >
                  Accept Delivery Job
                </Button>
              )}

              {delivery.status === 'assigned' && (
                <Button
                  variant="accent"
                  size="md"
                  disabled={isUpdating}
                  onClick={() => handleTransporterAction('picked_up')}
                  icon={Package}
                  iconPosition="left"
                  className="w-full sm:w-auto font-bold py-2.5 px-5 shadow-xs cursor-pointer"
                >
                  Mark as Picked Up
                </Button>
              )}

              {delivery.status === 'picked_up' && (
                <Button
                  variant="accent"
                  size="md"
                  disabled={isUpdating}
                  onClick={() => handleTransporterAction('in_transit')}
                  icon={Navigation}
                  iconPosition="left"
                  className="w-full sm:w-auto font-bold py-2.5 px-5 shadow-xs cursor-pointer"
                >
                  Start Transit
                </Button>
              )}

              {delivery.status === 'in_transit' && (
                <Button
                  variant="accent"
                  size="md"
                  disabled={isUpdating}
                  onClick={() => handleTransporterAction('delivered')}
                  icon={CheckCircle2}
                  iconPosition="left"
                  className="w-full sm:w-auto font-bold py-2.5 px-5 shadow-xs cursor-pointer"
                >
                  Mark as Delivered
                </Button>
              )}

              {delivery.status === 'delivered' && (
                <Badge variant="emerald" size="md">
                  ✓ Drop-Off Completed
                </Badge>
              )}

              {delivery.status === 'completed' && (
                <Badge variant="accent" size="md">
                  ✓ Trip Settled & Paid
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Buyer Confirmation Action */}
        {isBuyer && delivery.status === 'delivered' && (
          <div className="p-5 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-0.5 text-xs">
              <span className="font-bold text-[#34D399] uppercase tracking-wider block">
                Consignment Arrived at Destination
              </span>
              <span className="text-white/80">
                Did you inspect and receive the {delivery.quantity} {delivery.unit} {delivery.commodity}?
              </span>
            </div>

            <Button
              variant="accent"
              size="md"
              disabled={isUpdating}
              onClick={handleConfirmReceipt}
              icon={CheckCircle2}
              iconPosition="left"
              className="w-full sm:w-auto font-bold py-2.5 px-6 shadow-xs cursor-pointer"
            >
              Confirm Receipt
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
