import React, { useState, useMemo } from 'react';
import { X, Truck, MapPin, Calendar, ShieldCheck, ArrowRight, AlertCircle, Package, Info, CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { createDelivery, estimateDistanceKm, calculateEstimatedFare } from '../../utils/deliveries';

export default function CreateDeliveryModal({
  order,
  currentUser,
  onClose,
  onSuccess,
}) {
  const user = currentUser || {
    id: '',
    name: 'Farmer',
    role: 'farmer',
  };

  const defaultPickupState = order?.pickupLocation?.state || order?.state || user?.state || 'Tamil Nadu';
  const defaultPickupDistrict = order?.pickupLocation?.district || order?.district || user?.district || 'Salem';
  const defaultPickupAddress = order?.pickupLocation?.address || order?.village || user?.address || 'Farmgate Primary Packing Yard';

  const defaultDestState =
    order?.deliveryLocation?.state ||
    order?.buyerState ||
    order?.destinationState ||
    'Tamil Nadu';

  const defaultDestDistrict =
    order?.deliveryLocation?.district ||
    order?.buyerDistrict ||
    order?.destinationDistrict ||
    'Chennai';

  const defaultDestAddress =
    order?.deliveryLocation?.address ||
    order?.buyerAddress ||
    order?.destinationAddress ||
    'Wholesale Commercial Hub & Market Depot';

  const defaultDestPincode =
    order?.deliveryLocation?.pincode ||
    order?.buyerPincode ||
    '';

  const buyerBusiness =
    order?.deliveryLocation?.companyName ||
    order?.buyerCompany ||
    order?.buyerName ||
    'Buyer Retail Enterprise';

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

  // Dynamic distance and fair tariff estimation
  const distanceKm = useMemo(() => {
    return estimateDistanceKm(pickupDistrict, deliveryDistrict);
  }, [pickupDistrict, deliveryDistrict]);

  const fareEstimate = useMemo(() => {
    return calculateEstimatedFare(order?.quantity, distanceKm);
  }, [order?.quantity, distanceKm]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const finalPickup = pickupAddress.trim() || defaultPickupAddress;
    const finalDest = deliveryAddress.trim() || defaultDestAddress;

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
        estimatedDistanceKm: distanceKm,
        freightAmount: fareEstimate.estimatedFare,
        pickupLocation: {
          state: pickupState,
          district: pickupDistrict,
          address: finalPickup,
        },
        deliveryLocation: {
          state: deliveryState,
          district: deliveryDistrict,
          address: finalDest,
          pincode: defaultDestPincode,
          companyName: buyerBusiness,
        },
        preferredPickupDate: formattedDate,
        notes: notes.trim(),
      };

      const created = await createDelivery(deliveryPayload);
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start sm:items-center">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-[#E5EDE8] shadow-2xl text-left my-auto max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-[#E5EDE8] bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center shrink-0">
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
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form & Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
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
                  Buyer: <strong>{order?.buyerCompany || order?.buyerName || 'Buyer'}</strong>
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

            {/* Delivery Destination Section (Read-Only Verified) */}
            <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B3326] uppercase tracking-wider">
                  <MapPin className="w-4 h-4 text-[#10B981]" />
                  <span>Buyer Delivery Destination</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Verified Buyer Destination
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-[#E5EDE8] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#566861] uppercase tracking-wider block font-semibold">Recipient / Shop</span>
                    <strong className="text-[#0B3326] text-xs sm:text-sm">{buyerBusiness}</strong>
                  </div>
                  <Badge variant="blue" size="sm">
                    <span>{deliveryDistrict}, {deliveryState}</span>
                  </Badge>
                </div>

                <div className="pt-1.5 border-t border-[#E5EDE8]/60 text-xs">
                  <span className="text-[10px] text-[#566861] uppercase tracking-wider block font-semibold">Delivery Address</span>
                  <span className="text-[#14211D] font-medium block mt-0.5">
                    {deliveryAddress} {defaultDestPincode ? `• PIN: ${defaultDestPincode}` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic Distance & Fair Tariff Guide */}
            <div className="p-4 rounded-2xl bg-[#EBF5F0] border border-[#10B981]/30 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#10B981]" />
                  <span className="font-bold text-[#0B3326]">Estimated Distance & Tariff Guide</span>
                </div>
                <Badge variant="emerald" size="sm">
                  ~{distanceKm} km Corridor
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-white/80 p-2.5 rounded-xl border border-[#10B981]/20">
                  <span className="text-[10px] text-[#566861] block font-medium">Recommended Vehicle</span>
                  <span className="text-xs font-bold text-[#0B3326] block truncate">
                    {fareEstimate.vehicleName}
                  </span>
                  <span className="text-[10px] text-[#566861] block">
                    Base ₹{fareEstimate.baseFare} + ₹{fareEstimate.ratePerKm}/km
                  </span>
                </div>

                <div className="bg-white/80 p-2.5 rounded-xl border border-[#10B981]/20 text-right">
                  <span className="text-[10px] text-[#566861] block font-medium">Guide Transport Price</span>
                  <span className="text-base font-extrabold text-[#0B3326] block">
                    ₹{fareEstimate.estimatedFare.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-[#10B981] font-semibold block">
                    Zero Cash at Farmgate
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[#0B3326]/80 pt-1 border-t border-[#10B981]/20">
                <Info className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                <span>Transporters bid transparently against this standard rate. You confirm before dispatch.</span>
              </div>
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
          </div>

          {/* Fixed Footer Action Buttons */}
          <div className="p-4 sm:p-5 border-t border-[#E5EDE8] bg-[#FAFBF9] shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onClose}
              className="text-xs text-[#566861] justify-center w-full sm:w-auto"
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
              className="font-bold py-2.5 px-6 shadow-xs cursor-pointer justify-center w-full sm:w-auto"
            >
              {isSubmitting ? 'Creating Dispatch...' : 'Request Transport'}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}
