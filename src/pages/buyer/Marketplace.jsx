import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import MarketplaceCard from '../../components/buyer/MarketplaceCard';
import MarketplaceRow from '../../components/buyer/MarketplaceRow';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import SearchableSelect from '../../components/ui/SearchableSelect';
import Pagination from '../../components/ui/Pagination';
import ViewModeToggle from '../../components/ui/ViewModeToggle';
import {
  Search,
  Filter,
  ArrowLeft,
  ShoppingBag,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Lock,
  Clock,
  AlertCircle,
  Gavel,
  X,
  Check
} from 'lucide-react';
import { getActiveMarketplaceListings, getPlatformCommodities, fetchRemoteCommodities } from '../../utils/listings';
import { getVarietiesForCommodity } from '../../data/commodityTaxonomy';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';
import { getResolvedUserKycStatus, fetchCurrentProfile, getCurrentUser } from '../../utils/auth';
import VerificationRequiredModal from '../../components/verification/VerificationRequiredModal';

export default function Marketplace({ currentUser, onNavigate, navState }) {
  const user = currentUser || { name: 'Buyer', id: '', role: 'buyer' };
  const effectiveRole = user?.role || 'buyer';
  const isFoodProcessor = effectiveRole === 'food_processor' || effectiveRole === 'processor';
  const dashboardTarget = isFoodProcessor ? 'food-processor-dashboard' : 'buyer-dashboard';
  const [allListings, setAllListings] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState(navState?.initialQuery || '');
  const [selectedCommodity, setSelectedCommodity] = useState(navState?.initialCommodity || 'All');
  const [selectedVariety, setSelectedVariety] = useState('All');
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState(navState?.initialLocation || 'All');
  const [sortBy, setSortBy] = useState('latest');
  const [availableCommodities, setAvailableCommodities] = useState(() => ['All', ...getPlatformCommodities()]);
  const [viewMode, setViewMode] = useState('row'); // 'grid' | 'row'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const [currentKycStatus, setCurrentKycStatus] = useState(() => getResolvedUserKycStatus(user));
  const isVerified = currentKycStatus === 'verified';
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  // Mobile Filter Overlay State
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState({
    commodity: 'All',
    grade: 'All',
    location: 'All',
    sortBy: 'latest',
    variety: 'All'
  });

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCommodity !== 'All') count++;
    if (selectedVariety !== 'All') count++;
    if (selectedGrade !== 'All') count++;
    if (selectedLocation !== 'All') count++;
    if (sortBy !== 'latest') count++;
    return count;
  }, [selectedCommodity, selectedVariety, selectedGrade, selectedLocation, sortBy]);

  const openMobileFilters = () => {
    setTempFilters({
      commodity: selectedCommodity,
      grade: selectedGrade,
      location: selectedLocation,
      sortBy: sortBy,
      variety: selectedVariety
    });
    setIsMobileFilterOpen(true);
  };

  const handleSaveMobileFilters = () => {
    setSelectedCommodity(tempFilters.commodity);
    setSelectedGrade(tempFilters.grade);
    setSelectedLocation(tempFilters.location);
    setSortBy(tempFilters.sortBy);
    setSelectedVariety(tempFilters.variety);
    setIsMobileFilterOpen(false);
  };

  const handleResetMobileFilters = () => {
    setTempFilters({
      commodity: 'All',
      grade: 'All',
      location: 'All',
      sortBy: 'latest',
      variety: 'All'
    });
  };

  const tempVarieties = useMemo(() => {
    if (!tempFilters.commodity || tempFilters.commodity === 'All') return [];
    const vars = getVarietiesForCommodity(tempFilters.commodity);
    return ['All', ...vars];
  }, [tempFilters.commodity]);

  useEffect(() => {
    const syncKyc = async () => {
      const status = getResolvedUserKycStatus(user);
      setCurrentKycStatus(status);
      try {
        const profile = await fetchCurrentProfile();
        if (profile?.kycStatus) {
          setCurrentKycStatus(profile.kycStatus);
        }
      } catch {}
    };

    syncKyc();

    window.addEventListener('agrolnk_kyc_updated', syncKyc);
    window.addEventListener('storage', syncKyc);
    window.addEventListener('agrolnk_user_profile_updated', syncKyc);
    return () => {
      window.removeEventListener('agrolnk_kyc_updated', syncKyc);
      window.removeEventListener('storage', syncKyc);
      window.removeEventListener('agrolnk_user_profile_updated', syncKyc);
    };
  }, [user.id, user.email]);

  useEffect(() => {
    let isMounted = true;
    showGlobalLoader('Loading Verified Produce Lots...', 'Fetching active farmgate commodities & assay parameters...');
    const fetchListings = async () => {
      try {
        const [activeLots, fetchedCommodities] = await Promise.all([
          getActiveMarketplaceListings(),
          fetchRemoteCommodities()
        ]);
        if (isMounted) {
          setAllListings(activeLots || []);
          if (fetchedCommodities && fetchedCommodities.length > 0) {
            setAvailableCommodities(['All', ...fetchedCommodities]);
          }
        }
      } catch (err) {
        console.error('Error fetching marketplace listings:', err);
      } finally {
        hideGlobalLoader();
      }
    };
    fetchListings();

    const handleCommoditiesUpdated = () => {
      if (isMounted) {
        setAvailableCommodities(['All', ...getPlatformCommodities()]);
      }
    };

    const handleListingsUpdated = async () => {
      if (isMounted) {
        const activeLots = await getActiveMarketplaceListings();
        setAllListings(activeLots || []);
      }
    };

    window.addEventListener('agrolnk_commodities_updated', handleCommoditiesUpdated);
    window.addEventListener('agrolnk_listings_updated', handleListingsUpdated);
    window.addEventListener('storage', handleListingsUpdated);

    const channel = supabase
      .channel('public:marketplace_listings_feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => {
        handleListingsUpdated();
      })
      .subscribe();

    return () => {
      isMounted = false;
      hideGlobalLoader();
      window.removeEventListener('agrolnk_commodities_updated', handleCommoditiesUpdated);
      window.removeEventListener('agrolnk_listings_updated', handleListingsUpdated);
      window.removeEventListener('storage', handleListingsUpdated);
      supabase.removeChannel(channel);
    };
  }, []);

  const commodities = availableCommodities;
  const grades = ['All', 'A', 'B', 'C'];
  const locations = ['All', 'Tamil Nadu', 'Maharashtra', 'Madhya Pradesh', 'Himachal Pradesh'];

  const availableVarieties = useMemo(() => {
    if (!selectedCommodity || selectedCommodity === 'All') return [];
    const vars = getVarietiesForCommodity(selectedCommodity);
    return ['All', ...vars];
  }, [selectedCommodity]);

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCommodity, selectedVariety, selectedGrade, selectedLocation, sortBy]);

  // Memoized Filter & Sort
  const sortedListings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const hasQuery = query.length > 0;

    const filtered = allListings.filter((lot) => {
      if (selectedCommodity !== 'All' && lot.commodity?.toLowerCase() !== selectedCommodity.toLowerCase()) {
        return false;
      }
      if (selectedVariety !== 'All' && lot.variety?.toLowerCase() !== selectedVariety.toLowerCase()) {
        return false;
      }
      if (selectedGrade !== 'All' && lot.grade !== selectedGrade) {
        return false;
      }
      if (selectedLocation !== 'All' && !lot.state?.toLowerCase().includes(selectedLocation.toLowerCase())) {
        return false;
      }
      if (hasQuery) {
        const matches =
          lot.commodity?.toLowerCase().includes(query) ||
          lot.variety?.toLowerCase().includes(query) ||
          lot.state?.toLowerCase().includes(query) ||
          lot.district?.toLowerCase().includes(query);
        if (!matches) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'price-low') return Number(a.price) - Number(b.price);
      if (sortBy === 'price-high') return Number(b.price) - Number(a.price);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [allListings, searchQuery, selectedCommodity, selectedVariety, selectedGrade, selectedLocation, sortBy]);

  // Pagination calculation
  const totalPages = Math.ceil(sortedListings.length / pageSize) || 1;
  const paginatedListings = useMemo(() => {
    return sortedListings.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [sortedListings, currentPage, pageSize]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCommodity('All');
    setSelectedVariety('All');
    setSelectedGrade('All');
    setSelectedLocation('All');
    setSortBy('latest');
    setCurrentPage(1);
  };

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => onNavigate(dashboardTarget)}
              title="Return to Dashboard"
              aria-label="Back to Dashboard"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white border border-[#E5EDE8] shadow-2xs hover:bg-[#F8FAF8] text-[#0B3326] flex items-center justify-center shrink-0 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowLeft className="w-5 h-5 text-[#0B3326]" />
            </button>
            <div className="space-y-0.5 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#0B3326] font-heading tracking-tight">
                Marketplace
              </h1>
              <p className="text-xs sm:text-sm text-[#566861] hidden sm:block">
                Discover and procure fresh verified produce directly from local farmers and cooperatives.
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('buyer-orders')}
            icon={ShoppingBag}
            iconPosition="left"
            className="text-xs font-bold shrink-0 self-center"
          >
            My Orders
          </Button>
        </div>

        {/* Verification Status Alert Banner (Allows full browsing, reminds to verify for purchasing) */}
        {!isVerified && (
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs ${
            currentKycStatus === 'pending'
              ? 'bg-amber-50/90 border-amber-200 text-amber-950'
              : 'bg-[#F2FBF6] border-[#A7F3D0] text-[#0B3326]'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                currentKycStatus === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-[#EBF5F0] text-[#10B981]'
              }`}>
                {currentKycStatus === 'pending' ? (
                  <Clock className="w-5 h-5 text-amber-600" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-[#10B981]" />
                )}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-[#0B3326] flex items-center gap-1.5">
                  <span>{currentKycStatus === 'pending' ? 'KYC Verification Under Review' : 'Browsing Mode Active (KYC Required to Purchase)'}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    View Only
                  </span>
                </p>
                <p className="text-[11px] text-[#566861] mt-0.5">
                  {currentKycStatus === 'pending'
                    ? 'You can freely browse all active produce lots. Escrow checkout and instant buying will unlock once your documents are approved.'
                    : 'You can explore all farm harvests and warehouse lots. Complete your buyer identity verification to unlock purchase orders and escrow checkout.'}
                </p>
              </div>
            </div>
            <Button
              variant={currentKycStatus === 'pending' ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => setIsVerificationModalOpen(true)}
              icon={ShieldCheck}
              iconPosition="left"
              className="shrink-0 cursor-pointer shadow-xs whitespace-nowrap text-xs font-semibold py-2 px-4"
            >
              {currentKycStatus === 'pending' ? 'View Submitted Docs' : 'Verify Identity to Buy'}
            </Button>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="space-y-3">
          {/* Mobile Search & Filter Trigger (Only for mobile view) */}
          <div className="block sm:hidden space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#566861]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search commodity, region..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#E5EDE8] bg-white text-sm text-[#14211D] placeholder:text-[#566861]/50 focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all shadow-xs"
                />
              </div>
              <button
                type="button"
                onClick={openMobileFilters}
                className={`h-[42px] px-3.5 rounded-xl border flex items-center gap-1.5 font-bold text-xs shrink-0 cursor-pointer transition-all shadow-xs ${
                  activeFilterCount > 0
                    ? 'bg-[#EBF5F0] border-[#10B981] text-[#0B3326]'
                    : 'bg-white border-[#E5EDE8] text-[#566861] hover:bg-[#F8FAF8]'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 text-[#10B981]" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#10B981] text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Mobile Active Filter Badges */}
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1">
                <span className="text-[11px] font-bold text-[#566861] shrink-0">Active:</span>
                {selectedCommodity !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EBF5F0] text-[#0B3326] text-[11px] font-semibold border border-[#A7F3D0] shrink-0">
                    {selectedCommodity}
                    <button type="button" onClick={() => { setSelectedCommodity('All'); setSelectedVariety('All'); }} className="hover:text-red-600 font-bold ml-0.5 cursor-pointer">×</button>
                  </span>
                )}
                {selectedGrade !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EBF5F0] text-[#0B3326] text-[11px] font-semibold border border-[#A7F3D0] shrink-0">
                    Grade {selectedGrade}
                    <button type="button" onClick={() => setSelectedGrade('All')} className="hover:text-red-600 font-bold ml-0.5 cursor-pointer">×</button>
                  </span>
                )}
                {selectedLocation !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EBF5F0] text-[#0B3326] text-[11px] font-semibold border border-[#A7F3D0] shrink-0">
                    {selectedLocation}
                    <button type="button" onClick={() => setSelectedLocation('All')} className="hover:text-red-600 font-bold ml-0.5 cursor-pointer">×</button>
                  </span>
                )}
                {sortBy !== 'latest' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EBF5F0] text-[#0B3326] text-[11px] font-semibold border border-[#A7F3D0] shrink-0">
                    {sortBy === 'price-low' ? 'Low-High' : 'High-Low'}
                    <button type="button" onClick={() => setSortBy('latest')} className="hover:text-red-600 font-bold ml-0.5 cursor-pointer">×</button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-[11px] text-[#10B981] font-semibold hover:underline shrink-0 ml-1 cursor-pointer"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Desktop Search & Filter Card (Shown on sm: and above, untouched) */}
          <Card className="hidden sm:block p-5 bg-white border border-[#E5EDE8] shadow-xs space-y-4">
              
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
                  <SearchableSelect
                    options={commodities.map((c) => ({
                      value: c,
                      label: c === 'All' ? 'All Commodities' : c,
                    }))}
                    value={selectedCommodity}
                    onChange={(val) => {
                      setSelectedCommodity(val);
                      setSelectedVariety('All');
                    }}
                    placeholder="Commodity"
                    searchPlaceholder="Search commodity..."
                    buttonClassName="py-2 text-xs"
                  />
                </div>

                {/* Quality Grade Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-[#566861] mb-1">
                    Quality Grade
                  </label>
                  <SearchableSelect
                    options={grades.map((g) => ({
                      value: g,
                      label: g === 'All' ? 'All Grades' : `Grade ${g}`,
                    }))}
                    value={selectedGrade}
                    onChange={(val) => setSelectedGrade(val)}
                    placeholder="Grade"
                    searchPlaceholder="Search grade..."
                    buttonClassName="py-2 text-xs"
                  />
                </div>

                {/* Location / State Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-[#566861] mb-1">
                    Location
                  </label>
                  <SearchableSelect
                    options={locations.map((loc) => ({
                      value: loc,
                      label: loc === 'All' ? 'All Locations' : loc,
                    }))}
                    value={selectedLocation}
                    onChange={(val) => setSelectedLocation(val)}
                    placeholder="Location"
                    searchPlaceholder="Search state/district..."
                    buttonClassName="py-2 text-xs"
                  />
                </div>

                {/* Sort Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-[#566861] mb-1">
                    Sort By
                  </label>
                  <SearchableSelect
                    options={[
                      { value: 'latest', label: 'Newest Lots' },
                      { value: 'price-low', label: 'Price: Low to High' },
                      { value: 'price-high', label: 'Price: High to Low' },
                    ]}
                    value={sortBy}
                    onChange={(val) => setSortBy(val)}
                    placeholder="Sort"
                    searchPlaceholder="Search sort order..."
                    buttonClassName="py-2 text-xs"
                  />
                </div>

              </div>

              {/* Contextual Variety Filter Pills */}
              {selectedCommodity !== 'All' && availableVarieties.length > 1 && (
                <div className="pt-2.5 border-t border-[#E5EDE8]/60 flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  <span className="text-[11px] font-bold text-[#566861] shrink-0">Varieties:</span>
                  {availableVarieties.map((v) => {
                    const isSelected = selectedVariety === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setSelectedVariety(v)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#10B981] text-white shadow-xs'
                            : 'bg-[#F2FBF6] text-[#0B3326] hover:bg-[#E5EDE8]'
                        }`}
                      >
                        {v === 'All' ? `All ${selectedCommodity}` : v}
                      </button>
                    );
                  })}
                </div>
              )}

            </Card>
        </div>

            {/* Results Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#0B3326] font-heading">
                  Available Lots
                </span>
                <Badge variant="emerald" size="sm">
                  {sortedListings.length} {sortedListings.length === 1 ? 'result' : 'results'}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                {(selectedCommodity !== 'All' || selectedVariety !== 'All' || selectedGrade !== 'All' || selectedLocation !== 'All' || searchQuery !== '') && (
                  <button
                    onClick={resetFilters}
                    className="text-xs font-semibold text-[#10B981] hover:text-[#0B3326] flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
                  </button>
                )}

                <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
              </div>
            </div>

            {/* Listings Content */}
            {sortedListings.length > 0 ? (
              <div className="space-y-6">
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedListings.map((item) => (
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
                  <div className="space-y-3">
                    {paginatedListings.map((item) => (
                      <MarketplaceRow
                        key={item.id}
                        listing={item}
                        onSelect={(lot) =>
                          onNavigate('buyer-listing-detail', { listing: lot })
                        }
                      />
                    ))}
                  </div>
                )}

                {/* Pagination Controls */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={sortedListings.length}
                  pageSize={pageSize}
                />
              </div>
            ) : (
              <Card className="p-12 text-center border-2 border-dashed border-[#E5EDE8] rounded-3xl space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center mx-auto shadow-2xs">
                  <Search className="w-6 h-6 text-[#10B981]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#0B3326] font-heading">
                    No matching produce found
                  </h3>
                  <p className="text-xs text-[#566861] max-w-sm mx-auto">
                    Try adjusting your search terms or resetting filters to explore all active farm harvests and warehouse lots.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  <Button variant="secondary" size="sm" onClick={resetFilters} className="gap-2">
                    <RotateCcw className="w-4 h-4 text-[#566861]" />
                    Reset All Filters
                  </Button>
                  {onNavigate && (
                    <>
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => onNavigate('buyer-live-auctions')}
                        className="font-bold gap-2 shadow-xs"
                      >
                        <Gavel className="w-4 h-4" />
                        Explore Live Auctions
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigate('buyer-orders')}
                        className="text-xs text-[#566861] hover:text-[#0B3326] gap-1.5"
                      >
                        <ShoppingBag className="w-4 h-4 text-[#10B981]" />
                        My Orders
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            )}

      </div>

      {/* Mobile Filters Overlay Popup Modal */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in">
          {/* Backdrop */}
          <div
            className="fixed inset-0"
            onClick={() => setIsMobileFilterOpen(false)}
          />

          <div
            className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EBF5F0] text-[#10B981] flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0B3326] font-heading">
                    Filter Produce Lots
                  </h3>
                  <p className="text-[11px] text-[#566861]">
                    Refine results by commodity, grade, location, or sort order
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F2FBF6] text-[#566861] hover:text-[#0B3326] hover:bg-[#E5EDE8] flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Close filters"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Body (Scrollable) */}
            <div className="overflow-y-auto space-y-4 py-4 flex-1 pr-1 text-left">
              {/* 1. Commodity Filter */}
              <div>
                <label className="block text-xs font-bold text-[#0B3326] mb-1.5">
                  Commodity
                </label>
                <SearchableSelect
                  options={commodities.map((c) => ({
                    value: c,
                    label: c === 'All' ? 'All Commodities' : c,
                  }))}
                  value={tempFilters.commodity}
                  onChange={(val) => {
                    setTempFilters((prev) => ({
                      ...prev,
                      commodity: val,
                      variety: 'All'
                    }));
                  }}
                  placeholder="Commodity"
                  searchPlaceholder="Search commodity..."
                  buttonClassName="py-2.5 text-xs"
                />
              </div>

              {/* 1.1 Contextual Variety Filter (if specific commodity chosen) */}
              {tempFilters.commodity !== 'All' && tempVarieties.length > 1 && (
                <div>
                  <label className="block text-xs font-bold text-[#0B3326] mb-1.5">
                    Variety ({tempFilters.commodity})
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 border border-[#E5EDE8] rounded-xl bg-[#F8FAF8]">
                    {tempVarieties.map((v) => {
                      const isSel = tempFilters.variety === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setTempFilters((prev) => ({ ...prev, variety: v }))}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            isSel
                              ? 'bg-[#10B981] text-white shadow-xs'
                              : 'bg-white text-[#0B3326] border border-[#E5EDE8]'
                          }`}
                        >
                          {v === 'All' ? `All Varieties` : v}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Grade Filter (Short label for mobile) */}
              <div>
                <label className="block text-xs font-bold text-[#0B3326] mb-1.5">
                  Grade
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {grades.map((g) => {
                    const isSel = tempFilters.grade === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setTempFilters((prev) => ({ ...prev, grade: g }))}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center cursor-pointer border ${
                          isSel
                            ? 'bg-[#10B981] border-[#10B981] text-white shadow-xs'
                            : 'bg-white border-[#E5EDE8] text-[#14211D] hover:bg-[#F8FAF8]'
                        }`}
                      >
                        {g === 'All' ? 'All' : `Grade ${g}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3 & 4. Split Row: Location & Sort By (Short labels for mobile) */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Location Filter */}
                <div>
                  <label className="block text-xs font-bold text-[#0B3326] mb-1.5">
                    Location
                  </label>
                  <SearchableSelect
                    options={locations.map((loc) => ({
                      value: loc,
                      label: loc === 'All' ? 'All Locations' : loc,
                    }))}
                    value={tempFilters.location}
                    onChange={(val) => setTempFilters((prev) => ({ ...prev, location: val }))}
                    placeholder="Location"
                    searchPlaceholder="Search location..."
                    buttonClassName="py-2.5 text-xs truncate"
                  />
                </div>

                {/* Sort By Filter */}
                <div>
                  <label className="block text-xs font-bold text-[#0B3326] mb-1.5">
                    Sort By
                  </label>
                  <SearchableSelect
                    options={[
                      { value: 'latest', label: 'Newest Lots' },
                      { value: 'price-low', label: 'Price: Low-High' },
                      { value: 'price-high', label: 'Price: High-Low' },
                    ]}
                    value={tempFilters.sortBy}
                    onChange={(val) => setTempFilters((prev) => ({ ...prev, sortBy: val }))}
                    placeholder="Sort"
                    searchPlaceholder="Search sort..."
                    buttonClassName="py-2.5 text-xs truncate"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons Footer */}
            <div className="pt-3 border-t border-[#E5EDE8] flex items-center gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={handleResetMobileFilters}
                icon={RotateCcw}
                iconPosition="left"
                className="text-xs font-bold text-[#566861]"
              >
                Reset
              </Button>
              <Button
                variant="accent"
                size="md"
                onClick={handleSaveMobileFilters}
                icon={Check}
                iconPosition="left"
                className="flex-1 text-xs font-bold justify-center"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Required Modal */}
      {isVerificationModalOpen && (
        <VerificationRequiredModal
          isOpen={isVerificationModalOpen}
          currentUser={user}
          actionName="place escrow purchase orders and request certified assays"
          onClose={() => setIsVerificationModalOpen(false)}
          onSuccess={() => {
            setIsVerificationModalOpen(false);
            setCurrentKycStatus('pending');
          }}
        />
      )}
    </DashboardLayout>
  );
}
