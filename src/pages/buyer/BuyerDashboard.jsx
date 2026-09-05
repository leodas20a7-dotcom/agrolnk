import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import MarketplaceCard from '../../components/buyer/MarketplaceCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import {
  Search,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Compass,
  Package,
  Gavel,
  CreditCard,
  Truck,
  MapPin,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { getActiveMarketplaceListings } from '../../utils/listings';
import { getLiveAuctions } from '../../utils/auctions';
import { getBuyerOrders } from '../../utils/orders';
import { getBuyerFinancingRequests } from '../../utils/financing';
import { getBuyerDeliveries } from '../../utils/deliveries';
import { getTimeGreeting } from '../../utils/greeting';

export default function BuyerDashboard({ currentUser, onNavigate }) {
  const user = currentUser || { name: 'Ananya Agro', id: 'usr_buyer_02', role: 'buyer' };
  const [listings, setListings] = useState([]);
  const [liveAuctions, setLiveAuctions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [financingRequests, setFinancingRequests] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const sliderRef = useRef(null);

  const scrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -240, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 240, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadAll = async () => {
      try {
        const [activeLots, auctions, orderData, financingData, deliveryData] = await Promise.all([
          getActiveMarketplaceListings(),
          getLiveAuctions(),
          getBuyerOrders(user.id),
          getBuyerFinancingRequests(user.id),
          getBuyerDeliveries(user.id),
        ]);

        if (isMounted) {
          setListings(activeLots || []);
          setLiveAuctions(auctions || []);
          setOrders(orderData || []);
          setFinancingRequests(financingData || []);
          setDeliveries(deliveryData || []);
        }
      } catch (err) {
        console.error('Error loading buyer dashboard:', err);
      }
    };

    loadAll();
    return () => {
      isMounted = false;
    };
  }, [user.id]);

  const safeListings = Array.isArray(listings) ? listings : [];
  const totalKg = safeListings.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

  const commodities = [
    { name: 'Tomato', emoji: '🍅', label: 'Tomatoes' },
    { name: 'Potato', emoji: '🥔', label: 'Potatoes' },
    { name: 'Onion', emoji: '🧅', label: 'Onions' },
    { name: 'Apple', emoji: '🍎', label: 'Apples' },
    { name: 'Wheat', emoji: '🌾', label: 'Wheat' },
    { name: 'Maize', emoji: '🌽', label: 'Maize' },
    { name: 'Turmeric', emoji: '🌿', label: 'Turmeric' },
    { name: 'Cotton', emoji: '☁️', label: 'Cotton' },
    { name: 'Rice', emoji: '🍚', label: 'Basmati Rice' },
    { name: 'Chilli', emoji: '🌶️', label: 'Red Chilli' },
    { name: 'Soybean', emoji: '🫘', label: 'Soybeans' },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onNavigate('buyer-marketplace', {
      initialQuery: searchQuery,
      initialLocation: selectedLocation,
    });
  };

  const handleCommodityClick = (commodityName) => {
    onNavigate('buyer-marketplace', { initialCommodity: commodityName });
  };

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* Welcome Header with 2-in-1 Smart Search Bar */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-md space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F4A37] text-xs font-semibold text-[#34D399] border border-[#14624A]">
                <ShoppingBag className="w-3.5 h-3.5" /> Buyer Procurement Portal
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-white tracking-tight">
                {getTimeGreeting(user.name).fullGreeting} {getTimeGreeting().emoji}
              </h1>
              <p className="text-sm sm:text-base text-[#DCFCE7]/90 leading-relaxed font-normal">
                Find the produce your business needs directly from verified farmers across India.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto shrink-0">
              <Button
                variant="secondary"
                size="md"
                onClick={() => onNavigate('buyer-deliveries')}
                icon={Truck}
                iconPosition="left"
                className="py-2.5 px-3.5 font-bold shadow-xs text-xs border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white cursor-pointer justify-center shrink-0"
              >
                Inbound Deliveries ({deliveries.length})
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => onNavigate('buyer-financing')}
                icon={CreditCard}
                iconPosition="left"
                className="py-2.5 px-3.5 font-bold shadow-xs text-xs border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white cursor-pointer justify-center shrink-0"
              >
                Trade Credit ({financingRequests.length})
              </Button>
              <Button
                variant="accent"
                size="md"
                onClick={() => onNavigate('buyer-orders')}
                icon={ShoppingBag}
                iconPosition="left"
                className="py-2.5 px-4 font-bold shadow-xs text-xs cursor-pointer justify-center shrink-0"
              >
                My Orders ({orders.length})
              </Button>
            </div>
          </div>

          {/* 2-in-1 Smart Search (Crop Name + District/State Filter) */}
          <div className="space-y-3 pt-1">
            <form
              onSubmit={handleSearchSubmit}
              className="bg-white p-2 rounded-2xl sm:rounded-3xl shadow-lg border border-[#E5EDE8] flex flex-col md:flex-row items-stretch md:items-center gap-2"
            >
              {/* Part 1: Crop Name Input */}
              <div className="flex-1 flex items-center gap-3 px-3 py-1.5">
                <Search className="w-5 h-5 text-[#10B981] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search produce (e.g. Tomato, Sharbati Wheat, Potato)..."
                  className="w-full text-[#14211D] placeholder:text-[#566861]/70 text-sm font-medium focus:outline-none bg-transparent"
                />
              </div>

              {/* Vertical Divider */}
              <div className="hidden md:block w-px h-8 bg-[#E5EDE8]" />

              {/* Part 2: Location Dropdown */}
              <div className="flex items-center gap-2 px-3 py-1.5 border-t md:border-t-0 border-[#E5EDE8]/60 md:w-60 shrink-0">
                <MapPin className="w-4 h-4 text-[#10B981] shrink-0" />
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full text-xs font-semibold text-[#0B3326] bg-transparent focus:outline-none cursor-pointer py-1"
                >
                  <option value="All">All Regions / States</option>
                  <option value="Tamil Nadu">Tamil Nadu (Salem/Dindigul)</option>
                  <option value="Maharashtra">Maharashtra (Nashik/Pune)</option>
                  <option value="Madhya Pradesh">Madhya Pradesh (Sehore)</option>
                  <option value="Himachal Pradesh">Himachal Pradesh (Shimla)</option>
                  <option value="Punjab">Punjab</option>
                  <option value="Karnataka">Karnataka</option>
                </select>
              </div>

              {/* Part 3: Search Button */}
              <button
                type="submit"
                className="px-6 py-3 bg-[#0B3326] hover:bg-[#10B981] text-white text-xs font-bold rounded-xl sm:rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 shadow-xs cursor-pointer shrink-0"
              >
                <span>Find Lots</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Live Auctions Banner Callout */}
        <Card className="p-6 bg-gradient-to-r from-[#FEF3C7]/80 to-[#F2FBF6] border border-[#FDE68A] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#D97706] text-white flex items-center justify-center shadow-xs">
              <Gavel className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#92400E] uppercase tracking-wider block">
                Competitive Bidding Exchange
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl font-extrabold text-[#0B3326] font-heading">
                  {liveAuctions.length} Live Auctions Active
                </span>
                <span className="text-xs font-semibold text-[#D97706]">
                  • Real-Time Clocks
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('buyer-my-bids')}
              className="text-xs font-bold bg-white"
            >
              My Bids
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('buyer-live-auctions')}
              icon={ArrowRight}
              iconPosition="right"
              className="text-xs font-bold"
            >
              Join Live Auctions
            </Button>
          </div>
        </Card>

        {/* Available Produce Banner */}
        <Card className="p-6 bg-white border border-[#E5EDE8] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center">
              <Compass className="w-6 h-6 text-[#10B981]" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#566861] uppercase tracking-wider block">
                Direct Produce Catalog
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-extrabold text-[#0B3326] font-heading">
                  {totalKg.toLocaleString('en-IN')} kg
                </span>
                <span className="text-xs font-semibold text-[#10B981]">
                  • {listings.length} Fixed-Price Lots
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('buyer-marketplace')}
            icon={ArrowRight}
            iconPosition="right"
            className="text-xs font-bold"
          >
            Explore Catalog
          </Button>
        </Card>

        {/* Browse by Commodity Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0B3326] font-heading">
              Browse by commodity
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={scrollLeft}
                aria-label="Previous commodities"
                className="w-8 h-8 rounded-xl bg-white border border-[#E5EDE8] hover:border-[#10B981] hover:bg-[#F2FBF6] text-[#0B3326] flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
              >
                <ChevronLeft className="w-4 h-4 text-[#0B3326]" />
              </button>
              <button
                type="button"
                onClick={scrollRight}
                aria-label="Next commodities"
                className="w-8 h-8 rounded-xl bg-white border border-[#E5EDE8] hover:border-[#10B981] hover:bg-[#F2FBF6] text-[#0B3326] flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
              >
                <ChevronRight className="w-4 h-4 text-[#0B3326]" />
              </button>
            </div>
          </div>

          <div className="relative group">
            {/* Left Inline Floating Arrow */}
            <button
              type="button"
              onClick={scrollLeft}
              aria-label="Scroll left"
              className="absolute -left-3 sm:-left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-[#E5EDE8] hover:border-[#10B981] text-[#0B3326] shadow-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 text-[#0B3326]" />
            </button>

            {/* Scrollable Commodity Track */}
            <div
              ref={sliderRef}
              className="flex items-center gap-3.5 overflow-x-auto scroll-smooth py-2 px-1 snap-x snap-mandatory"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {commodities.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handleCommodityClick(item.name)}
                  className="shrink-0 w-36 sm:w-44 p-4 rounded-2xl bg-white border border-[#E5EDE8] hover:border-[#10B981] hover:bg-[#F2FBF6] hover:shadow-xs transition-all text-center group/card cursor-pointer snap-start"
                >
                  <span className="text-3xl block mb-1.5 transform group-hover/card:scale-110 transition-transform">
                    {item.emoji}
                  </span>
                  <span className="text-xs font-bold text-[#14211D] group-hover/card:text-[#0B3326] block truncate">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Right Inline Floating Arrow */}
            <button
              type="button"
              onClick={scrollRight}
              aria-label="Scroll right"
              className="absolute -right-3 sm:-right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-[#E5EDE8] hover:border-[#10B981] text-[#0B3326] shadow-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5 text-[#0B3326]" />
            </button>
          </div>
        </div>

        {/* Recommended Produce Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0B3326] font-heading flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#10B981]" /> Recommended Direct Lots
            </h2>
            <button
              onClick={() => onNavigate('buyer-marketplace')}
              className="text-xs font-bold text-[#0B3326] hover:text-[#10B981] transition-colors"
            >
              View All →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.slice(0, 3).map((item) => (
              <MarketplaceCard
                key={item.id}
                listing={item}
                onSelect={(lot) => onNavigate('buyer-listing-detail', { listing: lot })}
              />
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
