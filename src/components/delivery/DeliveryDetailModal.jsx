import React, { useState, useEffect } from 'react';
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
  const [currentDelivery, setCurrentDelivery] = useState(delivery);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setCurrentDelivery(delivery);
  }, [delivery]);

  if (!currentDelivery) return null;

  const isTransporter = viewerRole === 'transporter';
  const isBuyer = viewerRole === 'buyer';

  const pickupStr = typeof currentDelivery.pickupLocation === 'object'
    ? `${currentDelivery.pickupLocation?.address || ''}, ${currentDelivery.pickupLocation?.district || 'Salem'}, ${currentDelivery.pickupLocation?.state || 'Tamil Nadu'}`
    : currentDelivery.pickupLocation;

  const destStr = typeof currentDelivery.deliveryLocation === 'object'
    ? `${currentDelivery.deliveryLocation?.address || ''}, ${currentDelivery.deliveryLocation?.district || 'Chennai'}, ${currentDelivery.deliveryLocation?.state || 'Tamil Nadu'}`
    : currentDelivery.deliveryLocation;

  const handleTransporterAction = async (nextStatus) => {
    setIsUpdating(true);
    setErrorMessage('');
    try {
      let updated;
      if (nextStatus === 'assigned') {
        updated = await acceptDeliveryJob(currentDelivery.id, currentUser);
      } else {
        updated = await updateDeliveryStatus(currentDelivery.id, nextStatus);
      }
      if (updated) {
        setCurrentDelivery(updated);
        if (onStatusUpdated) await onStatusUpdated(updated);
      }
      setIsUpdating(false);
      onClose();
    } catch (err) {
      console.error('Failed to update delivery action:', err);
      setErrorMessage('Failed to update status. Please try again.');
      setIsUpdating(false);
    }
  };

  const handleConfirmReceipt = async () => {
    setIsUpdating(true);
    setErrorMessage('');
    try {
      const updated = await confirmBuyerReceipt(currentDelivery.id);
      if (updated) {
        setCurrentDelivery(updated);
        if (onStatusUpdated) await onStatusUpdated(updated);
      }
      setIsUpdating(false);
      onClose();
    } catch (err) {
      console.error('Failed to confirm receipt:', err);
      setErrorMessage('Failed to confirm delivery receipt.');
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
                  Dispatch {currentDelivery.deliveryNumber}
                </h3>
                <DeliveryStatusBadge status={currentDelivery.status} />
              </div>
              <span className="text-xs text-[#566861]">
                Linked Agreement: <strong>{currentDelivery.orderNumber}</strong>
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

        {/* Error Notice */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Consignment Specification Card */}
        <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-[#14211D]">
                  {currentDelivery.commodity}
                </h4>
                <Badge variant="dark" size="sm">
                  Grade {currentDelivery.grade || 'A'}
                </Badge>
              </div>
              <span className="text-xs text-[#566861]">
                Variety: {currentDelivery.variety || 'Standard Lot'}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-[#566861] block font-medium">Consignment Volume</span>
              <span className="text-xl font-extrabold text-[#0B3326] font-heading">
                {currentDelivery.quantity} {currentDelivery.unit || 'kg'}
              </span>
            </div>
          </div>

          {currentDelivery.notes && (
            <div className="p-2.5 rounded-xl bg-white border border-[#E5EDE8] text-xs text-[#566861]">
              <strong className="text-[#14211D]">Dispatch Notes:</strong> {currentDelivery.notes}
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
                  Producer: {currentDelivery.farmerName || 'Sakthi Vel'}
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
                  Buyer: {currentDelivery.buyerName || 'Ananya Agro Foods'}
                </span>
              </div>
            </div>
          </div>

          {/* Transporter Details if Assigned */}
          {currentDelivery.transporterName && (
            <div className="pt-3 border-t border-[#E5EDE8] grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
                <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
                  Assigned Transporter
                </span>
                <span className="font-bold text-[#14211D] block mt-0.5">
                  {currentDelivery.transporterName}
                </span>
                <span className="text-[11px] text-[#10B981] font-semibold">
                  {currentDelivery.vehicleType || 'Commercial Freight'} • {currentDelivery.vehicleNumber || 'TN 28 AB 4092'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
                <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
                  Driver Contact / Dispatch
                </span>
                <span className="font-bold text-[#14211D] block mt-0.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#10B981]" />
                  {currentDelivery.driverPhone || currentDelivery.driverContact || '+91 94433 77889'}
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
          <DeliveryTimeline currentStatus={currentDelivery.status} delivery={currentDelivery} />
        </div>

        {/* Transporter Action Bar */}
        {isTransporter && (
          <div className="p-5 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-0.5 text-xs text-left">
              <span className="font-bold text-[#34D399] uppercase tracking-wider block">
                Transporter Control Station
              </span>
              <span className="text-white/80">
                {currentDelivery.status === 'transport_requested' && 'Accept this freight load and assign your vehicle.'}
                {currentDelivery.status === 'assigned' && 'Confirm arrival and lot loading at the farmgate.'}
                {currentDelivery.status === 'picked_up' && 'Start active transit along the delivery corridor.'}
                {currentDelivery.status === 'in_transit' && 'Confirm produce drop-off at buyer destination.'}
                {currentDelivery.status === 'delivered' && 'Delivered. Awaiting buyer quality check & confirmation.'}
                {currentDelivery.status === 'completed' && 'Trip fully settled & freight payment released.'}
              </span>
            </div>

            <div className="shrink-0 w-full sm:w-auto">
              {currentDelivery.status === 'transport_requested' && (
                <Button
                  variant="accent"
                  size="md"
                  disabled={isUpdating}
                  onClick={() => handleTransporterAction('assigned')}
                  icon={Truck}
                  iconPosition="left"
                  className="w-full sm:w-auto font-bold py-2.5 px-5 shadow-xs cursor-pointer"
                >
                  {isUpdating ? 'Accepting...' : 'Accept Delivery Job'}
                </Button>
              )}

              {currentDelivery.status === 'assigned' && (
                <Button
                  variant="accent"
                  size="md"
                  disabled={isUpdating}
                  onClick={() => handleTransporterAction('picked_up')}
                  icon={Package}
                  iconPosition="left"
                  className="w-full sm:w-auto font-bold py-2.5 px-5 shadow-xs cursor-pointer"
                >
                  {isUpdating ? 'Updating Status...' : 'Mark as Picked Up'}
                </Button>
              )}

              {currentDelivery.status === 'picked_up' && (
                <Button
                  variant="accent"
                  size="md"
                  disabled={isUpdating}
                  onClick={() => handleTransporterAction('in_transit')}
                  icon={Navigation}
                  iconPosition="left"
                  className="w-full sm:w-auto font-bold py-2.5 px-5 shadow-xs cursor-pointer"
                >
                  {isUpdating ? 'Starting...' : 'Start Transit'}
                </Button>
              )}

              {currentDelivery.status === 'in_transit' && (
                <Button
                  variant="accent"
                  size="md"
                  disabled={isUpdating}
                  onClick={() => handleTransporterAction('delivered')}
                  icon={CheckCircle2}
                  iconPosition="left"
                  className="w-full sm:w-auto font-bold py-2.5 px-5 shadow-xs cursor-pointer"
                >
                  {isUpdating ? 'Confirming Drop-off...' : 'Mark as Delivered'}
                </Button>
              )}

              {currentDelivery.status === 'delivered' && (
                <Badge variant="emerald" size="md">
                  ✓ Drop-Off Completed
                </Badge>
              )}

              {currentDelivery.status === 'completed' && (
                <Badge variant="accent" size="md">
                  ✓ Trip Settled & Paid
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Buyer Confirmation Action */}
        {isBuyer && currentDelivery.status === 'delivered' && (
          <div className="p-5 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-0.5 text-xs text-left">
              <span className="font-bold text-[#34D399] uppercase tracking-wider block">
                Consignment Arrived at Destination
              </span>
              <span className="text-white/80">
                Did you inspect and receive the {currentDelivery.quantity} {currentDelivery.unit} {currentDelivery.commodity}?
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
              {isUpdating ? 'Confirming...' : 'Confirm Receipt'}
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
