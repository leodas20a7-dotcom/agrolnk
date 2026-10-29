import React, { useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, MapPin, Tag, Sparkles, AlertCircle } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import CommoditySelect from '../ui/CommoditySelect';
import SearchableSelect from '../ui/SearchableSelect';
import { COMMODITY_IMAGES } from '../../utils/listings';
import { uploadProduceImage } from '../../utils/imageUpload';
import { toast } from '../../context/ToastContext';
import MultiMediaUploader from '../ui/MultiMediaUploader';
import { computePricingBreakdown, PRICING_UNIT_OPTIONS } from '../../utils/pricingUnits';

export default function ProduceForm({ formData, onChange, onImageChange, isEditing = false }) {
  const isEditingRecord = Boolean(isEditing || formData?.id);
  const grades = ['Grade A', 'Grade B', 'Grade C'];
  const units = ['kg', 'Quintal', 'MT'];

  const pricingBreakdown = computePricingBreakdown({
    quantity: formData.quantity,
    unit: formData.unit,
    price: formData.price,
    priceUnit: formData.priceUnit || (formData.unit === 'MT' ? 'Quintal' : formData.unit),
  });

  const estimatedValue = pricingBreakdown.totalEscrowValue;

  const handleCustomImage = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      onImageChange(previewUrl, false);

      try {
        const permanentUrl = await uploadProduceImage(file);
        if (permanentUrl) {
          onImageChange(permanentUrl, false);
          toast.success('Produce photo optimized & attached!');
        }
      } catch (err) {
        console.warn('Produce image upload error:', err);
      }
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
            {isEditingRecord ? (
              <input
                type="text"
                name="commodity"
                value={formData.commodity || ''}
                onChange={onChange}
                placeholder="Enter commodity name..."
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-[#CBD7D0] text-[#14211D] placeholder:text-[#8E9F97] focus:outline-hidden focus:ring-2 focus:ring-[#008236] focus:border-[#008236] bg-[#F8FAF8] transition-all shadow-xs"
                required
              />
            ) : (
              <CommoditySelect
                value={formData.commodity}
                onChange={(val) => {
                  onChange({ target: { name: 'commodity', value: val } });
                  if (!formData.images || formData.images.length === 0 || formData.isDefaultImage) {
                    if (COMMODITY_IMAGES[val]) {
                      onImageChange(COMMODITY_IMAGES[val], true);
                    }
                  }
                }}
                onImageChange={onImageChange}
                placeholder="Select Commodity..."
                required
              />
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
            <SearchableSelect
              options={units.map((u) => ({ value: u, label: u }))}
              value={formData.unit}
              onChange={(val) => onChange({ target: { name: 'unit', value: val } })}
              placeholder="Select Unit"
              searchPlaceholder="Search unit..."
            />
          </div>
        </div>

        {/* Produce Detailing / Description (Optional) */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#0B3326] flex items-center gap-1.5">
              <span>Produce Detailing & Specifications</span>
              <span className="text-[10px] font-semibold text-[#566861] bg-[#F1F4F2] px-2 py-0.5 rounded-full">Optional</span>
            </label>
            <span className="text-[11px] text-[#71847D]">
              {(formData.description || '').length}/1000 characters
            </span>
          </div>
          <textarea
            name="description"
            rows={3}
            maxLength={1000}
            value={formData.description || ''}
            onChange={onChange}
            placeholder="Share details about produce freshness, packaging type (gunny bags, crates), moisture content, organic certification, harvest timing, or loading instructions..."
            className="w-full text-xs text-[#0B3326] bg-[#F8FAF8] border border-[#CBD7D0] focus:border-[#008236] focus:ring-1 focus:ring-[#008236] rounded-xl p-3 outline-hidden transition-all duration-150 resize-y placeholder:text-[#8E9F97] leading-relaxed"
          />
          <p className="text-[11px] text-[#566861]">
            Help verified buyers understand your lot specifics, packaging condition, or transportation readiness.
          </p>
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#14211D]">
                Target Price (₹) <span className="text-red-500">*</span>
              </label>
              <div className="w-36">
                <SearchableSelect
                  options={PRICING_UNIT_OPTIONS}
                  value={formData.priceUnit || (formData.unit === 'MT' ? 'Quintal' : formData.unit)}
                  onChange={(val) => onChange({ target: { name: 'priceUnit', value: val } })}
                  placeholder="Price basis"
                  buttonClassName="bg-[#F8FAF8] py-1 text-xs"
                />
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#0B3326]">
                ₹
              </span>
              <input
                type="number"
                name="price"
                min="0.1"
                step="any"
                required
                value={formData.price}
                onChange={onChange}
                placeholder={formData.priceUnit === 'MT' ? '18500' : (formData.priceUnit === 'kg' ? '18.5' : '1850')}
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-[#E5EDE8] text-sm text-[#14211D] font-bold placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all"
              />
            </div>
            <span className="text-[11px] text-[#2D5A47] mt-1 block">
              Mandi Equivalent: <strong>₹{pricingBreakdown.pricePerQuintal.toLocaleString('en-IN')}/Qtl</strong> • <strong>₹{pricingBreakdown.pricePerMT.toLocaleString('en-IN')}/MT</strong>
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
              {pricingBreakdown.totalQuintals} Quintals ({formData.quantity || 0} {formData.unit}) × ₹{pricingBreakdown.pricePerQuintal.toLocaleString('en-IN')}/Qtl
            </div>
          </div>
        </div>
      </div>

      {/* 4. Produce Media Gallery */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white border border-[#E5EDE8] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E5EDE8]">
          <span className="w-7 h-7 rounded-lg bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center text-xs font-bold font-heading">
            4
          </span>
          <h3 className="text-base font-bold text-[#0B3326] font-heading">
            Produce Photos &amp; Video
          </h3>
        </div>

        <MultiMediaUploader
          media={formData.images || []}
          onChange={(newMedia) => {
            onImageChange?.(newMedia, false);
          }}
          maxFiles={8}
          maxVideos={1}
        />
      </div>

    </div>
  );
}
