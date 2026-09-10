import React, { useState, useEffect } from 'react';
import { X, Building2, Package, Calendar, ShieldCheck, ArrowRight, AlertCircle, Layers, Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import CommoditySelect from '../ui/CommoditySelect';
import SearchableSelect from '../ui/SearchableSelect';
import { getWarehouses, depositProduceToWarehouse } from '../../utils/warehouses';

export default function DepositProduceModal({
  preselectedWarehouse,
  currentUser,
  onClose,
  onSuccess,
}) {
  const user = currentUser || {
    id: 'usr_farmer_01',
    name: 'Sakthi Vel',
    role: 'farmer',
  };

  const warehouses = getWarehouses();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    preselectedWarehouse?.id || warehouses[0]?.id || 'wh_salem_01'
  );

  const currentWarehouse = warehouses.find((w) => w.id === selectedWarehouseId) || warehouses[0];

  const [commodity, setCommodity] = useState('');
  const [variety, setVariety] = useState('');
  const [grade, setGrade] = useState('A');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [priceEstimate, setPriceEstimate] = useState('');
  const [chamber, setChamber] = useState(
    currentWarehouse?.chambers?.[0] || 'Chamber A1 (Dry Storage)'
  );
  const [storageDays, setStorageDays] = useState('60');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const estimatedTotalValue = (Number(quantity) || 0) * (Number(priceEstimate) || 0);
  const ratePerTonne = Number(currentWarehouse?.monthlyRatePerTonne || 350);
  const monthlyRentalEst = Math.round(((Number(quantity) || 0) / 1000) * ratePerTonne);

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
                Deposit Produce to Warehouse
              </h3>
              <span className="text-xs text-[#566861]">
                Issue Official Warehouse Storage Receipt
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
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
              Certified Storage Facility
            </label>
            <SearchableSelect
              options={warehouses.map((wh) => ({
                value: wh.id,
                label: wh.name,
                subtext: `${wh.district}, ${wh.state} • ₹${wh.monthlyRatePerTonne}/Tonne`,
                badge: `₹${wh.monthlyRatePerTonne}/T`,
              }))}
              value={selectedWarehouseId}
              onChange={(val) => {
                setSelectedWarehouseId(val);
                const selected = warehouses.find((w) => w.id === val);
                if (selected) setChamber(selected.chambers[0]);
              }}
              placeholder="Select Storage Facility"
              searchPlaceholder="Search warehouse name, city..."
            />
          </div>

          {/* Chamber Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
              Storage Chamber / Cell
            </label>
            <SearchableSelect
              options={currentWarehouse.chambers.map((ch) => ({
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
                min="1"
                step="10"
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
                min="1"
                step="1"
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
            <div className="flex items-center justify-between pt-1 border-t border-[#E5EDE8]">
              <div>
                <span className="text-[#566861] block">Storage Rent:</span>
                <span className="text-[10px] text-[#10B981] font-semibold">Auto-deducted upon produce sale (Zero upfront cash)</span>
              </div>
              <span className="font-extrabold text-[#0B3326] text-sm">
                ₹{monthlyRentalEst} / month
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* WDRA Guarantee Banner */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#EBF5F0] border border-[#10B981]/25 text-xs text-[#0B3326]">
            <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
            <span>
              Warehouse storage is certified under government storage standards. Stored produce is fully insured and eligible for immediate working capital loans.
            </span>
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
              disabled={isSubmitting}
              icon={ArrowRight}
              iconPosition="right"
              className="font-bold py-2.5 px-6 shadow-xs cursor-pointer justify-center w-full sm:w-auto"
            >
              {isSubmitting ? 'Issuing Receipt...' : 'Confirm Deposit & Issue Storage Receipt'}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
}
