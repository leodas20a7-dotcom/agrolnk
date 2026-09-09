import React, { useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, MapPin, Tag, Sparkles, AlertCircle } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

import { COMMODITY_IMAGES, getPlatformCommodities, registerCustomCommodity, fetchRemoteCommodities } from '../../utils/listings';

export default function ProduceForm({ formData, onChange, onImageChange }) {
  const [commodities, setCommodities] = useState(() => getPlatformCommodities());
  const [isAddingCustomCommodity, setIsAddingCustomCommodity] = useState(false);
  const [customCommodityName, setCustomCommodityName] = useState('');

  useEffect(() => {
    // Initial fetch from Supabase
    fetchRemoteCommodities().then(list => {
      if (list && list.length > 0) setCommodities(list);
    });

    const handleCommoditiesUpdated = () => {
      setCommodities(getPlatformCommodities());
    };
    window.addEventListener('agrolnk_commodities_updated', handleCommoditiesUpdated);
    return () => window.removeEventListener('agrolnk_commodities_updated', handleCommoditiesUpdated);
  }, []);

  const grades = ['Grade A', 'Grade B', 'Grade C'];
  const units = ['kg', 'Quintal', 'MT'];

  const estimatedValue =
    Number(formData.quantity || 0) * Number(formData.price || 0);

  const handleCommoditySelect = (e) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsAddingCustomCommodity(true);
      return;
    }
    setIsAddingCustomCommodity(false);
    onChange({ target: { name: 'commodity', value: val } });
    if (!formData.images || formData.images.length === 0 || formData.isDefaultImage) {
      if (COMMODITY_IMAGES[val]) {
        onImageChange(COMMODITY_IMAGES[val], true);
      }
    }
  };

  const handleSaveCustomCommodity = () => {
    if (!customCommodityName.trim()) return;
    const cleanName = customCommodityName.trim().charAt(0).toUpperCase() + customCommodityName.trim().slice(1);
    const registered = registerCustomCommodity(cleanName);
    if (registered) {
      setCommodities(getPlatformCommodities());
      onChange({ target: { name: 'commodity', value: registered } });
      const defaultImg = COMMODITY_IMAGES[registered] || COMMODITY_IMAGES.Other;
      onImageChange(defaultImg, true);
      setCustomCommodityName('');
      setIsAddingCustomCommodity(false);
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#14211D]">
                Commodity <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddingCustomCommodity(true)}
                className="text-[11px] font-bold text-[#10B981] hover:text-[#059669] transition-colors cursor-pointer"
              >
                + Add New Crop
              </button>
            </div>
            <select
              name="commodity"
              value={formData.commodity}
              onChange={handleCommoditySelect}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] text-sm text-[#14211D] bg-white focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all cursor-pointer"
            >
              <option value="">Select Commodity</option>
              {commodities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__custom__">➕ + Add New / Other Commodity...</option>
            </select>

            {/* Inline Custom Commodity Creator */}
            {isAddingCustomCommodity && (
              <div className="p-3 mt-2 bg-[#EBF5F0] rounded-2xl border border-[#10B981]/30 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs text-[#0B3326] font-bold">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Register New Commodity</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomCommodity(false)}
                    className="text-[11px] text-[#566861] hover:text-red-600 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCommodityName}
                    onChange={(e) => setCustomCommodityName(e.target.value.replace(/[^a-zA-Z\s.-]/g, ''))}
                    placeholder="e.g. Dragon Fruit, Moringa, Cashew"
                    className="flex-1 px-3 py-2 bg-white rounded-xl border border-[#E5EDE8] text-xs font-bold text-[#14211D] placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveCustomCommodity();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="accent"
                    size="sm"
                    onClick={handleSaveCustomCommodity}
                    disabled={!customCommodityName.trim()}
                    className="text-xs font-bold px-3 py-1.5 shrink-0 cursor-pointer shadow-xs"
                  >
                    Add & Select
                  </Button>
                </div>
                <p className="text-[10px] text-[#566861] leading-tight">
                  🌾 Added crops are saved to the platform so other farmers and buyers can select and trade them instantly!
                </p>
              </div>
            )}
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
              onChange={(e) => {
                const lettersOnly = e.target.value.replace(/[^a-zA-Z\s.-]/g, '');
                onChange({ target: { name: 'state', value: lettersOnly } });
              }}
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
              onChange={(e) => {
                const lettersOnly = e.target.value.replace(/[^a-zA-Z\s.-]/g, '');
                onChange({ target: { name: 'district', value: lettersOnly } });
              }}
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
