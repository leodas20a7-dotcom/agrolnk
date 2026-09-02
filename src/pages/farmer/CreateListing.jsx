import React, { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Tag,
  Gavel,
  Package,
  Camera,
  Sparkles,
  AlertCircle,
  Check,
  Calendar,
  Building2
} from 'lucide-react';
import { createListing, COMMODITY_IMAGES } from '../../utils/listings';
import { createAuction } from '../../utils/auctions';

export default function CreateListing({ currentUser, onNavigate, navState }) {
  const user = currentUser || { name: 'Sakthi Vel', id: 'usr_farmer_01', role: 'farmer' };

  const initialSource = navState?.editListing || navState?.initialData;

  // 5 Progressive Compact Steps
  const [currentStep, setCurrentStep] = useState(1);
  const [saleType, setSaleType] = useState(initialSource?.saleType || 'direct'); // 'direct' | 'auction'

  const [formData, setFormData] = useState({
    commodity: initialSource?.commodity || 'Tomato',
    variety: initialSource?.variety || 'Hybrid Shivam',
    grade: initialSource?.grade || 'A',
    quantity: initialSource?.quantity ? String(initialSource.quantity) : '500',
    unit: initialSource?.unit || 'kg',
    price: initialSource?.price ? String(initialSource.price) : (initialSource?.pricePerUnit ? String(initialSource.pricePerUnit) : '42'),
    startingBid: initialSource?.startingBid ? String(initialSource.startingBid) : '38',
    reservePrice: initialSource?.reservePrice ? String(initialSource.reservePrice) : '45',
    state: initialSource?.state || 'Tamil Nadu',
    district: initialSource?.district || 'Salem',
    village: initialSource?.village || 'Attur Farmgate Hub',
    harvestDate: initialSource?.harvestDate || new Date().toISOString().split('T')[0],
    images: initialSource?.images || [COMMODITY_IMAGES.Tomato],
    isDefaultImage: !initialSource?.images,
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const commodities = [
    'Tomato',
    'Onion',
    'Potato',
    'Mango',
    'Red Chilli',
    'Turmeric',
    'Basmati Rice',
    'Cotton',
    'Wheat',
    'Cardamom',
    'Ginger',
    'Apple',
    'Maize',
    'Soybean',
    'Banana',
    'Other'
  ];
  const grades = ['A', 'B', 'C', 'Export'];
  const units = ['kg', 'Quintal', 'MT'];

  const estimatedValue = Number(formData.quantity || 0) * Number(formData.price || 0);

  const handleCommoditySelect = (e) => {
    const commodity = e.target.value;
    const defaultImg = COMMODITY_IMAGES[commodity] || COMMODITY_IMAGES.Other;
    setFormData((prev) => ({
      ...prev,
      commodity,
      images: [defaultImg],
      isDefaultImage: true,
    }));
  };

  const handleCustomImage = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setFormData((prev) => ({
        ...prev,
        images: [previewUrl],
        isDefaultImage: false,
      }));
    }
  };

  const handleNextStep = () => {
    setError('');

    if (currentStep === 2 && !formData.commodity.trim()) {
      setError('Please select a commodity.');
      return;
    }

    if (currentStep === 3) {
      if (!formData.quantity || Number(formData.quantity) <= 0) {
        setError('Please enter a valid quantity.');
        return;
      }
      if (saleType === 'direct' && (!formData.price || Number(formData.price) <= 0)) {
        setError('Please enter a valid selling price.');
        return;
      }
      if (saleType === 'auction' && (!formData.startingBid || Number(formData.startingBid) <= 0)) {
        setError('Please enter a starting bid.');
        return;
      }
    }

    if (currentStep === 4 && (!formData.state.trim() || !formData.district.trim())) {
      setError('Please provide state and district.');
      return;
    }

    setCurrentStep((prev) => Math.min(5, prev + 1));
  };

  const handlePrevStep = () => {
    setError('');
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      onNavigate('farmer-dashboard');
    }
  };

  const handlePublishListing = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      if (saleType === 'auction') {
        await createAuction({
          farmerId: user.id || 'usr_farmer_01',
          farmerName: user.name || 'Sakthi Vel',
          commodity: formData.commodity,
          variety: formData.variety || 'Standard Lot',
          grade: formData.grade,
          quantity: Number(formData.quantity),
          unit: formData.unit,
          startingBid: Number(formData.startingBid || formData.price),
          reservePrice: Number(formData.reservePrice || Number(formData.startingBid || formData.price) * 1.1),
          state: formData.state,
          district: formData.district,
          images: formData.images,
        });
        onNavigate('farmer-my-auctions');
      } else {
        await createListing({
          farmerId: user.id || 'usr_farmer_01',
          farmerName: user.name || 'Sakthi Vel',
          commodity: formData.commodity,
          variety: formData.variety || 'Standard Lot',
          grade: formData.grade,
          quantity: Number(formData.quantity),
          unit: formData.unit,
          price: Number(formData.price),
          pricePerUnit: Number(formData.price),
          totalAmount: Number(formData.quantity) * Number(formData.price),
          state: formData.state,
          district: formData.district,
          village: formData.village,
          images: formData.images,
          saleType: 'direct',
        });
        onNavigate('farmer-my-listings');
      }
    } catch (err) {
      console.error('Failed to publish listing:', err);
      setError('Failed to publish listing. Please try again.');
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, label: 'Mode' },
    { num: 2, label: 'Produce' },
    { num: 3, label: 'Pricing' },
    { num: 4, label: 'Origin' },
    { num: 5, label: 'Preview' },
  ];

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="max-w-4xl mx-auto space-y-5 text-left">
        
        {/* Sleek Smart Header with Back, Centered Progress Pills & Next Button */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs flex items-center justify-between gap-3">
          
          {/* Back button */}
          <button
            type="button"
            onClick={handlePrevStep}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#566861] hover:text-[#0B3326] px-2.5 py-1.5 rounded-xl hover:bg-[#F8FAF8] transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{currentStep > 1 ? 'Back' : 'Dashboard'}</span>
          </button>

          {/* Smart Step Progress Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {stepsList.map((st) => {
              const isPassed = currentStep > st.num;
              const isCurrent = currentStep === st.num;

              return (
                <button
                  key={st.num}
                  type="button"
                  onClick={() => {
                    if (st.num < currentStep) setCurrentStep(st.num);
                  }}
                  className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-[#0B3326] text-white shadow-xs'
                      : isPassed
                      ? 'bg-[#EBF5F0] text-[#10B981] cursor-pointer'
                      : 'bg-[#F8FAF8] text-[#566861]/60'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      isCurrent
                        ? 'bg-[#10B981] text-white'
                        : isPassed
                        ? 'bg-[#10B981] text-white'
                        : 'bg-[#E5EDE8] text-[#566861]'
                    }`}
                  >
                    {isPassed ? '✓' : st.num}
                  </span>
                  <span className="hidden md:inline">{st.label}</span>
                </button>
              );
            })}
          </div>

          {/* Next / Submit Button */}
          {currentStep < 5 ? (
            <Button
              variant="accent"
              size="sm"
              onClick={handleNextStep}
              icon={ArrowRight}
              iconPosition="right"
              className="text-xs font-bold py-2 px-4 shadow-xs cursor-pointer shrink-0"
            >
              Next
            </Button>
          ) : (
            <Button
              variant="accent"
              size="sm"
              disabled={isSubmitting}
              onClick={handlePublishListing}
              icon={CheckCircle2}
              iconPosition="left"
              className="text-xs font-bold py-2 px-4 shadow-xs cursor-pointer shrink-0"
            >
              {isSubmitting ? 'Publishing...' : 'Publish'}
            </Button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* ================= STEP 1: Selling Mode ================= */}
        {currentStep === 1 && (
          <Card className="p-6 sm:p-7 bg-white border border-[#E5EDE8] shadow-xs space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#0B3326] font-heading">
                Choose How to Sell
              </h2>
              <p className="text-xs text-[#566861]">
                Select your preferred transaction model for this produce batch.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Direct Sale */}
              <div
                onClick={() => setSaleType('direct')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  saleType === 'direct'
                    ? 'border-[#10B981] bg-[#F2FBF6]/50 shadow-xs ring-2 ring-[#10B981]/20'
                    : 'border-[#E5EDE8] bg-white hover:border-[#10B981]/50'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center">
                      <Tag className="w-5 h-5 text-[#10B981]" />
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        saleType === 'direct'
                          ? 'bg-[#10B981] border-[#10B981] text-white'
                          : 'border-[#E5EDE8]'
                      }`}
                    >
                      {saleType === 'direct' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-[#0B3326]">
                      Direct Fixed-Price Sale
                    </h3>
                    <p className="text-xs text-[#566861] mt-0.5">
                      Set guaranteed price. Buyers purchase instantly with 100% escrow protection.
                    </p>
                  </div>
                </div>

                <div className="pt-3">
                  <span className="text-[11px] font-bold text-[#10B981]">
                    {saleType === 'direct' ? '✓ Active Selection' : 'Click to select'}
                  </span>
                </div>
              </div>

              {/* Live Auction */}
              <div
                onClick={() => setSaleType('auction')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  saleType === 'auction'
                    ? 'border-[#D97706] bg-[#FEF3C7]/30 shadow-xs ring-2 ring-[#D97706]/20'
                    : 'border-[#E5EDE8] bg-white hover:border-[#D97706]/50'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
                      <Gavel className="w-5 h-5 text-[#D97706]" />
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        saleType === 'auction'
                          ? 'bg-[#D97706] border-[#D97706] text-white'
                          : 'border-[#E5EDE8]'
                      }`}
                    >
                      {saleType === 'auction' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-[#0B3326]">
                      Live Clock Auction
                    </h3>
                    <p className="text-xs text-[#566861] mt-0.5">
                      Dynamic bidding room. Maximize price realization for high-demand bulk lots.
                    </p>
                  </div>
                </div>

                <div className="pt-3">
                  <span className="text-[11px] font-bold text-[#D97706]">
                    {saleType === 'auction' ? '✓ Active Selection' : 'Click to select'}
                  </span>
                </div>
              </div>

            </div>
          </Card>
        )}

        {/* ================= STEP 2: Produce Specs ================= */}
        {currentStep === 2 && (
          <Card className="p-6 sm:p-7 bg-white border border-[#E5EDE8] shadow-xs space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#0B3326] font-heading">
                Produce & Quality
              </h2>
              <p className="text-xs text-[#566861]">
                Specify commodity variety, quality grade, and lot photo.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Commodity */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0B3326] block">
                  Commodity
                </label>
                <select
                  value={formData.commodity}
                  onChange={handleCommoditySelect}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                >
                  {commodities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Variety */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0B3326] block">
                  Variety / Cultivar
                </label>
                <input
                  type="text"
                  value={formData.variety}
                  onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                  placeholder="e.g. Hybrid Shivam, Nasik Red"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>

              {/* Quality Grade */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0B3326] block">
                  Quality Grade
                </label>
                <select
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                >
                  {grades.map((g) => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </div>

              {/* Photo & Upload */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0B3326] block">
                  Lot Sample Photo
                </label>
                <div className="flex items-center gap-3">
                  <img
                    src={formData.images[0]}
                    alt="Sample"
                    className="w-10 h-10 rounded-xl object-cover border border-[#E5EDE8] shrink-0"
                  />
                  <label className="px-3 py-2 rounded-xl border border-[#E5EDE8] text-xs font-semibold text-[#0B3326] bg-[#F8FAF8] hover:bg-[#EBF5F0] transition-colors cursor-pointer flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Upload Custom Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCustomImage}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

            </div>
          </Card>
        )}

        {/* ================= STEP 3: Pricing & Volume ================= */}
        {currentStep === 3 && (
          <Card className="p-6 sm:p-7 bg-white border border-[#E5EDE8] shadow-xs space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#0B3326] font-heading">
                Pricing & Volume
              </h2>
              <p className="text-xs text-[#566861]">
                Define batch volume and target pricing.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Quantity */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0B3326] block">
                  Lot Volume
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    min="50"
                    step="10"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="px-3 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-semibold text-[#14211D] shrink-0"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price / Starting Bid */}
              {saleType === 'direct' ? (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0B3326] block">
                    Price per {formData.unit} (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    min="1"
                    step="0.5"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-extrabold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0B3326] block">
                    Starting Bid (₹/{formData.unit})
                  </label>
                  <input
                    type="number"
                    value={formData.startingBid}
                    onChange={(e) => setFormData({ ...formData, startingBid: e.target.value })}
                    min="1"
                    step="0.5"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                </div>
              )}

            </div>

            {/* Calculated Escrow Box */}
            <div className="p-3.5 rounded-xl bg-[#EBF5F0] border border-[#10B981]/25 flex items-center justify-between text-xs">
              <span className="text-[#0B3326] font-semibold">
                Total Transaction Escrow Value:
              </span>
              <span className="text-base font-extrabold text-[#0B3326] font-heading">
                ₹{estimatedValue.toLocaleString('en-IN')}
              </span>
            </div>
          </Card>
        )}

        {/* ================= STEP 4: Origin Location ================= */}
        {currentStep === 4 && (
          <Card className="p-6 sm:p-7 bg-white border border-[#E5EDE8] shadow-xs space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#0B3326] font-heading">
                Origin & Pickup Location
              </h2>
              <p className="text-xs text-[#566861]">
                Where should the logistics transporter collect this produce batch?
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0B3326] block">
                  District
                </label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  placeholder="e.g. Salem"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0B3326] block">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="e.g. Tamil Nadu"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-[#0B3326] block">
                  Farmgate / Mandi Pickup Address
                </label>
                <input
                  type="text"
                  value={formData.village}
                  onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                  placeholder="e.g. Attur Farmgate Depot, Salem"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>

            </div>
          </Card>
        )}

        {/* ================= STEP 5: Review & Direct Submit ================= */}
        {currentStep === 5 && (
          <Card className="p-6 sm:p-7 bg-white border-2 border-[#10B981]/40 shadow-md space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
                <span className="text-xs font-bold text-[#0B3326] uppercase tracking-wider">
                  Summary Preview
                </span>
              </div>
              <Badge variant={saleType === 'direct' ? 'emerald' : 'amber'} size="sm">
                {saleType === 'direct' ? 'Fixed-Price Direct Lot' : 'Live Auction Lot'}
              </Badge>
            </div>

            {/* Compact Spec Grid */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <img
                src={formData.images[0]}
                alt={formData.commodity}
                className="w-20 h-20 rounded-2xl object-cover border border-[#E5EDE8] shrink-0"
              />

              <div className="flex-1 space-y-1 text-left">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-extrabold text-[#0B3326] font-heading">
                    {formData.commodity}
                  </h3>
                  <Badge variant="dark" size="sm">Grade {formData.grade}</Badge>
                </div>
                <p className="text-xs text-[#566861]">
                  Variety: <strong>{formData.variety || 'Standard Lot'}</strong> • Location: <strong>{formData.district}, {formData.state}</strong>
                </p>
              </div>

              <div className="text-right sm:border-l sm:border-[#E5EDE8] sm:pl-4">
                <span className="text-[10px] text-[#566861] block font-medium">Escrow Value</span>
                <span className="text-2xl font-extrabold text-[#0B3326] font-heading">
                  ₹{estimatedValue.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-[#10B981] font-semibold block">
                  {formData.quantity} {formData.unit} @ ₹{saleType === 'direct' ? formData.price : formData.startingBid}/{formData.unit}
                </span>
              </div>
            </div>

            {/* Big Action Button */}
            <div className="pt-2">
              <Button
                variant="accent"
                size="lg"
                disabled={isSubmitting}
                onClick={handlePublishListing}
                icon={CheckCircle2}
                iconPosition="left"
                className="w-full font-bold py-3 px-6 shadow-md shadow-[#10B981]/20 text-sm cursor-pointer"
              >
                {isSubmitting ? 'Publishing to Live Exchange...' : 'Confirm & Publish Listing'}
              </Button>
            </div>
          </Card>
        )}

      </div>
    </DashboardLayout>
  );
}
