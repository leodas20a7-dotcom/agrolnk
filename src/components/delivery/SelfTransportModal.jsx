import React, { useState } from 'react';
import { X, Truck, ShieldCheck, MapPin, User, Phone, Calendar, ArrowRight, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { createOrUpdateSelfTransport } from '../../utils/deliveries';
import { updateOrderStatus } from '../../utils/orders';

export default function SelfTransportModal({
  order,
  currentUser,
  onClose,
  onSuccess,
}) {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState(currentUser?.name || 'Self / Farmer Dispatch');
  const [driverPhone, setDriverPhone] = useState(currentUser?.phone || '');
  const [dispatchTime, setDispatchTime] = useState('Immediate (Today)');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!order) return null;

  const validate = () => {
    const cleanVehicle = vehicleNumber.trim().toUpperCase();
    if (!cleanVehicle) {
      setError('Please enter the vehicle registration / lorry number.');
      return false;
    }
    if (cleanVehicle.length < 5) {
      setError('Please enter a valid vehicle number (e.g. TN 28 AB 4092 or KA 04 E 1234).');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const cleanVehicle = vehicleNumber.trim().toUpperCase();
      
      // 1. Create or update delivery record in Supabase with vehicle details
      const deliveryRecord = await createOrUpdateSelfTransport(order, {
        vehicleNumber: cleanVehicle,
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        dispatchTime,
        notes: notes.trim(),
      });

      // 2. Advance order status to in_transit
      await updateOrderStatus(order.id, 'in_transit');

      setIsSubmitting(false);
      onSuccess?.(deliveryRecord);
      onClose();
    } catch (err) {
      console.error('Failed to confirm self transport:', err);
      setError('Failed to update transport dispatch. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-4 sm:p-6 flex min-h-full items-center justify-center">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-[#E5EDE8] shadow-2xl space-y-5 text-left my-4 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0B3326] text-[#34D399] flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0B3326] font-heading">
                Self-Arranged Transport Dispatch
              </h3>
              <span className="text-xs text-[#566861]">
                Assign vehicle & notify buyer for Order {order.orderNumber}
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

        {/* Consignment Brief Card */}
        <div className="p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-[#0B3326] block text-sm">
              {order.commodity} ({order.variety || 'Standard'}, Grade {order.grade || 'A'})
            </span>
            <span className="text-[#566861]">
              Buyer: <strong>{order.buyerName || 'Ananya Agro Foods'}</strong>
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-[#566861] block uppercase font-semibold">Load Volume</span>
            <span className="text-sm font-extrabold text-[#0B3326]">
              {order.quantity} {order.unit || 'kg'}
            </span>
          </div>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Vehicle Registration Number */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0B3326] flex items-center justify-between">
              <span>Vehicle / Lorry Registration Number</span>
              <span className="text-red-500 font-bold">* Required</span>
            </label>
            <div className="relative">
              <Truck className="w-4 h-4 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                placeholder="e.g. TN 28 AB 4092 or KA 04 E 1234"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-mono font-bold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981] uppercase tracking-wider"
              />
            </div>
            <span className="text-[11px] text-[#566861]">
              This registration number is shared with the buyer for warehouse security & gate pass clearance.
            </span>
          </div>

          {/* Driver Name & Phone Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0B3326] block">
                Driver / Handler Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. M. Murugan"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0B3326] block">
                Driver Contact Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="e.g. +91 94433 77889"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>
            </div>
          </div>

          {/* Dispatch Timing */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0B3326] block">
              Dispatch Schedule
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={dispatchTime}
                onChange={(e) => setDispatchTime(e.target.value)}
                placeholder="e.g. Immediate / Departing 4:00 PM Today"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              />
            </div>
          </div>

          {/* Buyer Notification Notice Box */}
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Buyer <strong>{order.buyerName || 'Buyer'}</strong> will receive real-time notification with this vehicle number to prepare receiving at destination.
            </span>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 border-t border-[#E5EDE8]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs justify-center w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="md"
              disabled={isSubmitting}
              className="text-xs font-bold justify-center w-full sm:w-auto"
            >
              {isSubmitting ? 'Dispatching & Notifying...' : 'Confirm Dispatch & Notify Buyer'}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}
