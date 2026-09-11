import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import AuctionTimer from '../../components/auction/AuctionTimer';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import ViewModeToggle from '../../components/ui/ViewModeToggle';
import AuctionRow from '../../components/auction/AuctionRow';
import AuctionHistoryModal from '../../components/auction/AuctionHistoryModal';
import {
  Gavel,
  ArrowLeft,
  Search,
  TrendingUp,
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  Trophy,
  History,
  CheckCircle2
} from 'lucide-react';
import { getAuctions } from '../../utils/auctions';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';

export default function LiveAuctions({ currentUser, onNavigate }) {
  const user = currentUser || { id: 'usr_buyer_02', name: 'Ananya Agro Foods', role: 'buyer' };
  const [auctions, setAuctions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('live'); // 'live' | 'ended'
  const [selectedHistoryAuction, setSelectedHistoryAuction] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchAuctions = async () => {
      try {
        showGlobalLoader('Streaming Live Floor Bids...', 'Connecting to commodity trading desks & real-time tickers...');
        const data = await getAuctions();
        if (isMounted) setAuctions(data || []);
      } catch (err) {
        console.error('Error fetching auctions:', err);
      } finally {
        hideGlobalLoader();
      }
    };
    fetchAuctions();
    return () => {
      isMounted = false;
    };
  }, []);

  const safeAuctions = Array.isArray(auctions) ? auctions : [];

  const now = Date.now();
  const liveCount = safeAuctions.filter((a) => a.status === 'live' && (!a.endsAt || new Date(a.endsAt).getTime() > now)).length;
  const endedCount = safeAuctions.filter((a) => a.status === 'ended' || (a.endsAt && new Date(a.endsAt).getTime() <= now)).length;

  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'row'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Reset page when tab or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterTab, searchQuery]);

  const filteredAuctions = safeAuctions.filter((a) => {
    const isEnded = a.status === 'ended' || (a.endsAt && new Date(a.endsAt).getTime() <= now);
    
    if (filterTab === 'live' && isEnded) return false;
    if (filterTab === 'ended' && !isEnded) return false;

    return (
      searchQuery === '' ||
      a.commodity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.district?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalPages = Math.ceil(filteredAuctions.length / pageSize) || 1;
  const paginatedAuctions = filteredAuctions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
                Agricultural Auctions
              </h1>
              <Badge variant="amber" size="sm" dot={true}>
                {liveCount} Live Now
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-[#566861]">
              Watch, compete, and view transparent closing prices on verified harvest auction lots.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={Gavel}
              iconPosition="left"
              onClick={() => onNavigate('buyer-my-bids')}
              className="text-xs font-bold shrink-0"
            >
              My Bids Dashboard
            </Button>
          </div>
        </div>

        {/* Filter Tabs & Search Bar Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Search Bar */}
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#566861]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search auctions by commodity, state..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5EDE8] text-sm text-[#14211D] placeholder:text-[#566861]/50 bg-white focus:outline-none focus:ring-2 focus:ring-[#10B981] transition-all"
            />
          </div>

          {/* View Mode & Tab Filters */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-[#F8FAF8] border border-[#E5EDE8] rounded-2xl shrink-0 overflow-x-auto">
              <button
                onClick={() => setFilterTab('live')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  filterTab === 'live'
                    ? 'bg-[#0B3326] text-white shadow-xs'
                    : 'text-[#566861] hover:text-[#0B3326]'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${filterTab === 'live' ? 'bg-[#10B981] animate-pulse' : 'bg-[#10B981]'}`} />
                <span>Live Bidding</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${filterTab === 'live' ? 'bg-[#10B981] text-white' : 'bg-[#E5EDE8] text-[#566861]'}`}>
                  {liveCount}
                </span>
              </button>

              <button
                onClick={() => setFilterTab('ended')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  filterTab === 'ended'
                    ? 'bg-[#0B3326] text-white shadow-xs'
                    : 'text-[#566861] hover:text-[#0B3326]'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-[#D97706]" />
                <span>Auction History</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${filterTab === 'ended' ? 'bg-[#10B981] text-white' : 'bg-[#E5EDE8] text-[#566861]'}`}>
                  {endedCount}
                </span>
              </button>
            </div>

            <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>
        </div>

        {/* Auction Lots Content */}
        {filteredAuctions.length > 0 ? (
          <div className="space-y-6">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedAuctions.map((lot) => {
                  const isEnded = lot.status === 'ended' || (lot.endsAt && new Date(lot.endsAt).getTime() <= now);
                  const totalValuation = lot.quantity * (lot.currentBid || lot.startingBid || 0);
                  const reserveMet = Number(lot.currentBid || 0) >= Number(lot.reservePrice || 0);

                  return (
                    <Card
                      key={lot.id}
                      hoverEffect
                      className={`p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-4 flex flex-col justify-between group rounded-3xl ${
                        isEnded ? 'opacity-95' : ''
                      }`}
                    >
                      <div className="space-y-4">
                        
                        {/* Media with Badges */}
                        <div className="relative h-44 rounded-2xl overflow-hidden bg-[#F8FAF8] border border-[#E5EDE8]">
                          <img
                            src={
                              lot.images?.[0] ||
                              'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80'
                            }
                            alt={lot.commodity}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />

                          <div className="absolute top-3 left-3 flex items-center gap-1.5">
                            <Badge variant="dark" size="sm" className="font-bold">
                              Grade {lot.grade || 'A'}
                            </Badge>
                            {isEnded ? (
                              <Badge variant="emerald" size="sm">
                                Auction Closed
                              </Badge>
                            ) : (
                              <Badge variant="amber" size="sm" dot={true}>
                                LIVE NOW
                              </Badge>
                            )}
                          </div>

                          <div className="absolute bottom-2 left-2 right-2">
                            <AuctionTimer
                              endsAt={lot.endsAt}
                              status={lot.status}
                              className="w-full justify-center shadow-xs"
                            />
                          </div>
                        </div>

                        {/* Commodity Title & Location */}
                        <div className="space-y-1 text-left">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-[#0B3326] font-heading group-hover:text-[#10B981] transition-colors">
                              {lot.commodity}
                            </h3>
                            <span className="text-xs text-[#566861] font-semibold">
                              {lot.variety || 'Standard'}
                            </span>
                          </div>

                          <p className="text-xs text-[#566861] flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                            <span>
                              {lot.district ? `${lot.district}, ` : ''}
                              {lot.state || 'Tamil Nadu'}
                            </span>
                          </p>
                        </div>

                        {/* Price & Quantity Matrix */}
                        <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs text-center">
                          <div>
                            <span className="text-[10px] text-[#566861] block font-medium">
                              {isEnded ? 'Final Winning Price' : 'Current Highest Bid'}
                            </span>
                            <span className="text-base font-extrabold text-[#0B3326] font-heading">
                              ₹{lot.currentBid || lot.startingBid} / {lot.unit || 'kg'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-[#566861] block font-medium">
                              Available Lot
                            </span>
                            <span className="text-sm font-bold text-[#14211D]">
                              {lot.quantity} {lot.unit || 'kg'}
                            </span>
                          </div>
                        </div>

                        {/* Reserve Status Callout */}
                        <div className="flex items-center justify-between text-xs text-[#566861] px-1">
                          <span>Reserve: ₹{lot.reservePrice}/{lot.unit || 'kg'}</span>
                          <span className={`font-bold ${reserveMet ? 'text-[#10B981]' : 'text-[#D97706]'}`}>
                            {reserveMet ? '✓ Reserve Met' : '⏳ Below Reserve'}
                          </span>
                        </div>

                      </div>

                      {/* Action Button: Enter Room vs View Ended History */}
                      <div className="pt-2">
                        {isEnded ? (
                          <Button
                            variant="secondary"
                            size="md"
                            onClick={() => setSelectedHistoryAuction(lot)}
                            icon={Trophy}
                            iconPosition="left"
                            className="w-full justify-center font-bold text-xs py-2.5 cursor-pointer bg-[#F8FAF8] border-[#E5EDE8] hover:bg-[#EBF5F0] hover:border-[#10B981] text-[#0B3326] shadow-xs"
                          >
                            View Result & Winning Bid
                          </Button>
                        ) : (
                          <Button
                            variant="accent"
                            size="md"
                            onClick={() => onNavigate('auction-room', { auctionId: lot.id, auction: lot })}
                            icon={ArrowRight}
                            iconPosition="right"
                            className="w-full justify-center font-bold text-xs py-2.5 shadow-2xs cursor-pointer"
                          >
                            Enter Live Auction Room
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedAuctions.map((lot) => (
                  <AuctionRow
                    key={lot.id}
                    auction={lot}
                    timeNow={now}
                    onNavigate={onNavigate}
                    onViewHistory={(a) => setSelectedHistoryAuction(a)}
                  />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredAuctions.length}
              pageSize={pageSize}
            />
          </div>
        ) : (
          <Card className="p-12 text-center border-2 border-dashed border-[#E5EDE8] rounded-3xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center mx-auto">
              <Gavel className="w-6 h-6 text-[#10B981]" />
            </div>
            <h3 className="text-base font-bold text-[#0B3326] font-heading">
              No auctions found
            </h3>
            <p className="text-xs text-[#566861] max-w-sm mx-auto">
              {filterTab === 'ended'
                ? 'No past auction records matching your search.'
                : 'There are currently no active auctions matching your search criteria.'}
            </p>
          </Card>
        )}

      </div>

      {/* Auction History & Winning Record Modal */}
      {selectedHistoryAuction && (
        <AuctionHistoryModal
          auction={selectedHistoryAuction}
          isOpen={Boolean(selectedHistoryAuction)}
          onClose={() => setSelectedHistoryAuction(null)}
          onNavigate={onNavigate}
        />
      )}
    </DashboardLayout>
  );
}

