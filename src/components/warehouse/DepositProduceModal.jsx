import React, { useState } from 'react';
import { X, Building2, Package, Calendar, ShieldCheck, ArrowRight, AlertCircle, Layers } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
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

  const [commodity, setCommodity] = useState('Tomato');
  const [variety, setVariety] = useState('Hybrid Shivam');
  const [grade, setGrade] = useState('A');
  const [quantity, setQuantity] = useState('1000');
  const [unit, setUnit] = useState('kg');
  const [priceEstimate, setPriceEstimate] = useState('42');
  const [chamber, setChamber] = useState(
    currentWarehouse?.chambers?.[0] || 'Chamber A1 (Dry Storage)'
  );
  const [storageDays, setStorageDays] = useState('60');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const estimatedTotalValue = (Number(quantity) || 0) * (Number(priceEstimate) || 0);
  const ratePerTonne = Number(currentWarehouse?.monthlyRatePerTonne || 350);
  const monthlyRentalEst = Math.round(((Number(quantity) || 0) / 1000) * ratePerTonne);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!quantity || Number(quantity) <= 0) {
      setError('Please enter a valid deposit quantity.');
      return;
    }

    setIsSubmitting(true);

    try {
      const depositData = {
        farmerId: user.id,
        farmerName: user.name,
        warehouseId: selectedWarehouseId,
        commodity,
        variety,
        grade,
        quantity: Number(quantity),
        unit,
        priceEstimate: Number(priceEstimate),
        chamber,
        storageDays: Number(storageDays),
      };

      const created = depositProduceToWarehouse(depositData);
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
                Issue Electronic Negotiable Warehouse Receipt (e-NWR)
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
            <select
              value={selectedWarehouseId}
              onChange={(e) => {
                setSelectedWarehouseId(e.target.value);
                const selected = warehouses.find((w) => w.id === e.target.value);
                if (selected) setChamber(selected.chambers[0]);
              }}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] shadow-xs"
            >
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.district}, {wh.state}) • ₹{wh.monthlyRatePerTonne}/T
                </option>
              ))}
            </select>
          </div>

          {/* Chamber Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
              Storage Chamber / Cell
            </label>
            <select
              value={chamber}
              onChange={(e) => setChamber(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] shadow-xs"
            >
              {currentWarehouse.chambers.map((ch, idx) => (
                <option key={idx} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          </div>

          {/* Commodity & Variety */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                Commodity
              </label>
              <input
                type="text"
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                placeholder="e.g. Tomato, Onion, Wheat"
                className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] shadow-xs"
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
                  className="w-full px-3 py-3 rounded-2xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] shadow-xs"
                  required
                />
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3 py-3 rounded-2xl bg-white border border-[#E5EDE8] text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] shadow-xs"
                >
                  <option value="A">Grade A</option>
                  <option value="B">Grade B</option>
                  <option value="Export">Export</option>
                </select>
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
                min="100"
                step="50"
                className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E5EDE8] text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] shadow-xs"
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
                min="1"
                step="1"
                className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E5EDE8] text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] shadow-xs"
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
          <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#566861]">Estimated Lot Valuation:</span>
              <span className="font-extrabold text-[#0B3326] font-heading text-sm">
                ₹{estimatedTotalValue.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#E5EDE8]">
              <span className="text-[#566861]">Estimated Storage Rent:</span>
              <span className="font-bold text-[#10B981]">
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
              e-NWR is accredited under WDRA regulations. Stored produce is fully insured and eligible for immediate institutional financing.
            </span>
          </div>

          </div>

          {/* Action Buttons Footer */}
          <div className="p-4 sm:p-6 pt-4 border-t border-[#E5EDE8] flex items-center justify-end gap-3 shrink-0 bg-[#FAFBF9]">
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
              {isSubmitting ? 'Issuing Receipt...' : 'Confirm Deposit & Issue e-NWR'}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
}
