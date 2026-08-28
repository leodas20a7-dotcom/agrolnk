import React, { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import SaleMethodCard from '../../components/farmer/SaleMethodCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import {
  ArrowLeft,
  ArrowRight,
  Gavel,
  ShieldCheck,
  Clock,
  AlertCircle,
  Sparkles,
  Camera,
  Check
} from 'lucide-react';
import { createAuction } from '../../utils/auctions';
import { COMMODITY_IMAGES } from '../../utils/listings';

export default function CreateAuction({ currentUser, onNavigate }) {
  const user = currentUser || { name: 'Sakthi Vel', id: 'usr_farmer_01', role: 'farmer' };

  const [formData, setFormData] = useState({
    commodity: 'Tomato',
    variety: 'Hybrid Shivam',
    grade: 'A',
    quantity: '500',
    unit: 'kg',
    startingBid: '40',
    reservePrice: '40',
    durationMinutes: '30',
    state: 'Tamil Nadu',
    district: 'Salem',
    images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80'],
  });

  const [error, setError] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

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

  const durations = [
    { label: '15 minutes', value: '15' },
    { label: '30 minutes', value: '30' },
    { label: '1 hour', value: '60' },
    { label: '6 hours', value: '360' },
    { label: '24 hours', value: '1440' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'commodity') {
      const defaultImg = COMMODITY_IMAGES[value] || COMMODITY_IMAGES.Other;
      setFormData((prev) => ({
        ...prev,
        commodity: value,
        images: [defaultImg],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const startingLotValue =
    Number(formData.quantity || 0) * Number(formData.startingBid || 0);

  const handlePublishAuction = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.commodity) {
      setError('Please select a commodity.');
      return;
    }
    if (!formData.quantity || Number(formData.quantity) <= 0) {
      setError('Please enter a valid quantity amount.');
      return;
    }
    if (!formData.startingBid || Number(formData.startingBid) <= 0) {
      setError('Please enter a valid starting bid.');
      return;
    }
    if (!formData.reservePrice || Number(formData.reservePrice) <= 0) {
      setError('Please enter a valid reserve price.');
      return;
    }
    if (Number(formData.startingBid) > Number(formData.reservePrice)) {
      setError('Starting bid should generally be equal to or lower than the reserve price.');
    }

    setIsPublishing(true);

    try {
      createAuction({
        ...formData,
        farmerId: user.id || 'usr_farmer_01',
        farmerName: user.name || 'Sakthi Vel',
      });

      setTimeout(() => {
        onNavigate('farmer-my-auctions');
      }, 300);
    } catch (err) {
      console.error('Failed to create auction:', err);
      setError('Failed to publish auction. Please try again.');
      setIsPublishing(false);
    }
  };

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="max-w-4xl mx-auto space-y-8 text-left">
        
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('farmer-dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#566861] hover:text-[#0B3326] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <div className="text-xs text-[#566861]">
            Step <span className="font-bold text-[#0B3326]">1</span> of 1: Create Live Auction
          </div>
        </div>

        {/* Page Headline */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5">
            <Badge variant="amber" size="sm" dot={true}>
              Competitive Bidding Engine
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
            Launch Live Auction
          </h1>
          <p className="text-xs sm:text-sm text-[#566861]">
            Set your reserve floor price and let verified national buyers compete for your harvest in real time.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handlePublishAuction} className="space-y-8">
          
          {/* Selling Method Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#0B3326] font-heading">
                Trading Method
              </h2>
              <span className="text-xs text-[#566861]">Selected: Live Auction</span>
            </div>
            <SaleMethodCard
              selectedMethod="auction"
              onSelect={(method) => {
                if (method === 'direct') {
                  onNavigate('farmer-create-listing');
                }
              }}
            />
          </div>

          {/* 1. Produce Details */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-[#E5EDE8] shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E5EDE8]">
              <span className="w-7 h-7 rounded-lg bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center text-xs font-bold font-heading">
                1
              </span>
              <h3 className="text-base font-bold text-[#0B3326] font-heading">
                Produce Specifications
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#14211D] mb-1.5">
                  Commodity <span className="text-red-500">*</span>
                </label>
                <select
                  name="commodity"
                  value={formData.commodity}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] text-sm text-[#14211D] bg-white focus:outline-none focus:ring-2 focus:ring-[#10B981] transition-all cursor-pointer"
                >
                  {commodities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#14211D] mb-1.5">
                  Variety <span className="text-[10px] text-[#566861] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="variety"
                  value={formData.variety}
                  onChange={handleChange}
                  placeholder="e.g. Hybrid Shivam / Kufri"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] text-sm text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] transition-all"
                />
              </div>
            </div>

            {/* Quality Grade & Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-[#14211D] mb-2">
                  Quality Grade <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {grades.map((g) => {
                    const isSelected = formData.grade === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, grade: g }))}
                        className={`py-2.5 px-3 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#10B981] bg-[#F2FBF6] text-[#0B3326]'
                            : 'border-[#E5EDE8] bg-white text-[#566861] hover:border-[#10B981]/40'
                        }`}
                      >
                        Grade {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-[#14211D] mb-1.5">
                    Quantity Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={handleChange}
                    placeholder="500"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] text-sm text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#14211D] mb-1.5">
                    Unit
                  </label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] text-sm text-[#14211D] bg-white focus:outline-none focus:ring-2 focus:ring-[#10B981] transition-all cursor-pointer"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Auction Pricing & Reserve Protection */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-[#E5EDE8] shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E5EDE8]">
              <span className="w-7 h-7 rounded-lg bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center text-xs font-bold font-heading">
                2
              </span>
              <h3 className="text-base font-bold text-[#0B3326] font-heading">
                Reserve Price & Starting Bid
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Reserve Price */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#14211D]">
                  Reserve Price (₹ / {formData.unit}) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#0B3326]">
                    ₹
                  </span>
                  <input
                    type="number"
                    name="reservePrice"
                    min="1"
                    required
                    value={formData.reservePrice}
                    onChange={handleChange}
                    placeholder="40"
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-[#E5EDE8] text-sm font-bold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981] transition-all"
                  />
                </div>
                <span className="text-[11px] text-[#566861] block pt-0.5">
                  🛡️ <strong>Farmer Protection:</strong> You will not be required to sell if the highest bid is below this amount.
                </span>
              </div>

              {/* Starting Bid */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#14211D]">
                  Starting Bid (₹ / {formData.unit}) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#0B3326]">
                    ₹
                  </span>
                  <input
                    type="number"
                    name="startingBid"
                    min="1"
                    required
                    value={formData.startingBid}
                    onChange={handleChange}
                    placeholder="40"
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-[#E5EDE8] text-sm font-bold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981] transition-all"
                  />
                </div>
                <span className="text-[11px] text-[#566861] block pt-0.5">
                  Opening price at which buyers begin placing competitive bids.
                </span>
              </div>
            </div>

            {/* Starting Valuation Banner */}
            <div className="p-4 rounded-2xl bg-[#0B3326] text-white flex items-center justify-between">
              <div>
                <span className="text-xs text-[#DCFCE7]/80 block">Initial Lot Valuation</span>
                <span className="text-2xl font-extrabold font-heading text-white">
                  ₹{startingLotValue.toLocaleString('en-IN')}
                </span>
              </div>
              <Badge variant="accent" size="sm">
                Reserve Protected
              </Badge>
            </div>
          </div>

          {/* 3. Auction Duration */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-[#E5EDE8] shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E5EDE8]">
              <span className="w-7 h-7 rounded-lg bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center text-xs font-bold font-heading">
                3
              </span>
              <h3 className="text-base font-bold text-[#0B3326] font-heading">
                Auction Duration
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {durations.map((d) => {
                const isSelected = formData.durationMinutes === d.value;
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, durationMinutes: d.value }))}
                    className={`py-3 px-3 rounded-2xl border-2 text-xs font-bold text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'border-[#D97706] bg-[#FEF3C7] text-[#92400E] shadow-2xs'
                        : 'border-[#E5EDE8] bg-white text-[#566861] hover:border-[#D97706]/50'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-[#D97706]" />
                    <span>{d.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Live Auction Preview Snapshot */}
          <Card className="p-6 bg-[#F8FAF8] border border-[#E5EDE8] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0B3326] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#10B981]" /> Live Auction Preview
              </span>
              <Badge variant="amber" size="sm" dot={true}>
                {formData.durationMinutes} min countdown
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white border border-[#E5EDE8]">
                <span className="text-[#566861] block text-[10px]">Lot Size</span>
                <span className="font-bold text-[#0B3326] text-sm">
                  {formData.commodity} ({formData.quantity} {formData.unit})
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#E5EDE8]">
                <span className="text-[#566861] block text-[10px]">Reserve Floor</span>
                <span className="font-bold text-[#10B981] text-sm">
                  ₹{formData.reservePrice} / {formData.unit}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#E5EDE8]">
                <span className="text-[#566861] block text-[10px]">Starting Bid</span>
                <span className="font-bold text-[#D97706] text-sm">
                  ₹{formData.startingBid} / {formData.unit}
                </span>
              </div>
            </div>
          </Card>

          {/* Action Button */}
          <div className="p-6 rounded-3xl bg-white border border-[#E5EDE8] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <span className="text-xs font-bold text-[#14211D] block">
                Ready to start bidding?
              </span>
              <span className="text-[11px] text-[#566861]">
                Publishing will activate the live countdown clock immediately for verified buyers.
              </span>
            </div>

            <Button
              type="submit"
              variant="accent"
              size="lg"
              disabled={isPublishing}
              className="w-full sm:w-auto font-bold py-3.5 px-8 shadow-sm cursor-pointer"
              icon={Gavel}
              iconPosition="right"
            >
              {isPublishing ? 'Launching Live Auction...' : 'Publish Live Auction'}
            </Button>
          </div>

        </form>

      </div>
    </DashboardLayout>
  );
}
