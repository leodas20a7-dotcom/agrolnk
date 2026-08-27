import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import MarketplaceCard from '../../components/buyer/MarketplaceCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import {
  Search,
  Filter,
  ArrowLeft,
  ShoppingBag,
  SlidersHorizontal,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { getActiveMarketplaceListings } from '../../utils/listings';

export default function Marketplace({ currentUser, onNavigate, navState }) {
  const user = currentUser || { name: 'Ananya Agro', role: 'buyer' };
  const [allListings, setAllListings] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState(navState?.initialQuery || '');
  const [selectedCommodity, setSelectedCommodity] = useState(navState?.initialCommodity || 'All');
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState(navState?.initialLocation || 'All');
  const [sortBy, setSortBy] = useState('latest');

  useEffect(() => {
    const activeLots = getActiveMarketplaceListings();
    setAllListings(activeLots);
  }, []);

  const commodities = ['All', 'Tomato', 'Potato', 'Onion', 'Apple', 'Wheat', 'Maize'];
  const grades = ['All', 'A', 'B', 'C'];
  const locations = ['All', 'Tamil Nadu', 'Maharashtra', 'Madhya Pradesh', 'Himachal Pradesh'];

  // Filter listings
  const filteredListings = allListings.filter((lot) => {
    const matchesSearch =
      searchQuery === '' ||
      lot.commodity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.variety?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.district?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCommodity =
      selectedCommodity === 'All' ||
      lot.commodity.toLowerCase() === selectedCommodity.toLowerCase();

    const matchesGrade =
      selectedGrade === 'All' || lot.grade === selectedGrade;

    const matchesLocation =
      selectedLocation === 'All' ||
      lot.state.toLowerCase().includes(selectedLocation.toLowerCase());

    return matchesSearch && matchesCommodity && matchesGrade && matchesLocation;
  });

  // Sort listings
  const sortedListings = [...filteredListings].sort((a, b) => {
    if (sortBy === 'price-low') return Number(a.price) - Number(b.price);
    if (sortBy === 'price-high') return Number(b.price) - Number(a.price);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCommodity('All');
    setSelectedGrade('All');
    setSelectedLocation('All');
    setSortBy('latest');
  };

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={() => onNavigate('buyer-dashboard')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#566861] hover:text-[#0B3326] transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              Marketplace
            </h1>
            <p className="text-xs sm:text-sm text-[#566861]">
              Discover and procure fresh verified produce directly from local farmers and cooperatives.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('buyer-orders')}
            icon={ShoppingBag}
            iconPosition="left"
            className="text-xs font-bold shrink-0"
          >
            My Orders
          </Button>
        </div>

        {/* Search & Filter Bar */}
        <Card className="p-5 bg-white border border-[#E5EDE8] shadow-xs space-y-4">
          
          {/* Main Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#566861]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by commodity, variety, region..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5EDE8] text-sm text-[#14211D] placeholder:text-[#566861]/50 focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all"
            />
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            
            {/* Commodity Filter */}
            <div>
              <label className="block text-[11px] font-bold text-[#566861] mb-1">
                Commodity
              </label>
              <select
                value={selectedCommodity}
                onChange={(e) => setSelectedCommodity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5EDE8] text-xs font-semibold text-[#14211D] bg-white focus:outline-none focus:ring-2 focus:ring-[#10B981] transition-all cursor-pointer"
              >
                {commodities.map((c) => (
                  <option key={c} value={c}>
                    {c === 'All' ? 'All Commodities' : c}
                  </option>
                ))}
              </select>
            </div>

            {/* Quality Grade Filter */}
            <div>
              <label className="block text-[11px] font-bold text-[#566861] mb-1">
                Quality Grade
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5EDE8] text-xs font-semibold text-[#14211D] bg-white focus:outline-none focus:ring-2 focus:ring-[#10B981] transition-all cursor-pointer"
              >
                {grades.map((g) => (
                  <option key={g} value={g}>
                    {g === 'All' ? 'All Grades' : `Grade ${g}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Location / State Filter */}
            <div>
              <label className="block text-[11px] font-bold text-[#566861] mb-1">
                Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5EDE8] text-xs font-semibold text-[#14211D] bg-white focus:outline-none focus:ring-2 focus:ring-[#10B981] transition-all cursor-pointer"
              >
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc === 'All' ? 'All Locations' : loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Filter */}
            <div>
              <label className="block text-[11px] font-bold text-[#566861] mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5EDE8] text-xs font-semibold text-[#14211D] bg-white focus:outline-none focus:ring-2 focus:ring-[#10B981] transition-all cursor-pointer"
              >
                <option value="latest">Newest Lots</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>

          </div>

        </Card>

        {/* Results Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#0B3326] font-heading">
              Available Lots
            </span>
            <Badge variant="emerald" size="sm">
              {sortedListings.length} {sortedListings.length === 1 ? 'result' : 'results'}
            </Badge>
          </div>

          {(selectedCommodity !== 'All' || selectedGrade !== 'All' || selectedLocation !== 'All' || searchQuery !== '') && (
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-[#10B981] hover:text-[#0B3326] flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
            </button>
          )}
        </div>

        {/* Listings Grid */}
        {sortedListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedListings.map((item) => (
              <MarketplaceCard
                key={item.id}
                listing={item}
                onSelect={(lot) =>
                  onNavigate('buyer-listing-detail', { listing: lot })
                }
              />
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center border-2 border-dashed border-[#E5EDE8] rounded-3xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center mx-auto">
              <Search className="w-6 h-6 text-[#10B981]" />
            </div>
            <h3 className="text-base font-bold text-[#0B3326] font-heading">
              No matching produce found
            </h3>
            <p className="text-xs text-[#566861] max-w-sm mx-auto">
              Try adjusting your search terms or resetting filters to see all available lots.
            </p>
            <div className="pt-2">
              <Button variant="secondary" size="sm" onClick={resetFilters}>
                Reset All Filters
              </Button>
            </div>
          </Card>
        )}

      </div>
    </DashboardLayout>
  );
}
