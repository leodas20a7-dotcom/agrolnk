import React, { useState } from 'react';
import { X, Truck, MapPin, Calendar, ShieldCheck, ArrowRight, AlertCircle, Package } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { createDelivery } from '../../utils/deliveries';

export default function CreateDeliveryModal({
  order,
  currentUser,
  onClose,
  onSuccess,
}) {
  const user = currentUser || {
    id: 'usr_farmer_01',
    name: 'Sakthi Vel',
    role: 'farmer',
  };

  const defaultPickupState = order?.pickupLocation?.state || order?.state || 'Tamil Nadu';
  const defaultPickupDistrict = order?.pickupLocation?.district || order?.district || 'Salem';
  const defaultPickupAddress = order?.pickupLocation?.address || `${defaultPickupDistrict} Farmgate Warehouse`;

  const defaultDestState = order?.deliveryLocation?.state || 'Tamil Nadu';
  const defaultDestDistrict = order?.deliveryLocation?.district || 'Chennai';
  const defaultDestAddress = order?.deliveryLocation?.address || `${defaultDestDistrict} Wholesale Market Bay 12`;

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [pickupState, setPickupState] = useState(defaultPickupState);
  const [pickupDistrict, setPickupDistrict] = useState(defaultPickupDistrict);
  const [pickupAddress, setPickupAddress] = useState(defaultPickupAddress);

  const [deliveryState, setDeliveryState] = useState(defaultDestState);
  const [deliveryDistrict, setDeliveryDistrict] = useState(defaultDestDistrict);
  const [deliveryAddress, setDeliveryAddress] = useState(defaultDestAddress);

  const [preferredPickupDate, setPreferredPickupDate] = useState(tomorrow);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!pickupAddress.trim() || !deliveryAddress.trim()) {
      setError('Please provide complete pickup and destination addresses.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedDate = new Date(preferredPickupDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      const deliveryPayload = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        farmerId: user.id,
        farmerName: user.name,
        buyerId: order.buyerId,
        buyerName: order.buyerName,
        commodity: order.commodity,
        variety: order.variety || 'Standard Lot',
        grade: order.grade || 'A',
        quantity: order.quantity,
        unit: order.unit || 'kg',
        pickupLocation: {
          state: pickupState,
          district: pickupDistrict,
          address: pickupAddress.trim(),
        },
        deliveryLocation: {
          state: deliveryState,
          district: deliveryDistrict,
          address: deliveryAddress.trim(),
        },
        preferredPickupDate: formattedDate,
        notes: notes.trim(),
      };

      const created = createDelivery(deliveryPayload);
      setIsSubmitting(false);
      onSuccess?.(created);
      onClose();
    } catch (err) {
      console.error('Failed to create delivery request:', err);
      setError('Failed to submit transport request. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-4 sm:p-6 flex min-h-full items-start justify-center">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-[#E5EDE8] shadow-2xl space-y-6 text-left my-6 animate-in fade-in zoom-in-95 duration-200 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center">
              <Truck className="w-5 h-5 text-[#34D399]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0B3326] font-heading">
                Arrange Produce Delivery
              </h3>
              <span className="text-xs text-[#566861]">
                Request farmgate freight pickup for Order {order?.orderNumber}
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

        {/* Linked Produce Lot Summary */}
        <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#566861]">Order:</span>
              <Badge variant="dark" size="sm">
                {order?.orderNumber}
              </Badge>
            </div>
            <span className="text-xs text-[#566861]">
              Buyer: <strong>{order?.buyerName || 'Ananya Agro Foods'}</strong>
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <h4 className="text-base font-bold text-[#14211D]">
                {order?.commodity}
              </h4>
              <span className="text-xs text-[#566861]">
                {order?.variety || 'Standard Lot'} • Grade {order?.grade || 'A'}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-[#566861] block font-medium">Consignment Volume</span>
              <span className="text-xl font-extrabold text-[#0B3326] font-heading">
                {order?.quantity} {order?.unit || 'kg'}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Origin Pickup Section */}
          <div className="p-4 rounded-2xl bg-white border border-[#E5EDE8] space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B3326] uppercase tracking-wider">
              <MapPin className="w-4 h-4 text-[#10B981]" />
              <span>Farmgate Pickup Origin</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={pickupDistrict}
                onChange={(e) => setPickupDistrict(e.target.value)}
                placeholder="District (e.g. Salem)"
                className="px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                required
              />
              <input
                type="text"
                value={pickupState}
                onChange={(e) => setPickupState(e.target.value)}
                placeholder="State (e.g. Tamil Nadu)"
                className="px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                required
              />
            </div>

            <input
              type="text"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="Exact Farmgate / Depot Address"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              required
            />
          </div>

          {/* Delivery Destination Section */}
          <div className="p-4 rounded-2xl bg-white border border-[#E5EDE8] space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B3326] uppercase tracking-wider">
              <MapPin className="w-4 h-4 text-[#0B3326]" />
              <span>Buyer Delivery Destination</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={deliveryDistrict}
                onChange={(e) => setDeliveryDistrict(e.target.value)}
                placeholder="District (e.g. Chennai)"
                className="px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                required
              />
              <input
                type="text"
                value={deliveryState}
                onChange={(e) => setDeliveryState(e.target.value)}
                placeholder="State (e.g. Tamil Nadu)"
                className="px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                required
              />
            </div>

            <input
              type="text"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Buyer Hub / Market Destination Address"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              required
            />
          </div>

          {/* Preferred Pickup Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
              Preferred Pickup Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={preferredPickupDate}
                onChange={(e) => setPreferredPickupDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] shadow-xs"
                required
              />
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
              Handling & Stacking Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g. Ventilated crates, tarp cover required, moisture sensitive..."
              className="w-full p-3.5 rounded-2xl bg-white border border-[#E5EDE8] text-xs font-medium text-[#14211D] placeholder:text-[#566861]/60 focus:outline-none focus:ring-2 focus:ring-[#10B981] shadow-xs resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Trust Banner */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#EBF5F0] border border-[#10B981]/25 text-xs text-[#0B3326]">
            <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
            <span>
              This dispatch is broadcast to verified Agrolnk logistics transporters. Escrow payout is protected throughout transit.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#E5EDE8] flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onClose}
              className="text-xs text-[#566861]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="md"
              disabled={isSubmitting}
              icon={ArrowRight}
              iconPosition="right"
              className="font-bold py-2.5 px-6 shadow-xs cursor-pointer"
            >
              {isSubmitting ? 'Creating Dispatch...' : 'Request Transport'}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
}
