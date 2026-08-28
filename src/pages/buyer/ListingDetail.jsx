import React, { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import OrderModal from '../../components/buyer/OrderModal';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  ArrowLeft,
  MapPin,
  ShieldCheck,
  Award,
  Truck,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { createOrder } from '../../utils/orders';
import { deductListingQuantity, COMMODITY_IMAGES } from '../../utils/listings';

export default function ListingDetail({ currentUser, onNavigate, navState }) {
  const user = currentUser || { name: 'Ananya Agro', id: 'usr_buyer_02', role: 'buyer' };
  const listing = navState?.listing || {
    id: 'lot_demo_01',
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
    farmerName: 'Sakthi Vel',
    images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80'],
  };

  const fallbackImg = COMMODITY_IMAGES[listing.commodity] || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const estimatedTotal = Number(listing.quantity || 0) * Number(listing.price || 0);

  const handleOrderConfirmed = (orderPayload) => {
    try {
      const order = createOrder({
        ...orderPayload,
        buyerId: user.id || 'usr_buyer_02',
        buyerName: user.name || 'Ananya Agro Foods',
      });

      // Deduct quantity from live listing
      deductListingQuantity(listing.id, orderPayload.quantity);

      setIsModalOpen(false);
      onNavigate('buyer-orders', { newOrder: order });
    } catch (err) {
      console.error('Order creation failed:', err);
    }
  };

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="max-w-4xl mx-auto space-y-8 text-left">
        
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('buyer-marketplace')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#566861] hover:text-[#0B3326] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Marketplace
          </button>
          <Badge variant="emerald" size="sm" dot={true}>
            Live Verified Batch
          </Badge>
        </div>

        {/* Main Produce Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Produce Photo & Visual Badges */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative h-72 sm:h-96 rounded-3xl overflow-hidden bg-[#F8FAF8] border border-[#E5EDE8] shadow-xs">
              <img
                src={listing.images?.[0] || fallbackImg}
                alt={listing.commodity}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = fallbackImg;
                }}
                className="w-full h-full object-cover"
              />

              <div className="absolute top-4 left-4 flex items-center gap-2">
                <Badge variant="dark" size="md" className="font-bold">
                  Grade {listing.grade}
                </Badge>
                <Badge variant="accent" size="md">
                  {listing.saleType === 'direct' ? 'DIRECT SALE' : 'LIVE AUCTION'}
                </Badge>
              </div>

              <div className="absolute bottom-4 left-4 right-4 p-3 rounded-2xl bg-[#0B3326]/90 text-white flex items-center justify-between text-xs backdrop-blur-xs">
                <span className="flex items-center gap-1.5 text-[#34D399] font-medium">
                  <ShieldCheck className="w-4 h-4 text-[#10B981]" /> Escrow Secured Agreement
                </span>
                <span className="font-bold">Ready for Dispatch</span>
              </div>
            </div>

            {/* Quality & Assay Specifications */}
            <Card className="p-6 bg-white border border-[#E5EDE8] space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-[#0B3326] font-heading uppercase tracking-wider">
                Quality & Assay Report
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
                  <span className="text-[#566861] block text-[11px]">Quality Rating</span>
                  <span className="font-bold text-[#0B3326] text-sm">Grade {listing.grade} (Commercial)</span>
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
                  <span className="text-[#566861] block text-[11px]">Lab Certification</span>
                  <span className="font-bold text-[#10B981] text-sm">NABL Assayed ✓</span>
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
                  <span className="text-[#566861] block text-[11px]">Packaging Type</span>
                  <span className="font-bold text-[#14211D] text-sm">Standard Jute Bags</span>
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
                  <span className="text-[#566861] block text-[11px]">Dispatch Readiness</span>
                  <span className="font-bold text-[#0B3326] text-sm">Immediate (T+0)</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Pricing, Seller Info & Buy Now Card */}
          <div className="lg:col-span-5 space-y-5">
            
            <Card className="p-6 sm:p-7 bg-white border border-[#E5EDE8] shadow-md space-y-6">
              
              {/* Commodity Title & Variety */}
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
                  {listing.commodity}
                </h1>
                <p className="text-xs font-semibold text-[#10B981]">
                  Variety: {listing.variety || 'Standard Farm Lot'}
                </p>
                <p className="text-xs text-[#566861] flex items-center gap-1 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                  <span>
                    {listing.village ? `${listing.village}, ` : ''}
                    {listing.district ? `${listing.district}, ` : ''}
                    {listing.state}
                  </span>
                </p>
              </div>

              {/* Price & Valuation Banner */}
              <div className="p-5 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] space-y-3">
                <div className="flex items-center justify-between text-xs text-[#DCFCE7]/80">
                  <span>Unit Price</span>
                  <span className="text-[#34D399] font-bold">Fixed Direct Price</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-extrabold font-heading text-white">
                      ₹{listing.price}
                    </span>
                    <span className="text-xs text-white/70 ml-1">/ {listing.unit}</span>
                  </div>
                  <Badge variant="accent" size="sm">
                    In Stock
                  </Badge>
                </div>
                <div className="pt-2 border-t border-[#14624A] flex items-center justify-between text-xs text-[#DCFCE7]/90">
                  <span>Available: {listing.quantity} {listing.unit}</span>
                  <span>Est. Total: ₹{estimatedTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Seller Marketplace Identity */}
              <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2 text-xs">
                <span className="font-bold text-[#566861] uppercase tracking-wider block text-[10px]">
                  Seller Profile
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#14211D] text-sm">
                    {listing.farmerName || 'Verified Producer'}
                  </span>
                  <Badge variant="emerald" size="sm">
                    Verified Farmer
                  </Badge>
                </div>
                <p className="text-[11px] text-[#566861]">
                  Direct grower with 100% past delivery fulfillment on AGRAMAZ.
                </p>
              </div>

              {/* Buy Now CTA */}
              <div>
                <Button
                  variant="accent"
                  size="lg"
                  onClick={() => setIsModalOpen(true)}
                  icon={ShoppingBag}
                  iconPosition="left"
                  className="w-full justify-center py-3.5 font-bold text-base shadow-sm cursor-pointer"
                >
                  Buy Now
                </Button>
              </div>

              {/* Trust Guarantees */}
              <div className="space-y-2 pt-2 border-t border-[#E5EDE8] text-xs text-[#566861]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                  <span>100% Escrow deposit protection</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                  <span>GPS tracked multi-axle freight coordination</span>
                </div>
              </div>

            </Card>

          </div>

        </div>

      </div>

      {/* Buy Now Confirmation Modal */}
      <OrderModal
        listing={listing}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleOrderConfirmed}
      />
    </DashboardLayout>
  );
}
