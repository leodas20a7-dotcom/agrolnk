import React, { useState, useEffect } from 'react';
import { X, Building2, Package, Calendar, ShieldCheck, ArrowRight, AlertCircle, Layers, Sparkles, Loader2, Truck, MapPin } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import CommoditySelect from '../ui/CommoditySelect';
import SearchableSelect from '../ui/SearchableSelect';
import { getWarehouses, getWarehousesSync, depositProduceToWarehouse } from '../../utils/warehouses';
import { createDelivery } from '../../utils/deliveries';

export default function DepositProduceModal({
  preselectedWarehouse,
  currentUser,
  onClose,
  onSuccess,
}) {
  const user = currentUser || {
    id: 'farmer_guest',
    name: 'Farmer',
    role: 'farmer',
  };

  const [warehouses, setWarehouses] = useState(() => {
    const raw = getWarehousesSync();
    return Array.isArray(raw) ? raw : [];
  });

  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    preselectedWarehouse?.id || ''
  );

  useEffect(() => {
    let isMounted = true;
    const fetchDb = async () => {
      try {
        const live = await getWarehouses();
        if (isMounted && Array.isArray(live) && live.length > 0) {
          setWarehouses(live);
          if (!preselectedWarehouse?.id) {
            setSelectedWarehouseId((prev) => (prev && live.some((w) => w.id === prev) ? prev : ''));
          }
        }
      } catch (err) {
        console.warn('Live warehouse list fetch notice:', err);
      }
    };
    fetchDb();
    return () => {
      isMounted = false;
    };
  }, [preselectedWarehouse?.id]);

  const currentWarehouse = warehouses.find((w) => w.id === selectedWarehouseId) || null;
  const availableChambers = (Array.isArray(currentWarehouse?.chambers) && currentWarehouse.chambers.length > 0)
    ? currentWarehouse.chambers
    : [];

  const [commodity, setCommodity] = useState('');
  const [variety, setVariety] = useState('');
  const [grade, setGrade] = useState('Grade A');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [priceEstimate, setPriceEstimate] = useState('');
  const [chamber, setChamber] = useState('');
  const [storageDays, setStorageDays] = useState('30');
  const [transportMode, setTransportMode] = useState('self');
  const [pickupAddress, setPickupAddress] = useState(
    [user.address, user.district, user.state].filter(Boolean).join(', ')
  );
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (chamber && availableChambers?.length > 0 && !availableChambers.includes(chamber)) {
      setChamber('');
    }
  }, [selectedWarehouseId, availableChambers]);

  const handleCommodityChange = (val) => {
    setCommodity(val);
  };

  const estimatedTotalValue = Number(quantity || 0) * Number(priceEstimate || 0);

  const baseChamberRate = (currentWarehouse?.chamberRates && chamber && currentWarehouse.chamberRates[chamber])
    ? Number(currentWarehouse.chamberRates[chamber])
    : Number(currentWarehouse?.monthlyRatePerTonne || 350);

  const depositTonnes = (Number(quantity) || 0) / 1000;
  const effectiveRatePerTonne = baseChamberRate;

  const monthlyRentalEst = Math.round(depositTonnes * effectiveRatePerTonne);
  const durationDays = Number(storageDays || 30);
  const durationMonths = durationDays / 30;
  const durationMonthsLabel = Number.isInteger(durationMonths) ? `${durationMonths}` : durationMonths.toFixed(1);
  const totalDurationRentalEst = Math.round(monthlyRentalEst * durationMonths);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!selectedWarehouseId) {
      setError('Please choose a certified storage facility.');
      return;
    }

    if (!chamber) {
      setError('Please choose a storage chamber / cell.');
      return;
    }

    if (!commodity || commodity.trim() === '') {
      setError('Please select or specify a commodity / crop.');
      return;
    }

    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      setError('Please enter a valid deposit quantity (e.g. 1000 kg).');
      return;
    }

    if (!priceEstimate || isNaN(Number(priceEstimate)) || Number(priceEstimate) <= 0) {
      setError('Please enter a valid estimated market price per kg.');
      return;
    }

    if (transportMode === 'transporter' && !pickupAddress.trim()) {
      setError('Please enter your farm / pickup location for transporter dispatch.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let linkedDelivery = null;
      if (transportMode === 'transporter') {
        const dropAddress = [
          currentWarehouse?.name,
          currentWarehouse?.address,
          currentWarehouse?.district,
          currentWarehouse?.state,
        ].filter(Boolean).join(', ');

        linkedDelivery = await createDelivery({
          orderNumber: `WH-IN-${Date.now().toString().slice(-6)}`,
          farmerId: user.id || null,
          farmerName: user.name || 'Farmer Depositor',
          buyerId: currentWarehouse?.id || null,
          buyerName: currentWarehouse?.name || 'Warehouse Gate',
          commodity: commodity.trim(),
          grade: grade || 'Grade A',
          variety: (variety || 'Standard').trim(),
          quantity: Number(quantity),
          unit: unit || 'kg',
          pickupLocation: {
            address: pickupAddress.trim(),
            district: user.district || '',
            state: user.state || '',
          },
          deliveryLocation: {
            address: dropAddress || 'Warehouse Facility Gate',
            district: currentWarehouse?.district || '',
            state: currentWarehouse?.state || '',
          },
          freightPayerId: user.id || null,
          freightPayerRole: 'farmer',
          status: 'transport_requested',
          notes: `Warehouse inbound transport to ${currentWarehouse?.name || 'Warehouse'} (${chamber || availableChambers[0] || 'Chamber A1'})`,
        });
      }

      const depositData = {
        farmerId: user.id || 'farmer_guest',
        farmerName: user.name || 'Farmer Depositor',
        warehouseId: selectedWarehouseId || currentWarehouse?.id || '',
        warehouseName: currentWarehouse?.name || 'Agri Storage Facility',
        warehouseEmail: currentWarehouse?.email || '',
        wdraCode: currentWarehouse?.wdraCode || '',
        commodity: commodity.trim(),
        variety: (variety || 'Standard').trim(),
        grade: grade || 'Grade A',
        quantity: Number(quantity),
        unit: unit || 'kg',
        priceEstimate: Number(priceEstimate),
        chamber: chamber || availableChambers[0] || 'Chamber A1',
        storageDays: Number(storageDays || 30),
        monthlyRatePerTonne: effectiveRatePerTonne,
        storageFeeMonthly: monthlyRentalEst,
        minBillingDays: currentWarehouse?.minBillingDays || 0,
        handlingFeePerTonne: 0,
        transportMode,
        transportRequested: transportMode === 'transporter',
        transportDeliveryId: linkedDelivery?.id || null,
        transportDeliveryNumber: linkedDelivery?.deliveryNumber || '',
        pickupAddress: transportMode === 'transporter' ? pickupAddress.trim() : '',
      };

      const created = await depositProduceToWarehouse(depositData);
      setIsSubmitting(false);
      onSuccess?.(created);
      onClose();
    } catch (err) {
      console.error('Failed to deposit produce:', err);
      setError(err?.message || 'Failed to process warehouse deposit. Please check connection.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] flex flex-col border border-[#E5EDE8] shadow-2xl text-left my-auto animate-in zoom-in-95 duration-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-[#E5EDE8] shrink-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#34D399]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0B3326] font-heading">
                Deposit Produce / Request Storage Quote
              </h3>
              <span className="text-xs text-[#566861]">
                Submit lot details for warehouse admin review & rent quote
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

        <form noValidate onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          
          {/* Warehouse Facility Selection */}
          {warehouses.length === 0 ? (
            <div className="p-6 text-center bg-[#FEF3C7]/40 rounded-2xl border border-[#F59E0B]/30 space-y-2">
              <Building2 className="w-8 h-8 text-[#D97706] mx-auto" />
              <h4 className="font-bold text-xs sm:text-sm text-[#92400E]">No Verified Facilities Currently Active</h4>
              <p className="text-[11px] text-[#78350F] max-w-sm mx-auto">
                Warehouse operators must complete Administrative KYC verification before their facilities appear here for booking.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                Certified Storage Facility <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={warehouses.map((wh) => ({
                  value: wh.id,
                  label: wh.name,
                  subtext: `${wh.district || 'District'}, ${wh.state || 'State'}${wh.totalCapacityTonnes ? ` • ${Number(wh.totalCapacityTonnes).toLocaleString('en-IN')}T Capacity` : ''}`,
                }))}
                value={selectedWarehouseId}
                onChange={(val) => {
                  setSelectedWarehouseId(val);
                  setChamber('');
                }}
                placeholder="Choose Certified Storage Facility..."
                searchPlaceholder="Search warehouse name, city..."
              />
            </div>
          )}

          {/* Chamber Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
              Storage Chamber / Cell <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={availableChambers.map((ch) => {
                const chamberRate = (currentWarehouse?.chamberRates && currentWarehouse.chamberRates[ch])
                  ? Number(currentWarehouse.chamberRates[ch])
                  : Number(currentWarehouse?.monthlyRatePerTonne || 350);
                const kgRate = (chamberRate / 1000).toFixed(2);
                const bagRate = Math.round(chamberRate / 20);

                return {
                  value: ch,
                  label: ch,
                  subtext: `Storage Fee: ₹${chamberRate}/Tonne/mo (₹${kgRate}/kg · ₹${bagRate}/50kg bag)`,
                  badge: `₹${chamberRate}/T`,
                };
              })}
              value={chamber}
              onChange={(val) => setChamber(val)}
              disabled={!selectedWarehouseId}
              placeholder={selectedWarehouseId ? "Choose Storage Chamber / Cell..." : "Choose Storage Facility First..."}
              searchPlaceholder="Search chamber..."
            />
          </div>

          {/* Commodity & Variety */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                Commodity <span className="text-red-500">*</span>
              </label>
              <CommoditySelect
                value={commodity}
                onChange={handleCommodityChange}
                userId={user.id}
                placeholder="Select Crop..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                Variety & Grade
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={variety}
                  onChange={(e) => setVariety(e.target.value)}
                  placeholder="Variety"
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] shadow-2xs"
                />
                <SearchableSelect
                  options={[
                    { value: 'Grade A', label: 'Grade A' },
                    { value: 'Grade B', label: 'Grade B' },
                    { value: 'Grade C', label: 'Grade C' },
                    { value: 'Export', label: 'Export' },
                  ]}
                  value={grade}
                  onChange={(val) => setGrade(val)}
                  placeholder="Grade"
                  searchPlaceholder="Search grade..."
                />
              </div>
            </div>
          </div>

          {/* Quantity & Value Estimate */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                Deposit Volume ({unit}) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 1000"
                min="0.1"
                step="any"
                className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E5EDE8] text-xs font-bold text-[#14211D] placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981] shadow-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                Estimated Price (₹/{unit}) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={priceEstimate}
                onChange={(e) => setPriceEstimate(e.target.value)}
                placeholder="e.g. 42"
                min="0.01"
                step="any"
                className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E5EDE8] text-xs font-bold text-[#14211D] placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981] shadow-xs"
              />
            </div>
          </div>

          {/* Storage Duration */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
              Expected Storage Holding Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['30', '60', '90', '180'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setStorageDays(d)}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    storageDays === d
                      ? 'bg-[#0B3326] text-white shadow-xs'
                      : 'bg-[#F8FAF8] text-[#566861] border border-[#E5EDE8] hover:bg-white'
                  }`}
                >
                  {d} Days
                </button>
              ))}
            </div>
          </div>

          {/* Optional Transport to Warehouse Gate */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
              Transport to Warehouse Gate
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setTransportMode('self')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  transportMode === 'self'
                    ? 'border-[#10B981] bg-[#EBF5F0] text-[#0B3326]'
                    : 'border-[#E5EDE8] bg-[#F8FAF8] text-[#566861] hover:bg-white'
                }`}
              >
                <span className="text-xs font-bold block">Self Drop-off at Gate</span>
                <span className="text-[10px] opacity-80 block mt-0.5">Bring produce using your own vehicle</span>
              </button>
              <button
                type="button"
                onClick={() => setTransportMode('transporter')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  transportMode === 'transporter'
                    ? 'border-[#10B981] bg-[#EBF5F0] text-[#0B3326]'
                    : 'border-[#E5EDE8] bg-[#F8FAF8] text-[#566861] hover:bg-white'
                }`}
              >
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Book AgrowLink Transporter</span>
                </span>
                <span className="text-[10px] opacity-80 block mt-0.5">Post pickup load for verified carriers</span>
              </button>
            </div>

            {transportMode === 'transporter' && (
              <div className="p-3.5 rounded-2xl bg-[#F4FAF6] border border-[#10B981]/25 space-y-2.5 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#0B3326] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Pickup Location (Farm / Village)</span>
                  </label>
                  <input
                    type="text"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="e.g. Omalur Farm, Salem, Tamil Nadu"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-1 focus:ring-[#10B981]"
                    required={transportMode === 'transporter'}
                  />
                </div>
                <div className="text-[11px] text-[#566861]">
                  Drop Gate: <strong className="text-[#0B3326]">{currentWarehouse ? `${currentWarehouse.name} (${currentWarehouse.district || 'Selected Warehouse'})` : 'Select a warehouse above'}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Calculated Valuation & Fee Summary Card */}
          <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#566861]">Estimated Lot Valuation:</span>
              <span className="font-extrabold text-[#0B3326] font-heading text-sm">
                ₹{estimatedTotalValue.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3 pt-2 border-t border-[#E5EDE8]">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[#566861]">Chamber Storage Fee:</span>
                  {chamber && currentWarehouse ? (
                    <>
                      <strong className="text-[#0B3326]">
                        ₹{effectiveRatePerTonne} / Tonne / mo
                      </strong>
                      <span className="text-[11px] text-[#566861]">
                        (₹{(effectiveRatePerTonne / 1000).toFixed(2)}/kg · ₹{Math.round(effectiveRatePerTonne / 20)}/50kg bag)
                      </span>
                    </>
                  ) : (
                    <span className="text-[#566861] italic text-[11px]">
                      Choose facility &amp; chamber to calculate rate
                    </span>
                  )}
                </div>
                {currentWarehouse?.minBillingDays > 0 && (
                  <div className="mt-1 text-[11px] text-[#566861]">
                    Min Billing: <strong>{currentWarehouse.minBillingDays} Days</strong>
                  </div>
                )}
                {chamber && Number(quantity) > 0 && (
                  <div className="mt-1 text-[11px] text-[#065F46] font-semibold">
                    Monthly Rent: ₹{monthlyRentalEst.toLocaleString('en-IN')}/mo × {durationMonthsLabel} mo ({durationDays} Days)
                  </div>
                )}
                <span className="text-[10px] text-[#10B981] font-semibold block mt-1">
                  Settle rent online via Razorpay (UPI, GPay, Cards)
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="font-extrabold text-[#0B3326] text-sm block">
                  {chamber && Number(quantity) > 0 ? `₹${totalDurationRentalEst.toLocaleString('en-IN')}` : '—'}
                </span>
                <span className="text-[10px] text-[#566861] block">
                  Est. Total ({durationDays} Days)
                </span>
                {chamber && Number(quantity) > 0 && (
                  <span className="text-[10px] font-semibold text-[#566861] block">
                    ₹{monthlyRentalEst.toLocaleString('en-IN')} / mo
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 4-Step Workflow Banner */}
          <div className="p-3.5 rounded-2xl bg-[#EBF5F0] border border-[#10B981]/30 text-xs text-[#0B3326] space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[#0B3326]">
              <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
              <span>How Storage Booking Works:</span>
            </div>
            <p className="text-[11px] text-[#566861] leading-relaxed">
              1. Submit request ➔ 2. Warehouse sets confirmed monthly rent quote ➔ 3. You review, accept & dispatch goods ➔ 4. Official WDRA-insured <strong>e-NWR</strong> is issued upon gate arrival.
            </p>
          </div>

          </div>

          {/* Action Buttons Footer */}
          <div className="p-4 sm:p-6 pt-4 border-t border-[#E5EDE8] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 shrink-0 bg-[#FAFBF9]">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs text-[#566861] justify-center w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="md"
              disabled={isSubmitting || warehouses.length === 0}
              onClick={handleSubmit}
              icon={isSubmitting ? Loader2 : ArrowRight}
              iconPosition="right"
              className={`font-bold py-2.5 px-6 shadow-xs cursor-pointer justify-center w-full sm:w-auto ${isSubmitting ? 'opacity-80 cursor-wait' : ''}`}
            >
              {isSubmitting ? 'Sending Request...' : 'Send Deposit Request to Warehouse'}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
}
