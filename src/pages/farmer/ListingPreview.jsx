import React, { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Tag,
  Edit3,
  Check,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { createListing } from '../../utils/listings';

export default function ListingPreview({ currentUser, onNavigate, navState }) {
  const user = currentUser || { name: 'Sakthi Vel', role: 'farmer' };
  const listingData = navState?.listingData || {
    commodity: 'Tomato',
    variety: 'Hybrid Shivam',
    grade: 'A',
    quantity: 500,
    unit: 'kg',
    price: 42,
    state: 'Tamil Nadu',
    district: 'Salem',
    village: 'Attur Mandi',
    saleType: 'direct',
    images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80'],
  };

  const [isPublishing, setIsPublishing] = useState(false);
  const estimatedValue =
    Number(listingData.quantity || 0) * Number(listingData.price || 0);

  const handlePublish = () => {
    setIsPublishing(true);
    try {
      createListing({
        ...listingData,
        farmerId: user.id || 'usr_farmer_01',
        farmerName: user.name || 'Sakthi Vel',
      });
      setTimeout(() => {
        onNavigate('farmer-my-listings');
      }, 300);
    } catch (err) {
      console.error('Failed to publish listing:', err);
      setIsPublishing(false);
    }
  };

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="max-w-3xl mx-auto space-y-8 text-left">
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('farmer-create-listing', { initialData: listingData })}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#566861] hover:text-[#0B3326] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Edit Details
          </button>
          <div className="text-xs text-[#566861]">
            Step <span className="font-bold text-[#0B3326]">2</span> of 2: Preview & Publish
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-1">
          <Badge variant="emerald" size="sm">
            Buyer View Simulation
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
            Preview Listing
          </h1>
          <p className="text-xs sm:text-sm text-[#566861]">
            This is exactly how your produce will appear to verified buyers across the Agrolnk exchange.
          </p>
        </div>

        {/* Main Buyer Perspective Card */}
        <Card className="p-6 sm:p-8 bg-white border border-[#E5EDE8] shadow-md space-y-6">
          
          {/* Image & Header Overlay */}
          <div className="relative h-64 sm:h-72 rounded-3xl overflow-hidden bg-[#F8FAF8] border border-[#E5EDE8]">
            <img
              src={
                listingData.images?.[0] ||
                'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80'
              }
              alt={listingData.commodity}
              className="w-full h-full object-cover"
            />
            
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <Badge variant="dark" size="md" className="font-bold">
                Grade {listingData.grade}
              </Badge>
              <Badge variant="accent" size="md">
                {listingData.saleType === 'direct' ? 'DIRECT SALE' : 'LIVE AUCTION'}
              </Badge>
            </div>

            <div className="absolute bottom-4 left-4 right-4 p-3 rounded-2xl bg-[#0B3326]/90 text-white flex items-center justify-between text-xs backdrop-blur-xs">
              <span className="flex items-center gap-1.5 text-[#34D399] font-medium">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" /> Escrow Secured Trading
              </span>
              <span className="font-bold">Ready for Instant Lock</span>
            </div>
          </div>

          {/* Title & Origin Details */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
                  Fresh {listingData.commodity}
                </h2>
                <span className="text-xs font-semibold text-[#10B981]">
                  Variety: {listingData.variety || 'Standard Producer Grade'}
                </span>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs text-[#566861] block">Direct Sale Price</span>
                <span className="text-2xl font-extrabold text-[#0B3326] font-heading">
                  ₹{listingData.price}
                </span>
                <span className="text-xs text-[#566861] ml-1">/ {listingData.unit}</span>
              </div>
            </div>

            <p className="text-xs text-[#566861] flex items-center gap-1">
              <MapPin className="w-4 h-4 text-[#10B981] shrink-0" />
              <span>
                {listingData.village ? `${listingData.village}, ` : ''}
                {listingData.district}, {listingData.state}
              </span>
            </p>
          </div>

          {/* Specifications Grid */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] text-center">
            <div>
              <span className="text-[11px] text-[#566861] block font-medium">Lot Volume</span>
              <span className="text-sm font-bold text-[#14211D]">
                {listingData.quantity} {listingData.unit}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[#566861] block font-medium">Quality Grade</span>
              <span className="text-sm font-bold text-[#10B981]">
                Grade {listingData.grade}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[#566861] block font-medium">Total Lot Value</span>
              <span className="text-sm font-bold text-[#0B3326]">
                ₹{estimatedValue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Trust Guarantee Checklist */}
          <div className="p-4 rounded-2xl bg-[#EBF5F0] border border-[#10B981]/20 space-y-2">
            <div className="flex items-center gap-2 text-xs text-[#0B3326] font-bold">
              <Sparkles className="w-4 h-4 text-[#10B981]" />
              <span>Included with this listing:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#566861]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Zero commission deduction</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                <span>100% Escrow deposit before dispatch</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                <span>T+0 payout release upon handover</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                <span>NABL standard assay protection</span>
              </div>
            </div>
          </div>

        </Card>

        {/* Action Controls */}
        <div className="p-6 rounded-3xl bg-white border border-[#E5EDE8] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => onNavigate('farmer-create-listing', { initialData: listingData })}
            icon={Edit3}
            iconPosition="left"
            className="w-full sm:w-auto font-semibold"
          >
            Edit Listing
          </Button>

          <Button
            variant="primary"
            size="lg"
            disabled={isPublishing}
            onClick={handlePublish}
            icon={Check}
            iconPosition="right"
            className="w-full sm:w-auto font-bold py-3 px-8 shadow-sm cursor-pointer"
          >
            {isPublishing ? 'Publishing Lot...' : 'Publish Listing'}
          </Button>
        </div>

      </div>
    </DashboardLayout>
  );
}
