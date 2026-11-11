import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Truck,
  MapPin,
  Calculator,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  User,
  Phone,
  CheckCircle2,
  PlusCircle,
  Star,
  Check
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import {
  estimateDistanceKm,
  calculateEstimatedFare,
  submitTransportQuote,
  VEHICLE_TARIFF_RATES
} from '../../utils/deliveries';
import { getTransporterFleet } from '../../utils/fleet';
import { getResolvedUserKycStatus } from '../../utils/auth';
import AddEditVehicleModal from '../transporter/AddEditVehicleModal';

export default function TransportQuoteModal({
  delivery,
  currentUser,
  isVerified: propIsVerified,
  onClose,
  onSuccess,
}) {
  const user = currentUser || {
    id: 'usr_transporter',
    name: 'Commercial Transporter',
    role: 'transporter',
    vehicleType: '',
    vehicleNumber: '',
    phone: '',
  };

  const pickupDistrict = typeof delivery?.pickupLocation === 'object'
    ? `${delivery.pickupLocation?.district || 'Salem'}, ${delivery.pickupLocation?.state || 'Tamil Nadu'}`
    : `${delivery?.pickupDistrict || 'Salem'}, ${delivery?.pickupState || 'Tamil Nadu'}`;

  const destDistrict = typeof delivery?.deliveryLocation === 'object'
    ? `${delivery.deliveryLocation?.district || 'Chennai'}, ${delivery.deliveryLocation?.state || 'Tamil Nadu'}`
    : `${delivery?.deliveryDistrict || 'Chennai'}, ${delivery?.deliveryState || 'Tamil Nadu'}`;

  const distanceKm = useMemo(() => {
    return delivery?.estimatedDistanceKm || estimateDistanceKm(pickupDistrict, destDistrict);
  }, [delivery, pickupDistrict, destDistrict]);

  const defaultFareInfo = useMemo(() => {
    return calculateEstimatedFare(delivery?.quantity, distanceKm);
  }, [delivery?.quantity, distanceKm]);

  const existingQuotes = Array.isArray(delivery?.freightQuotes) ? delivery.freightQuotes : [];
  const myExistingQuote = existingQuotes.find(
    (q) => String(q.transporterId) === String(user.id)
  );
  const currentLowestAmount = Number(
    delivery?.lowestQuote?.freightAmount || delivery?.freightAmount || 0
  );

  const [rfqRemainingSec, setRfqRemainingSec] = useState(30 * 60);
  useEffect(() => {
    const expiryIso =
      delivery?.rfqExpiresAt ||
      (delivery?.createdAt
        ? new Date(new Date(delivery.createdAt).getTime() + 30 * 60 * 1000).toISOString()
        : null);
    if (!expiryIso) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(expiryIso).getTime() - Date.now()) / 1000));
      setRfqRemainingSec(diff);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [delivery?.rfqExpiresAt, delivery?.createdAt]);

  const formatRfqTime = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const [savedFleet, setSavedFleet] = useState([]);
  const [selectedVehicleKey, setSelectedVehicleKey] = useState(defaultFareInfo.vehicleKey || 'medium_lcv');
  const [freightAmount, setFreightAmount] = useState(
    myExistingQuote?.freightAmount ? Number(myExistingQuote.freightAmount) : 0
  );
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isAddTruckModalOpen, setIsAddTruckModalOpen] = useState(false);

  // Load saved fleet vehicles
  useEffect(() => {
    let isMounted = true;
    getTransporterFleet(user.id, user.email).then((fleet) => {
      if (isMounted && Array.isArray(fleet) && fleet.length > 0) {
        setSavedFleet(fleet);
        const primary = fleet.find((v) => v.isPrimary) || fleet[0];
        if (primary && !vehicleNumber) {
          setVehicleNumber(primary.vehicleNumber || '');
          if (primary.driverName) setDriverName(primary.driverName);
          if (primary.driverPhone) setDriverPhone(primary.driverPhone);
          if (primary.vehicleCategory && VEHICLE_TARIFF_RATES[primary.vehicleCategory]) {
            setSelectedVehicleKey(primary.vehicleCategory);
          }
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [user.id, user.email, vehicleNumber]);

  // When a fleet vehicle is clicked to assign
  const handleSelectFleetVehicle = (veh) => {
    setVehicleNumber(veh.vehicleNumber || '');
    if (veh.driverName) setDriverName(veh.driverName);
    if (veh.driverPhone) setDriverPhone(veh.driverPhone);
    const catKey = veh.vehicleCategory || 'medium_lcv';
    if (VEHICLE_TARIFF_RATES[catKey]) {
      setSelectedVehicleKey(catKey);
    }
  };

  // Re-calculate suggested fare when vehicle category changes
  const handleVehicleChange = (newKey) => {
    setSelectedVehicleKey(newKey);
  };

  const isVerified =
    propIsVerified !== undefined
      ? propIsVerified
      : (getResolvedUserKycStatus(currentUser || user) === 'verified' ||
         currentUser?.kycStatus === 'verified' ||
         currentUser?.verificationStatus === 'verified' ||
         user?.kycStatus === 'verified');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isVerified) {
      setError('Admin KYC verification is mandatory before quoting on freight loads.');
      return;
    }
    if (!freightAmount || Number(freightAmount) <= 0) {
      setError('Please enter your transport quote price.');
      return;
    }
    if (!vehicleNumber.trim()) {
      setError('Please provide vehicle registration number.');
      return;
    }
    const cleanPhone = driverPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Please provide a valid 10-digit driver contact mobile number.');
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

        {/* Load & Route Summary (Privacy Protected District, State) */}
        <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-base font-bold text-[#14211D] block">
                {delivery.commodity} ({delivery.quantity} {delivery.unit})
              </span>
              <span className="text-xs text-[#566861]">
                Producer: {delivery.farmerName || 'Producer'} → Buyer: {delivery.buyerName || 'Buyer'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Badge variant={rfqRemainingSec > 0 ? 'amber' : 'dark'} size="sm">
                {rfqRemainingSec > 0 ? `⏱ 30m RFQ: ${formatRfqTime(rfqRemainingSec)}` : '30m Window Ended'}
              </Badge>
              {currentLowestAmount > 0 && (
                <Badge variant="emerald" size="sm">
                  Lowest Bid: ₹{currentLowestAmount.toLocaleString('en-IN')}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs text-[#566861] pt-2 border-t border-[#E5EDE8] flex-wrap">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
              <strong>{pickupDistrict}</strong> (Origin) → <strong>{destDistrict}</strong> (Destination)
            </span>
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              🔒 Exact Street Addresses Unlock Upon Escrow Lock
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Quick Fleet Vehicle Selector (1-Click Auto-Fill) */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#0B3326] flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Select from Your Fleet (1-Click Fill)</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddTruckModalOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#10B981] hover:text-[#0B3326] cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" /> + Register Truck
              </button>
            </div>

            {savedFleet.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-0.5">
                {savedFleet.map((v) => {
                  const isCurrentChosen =
                    vehicleNumber.trim().toUpperCase() ===
                    (v.vehicleNumber || '').trim().toUpperCase();
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleSelectFleetVehicle(v)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isCurrentChosen
                          ? 'bg-[#EBF5F0] border-[#10B981] text-[#0B3326] ring-2 ring-[#10B981]/20 font-bold'
                          : 'bg-white border-[#E5EDE8] text-[#566861] hover:bg-[#F2FBF6]'
                      }`}
                    >
                      <div className="truncate pr-1">
                        <span className="text-xs font-mono font-bold block text-[#14211D]">
                          {v.vehicleNumber}
                        </span>
                        <span className="text-[10px] text-[#566861] truncate block">
                          {v.vehicleType?.split('(')[0] || 'Truck'} • {v.driverName || 'Driver'}
                        </span>
                      </div>
                      {isCurrentChosen && (
                        <Check className="w-4 h-4 text-[#10B981] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-[#566861] py-1 flex items-center justify-between">
                <span>No saved vehicles in fleet yet.</span>
                <button
                  type="button"
                  onClick={() => setIsAddTruckModalOpen(true)}
                  className="text-[#10B981] font-semibold hover:underline cursor-pointer"
                >
                  Register Truck & Driver
                </button>
              </div>
            )}
          </div>

          {/* Vehicle Category Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
              Select Vehicle Class &amp; Tonnage Capacity
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
                      Capacity up to {(v.maxKg / 1000).toLocaleString('en-IN')} MT
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transport Quote Fare Input */}
          <div className="p-4 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-xs font-bold text-[#34D399] uppercase tracking-wider block">
                  Your Competitive Freight Quote (₹)
                </span>
                <span className="text-[11px] text-[#DCFCE7]/80">
                  Quote based on your vehicle availability &amp; route ({pickupDistrict} → {destDistrict}). The lowest verified quote wins automatically!
                </span>
              </div>
              {currentLowestAmount > 0 && (
                <div className="px-2.5 py-1 rounded-xl bg-[#14624A] border border-[#34D399]/40 text-right">
                  <span className="text-[9px] uppercase tracking-wider text-[#DCFCE7]/80 block">
                    Current Lowest Bid
                  </span>
                  <span className="text-xs font-extrabold text-[#34D399]">
                    ₹{currentLowestAmount.toLocaleString('en-IN')} ({delivery?.quotesCount || 1} bid{(delivery?.quotesCount || 1) > 1 ? 's' : ''})
                  </span>
                </div>
              )}
            </div>

            {myExistingQuote && (
              <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-[11px] text-[#DCFCE7] flex items-center justify-between">
                <span>Your Previous Quote: <strong>₹{Number(myExistingQuote.freightAmount).toLocaleString('en-IN')}</strong></span>
                <span className="text-[#34D399] font-semibold">You can lower/update your bid anytime</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-[#34D399]">₹</span>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Enter your competitive freight amount"
                value={freightAmount}
                onFocus={() => {
                  if (Number(freightAmount) === 0) setFreightAmount('');
                }}
                onBlur={() => {
                  if (freightAmount === '' || Number.isNaN(Number(freightAmount))) setFreightAmount(0);
                }}
                onChange={(e) => setFreightAmount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white text-gray-900 font-extrabold text-xl focus:outline-none focus:ring-2 focus:ring-[#34D399]"
                required
              />
            </div>
            <span className="text-[10px] text-white/70 block">
              * The system automatically displays the lowest verified quote to the Buyer. Once the Buyer pays Combined Escrow, you and the Farmer are notified immediately and exact addresses unlock.
            </span>
          </div>

          {/* Vehicle Reg & Driver Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                Vehicle Plate
              </label>
              <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
                <Truck className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g. TN 01 AB 1234"
                  className="w-full text-xs font-mono font-bold text-[#14211D] bg-transparent focus:outline-none uppercase tracking-wide"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                Driver Name
              </label>
              <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
                <User className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Driver Full Name"
                  className="w-full text-xs font-semibold text-[#14211D] bg-transparent focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                Driver Phone
              </label>
              <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
                <Phone className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                <input
                  type="tel"
                  maxLength={10}
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9443377889"
                  className="w-full text-xs font-mono font-semibold text-[#14211D] bg-transparent focus:outline-none"
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
          <div className="pt-3 border-t border-[#E5EDE8] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
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
              {isSubmitting ? 'Submitting Quote...' : 'Submit Binding Quote'}
            </Button>
          </div>

        </form>

      </div>

      {/* Quick Add Vehicle Modal within Quote Flow */}
      {isAddTruckModalOpen && (
        <AddEditVehicleModal
          isOpen={isAddTruckModalOpen}
          currentUser={user}
          onClose={() => setIsAddTruckModalOpen(false)}
          onSuccess={(updatedFleet, newVehicle) => {
            setSavedFleet(updatedFleet);
            if (newVehicle) {
              handleSelectFleetVehicle(newVehicle);
            }
            setIsAddTruckModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
