import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  withdrawTransportQuote,
  VEHICLE_TARIFF_RATES,
  getPrivacySafeLocationLabel
} from '../../utils/deliveries';
import { getTransporterFleet } from '../../utils/fleet';
import { getResolvedUserKycStatus, isUserKycVerified } from '../../utils/auth';
import { toast } from '../../context/ToastContext';
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
    ? getPrivacySafeLocationLabel(delivery.pickupLocation, true, 'Origin Hub')
    : `${delivery?.pickupDistrict || 'Salem'}, ${delivery?.pickupState || 'Tamil Nadu'}`;

  const destDistrict = typeof delivery?.deliveryLocation === 'object'
    ? getPrivacySafeLocationLabel(delivery.deliveryLocation, true, 'Destination Hub')
    : `${delivery?.deliveryDistrict || 'Chennai'}, ${delivery?.deliveryState || 'Tamil Nadu'}`;

  const pickupLandmark =
    (typeof delivery?.pickupLocation === 'object' ? delivery?.pickupLocation?.landmark : '') ||
    delivery?.landmark ||
    '';

  const distanceKm = useMemo(() => {
    return delivery?.estimatedDistanceKm || estimateDistanceKm(pickupDistrict, destDistrict);
  }, [delivery, pickupDistrict, destDistrict]);

  const loadWeightKg = useMemo(() => {
    const qty = Number(delivery?.quantity) || 0;
    const unitLower = String(delivery?.unit || '').toLowerCase();
    if (unitLower.includes('quintal')) return qty * 100;
    if (unitLower.includes('ton') || unitLower === 'mt') return qty * 1000;
    return qty || 1000;
  }, [delivery?.quantity, delivery?.unit]);

  const defaultFareInfo = useMemo(() => {
    return calculateEstimatedFare(loadWeightKg, distanceKm);
  }, [loadWeightKg, distanceKm]);

  const existingQuotes = Array.isArray(delivery?.freightQuotes) ? delivery.freightQuotes : [];
  const myExistingQuote = existingQuotes.find(
    (q) => String(q.transporterId) === String(user.id)
  );
  const currentLowestAmount = Number(
    delivery?.lowestQuote?.freightAmount || delivery?.freightAmount || 0
  );

  const [rfqRemainingSec, setRfqRemainingSec] = useState(30 * 60);
  const [showWithdrawBox, setShowWithdrawBox] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('Truck booked on another route');
  const [withdrawNote, setWithdrawNote] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
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
  const [selectedVehicleKey, setSelectedVehicleKey] = useState(
    (myExistingQuote?.vehicleCategory && VEHICLE_TARIFF_RATES[myExistingQuote.vehicleCategory]
      ? myExistingQuote.vehicleCategory
      : defaultFareInfo.vehicleKey) || 'medium_lcv'
  );
  const [freightAmount, setFreightAmount] = useState(
    myExistingQuote?.freightAmount ? String(myExistingQuote.freightAmount) : ''
  );
  const [vehicleNumber, setVehicleNumber] = useState(myExistingQuote?.vehicleNumber || '');
  const [driverName, setDriverName] = useState(myExistingQuote?.driverName || '');
  const [driverPhone, setDriverPhone] = useState(myExistingQuote?.driverPhone || '');
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
        if (primary) {
          setVehicleNumber((prev) => prev || primary.vehicleNumber || '');
          setDriverName((prev) => prev || primary.driverName || '');
          setDriverPhone((prev) => prev || primary.driverPhone || '');
          if (!myExistingQuote?.vehicleCategory && primary.vehicleCategory && VEHICLE_TARIFF_RATES[primary.vehicleCategory]) {
            setSelectedVehicleKey(primary.vehicleCategory);
          }
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [user.id, user.email]);

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
      ? Boolean(propIsVerified)
      : (isUserKycVerified(currentUser || user) ||
         getResolvedUserKycStatus(currentUser || user) === 'verified' ||
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
      toast.success('Freight quote submitted successfully!');
      onSuccess?.(updated);
      onClose();
    } catch (err) {
      console.error('Failed to submit quote:', err);
      setError(err?.message || 'Failed to submit quote. Please try again.');
      setIsSubmitting(false);
    }
  };

  const modalMarkup = (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-2xs p-3 sm:p-6 flex items-center justify-center">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-[#E5EDE8] shadow-2xl text-left animate-in fade-in zoom-in-95 duration-200 relative">

        {/* Pinned Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-4 pb-3 border-b border-[#E5EDE8] shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0B3326] text-white flex items-center justify-center shrink-0">
              <Calculator className="w-4.5 h-4.5 text-[#34D399]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#0B3326] font-heading leading-tight">
                Send Freight Quote
              </h3>
              <span className="text-xs text-[#566861]">
                {delivery.deliveryNumber} • {delivery.orderNumber}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form wraps scrollable content + pinned footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">

            {/* 1. Compact Load & Route Summary */}
            <div className="p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-bold text-[#14211D]">
                    {delivery.commodity}
                  </span>
                  <Badge variant="dark" size="sm">
                    {delivery.quantity} {delivery.unit}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant={rfqRemainingSec > 0 ? 'amber' : 'dark'} size="sm">
                    {rfqRemainingSec > 0 ? `⏱ ${formatRfqTime(rfqRemainingSec)}` : 'RFQ Closed'}
                  </Badge>
                  {currentLowestAmount > 0 && (
                    <Badge variant="emerald" size="sm">
                      Lowest: ₹{currentLowestAmount.toLocaleString('en-IN')}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="text-xs text-[#566861] pt-1.5 border-t border-[#E5EDE8]">
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#10B981] shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <span className="text-[#14211D] font-semibold">{pickupDistrict}</span>
                    {pickupLandmark ? <span className="text-[#566861]"> ({pickupLandmark})</span> : null}
                    <span className="mx-1.5 text-[#10B981] font-bold">→</span>
                    <span className="text-[#14211D] font-semibold">{destDistrict}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Truck & Driver */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#0B3326] flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Vehicle &amp; Driver</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddTruckModalOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#10B981] hover:text-[#0B3326] cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Add Saved Truck
                </button>
              </div>

              {savedFleet.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-28 overflow-y-auto pr-0.5">
                  {savedFleet.map((v) => {
                    const isCurrentChosen =
                      vehicleNumber.trim().toUpperCase() ===
                      (v.vehicleNumber || '').trim().toUpperCase();
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleSelectFleetVehicle(v)}
                        className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          isCurrentChosen
                            ? 'bg-[#EBF5F0] border-[#10B981] text-[#0B3326] ring-1 ring-[#10B981]'
                            : 'bg-white border-[#E5EDE8] text-[#566861] hover:bg-[#F2FBF6]'
                        }`}
                      >
                        <div className="truncate pr-1">
                          <span className="text-xs font-mono font-bold block text-[#14211D]">
                            {v.vehicleNumber}
                          </span>
                          <span className="text-[10px] text-[#566861] truncate block">
                            {v.driverName || 'Saved Driver'}
                          </span>
                        </div>
                        {isCurrentChosen && <Check className="w-4 h-4 text-[#10B981] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Compact Vehicle Type Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {Object.entries(VEHICLE_TARIFF_RATES).map(([key, v]) => {
                  const isSelected = selectedVehicleKey === key;
                  const shortName = v.name.split('(')[0].trim();
                  return (
                    <button
                      key={key}
                      type="button"
                      title={v.name}
                      onClick={() => handleVehicleChange(key)}
                      className={`px-2.5 py-2 rounded-xl text-left border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#EBF5F0] border-[#10B981] text-[#0B3326] ring-1 ring-[#10B981]'
                          : 'bg-white border-[#E5EDE8] text-[#566861] hover:bg-white/80'
                      }`}
                    >
                      <span className="text-[11px] font-bold block truncate">{shortName}</span>
                      <span className="text-[10px] text-[#566861] block">
                        Up to {((v.maxCapacityKg || v.maxKg || 0) / 1000).toLocaleString('en-IN')} MT
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Plate, Driver Name, Driver Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block mb-1">
                    Truck Number
                  </label>
                  <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-white border border-[#E5EDE8]">
                    <Truck className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                    <input
                      type="text"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      placeholder="TN 01 AB 1234"
                      className="w-full text-xs font-mono font-bold text-[#14211D] bg-transparent focus:outline-none uppercase"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block mb-1">
                    Driver Name
                  </label>
                  <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-white border border-[#E5EDE8]">
                    <User className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="Full name"
                      className="w-full text-xs font-semibold text-[#14211D] bg-transparent focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block mb-1">
                    Driver Mobile
                  </label>
                  <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-white border border-[#E5EDE8]">
                    <Phone className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                    <input
                      type="tel"
                      maxLength={10}
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit no."
                      className="w-full text-xs font-mono font-semibold text-[#14211D] bg-transparent focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Compact Quote Amount */}
            <div className="p-3.5 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-bold text-[#34D399] uppercase tracking-wider">
                  Your Freight Price (₹)
                </label>
                {myExistingQuote && (
                  <span className="text-[11px] text-[#DCFCE7]">
                    Previous: <strong>₹{Number(myExistingQuote.freightAmount).toLocaleString('en-IN')}</strong>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold text-[#34D399]">₹</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="Enter amount (e.g. 8500)"
                  value={freightAmount}
                  onChange={(e) => setFreightAmount(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white text-gray-900 font-bold text-base placeholder:text-gray-400 placeholder:font-medium focus:outline-none focus:ring-2 focus:ring-[#34D399]"
                  required
                />
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[#DCFCE7]/85">
                <ShieldCheck className="w-3.5 h-3.5 text-[#34D399] shrink-0" />
                <span>Lowest quote wins • Payout guaranteed on delivery OTP</span>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {myExistingQuote && showWithdrawBox && (
              <div className="p-3.5 rounded-2xl bg-red-50/70 border border-red-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-900">
                    Why are you cancelling? (Sent to who booked)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowWithdrawBox(false)}
                    className="text-[11px] font-semibold text-red-700 hover:underline cursor-pointer"
                  >
                    Back
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Truck booked on another route',
                    'Vehicle not available',
                    'Schedule changed',
                    'Entered wrong price',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setWithdrawReason(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer transition ${
                        withdrawReason === preset
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-red-900 border-red-200 hover:bg-red-100/60'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={withdrawNote}
                  onChange={(e) => setWithdrawNote(e.target.value)}
                  placeholder="Optional short message..."
                  className="w-full px-3 py-1.5 rounded-xl border border-red-200 bg-white text-xs text-[#14211D] focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={isWithdrawing}
                    onClick={async () => {
                      setIsWithdrawing(true);
                      setError('');
                      try {
                        const finalReason = [withdrawReason, withdrawNote.trim()].filter(Boolean).join(' — ');
                        await withdrawTransportQuote(delivery.id, finalReason);
                        toast.success('Quote withdrawn and booker notified.');
                        if (onSuccess) await onSuccess();
                        onClose();
                      } catch (err) {
                        console.error('Failed to withdraw quote:', err);
                        setError(err?.message || 'Could not withdraw quote.');
                      } finally {
                        setIsWithdrawing(false);
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer"
                  >
                    {isWithdrawing ? 'Withdrawing...' : 'Withdraw & Notify'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Pinned Footer Actions */}
          <div className="px-5 sm:px-6 py-3.5 border-t border-[#E5EDE8] bg-white shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {myExistingQuote && !showWithdrawBox ? (
              <button
                type="button"
                disabled={isSubmitting || isWithdrawing}
                onClick={() => setShowWithdrawBox(true)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition cursor-pointer text-center"
              >
                Withdraw Quote
              </button>
            ) : (
              <span className="hidden sm:inline" />
            )}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:ml-auto">
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
                disabled={isSubmitting || isWithdrawing}
                icon={ArrowRight}
                iconPosition="right"
                className="font-bold py-2.5 px-6 shadow-xs cursor-pointer justify-center w-full sm:w-auto"
              >
                {isSubmitting ? 'Submitting...' : myExistingQuote ? 'Update Quote' : 'Submit Quote'}
              </Button>
            </div>
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

  return typeof document !== 'undefined' ? createPortal(modalMarkup, document.body) : modalMarkup;
}
