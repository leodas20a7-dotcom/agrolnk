import React from 'react';
import { Camera, Image as ImageIcon, MapPin, Tag, Sparkles, AlertCircle } from 'lucide-react';
import Badge from '../ui/Badge';

const COMMODITY_IMAGES = {
  Tomato: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80',
  Potato: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&auto=format&fit=crop&q=80',
  Onion: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&auto=format&fit=crop&q=80',
  Apple: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&auto=format&fit=crop&q=80',
  Wheat: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=500&auto=format&fit=crop&q=80',
  Maize: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=500&auto=format&fit=crop&q=80',
  Other: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80',
};

export default function ProduceForm({ formData, onChange, onImageChange }) {
  const commodities = ['Tomato', 'Potato', 'Onion', 'Apple', 'Wheat', 'Maize', 'Other'];
  const grades = ['Grade A', 'Grade B', 'Grade C'];
  const units = ['kg', 'Quintal', 'MT'];

  const estimatedValue =
    Number(formData.quantity || 0) * Number(formData.price || 0);

  const handleCommoditySelect = (e) => {
    const commodity = e.target.value;
    onChange({ target: { name: 'commodity', value: commodity } });
    if (!formData.images || formData.images.length === 0 || formData.isDefaultImage) {
      if (COMMODITY_IMAGES[commodity]) {
        onImageChange(COMMODITY_IMAGES[commodity], true);
      }
    }
  };

  const handleCustomImage = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      onImageChange(previewUrl, false);
    }
  };

  return (
    <div className="space-y-8 text-left">
      
      {/* 1. Produce Information */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white border border-[#E5EDE8] shadow-xs space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E5EDE8]">
          <span className="w-7 h-7 rounded-lg bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center text-xs font-bold font-heading">
            1
          </span>
          <h3 className="text-base font-bold text-[#0B3326] font-heading">
            Produce Information
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Commodity Dropdown */}
          <div>
            <label className="block text-xs font-bold text-[#14211D] mb-1.5">
              Commodity <span className="text-red-500">*</span>
            </label>
            <select
              name="commodity"
              value={formData.commodity}
              onChange={handleCommoditySelect}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] text-sm text-[#14211D] bg-white focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all cursor-pointer"
            >
              {commodities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Variety */}
          <div>
            <label className="block text-xs font-bold text-[#14211D] mb-1.5">
              Variety <span className="text-[10px] text-[#566861] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              name="variety"
              value={formData.variety}
              onChange={onChange}
              placeholder="e.g. Hybrid Shivam / Desi"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] text-sm text-[#14211D] placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Quality Grade */}
        <div>
          <label className="block text-xs font-bold text-[#14211D] mb-2">
            Quality Grade <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {grades.map((g) => {
              const isSelected = formData.grade === g.replace('Grade ', '');
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() =>
                    onChange({
                      target: { name: 'grade', value: g.replace('Grade ', '') },
                    })
                  }
                  className={`py-2.5 px-3 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#10B981] bg-[#F2FBF6] text-[#0B3326] shadow-2xs'
                      : 'border-[#E5EDE8] bg-white text-[#566861] hover:border-[#10B981]/40'
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quantity & Unit */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-[#14211D] mb-1.5">
              Quantity Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="quantity"
              min="1"
              required
              value={formData.quantity}
              onChange={onChange}
              placeholder="500"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] text-sm text-[#14211D] placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#14211D] mb-1.5">
              Unit
            </label>
            <select
              name="unit"
              value={formData.unit}
              onChange={onChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] text-sm text-[#14211D] bg-white focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all cursor-pointer"
            >
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Origin & Location */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white border border-[#E5EDE8] shadow-xs space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E5EDE8]">
          <span className="w-7 h-7 rounded-lg bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center text-xs font-bold font-heading">
            2
          </span>
          <h3 className="text-base font-bold text-[#0B3326] font-heading">
            Harvest Origin & Location
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#14211D] mb-1.5">
              State <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="state"
              required
              value={formData.state}
              onChange={onChange}
              placeholder="e.g. Tamil Nadu"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] text-sm text-[#14211D] placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#14211D] mb-1.5">
              District <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="district"
              required
              value={formData.district}
              onChange={onChange}
              placeholder="e.g. Salem"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] text-sm text-[#14211D] placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#14211D] mb-1.5">
              Village / Market
            </label>
            <input
              type="text"
              name="village"
              value={formData.village}
              onChange={onChange}
              placeholder="e.g. Attur Mandi"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] text-sm text-[#14211D] placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {/* 3. Pricing & Estimated Value */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white border border-[#E5EDE8] shadow-xs space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E5EDE8]">
          <span className="w-7 h-7 rounded-lg bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center text-xs font-bold font-heading">
            3
          </span>
          <h3 className="text-base font-bold text-[#0B3326] font-heading">
            Pricing & Listing Valuation
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          <div>
            <label className="block text-xs font-bold text-[#14211D] mb-1.5">
              Target Price (₹ per {formData.unit}) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#0B3326]">
                ₹
              </span>
              <input
                type="number"
                name="price"
                min="1"
                required
                value={formData.price}
                onChange={onChange}
                placeholder="42"
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-[#E5EDE8] text-sm text-[#14211D] font-bold placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all"
              />
            </div>
            <span className="text-[11px] text-[#566861] mt-1 block">
              100% direct realization with zero commission deductions
            </span>
          </div>

          {/* Live Auto-Calculated Valuation Banner */}
          <div className="p-4 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#DCFCE7]/80 mb-1">
              <span>Estimated Listing Value</span>
              <Badge variant="accent" size="sm">
                Direct
              </Badge>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-heading text-white">
              ₹{estimatedValue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-[#34D399] mt-1">
              {formData.quantity || 0} {formData.unit} × ₹{formData.price || 0}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Produce Photo Upload */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white border border-[#E5EDE8] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center text-xs font-bold font-heading">
              4
            </span>
            <h3 className="text-base font-bold text-[#0B3326] font-heading">
              Produce Photo
            </h3>
          </div>
          <span className="text-xs text-[#566861]">1–5 images</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          {/* Upload Area */}
          <label className="p-6 rounded-2xl border-2 border-dashed border-[#E5EDE8] hover:border-[#10B981] bg-[#F8FAF8] hover:bg-[#F2FBF6] flex flex-col items-center justify-center text-center cursor-pointer transition-all">
            <Camera className="w-8 h-8 text-[#10B981] mb-2" />
            <span className="text-xs font-bold text-[#0B3326]">
              Upload produce photo
            </span>
            <span className="text-[10px] text-[#566861] mt-0.5">
              JPG, PNG up to 10MB
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleCustomImage}
              className="hidden"
            />
          </label>

          {/* Current Selected Thumbnail Preview */}
          <div className="relative rounded-2xl overflow-hidden border border-[#E5EDE8] bg-[#F8FAF8] h-32 flex items-center justify-center">
            {formData.images?.[0] ? (
              <img
                src={formData.images[0]}
                alt={formData.commodity}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center text-xs text-[#566861]">
                <ImageIcon className="w-6 h-6 mx-auto mb-1 text-[#566861]/50" />
                <span>Auto-matches {formData.commodity}</span>
              </div>
            )}
            <div className="absolute bottom-2 right-2">
              <Badge variant="dark" size="sm">
                Active Preview
              </Badge>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
