import React, { useState, useMemo } from 'react';
import { X, Truck, MapPin, Calculator, ShieldCheck, ArrowRight, AlertCircle, User, Phone, CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import {
  estimateDistanceKm,
  calculateEstimatedFare,
  submitTransportQuote,
  VEHICLE_TARIFF_RATES
} from '../../utils/deliveries';

export default function TransportQuoteModal({
  delivery,
  currentUser,
  onClose,
  onSuccess,
}) {
  const user = currentUser || {
    id: 'usr_transporter_04',
    name: 'Vetri Logistics & Transport',
    role: 'transporter',
    vehicleType: '14ft Eicher Truck (4 Tonne)',
    vehicleNumber: 'TN 28 AB 4092',
    phone: '+91 94433 77889',
  };

  const pickupDistrict = typeof delivery?.pickupLocation === 'object'
    ? (delivery.pickupLocation?.district || 'Salem')
    : 'Salem';

  const destDistrict = typeof delivery?.deliveryLocation === 'object'
    ? (delivery.deliveryLocation?.district || 'Chennai')
    : 'Chennai';

  const distanceKm = useMemo(() => {
    return delivery?.estimatedDistanceKm || estimateDistanceKm(pickupDistrict, destDistrict);
  }, [delivery, pickupDistrict, destDistrict]);

  const defaultFareInfo = useMemo(() => {
    return calculateEstimatedFare(delivery?.quantity, distanceKm);
  }, [delivery?.quantity, distanceKm]);

  const [selectedVehicleKey, setSelectedVehicleKey] = useState(defaultFareInfo.vehicleKey || 'medium_lcv');
  const [freightAmount, setFreightAmount] = useState(
    delivery?.freightAmount || defaultFareInfo.estimatedFare || ''
  );
  const [vehicleNumber, setVehicleNumber] = useState(currentUser?.vehicleNumber || '');
  const [driverName, setDriverName] = useState(currentUser?.driverName || currentUser?.name || '');
  const [driverPhone, setDriverPhone] = useState(currentUser?.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Re-calculate suggested fare when vehicle category changes
  const handleVehicleChange = (newKey) => {
    setSelectedVehicleKey(newKey);
    const updated = calculateEstimatedFare(delivery?.quantity, distanceKm, newKey);
    setFreightAmount(updated.estimatedFare);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!freightAmount || Number(freightAmount) <= 0) {
      setError('Please enter a valid transport quote price.');
      return;
    }
    if (!vehicleNumber.trim()) {
      setError('Please provide vehicle registration number.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const selectedRate = VEHICLE_TARIFF_RATES[selectedVehicleKey] || VEHICLE_TARIFF_RATES.medium_lcv;
      const quoteData = {
        transporterId: user.id,
        transporterName: user.name,
        vehicleType: selectedRate.name,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        freightAmount: Number(freightAmount),
        distanceKm: distanceKm,
      };

      const updated = await submitTransportQuote(delivery.id, quoteData);
      setIsSubmitting(false);
      onSuccess?.(updated);
      onClose();
    } catch (err) {
      console.error('Failed to submit quote:', err);
      setError('Failed to submit quote. Please try again.');
      setIsSubmitting(false);
    }
  };

  const currentRate = VEHICLE_TARIFF_RATES[selectedVehicleKey] || VEHICLE_TARIFF_RATES.medium_lcv;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-4 sm:p-6 flex min-h-full items-start justify-center">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-[#E5EDE8] shadow-2xl space-y-6 text-left my-6 animate-in fade-in zoom-in-95 duration-200 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center">
              <Calculator className="w-5 h-5 text-[#34D399]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0B3326] font-heading">
                Submit Freight Quote & Vehicle
              </h3>
              <span className="text-xs text-[#566861]">
                Job Manifest {delivery.deliveryNumber} • {delivery.orderNumber}
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

        {/* Load & Route Summary */}
        <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-base font-bold text-[#14211D] block">
                {delivery.commodity} ({delivery.quantity} {delivery.unit})
              </span>
              <span className="text-xs text-[#566861]">
                Farmer: {delivery.farmerName || 'Sakthi Vel'} → Buyer: {delivery.buyerName || 'Ananya Agro'}
              </span>
            </div>

            <Badge variant="emerald" size="sm">
              ~{distanceKm} km Route
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#566861] pt-2 border-t border-[#E5EDE8]">
            <MapPin className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
            <span>{pickupDistrict} (Farmgate) → {destDistrict} (Buyer Market Hub)</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Vehicle Category Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
              Select Vehicle Class
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(VEHICLE_TARIFF_RATES).map(([key, v]) => {
                const isSelected = selectedVehicleKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleVehicleChange(key)}
                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#EBF5F0] border-[#10B981] text-[#0B3326] ring-2 ring-[#10B981]/20'
                        : 'bg-white border-[#E5EDE8] text-[#566861] hover:bg-[#F8FAF8]'
                    }`}
                  >
                    <span className="text-xs font-bold block">{v.name.split('(')[0]}</span>
                    <span className="text-[10px] text-[#566861] block">
                      Base ₹{v.baseFare} + ₹{v.ratePerKm}/km
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transport Quote Fare Input */}
          <div className="p-4 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#34D399] uppercase tracking-wider block">
                  Transporter Price Quote (₹)
                </span>
                <span className="text-[11px] text-[#DCFCE7]/80">
                  Standard Matrix: Base ₹{currentRate.baseFare} + ({distanceKm} km × ₹{currentRate.ratePerKm}) = ₹{Math.round(currentRate.baseFare + distanceKm * currentRate.ratePerKm)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-[#34D399]">₹</span>
              <input
                type="number"
                min="500"
                step="50"
                value={freightAmount}
                onChange={(e) => setFreightAmount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white text-gray-900 font-extrabold text-xl focus:outline-none focus:ring-2 focus:ring-[#34D399]"
                required
              />
            </div>
            <span className="text-[10px] text-white/70 block">
              * The farmer will review and click "Accept & Confirm" before you are dispatched.
            </span>
          </div>

          {/* Vehicle Reg & Driver Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                Vehicle Plate Number
              </label>
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
                <Truck className="w-4 h-4 text-[#10B981] shrink-0" />
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="E.g. TN 28 AB 4092"
                  className="w-full text-xs font-bold text-[#14211D] bg-transparent focus:outline-none uppercase"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                Driver Contact Phone
              </label>
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
                <Phone className="w-4 h-4 text-[#10B981] shrink-0" />
                <input
                  type="text"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="+91 94433 77889"
                  className="w-full text-xs font-bold text-[#14211D] bg-transparent focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Escrow Guarantee Notice */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#EBF5F0] border border-[#10B981]/25 text-xs text-[#0B3326]">
            <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
            <span>
              100% Escrow Guaranteed: Upon buyer delivery OTP verification, this ₹{Number(freightAmount || 0).toLocaleString('en-IN')} freight fare will be credited instantly to your bank account.
            </span>
          </div>

          {/* Modal Actions */}
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
              {isSubmitting ? 'Submitting Quote...' : `Send Quote (₹${Number(freightAmount || 0).toLocaleString('en-IN')})`}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
}
