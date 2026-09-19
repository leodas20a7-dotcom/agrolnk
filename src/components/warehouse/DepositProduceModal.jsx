import React, { useState, useEffect } from 'react';
import { X, Building2, Package, Calendar, ShieldCheck, ArrowRight, AlertCircle, Layers, Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import CommoditySelect from '../ui/CommoditySelect';
import SearchableSelect from '../ui/SearchableSelect';
import { getWarehouses, getWarehousesSync, depositProduceToWarehouse } from '../../utils/warehouses';

export default function DepositProduceModal({
  preselectedWarehouse,
  currentUser,
  onClose,
  onSuccess,
}) {
  const user = currentUser || {
    id: '',
    name: 'Farmer',
    role: 'farmer',
  };

  const [warehouses, setWarehouses] = useState(() => {
    const raw = getWarehousesSync();
    return Array.isArray(raw) ? raw : [];
  });

  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    preselectedWarehouse?.id || warehouses[0]?.id || ''
  );

  useEffect(() => {
    let isMounted = true;
    const fetchDb = async () => {
      try {
        const live = await getWarehouses();
        if (isMounted && Array.isArray(live)) {
          setWarehouses(live);
          if (!preselectedWarehouse?.id && live.length > 0) {
            setSelectedWarehouseId((prev) => (prev && live.some((w) => w.id === prev) ? prev : live[0].id));
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

  const currentWarehouse = warehouses.find((w) => w.id === selectedWarehouseId) || warehouses[0] || null;
  const availableChambers = (Array.isArray(currentWarehouse?.chambers) && currentWarehouse.chambers.length > 0)
    ? currentWarehouse.chambers
    : [];

  const [commodity, setCommodity] = useState('');
  const [variety, setVariety] = useState('');
  const [grade, setGrade] = useState('A');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [priceEstimate, setPriceEstimate] = useState('');
  const [chamber, setChamber] = useState(
    availableChambers[0] || 'Chamber A1'
  );
  const [storageDays, setStorageDays] = useState('60');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (availableChambers?.length > 0 && !availableChambers.includes(chamber)) {
      setChamber(availableChambers[0]);
    }
  }, [selectedWarehouseId, availableChambers]);

  const estimatedTotalValue = (Number(quantity) || 0) * (Number(priceEstimate) || 0);
  
  // Calculate active rate per tonne based on selected chamber or warehouse baseline tariff
  const baseChamberRate = (currentWarehouse?.chamberRates && currentWarehouse.chamberRates[chamber])
    ? Number(currentWarehouse.chamberRates[chamber])
    : Number(currentWarehouse?.monthlyRatePerTonne || 350);

  const depositTonnes = (Number(quantity) || 0) / 1000;
  const isBulkDiscountEligible = Boolean(currentWarehouse?.enableBulkDiscount) && depositTonnes >= (Number(currentWarehouse?.bulkDiscountThreshold) || 50);
  const appliedDiscountPct = isBulkDiscountEligible ? (Number(currentWarehouse?.bulkDiscountRate) || 10) : 0;
  const effectiveRatePerTonne = appliedDiscountPct > 0 ? Math.round(baseChamberRate * (1 - appliedDiscountPct / 100)) : baseChamberRate;

  const monthlyRentalEst = Math.round(depositTonnes * effectiveRatePerTonne);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!quantity || Number(quantity) <= 0) {
      setError('Please enter a valid deposit quantity.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const depositData = {
        farmerId: user.id,
        farmerName: user.name,
        warehouseId: selectedWarehouseId,
        warehouseName: currentWarehouse?.name || 'Agri Storage Hub',
        commodity,
        variety,
        grade,
        quantity: Number(quantity),
        unit,
        priceEstimate: Number(priceEstimate),
        chamber,
        storageDays: Number(storageDays),
        monthlyRatePerTonne: effectiveRatePerTonne,
        storageFeeMonthly: monthlyRentalEst,
        minBillingDays: currentWarehouse?.minBillingDays || 0,
        handlingFeePerTonne: currentWarehouse?.handlingFeePerTonne || 0,
      };

      const created = await depositProduceToWarehouse(depositData);
      setIsSubmitting(false);
      onSuccess?.(created);
      onClose();
    } catch (err) {
      console.error('Failed to deposit produce:', err);
      setError('Failed to process warehouse deposit. Please try again.');
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
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
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
                Certified Storage Facility
              </label>
              <SearchableSelect
                options={warehouses.map((wh) => ({
                  value: wh.id,
                  label: wh.name,
                  subtext: `${wh.district || 'District'}, ${wh.state || 'State'} • ₹${wh.monthlyRatePerTonne || 350}/Tonne`,
                  badge: `₹${wh.monthlyRatePerTonne || 350}/T`,
                }))}
                value={selectedWarehouseId}
                onChange={(val) => {
                  setSelectedWarehouseId(val);
                  const selected = warehouses.find((w) => w.id === val);
                  if (selected && Array.isArray(selected.chambers) && selected.chambers.length > 0) {
                    setChamber(selected.chambers[0]);
                  }
                }}
                placeholder="Select Storage Facility"
                searchPlaceholder="Search warehouse name, city..."
              />
            </div>
          )}

          {/* Chamber Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
              Storage Chamber / Cell
            </label>
            <SearchableSelect
              options={availableChambers.map((ch) => ({
                value: ch,
                label: ch,
              }))}
              value={chamber}
              onChange={(val) => setChamber(val)}
              placeholder="Select Chamber"
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
                onChange={(val) => setCommodity(val)}
                userId={user.id}
                placeholder="Select Crop..."
                required
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
                  required
                />
                <SearchableSelect
                  options={[
                    { value: 'A', label: 'Grade A' },
                    { value: 'B', label: 'Grade B' },
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
                Deposit Volume ({unit})
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 1000"
                min="0.1"
                step="any"
                className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E5EDE8] text-xs font-bold text-[#14211D] placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981] shadow-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                Estimated Price (₹/{unit})
              </label>
              <input
                type="number"
                value={priceEstimate}
                onChange={(e) => setPriceEstimate(e.target.value)}
                placeholder="e.g. 42"
                min="0.01"
                step="any"
                className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E5EDE8] text-xs font-bold text-[#14211D] placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981] shadow-xs"
                required
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

          {/* Calculated Valuation & Fee Summary Card */}
          <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#566861]">Estimated Lot Valuation:</span>
              <span className="font-extrabold text-[#0B3326] font-heading text-sm">
                ₹{estimatedTotalValue.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-start justify-between pt-2 border-t border-[#E5EDE8]">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[#566861]">Chamber Tariff:</span>
                  <strong className="text-[#0B3326]">
                    ₹{effectiveRatePerTonne} / Tonne / mo
                  </strong>
                  <span className="text-[11px] text-[#566861]">
                    (₹{(effectiveRatePerTonne / 1000).toFixed(2)}/kg · ₹{Math.round(effectiveRatePerTonne / 20)}/50kg bag)
                  </span>
                  {appliedDiscountPct > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {appliedDiscountPct}% Bulk Discount Applied
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-[#566861] flex-wrap">
                  {currentWarehouse?.minBillingDays > 0 && (
                    <span>Min Billing: <strong>{currentWarehouse.minBillingDays} Days</strong></span>
                  )}
                  {currentWarehouse?.handlingFeePerTonne > 0 && (
                    <span>· Gate Hamali: <strong>₹{currentWarehouse.handlingFeePerTonne}/Tonne</strong></span>
                  )}
                </div>
                <span className="text-[10px] text-[#10B981] font-semibold block mt-1">
                  Settle monthly rent online via Razorpay (UPI, GPay, Cards)
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="font-extrabold text-[#0B3326] text-sm block">
                  ₹{monthlyRentalEst.toLocaleString('en-IN')} / mo
                </span>
                <span className="text-[10px] text-[#566861]">
                  Est. Rent Quote
                </span>
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
              className="text-xs text-[#566861] justify-center w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="md"
              disabled={isSubmitting || warehouses.length === 0}
              icon={ArrowRight}
              iconPosition="right"
              className="font-bold py-2.5 px-6 shadow-xs cursor-pointer justify-center w-full sm:w-auto"
            >
              {isSubmitting ? 'Sending Request...' : 'Send Deposit Request to Warehouse'}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
}
