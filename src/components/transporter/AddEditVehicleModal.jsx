import React, { useState, useEffect } from 'react';
import {
  Truck,
  X,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  User,
  Phone,
  Weight,
  Sparkles,
  Info
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import SearchableSelect from '../ui/SearchableSelect';
import { VEHICLE_CATEGORIES, saveFleetVehicle } from '../../utils/fleet';

export default function AddEditVehicleModal({
  isOpen,
  onClose,
  currentUser,
  vehicle = null, // if passed, we are editing
  onSuccess,
}) {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState('medium_lcv');
  const [customCapacity, setCustomCapacity] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [status, setStatus] = useState('available');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (vehicle) {
      setVehicleNumber(vehicle.vehicleNumber || '');
      setSelectedCategoryKey(vehicle.vehicleCategory || 'medium_lcv');
      setCustomCapacity(vehicle.capacityDisplay || '');
      setDriverName(vehicle.driverName || '');
      setDriverPhone(vehicle.driverPhone || '');
      setIsPrimary(Boolean(vehicle.isPrimary));
      setStatus(vehicle.status || 'available');
    } else {
      setVehicleNumber('');
      setSelectedCategoryKey('medium_lcv');
      setCustomCapacity('');
      setDriverName(currentUser?.name || '');
      setDriverPhone(currentUser?.phone || '');
      setIsPrimary(false);
      setStatus('available');
    }
    setErrorMessage('');
    setFieldErrors({});
  }, [vehicle, isOpen, currentUser]);

  if (!isOpen) return null;

  const currentCategory =
    VEHICLE_CATEGORIES.find((c) => c.key === selectedCategoryKey) ||
    VEHICLE_CATEGORIES[1];

  const handleVehicleNumberChange = (e) => {
    setFieldErrors((prev) => ({ ...prev, vehicleNumber: '' }));
    setErrorMessage('');
    // Normalize plate: uppercase and allowed chars
    const clean = e.target.value.toUpperCase();
    setVehicleNumber(clean);
  };

  const validate = () => {
    const errors = {};
    const cleanPlate = vehicleNumber.trim().replace(/[\s-]/g, '');

    if (!cleanPlate) {
      errors.vehicleNumber = 'Vehicle registration number is required.';
    } else if (!/^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/.test(cleanPlate)) {
      errors.vehicleNumber =
        'Please enter a valid registration plate (e.g. TN 28 AB 4092).';
    }

    if (!driverName.trim()) {
      errors.driverName = 'Driver or operator name is required.';
    } else if (!/^[A-Za-z\s.]{2,}$/.test(driverName.trim())) {
      errors.driverName = 'Driver name must contain only letters and spaces.';
    }

    const cleanPhone = driverPhone.replace(/\D/g, '');
    if (!cleanPhone) {
      errors.driverPhone = 'Driver contact mobile is required.';
    } else if (cleanPhone.length !== 10) {
      errors.driverPhone = 'Driver mobile number must be exactly 10 digits.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validate()) {
      setErrorMessage('Please fix the highlighted fields below.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        id: vehicle?.id || null,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        vehicleCategory: currentCategory.key,
        vehicleType: currentCategory.name,
        capacityKg: currentCategory.capacityKg,
        capacityDisplay: customCapacity.trim() || currentCategory.capacity,
        driverName: driverName.trim(),
        driverPhone: driverPhone.replace(/\D/g, ''),
        isPrimary,
        status,
      };

      const updatedFleet = await saveFleetVehicle(
        currentUser?.id,
        currentUser?.email,
        payload
      );

      setIsSubmitting(false);
      if (onSuccess) onSuccess(updatedFleet, payload);
      onClose();
    } catch (err) {
      console.error('Failed to save vehicle:', err);
      setErrorMessage(err.message || 'Failed to save vehicle. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-4 sm:p-6 flex min-h-full items-start justify-center">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-[#E5EDE8] shadow-2xl space-y-6 text-left my-6 animate-in fade-in zoom-in-95 duration-200 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center shadow-xs">
              <Truck className="w-5 h-5 text-[#34D399]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0B3326] font-heading">
                {vehicle ? 'Edit Fleet Vehicle' : 'Register New Fleet Vehicle'}
              </h3>
              <p className="text-xs text-[#566861]">
                Configure truck details & assign to freight dispatch routes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Error message */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          
          {/* Vehicle Registration Number */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#14211D] flex items-center justify-between">
              <span className="flex items-center gap-1">
                Vehicle Registration Plate <span className="text-red-500 font-bold">*</span>
              </span>
              <span className="text-[11px] text-[#566861]">Format: State + Digits + Series (e.g. TN01AB1234)</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-[#1E3A8A] text-white font-mono font-bold text-[10px] px-1.5 py-0.5 rounded">
                <span>IND</span>
              </div>
              <input
                type="text"
                value={vehicleNumber}
                onChange={handleVehicleNumberChange}
                placeholder="Enter Registration Plate"
                maxLength={16}
                className={`w-full pl-14 pr-3 py-2.5 rounded-xl text-sm font-mono font-bold tracking-wider uppercase border focus:outline-none transition-all ${
                  fieldErrors.vehicleNumber
                    ? 'border-red-400 bg-red-50/40 text-red-900 focus:ring-2 focus:ring-red-200'
                    : 'border-[#E5EDE8] bg-[#F8FAF8] text-[#14211D] focus:border-[#10B981] focus:bg-white focus:ring-2 focus:ring-[#10B981]/15'
                }`}
              />
            </div>
            {fieldErrors.vehicleNumber && (
              <span className="text-[11px] font-medium text-red-600 block">
                {fieldErrors.vehicleNumber}
              </span>
            )}
          </div>

          {/* Vehicle Category / Type */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#14211D] flex items-center gap-1">
              <span>Vehicle Category & Payload Capacity</span>
              <span className="text-red-500 font-bold">*</span>
            </label>
            <SearchableSelect
              options={VEHICLE_CATEGORIES.map((cat) => ({
                value: cat.key,
                label: `${cat.name} — (${cat.capacity})`,
              }))}
              value={selectedCategoryKey}
              onChange={(val) => {
                setSelectedCategoryKey(val);
                const match = VEHICLE_CATEGORIES.find((c) => c.key === val);
                if (match) setCustomCapacity(match.capacity);
              }}
              placeholder="Select Truck Type"
              searchPlaceholder="Search category..."
              buttonClassName="bg-[#F8FAF8]"
            />
            <span className="text-[11px] text-[#566861] block">
              {currentCategory.description} (Payload limit: {currentCategory.capacity})
            </span>
          </div>

          {/* Driver Name & Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#14211D] flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#566861]" />
                <span>Driver Name</span>
                <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => {
                  setFieldErrors((prev) => ({ ...prev, driverName: '' }));
                  setDriverName(e.target.value.replace(/[^a-zA-Z\s.]/g, ''));
                }}
                placeholder="e.g. M. Murugan"
                className={`w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none transition-all ${
                  fieldErrors.driverName
                    ? 'border-red-400 bg-red-50/40 text-red-900 focus:ring-2 focus:ring-red-200'
                    : 'border-[#E5EDE8] bg-[#F8FAF8] text-[#14211D] focus:border-[#10B981] focus:bg-white focus:ring-2 focus:ring-[#10B981]/15'
                }`}
              />
              {fieldErrors.driverName && (
                <span className="text-[11px] font-medium text-red-600 block">
                  {fieldErrors.driverName}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#14211D] flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-[#566861]" />
                <span>Driver Phone</span>
                <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#566861] font-semibold">
                  +91
                </span>
                <input
                  type="tel"
                  value={driverPhone}
                  onChange={(e) => {
                    setFieldErrors((prev) => ({ ...prev, driverPhone: '' }));
                    setDriverPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                  }}
                  placeholder="94433 77889"
                  maxLength={10}
                  className={`w-full pl-11 pr-3 py-2.5 rounded-xl text-sm border focus:outline-none transition-all ${
                    fieldErrors.driverPhone
                      ? 'border-red-400 bg-red-50/40 text-red-900 focus:ring-2 focus:ring-red-200'
                      : 'border-[#E5EDE8] bg-[#F8FAF8] text-[#14211D] focus:border-[#10B981] focus:bg-white focus:ring-2 focus:ring-[#10B981]/15'
                  }`}
                />
              </div>
              {fieldErrors.driverPhone && (
                <span className="text-[11px] font-medium text-red-600 block">
                  {fieldErrors.driverPhone}
                </span>
              )}
            </div>
          </div>

          {/* Primary Vehicle & Status Options */}
          <div className="p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#10B981] focus:ring-[#10B981] border-[#E5EDE8] cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-[#14211D] block">
                  Set as Default / Primary Dispatch Vehicle
                </span>
                <span className="text-[11px] text-[#566861] block">
                  This truck will be auto-selected for freight quotes and shown on your dashboard header.
                </span>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5EDE8]">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting}
              className="cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {vehicle ? 'Update Vehicle' : 'Save to Fleet'}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
}
