import React, { useState } from 'react';
import { X, Plus, Sparkles, TrendingDown, Users, Check, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import SearchableSelect from '../ui/SearchableSelect';
import { PRICING_UNIT_OPTIONS, computePricingBreakdown } from '../../utils/pricingUnits';
import { createBuyerDemand } from '../../utils/demands';
import { showGlobalToast } from '../../context/ToastContext';

export default function PostDemandModal({ isOpen, onClose, currentUser, onSuccess, onCreated }) {
  const [formData, setFormData] = useState({
    commodity: '',
    variety: 'None',
    grade: 'A',
    quantity: '',
    unit: 'Quintal',
    procurementMode: 'direct_offers', // 'direct_offers' | 'reverse_auction'
    targetPrice: '',
    priceUnit: 'Quintal',
    bidStep: '25',
    durationHours: '24',
    deliveryState: '',
    deliveryDistrict: '',
    description: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const units = ['kg', 'Quintal', 'MT'];
  const grades = ['A', 'B', 'C', 'Export'];
  const durations = [
    { value: '2', label: '⏱ 2 Hours (Flash Tender)' },
    { value: '6', label: '⏱ 6 Hours' },
    { value: '12', label: '⏱ 12 Hours' },
    { value: '24', label: '⏱ 24 Hours (1 Day - Recommended)' },
    { value: '48', label: '⏱ 2 Days' },
    { value: '72', label: '⏱ 3 Days' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.commodity) {
      setError('Please select a commodity.');
      return;
    }
    if (!formData.quantity || Number(formData.quantity) <= 0) {
      setError('Please enter a valid required quantity.');
      return;
    }
    if (!formData.targetPrice || Number(formData.targetPrice) <= 0) {
      setError('Please enter your target budget / max ceiling price.');
      return;
    }
    if (!formData.deliveryState || !formData.deliveryDistrict) {
      setError('Please specify delivery state and district.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createBuyerDemand({
        ...formData,
        buyerId: currentUser?.id,
        buyerName: currentUser?.name || 'Verified Buyer',
        buyerPhone: currentUser?.phone || '',
      });

      showGlobalToast({
        message:
          formData.procurementMode === 'reverse_auction'
            ? 'Live procurement tender published! Farmers can now bid.'
            : 'Buy requirement posted! Farmers can now send direct quotes.',
        type: 'success',
      });

      if (onCreated) onCreated(created);
      if (onSuccess) onSuccess(created);
      onClose();
    } catch (err) {
      console.error('Failed to post demand:', err);
      setError(err.message || 'Failed to submit buy requirement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-4 sm:p-6 flex min-h-full items-start justify-center">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 border border-[#E5EDE8] shadow-2xl space-y-5 text-left my-6 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center font-bold">
              <Plus className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0B3326] font-heading">
                Post Buy Requirement
              </h3>
              <p className="text-xs text-[#566861]">
                Tell verified farmers what produce you want to purchase.
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Commodity & Grade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="font-bold text-[#0B3326] block">
                Produce Commodity <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.commodity}
                onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                placeholder="e.g. Basmati Rice, Soya Bean, Tomato..."
                className="w-full px-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] font-bold text-[#14211D] focus:ring-1 focus:ring-[#10B981] placeholder:font-normal placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#0B3326] block">Quality Grade</label>
              <SearchableSelect
                options={grades.map((g) => ({ value: g, label: `Grade ${g}` }))}
                value={formData.grade}
                onChange={(val) => setFormData({ ...formData, grade: val })}
                buttonClassName="bg-[#F8FAF8]"
              />
            </div>
          </div>

          {/* Volume Quantity & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-[#0B3326] block">
                Required Volume <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="e.g. 100"
                  className="w-full px-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] font-bold text-[#14211D] focus:ring-1 focus:ring-[#10B981]"
                />
                <div className="w-28 shrink-0">
                  <SearchableSelect
                    options={units.map((u) => ({ value: u, label: u }))}
                    value={formData.unit}
                    onChange={(val) => setFormData({ ...formData, unit: val })}
                    buttonClassName="bg-[#F8FAF8]"
                  />
                </div>
              </div>
            </div>

            {/* Target Price */}
            <div className="space-y-1">
              <label className="font-bold text-[#0B3326] block">
                {formData.procurementMode === 'reverse_auction' ? 'Max Ceiling Price (₹)' : 'Target Budget Price (₹)'}{' '}
                <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-[#0B3326]">₹</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.targetPrice}
                    onChange={(e) => setFormData({ ...formData, targetPrice: e.target.value })}
                    placeholder="e.g. 2400"
                    className="w-full pl-6 pr-2 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] font-bold text-[#0B3326] focus:ring-1 focus:ring-[#10B981]"
                  />
                </div>
                <div className="w-32 shrink-0">
                  <SearchableSelect
                    options={PRICING_UNIT_OPTIONS}
                    value={formData.priceUnit}
                    onChange={(val) => setFormData({ ...formData, priceUnit: val })}
                    buttonClassName="bg-[#F8FAF8]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Clean Procurement Mode Selector */}
          <div className="space-y-1.5 pt-1">
            <label className="font-bold text-[#0B3326] block">
              How would you like farmers to respond? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, procurementMode: 'direct_offers' })}
                className={`py-2.5 px-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  formData.procurementMode === 'direct_offers'
                    ? 'border-[#10B981] bg-[#F2FBF6] text-[#0B3326] shadow-xs'
                    : 'border-[#E5EDE8] bg-white text-[#566861] hover:border-[#10B981]/40'
                }`}
              >
                <Users className="w-4 h-4 text-[#10B981]" />
                <span>Direct Quotes</span>
                {formData.procurementMode === 'direct_offers' && (
                  <Check className="w-3.5 h-3.5 text-[#10B981] stroke-[3]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, procurementMode: 'reverse_auction' })}
                className={`py-2.5 px-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  formData.procurementMode === 'reverse_auction'
                    ? 'border-[#D97706] bg-[#FEF3C7]/60 text-[#92400E] shadow-xs'
                    : 'border-[#E5EDE8] bg-white text-[#566861] hover:border-[#D97706]/40'
                }`}
              >
                <TrendingDown className="w-4 h-4 text-[#D97706]" />
                <span>Live Reverse Bidding</span>
                {formData.procurementMode === 'reverse_auction' && (
                  <Check className="w-3.5 h-3.5 text-[#D97706] stroke-[3]" />
                )}
              </button>
            </div>
          </div>

          {/* Reverse Auction Specific Controls */}
          {formData.procurementMode === 'reverse_auction' && (
            <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] space-y-2.5 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#92400E] block">Bidding Window Duration</label>
                  <SearchableSelect
                    options={durations}
                    value={formData.durationHours}
                    onChange={(val) => setFormData({ ...formData, durationHours: val })}
                    buttonClassName="bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#92400E] block">
                    Bid Step Decrement (-₹ / {formData.unit})
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[10, 25, 50, 100].map((step) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => setFormData({ ...formData, bidStep: String(step) })}
                        className={`px-2 py-1 rounded-lg border text-xs font-bold cursor-pointer ${
                          Number(formData.bidStep) === step
                            ? 'bg-[#92400E] text-white border-[#92400E]'
                            : 'bg-white text-[#92400E] border-[#FDE68A]'
                        }`}
                      >
                        -₹{step}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Location */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-[#0B3326] block">
                Delivery State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.deliveryState}
                onChange={(e) => setFormData({ ...formData, deliveryState: e.target.value.replace(/[^a-zA-Z\s.-]/g, '') })}
                placeholder="e.g. Madhya Pradesh"
                className="w-full px-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] font-semibold text-[#14211D] focus:ring-1 focus:ring-[#10B981]"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-[#0B3326] block">
                Delivery District / City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.deliveryDistrict}
                onChange={(e) => setFormData({ ...formData, deliveryDistrict: e.target.value.replace(/[^a-zA-Z\s.-]/g, '') })}
                placeholder="e.g. Indore"
                className="w-full px-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] font-semibold text-[#14211D] focus:ring-1 focus:ring-[#10B981]"
              />
            </div>
          </div>

          {/* Error notice */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="accent"
              size="lg"
              disabled={isSubmitting}
              className="w-full justify-center font-bold py-3 text-xs shadow-xs cursor-pointer"
            >
              {isSubmitting ? 'Publishing Requirement...' : 'Publish Buy Requirement'}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}
