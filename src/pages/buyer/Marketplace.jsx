import React, { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { getActiveMarketplaceListings, getPlatformCommodities, fetchRemoteCommodities } from '../../utils/listings';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';
import { getResolvedUserKycStatus, fetchCurrentProfile, getCurrentUser } from '../../utils/auth';
import VerificationRequiredModal from '../../components/verification/VerificationRequiredModal';

export default function Marketplace({ currentUser, onNavigate, navState }) {
  const user = currentUser || { name: 'Buyer', id: '', role: 'buyer' };
  const [allListings, setAllListings] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState(navState?.initialQuery || '');
  const [selectedCommodity, setSelectedCommodity] = useState(navState?.initialCommodity || 'All');
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

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCommodity, selectedGrade, selectedLocation, sortBy]);

  // Sort listings
  const sortedListings = [...filteredListings].sort((a, b) => {
    if (sortBy === 'price-low') return Number(a.price) - Number(b.price);
    if (sortBy === 'price-high') return Number(b.price) - Number(a.price);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  // Pagination calculation
  const totalPages = Math.ceil(sortedListings.length / pageSize) || 1;
  const paginatedListings = sortedListings.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCommodity('All');
    setSelectedGrade('All');
    setSelectedLocation('All');
    setSortBy('latest');
    setCurrentPage(1);
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

        {/* Conditional Content: KYC Compliance Gate vs Active Listings */}
        {!isVerified ? (
          <Card className="p-8 sm:p-12 text-center border-2 border-dashed border-[#E5EDE8] rounded-3xl bg-gradient-to-b from-[#F8FAF8] to-[#F2FBF6] space-y-6 shadow-xs max-w-3xl mx-auto animate-in fade-in duration-200">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-xs ${
              currentKycStatus === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-[#EBF5F0] text-[#0B3326]'
            }`}>
              {currentKycStatus === 'pending' ? (
                <Clock className="w-8 h-8 text-amber-700" />
              ) : (
                <ShieldCheck className="w-8 h-8 text-[#10B981]" />
              )}
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-xs font-semibold text-amber-800 border border-amber-200">
                <Lock className="w-3.5 h-3.5" />
                <span>{currentKycStatus === 'pending' ? 'KYC Verification In Progress' : 'Identity Verification Required'}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#0B3326] font-heading">
                {currentKycStatus === 'pending'
                  ? 'Your Verification Documents Are Under Review'
                  : 'Verify Your Identity to Unlock Produce Marketplace'}
              </h3>
              <p className="text-xs sm:text-sm text-[#566861] leading-relaxed">
                {currentKycStatus === 'pending'
                  ? 'We have received your verification documents. Once approved by the administrator, direct produce lots, wholesale pricing, and escrow purchasing will unlock automatically.'
                  : 'Agrolnk enforces mandatory KYC for all buyers to safeguard farmers against unauthorized orders, secure digital escrow payments, and ensure verified GST/Tax compliance.'}
              </p>
            </div>

            {/* 3 Step Trust Guarantees */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
              <div className="p-3.5 rounded-2xl bg-white border border-[#E5EDE8] space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B3326]">
                  <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                  <span>Verified Farmgates</span>
                </div>
                <p className="text-[11px] text-[#566861]">Direct produce sourced from authenticated farmer clusters.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-[#E5EDE8] space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B3326]">
                  <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                  <span>100% Escrow Safety</span>
                </div>
                <p className="text-[11px] text-[#566861]">Funds held in certified institutional escrow until physical delivery.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-[#E5EDE8] space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B3326]">
                  <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                  <span>Certified Assays</span>
                </div>
                <p className="text-[11px] text-[#566861]">Quality lab assays and moisture parameters on every harvest lot.</p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="primary"
                size="lg"
                onClick={() => setIsVerificationModalOpen(true)}
                icon={ShieldCheck}
                iconPosition="left"
                className="w-full sm:w-auto font-bold text-xs py-3 px-8 shadow-sm cursor-pointer"
              >
                {currentKycStatus === 'pending' ? 'View / Update Submitted Documents' : 'Complete Buyer KYC Verification'}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => onNavigate('buyer-dashboard')}
                className="w-full sm:w-auto text-xs py-3 px-6 cursor-pointer"
              >
                Back to Dashboard
              </Button>
            </div>
          </Card>
        ) : (
          <>
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
                  <SearchableSelect
                    options={commodities.map((c) => ({
                      value: c,
                      label: c === 'All' ? 'All Commodities' : c,
                    }))}
                    value={selectedCommodity}
                    onChange={(val) => setSelectedCommodity(val)}
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

            </Card>

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
                {(selectedCommodity !== 'All' || selectedGrade !== 'All' || selectedLocation !== 'All' || searchQuery !== '') && (
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
          </>
        )}

      </div>

      {/* Verification Required Modal */}
      {isVerificationModalOpen && (
        <VerificationRequiredModal
          isOpen={isVerificationModalOpen}
          currentUser={user}
          actionName="browse marketplace produce lots and place orders"
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
