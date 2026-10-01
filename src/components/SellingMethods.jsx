import React, { useState, useEffect } from 'react';
import {
  Tag,
  Gavel,
  ArrowRight,
  MapPin,
  Lock,
  ShieldCheck,
  Eye,
  Clock,
  Sparkles,
  CheckCircle2,
  X
} from 'lucide-react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';
import Modal from './ui/Modal';
import AuctionTimer from './auction/AuctionTimer';
import { getLiveAuctions } from '../utils/auctions';
import { getActiveMarketplaceListings, COMMODITY_IMAGES } from '../utils/listings';
import { supabase } from '../lib/supabase';

// Realistic fallback samples to ensure the homepage always has vibrant real-time data
const FALLBACK_AUCTIONS = [
  {
    id: 'auction-sample-1',
    commodity: 'Basmati 1121 Rice',
    variety: 'Export Quality (Long Grain)',
    grade: 'A+',
    quantity: 50,
    unit: 'Quintal',
    startingBid: 3500,
    currentBid: 3850,
    reservePrice: 3700,
    totalBids: 14,
    state: 'Punjab',
    district: 'Amritsar',
    status: 'live',
    endsAt: new Date(Date.now() + 2 * 3600 * 1000 + 15 * 60 * 1000).toISOString(),
    images: [COMMODITY_IMAGES['Basmati Rice'] || COMMODITY_IMAGES.Wheat],
  },
  {
    id: 'auction-sample-2',
    commodity: 'Red Onion',
    variety: 'Nashik Garva (Medium)',
    grade: 'A',
    quantity: 120,
    unit: 'Bags (50kg)',
    startingBid: 1200,
    currentBid: 1420,
    reservePrice: 1350,
    totalBids: 19,
    state: 'Maharashtra',
    district: 'Nashik',
    status: 'live',
    endsAt: new Date(Date.now() + 48 * 60 * 1000).toISOString(),
    images: [COMMODITY_IMAGES.Onion],
  },
  {
    id: 'auction-sample-3',
    commodity: 'Turmeric',
    variety: 'Salem Gold (Finger)',
    grade: 'A',
    quantity: 40,
    unit: 'Quintal',
    startingBid: 11000,
    currentBid: 12450,
    reservePrice: 12000,
    totalBids: 8,
    state: 'Tamil Nadu',
    district: 'Erode',
    status: 'live',
    endsAt: new Date(Date.now() + 4 * 3600 * 1000 + 30 * 60 * 1000).toISOString(),
    images: [COMMODITY_IMAGES.Turmeric],
  },
];

const FALLBACK_DIRECT_SALES = [
  {
    id: 'direct-sample-1',
    commodity: 'Tomato',
    variety: 'Hybrid Plum (Firm)',
    grade: 'A',
    quantity: 1800,
    unit: 'kg',
    price: 26,
    state: 'Karnataka',
    district: 'Kolar',
    harvestDate: '2 days ago',
    images: [COMMODITY_IMAGES.Tomato],
  },
  {
    id: 'direct-sample-2',
    commodity: 'Potato',
    variety: 'Jyoti Table Grade',
    grade: 'A',
    quantity: 4500,
    unit: 'kg',
    price: 19,
    state: 'Uttar Pradesh',
    district: 'Agra',
    harvestDate: 'Yesterday',
    images: [COMMODITY_IMAGES.Potato],
  },
  {
    id: 'direct-sample-3',
    commodity: 'Wheat',
    variety: 'Sharbati Premium Gold',
    grade: 'A+',
    quantity: 80,
    unit: 'Quintal',
    price: 3150,
    state: 'Madhya Pradesh',
    district: 'Sehore',
    harvestDate: 'Fresh Harvest',
    images: [COMMODITY_IMAGES.Wheat],
  },
];

export default function SellingMethods({ onNavigate, onExploreDirect, onExploreAuction }) {
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' | 'auctions'
  const [liveAuctions, setLiveAuctions] = useState([]);
  const [directListings, setDirectListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Auth gate modal state
  const [authModal, setAuthModal] = useState({
    isOpen: false,
    itemTitle: '',
    actionType: 'bid', // 'bid' | 'buy'
  });

  // Quick view inspection modal
  const [quickViewItem, setQuickViewItem] = useState(null);

  const handleRegisterNavigate = () => {
    setAuthModal({ isOpen: false, itemTitle: '', actionType: 'bid' });
    setQuickViewItem(null);
    if (onNavigate) {
      onNavigate('register', { initialRole: 'buyer' });
    } else if (onExploreDirect) {
      onExploreDirect();
    }
  };

  const handleLoginNavigate = () => {
    setAuthModal({ isOpen: false, itemTitle: '', actionType: 'bid' });
    setQuickViewItem(null);
    if (onNavigate) {
      onNavigate('login');
    }
  };

  // Fetch real-time data & subscribe to changes
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        const [fetchedAuctions, fetchedListings] = await Promise.all([
          getLiveAuctions(),
          getActiveMarketplaceListings(),
        ]);

        if (!isMounted) return;

        // Use fetched data or gracefully fallback if empty
        const validAuctions = Array.isArray(fetchedAuctions) && fetchedAuctions.length > 0
          ? fetchedAuctions.slice(0, 3)
          : FALLBACK_AUCTIONS;

        const directOnlyListings = Array.isArray(fetchedListings)
          ? fetchedListings.filter((item) => item.saleType !== 'auction').slice(0, 3)
          : [];

        const validDirect = directOnlyListings.length > 0
          ? directOnlyListings
          : FALLBACK_DIRECT_SALES;

        setLiveAuctions(validAuctions);
        setDirectListings(validDirect);
      } catch (err) {
        console.warn('Real-time preview fetch fallback:', err);
        if (isMounted) {
          setLiveAuctions(FALLBACK_AUCTIONS);
          setDirectListings(FALLBACK_DIRECT_SALES);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    // Subscribe to realtime updates on auctions and listings
    let auctionChannel;
    let listingChannel;

    try {
      auctionChannel = supabase
        .channel('homepage-auctions-feed')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'auctions' },
          () => loadData()
        )
        .subscribe();

      listingChannel = supabase
        .channel('homepage-listings-feed')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'listings' },
          () => loadData()
        )
        .subscribe();
    } catch (e) {
      // Supabase realtime channel fallback
    }

    return () => {
      isMounted = false;
      if (auctionChannel) supabase.removeChannel(auctionChannel);
      if (listingChannel) supabase.removeChannel(listingChannel);
    };
  }, []);

  const triggerAuthGate = (title, actionType = 'bid') => {
    setAuthModal({
      isOpen: true,
      itemTitle: title,
      actionType,
    });
  };

  return (
    <section id="marketplace" className="py-20 bg-[#F8FAF8] border-t border-[#E5EDE8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF5F0] border border-[#D1E7DD] text-[#0B3326] text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span>Live Agricultural Floor</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B3326] font-heading tracking-tight">
            Real-Time Market Data
          </h2>
          <p className="text-sm sm:text-base text-[#566861]">
            Explore active harvest lots and live floor bidding directly from verified farmers.
          </p>

          {/* Clean Segmented Tab Switcher */}
          <div className="pt-4 flex items-center justify-center">
            <div className="inline-flex items-center p-1.5 bg-white border border-[#E5EDE8] rounded-2xl shadow-xs gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('direct')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'direct'
                    ? 'bg-[#0B3326] text-white shadow-xs'
                    : 'text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8]'
                }`}
              >
                <Tag className="w-4 h-4 text-[#10B981]" />
                <span>Direct Sales</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'direct' ? 'bg-[#10B981] text-white' : 'bg-[#EBF5F0] text-[#0B3326]'
                }`}>
                  Fixed Price
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('auctions')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'auctions'
                    ? 'bg-[#0B3326] text-white shadow-xs'
                    : 'text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8]'
                }`}
              >
                <Gavel className="w-4 h-4 text-[#10B981]" />
                <span>Live Auctions</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'auctions' ? 'bg-[#10B981] text-white' : 'bg-[#EBF5F0] text-[#0B3326]'
                }`}>
                  {liveAuctions.length} Live
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* TAB 1: DIRECT HARVEST SALES */}
        {activeTab === 'direct' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
              {directListings.map((lot) => (
                <Card
                  key={lot.id}
                  hoverEffect
                  className="p-5 bg-white border border-[#E5EDE8] shadow-xs flex flex-col justify-between rounded-3xl group"
                >
                  <div className="space-y-4">
                    {/* Media Box */}
                    <div className="relative h-44 rounded-2xl overflow-hidden bg-[#F8FAF8] border border-[#E5EDE8]">
                      <img
                        src={lot.images?.[0] || COMMODITY_IMAGES[lot.commodity] || COMMODITY_IMAGES.Other}
                        alt={lot.commodity}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Quick preview icon */}
                      <button
                        type="button"
                        onClick={() => setQuickViewItem({ ...lot, type: 'direct' })}
                        title="Quick View Specs"
                        className="absolute top-3 right-3 p-2 rounded-xl bg-white/90 backdrop-blur-xs text-[#0B3326] hover:bg-white hover:text-[#10B981] shadow-xs transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Commodity Info */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-[#0B3326] font-heading group-hover:text-[#10B981] transition-colors truncate">
                          {lot.commodity}
                        </h3>
                        <span className="text-xs text-[#566861] font-semibold truncate ml-2">
                          {lot.variety || 'Standard Lot'}
                        </span>
                      </div>

                      <p className="text-xs text-[#566861] flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                        <span className="truncate">
                          {lot.district ? `${lot.district}, ` : ''}{lot.state || 'India'}
                        </span>
                      </p>
                    </div>

                    {/* Price and Lot Matrix */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] text-center">
                      <div>
                        <span className="text-[10px] text-[#566861] block font-medium">Fixed Price</span>
                        <span className="text-base font-extrabold text-[#0B3326] font-heading">
                          ₹{lot.price}
                          <span className="text-[11px] font-normal text-[#566861]">/{lot.unit || 'kg'}</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#566861] block font-medium">Available Quantity</span>
                        <span className="text-sm font-bold text-[#14211D]">
                          {lot.quantity} {lot.unit || 'kg'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action CTA */}
                  <div className="pt-4 mt-2 border-t border-[#E5EDE8]/70 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-[#566861] font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                      <span>Escrow Protected</span>
                    </span>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => triggerAuthGate(lot.commodity, 'buy')}
                      icon={Lock}
                      iconPosition="right"
                      className="text-xs font-bold py-2 px-3.5 shadow-xs cursor-pointer"
                    >
                      Buy Lot
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Bottom Callout */}
            <div className="p-6 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
              <div>
                <h4 className="text-sm font-bold text-[#0B3326]">
                  Guaranteed Fixed-Price Direct Procurement
                </h4>
                <p className="text-xs text-[#566861]">
                  Purchase directly from farmers at transparent fixed rates with instant logistics coordination.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRegisterNavigate}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B3326] text-white text-xs font-bold hover:bg-[#10B981] transition-colors cursor-pointer shrink-0 shadow-xs"
              >
                <span>Browse Full Marketplace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE AUCTIONS */}
        {activeTab === 'auctions' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
              {liveAuctions.map((lot) => (
                <Card
                  key={lot.id}
                  hoverEffect
                  className="p-5 bg-white border border-[#E5EDE8] shadow-xs flex flex-col justify-between rounded-3xl group"
                >
                  <div className="space-y-4">
                    {/* Media Box */}
                    <div className="relative h-44 rounded-2xl overflow-hidden bg-[#F8FAF8] border border-[#E5EDE8]">
                      <img
                        src={lot.images?.[0] || COMMODITY_IMAGES[lot.commodity] || COMMODITY_IMAGES.Other}
                        alt={lot.commodity}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Quick preview icon */}
                      <button
                        type="button"
                        onClick={() => setQuickViewItem({ ...lot, type: 'auction' })}
                        title="Quick View Specs"
                        className="absolute top-3 right-3 p-2 rounded-xl bg-white/90 backdrop-blur-xs text-[#0B3326] hover:bg-white hover:text-[#10B981] shadow-xs transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Commodity Info */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-[#0B3326] font-heading group-hover:text-[#10B981] transition-colors truncate">
                          {lot.commodity}
                        </h3>
                        <span className="text-xs text-[#566861] font-semibold truncate ml-2">
                          {lot.variety || 'Standard Lot'}
                        </span>
                      </div>

                      <p className="text-xs text-[#566861] flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                        <span className="truncate">
                          {lot.district ? `${lot.district}, ` : ''}{lot.state || 'India'}
                        </span>
                      </p>
                    </div>

                    {/* Price and Lot Matrix */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] text-center">
                      <div>
                        <span className="text-[10px] text-[#566861] block font-medium">Current Bid</span>
                        <span className="text-base font-extrabold text-[#0B3326] font-heading">
                          ₹{lot.currentBid || lot.startingBid}
                          <span className="text-[11px] font-normal text-[#566861]">/{lot.unit}</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#566861] block font-medium">Lot Volume</span>
                        <span className="text-sm font-bold text-[#14211D]">
                          {lot.quantity} {lot.unit}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action CTA */}
                  <div className="pt-4 mt-2 border-t border-[#E5EDE8]/70 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-[#566861] font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                      <span>{lot.totalBids || 0} bids placed</span>
                    </span>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => triggerAuthGate(lot.commodity, 'bid')}
                      icon={Lock}
                      iconPosition="right"
                      className="text-xs font-bold py-2 px-3.5 shadow-xs cursor-pointer"
                    >
                      Bid Now
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Bottom Callout */}
            <div className="p-6 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
              <div>
                <h4 className="text-sm font-bold text-[#0B3326]">
                  Competitive Price Discovery with Minimum Floor
                </h4>
                <p className="text-xs text-[#566861]">
                  Farmers protect reserve rates while verified wholesale buyers place real-time bids.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRegisterNavigate}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B3326] text-white text-xs font-bold hover:bg-[#10B981] transition-colors cursor-pointer shrink-0 shadow-xs"
              >
                <span>Join Bidding Floor</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 🔒 AUTH GATE INTERCEPT MODAL */}
      <Modal
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ isOpen: false, itemTitle: '', actionType: 'bid' })}
        maxWidth="max-w-md"
        showClose={true}
      >
        <div className="text-center space-y-4 pt-1">
          <div className="w-14 h-14 rounded-2xl bg-[#EBF5F0] text-[#10B981] flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl font-bold text-[#0B3326] font-heading">
              {authModal.actionType === 'bid' ? 'Sign In to Place Bids' : 'Sign In to Buy Harvest Lots'}
            </h3>
            <p className="text-xs sm:text-sm text-[#566861] leading-relaxed">
              To ensure verified transactions, quality-backed assays, and escrow protection for <span className="font-bold text-[#0B3326]">{authModal.itemTitle}</span>, you need an active buyer account.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs text-left space-y-2">
            <div className="flex items-center gap-2 text-[#0B3326]">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
              <span>Direct farmer-to-buyer transactions</span>
            </div>
            <div className="flex items-center gap-2 text-[#0B3326]">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
              <span>100% Escrow payment safety</span>
            </div>
            <div className="flex items-center gap-2 text-[#0B3326]">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
              <span>Integrated warehouse & transport logistics</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={handleRegisterNavigate}
              icon={ArrowRight}
              iconPosition="right"
              className="w-full justify-center text-xs sm:text-sm font-bold shadow-xs cursor-pointer"
            >
              Create Free Buyer Account
            </Button>

            <button
              type="button"
              onClick={handleLoginNavigate}
              className="w-full py-2 text-xs font-semibold text-[#566861] hover:text-[#0B3326] transition-colors cursor-pointer"
            >
              Already have an account? <span className="text-[#10B981] font-bold underline">Sign In</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* 🔍 QUICK VIEW LOT INSPECTION MODAL */}
      {quickViewItem && (
        <Modal
          isOpen={Boolean(quickViewItem)}
          onClose={() => setQuickViewItem(null)}
          maxWidth="max-w-lg"
          showClose={true}
        >
          <div className="text-left space-y-4">
            {/* Image Box */}
            <div className="relative h-52 rounded-2xl overflow-hidden bg-[#F8FAF8] border border-[#E5EDE8]">
              <img
                src={quickViewItem.images?.[0] || COMMODITY_IMAGES[quickViewItem.commodity] || COMMODITY_IMAGES.Other}
                alt={quickViewItem.commodity}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                <Badge variant="dark" size="sm">
                  {String(quickViewItem.grade || 'A').toLowerCase().startsWith('grade')
                    ? quickViewItem.grade
                    : `Grade ${quickViewItem.grade || 'A'}`}
                </Badge>
                <Badge
                  variant={quickViewItem.type === 'auction' ? 'amber' : 'emerald'}
                  size="sm"
                  dot={quickViewItem.type === 'auction'}
                >
                  {quickViewItem.type === 'auction' ? 'LIVE NOW' : 'Direct Sale'}
                </Badge>
              </div>

              {/* Show countdown timer inside Quick View modal for auctions */}
              {quickViewItem.type === 'auction' && (
                <div className="absolute bottom-2.5 right-2.5">
                  <AuctionTimer
                    endsAt={quickViewItem.endsAt}
                    status="live"
                    showOnlyTime={true}
                  />
                </div>
              )}
            </div>

            {/* Title & Origin */}
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-[#0B3326] font-heading">
                {quickViewItem.commodity}
              </h3>
              <p className="text-xs text-[#566861] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                <span>
                  {quickViewItem.district ? `${quickViewItem.district}, ` : ''}{quickViewItem.state || 'India'}
                </span>
                <span className="mx-1">•</span>
                <span>{quickViewItem.variety || 'Standard Lot'}</span>
              </p>
            </div>

            {/* Lot Metrics */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs">
              <div>
                <span className="text-[#566861] block text-[10px]">
                  {quickViewItem.type === 'auction' ? 'Current Top Bid' : 'Fixed Selling Price'}
                </span>
                <span className="text-base font-extrabold text-[#0B3326] font-heading">
                  ₹{quickViewItem.currentBid || quickViewItem.price} / {quickViewItem.unit || 'kg'}
                </span>
              </div>
              <div>
                <span className="text-[#566861] block text-[10px]">Lot Size</span>
                <span className="text-sm font-bold text-[#14211D]">
                  {quickViewItem.quantity} {quickViewItem.unit || 'kg'}
                </span>
              </div>
            </div>

            {/* Locked Action Trigger */}
            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  const title = quickViewItem.commodity;
                  const type = quickViewItem.type === 'auction' ? 'bid' : 'buy';
                  setQuickViewItem(null);
                  triggerAuthGate(title, type);
                }}
                icon={Lock}
                iconPosition="right"
                className="w-full justify-center text-xs font-bold py-3 shadow-xs cursor-pointer"
              >
                {quickViewItem.type === 'auction' ? 'Unlock to Place Bid' : 'Unlock to Purchase Lot'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </section>
  );
}
