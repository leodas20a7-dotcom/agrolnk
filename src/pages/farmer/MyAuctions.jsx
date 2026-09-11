import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Pagination from '../../components/ui/Pagination';
import ViewModeToggle from '../../components/ui/ViewModeToggle';
import AuctionRow from '../../components/auction/AuctionRow';
import AcceptBidEarlyModal from '../../components/auction/AcceptBidEarlyModal';
import AuctionHistoryModal from '../../components/auction/AuctionHistoryModal';
import {
  Gavel,
  Plus,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  ShieldCheck,
  TrendingUp,
  MapPin,
  ArrowRight,
  Eye,
  ShoppingBag,
  RotateCcw,
  Zap,
  Trophy
} from 'lucide-react';
import { getFarmerAuctions } from '../../utils/auctions';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';

export default function MyAuctions({ currentUser, onNavigate }) {
  const user = currentUser || { name: 'Sakthi Vel', id: 'usr_farmer_01', role: 'farmer' };
  const [auctions, setAuctions] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('agrolnk_farmer_auctions_viewmode') || 'rows';
    } catch {
      return 'rows';
    }
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('agrolnk_farmer_auctions_viewmode', mode);
    } catch {}
  };

  const [timeNow, setTimeNow] = useState(Date.now());
  const [selectedAuctionForEarlyAccept, setSelectedAuctionForEarlyAccept] = useState(null);
  const [selectedHistoryAuction, setSelectedHistoryAuction] = useState(null);
  const [earlyAcceptSuccess, setEarlyAcceptSuccess] = useState(null);

  const ITEMS_PER_PAGE = 6;

  const fetchAuctions = async () => {
    try {
      const data = await getFarmerAuctions(user.id);
      setAuctions(data || []);
    } catch (err) {
      console.error('Error fetching farmer auctions:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadAuctions = async () => {
      try {
        showGlobalLoader('Loading Live Commodity Auctions...', 'Syncing real-time bids & tick books...');
        const data = await getFarmerAuctions(user.id);
        if (isMounted) setAuctions(data || []);
      } catch (err) {
        console.error('Error fetching farmer auctions:', err);
      } finally {
        hideGlobalLoader();
      }
    };
    loadAuctions();

    const interval = setInterval(() => {
      setTimeNow(Date.now());
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user.id]);

  const formatRemainingTime = (endsAtStr) => {
    const remainingMs = new Date(endsAtStr).getTime() - timeNow;
    if (remainingMs <= 0) return '00:00 (Ended)';

    const totalSeconds = Math.floor(remainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n) => String(n).padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const safeAuctions = Array.isArray(auctions) ? auctions : [];

  const tabs = [
    { id: 'all', label: 'All Auctions', count: safeAuctions.length },
    {
      id: 'live',
      label: 'Live Now',
      count: safeAuctions.filter((a) => a.status === 'live').length,
    },
    {
      id: 'completed',
      label: 'Completed / Won',
      count: safeAuctions.filter((a) => a.status === 'completed').length,
    },
    {
      id: 'unsold',
      label: 'Reserve Not Met',
      count: safeAuctions.filter((a) => a.status === 'reserve_not_met' || a.status === 'ended_unsold').length,
    },
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentPage(1);
  };

  const filteredAuctions = safeAuctions.filter((a) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'live') return a.status === 'live';
    if (activeTab === 'completed') return a.status === 'completed';
    if (activeTab === 'unsold')
      return a.status === 'reserve_not_met' || a.status === 'ended_unsold';
    return true;
  });

  const totalPages = Math.ceil(filteredAuctions.length / ITEMS_PER_PAGE) || 1;
  const paginatedAuctions = filteredAuctions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={() => onNavigate('farmer-dashboard')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#566861] hover:text-[#0B3326] transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              My Live Auctions
            </h1>
            <p className="text-xs sm:text-sm text-[#566861]">
              Monitor real-time bids, countdown timers, and reserve price settlements on your auction lots.
            </p>
          </div>

          <Button
            variant="accent"
            size="md"
            icon={Plus}
            iconPosition="left"
            onClick={() => onNavigate('farmer-create-auction')}
            className="font-bold py-2.5 px-5 shadow-xs shrink-0 cursor-pointer"
          >
            Launch New Auction
          </Button>
        </div>

        {/* Filter Tabs & View Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? 'bg-[#0B3326] text-white shadow-xs'
                      : 'bg-white text-[#566861] hover:bg-[#F2FBF6] hover:text-[#0B3326] border border-[#E5EDE8]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-[#10B981] text-white'
                        : 'bg-[#F8FAF8] text-[#566861]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <ViewModeToggle
            viewMode={viewMode}
            onViewModeChange={handleSetViewMode}
          />
        </div>

        {/* Auctions Content: Row View vs Grid View */}
        {filteredAuctions.length > 0 ? (
          <div className="space-y-6">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paginatedAuctions.map((auction) => {
                  const isLive = auction.status === 'live';
                  const isCompleted = auction.status === 'completed';
                  const isUnsold =
                    auction.status === 'reserve_not_met' || auction.status === 'ended_unsold';
                  const reserveMet = auction.currentBid >= auction.reservePrice;

                  return (
                    <Card
                      key={auction.id}
                      hoverEffect
                      className="p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-5 flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        
                        {/* Top Row: Thumbnail + Status + Countdown */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                auction.images?.[0] ||
                                'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80'
                              }
                              alt={auction.commodity}
                              className="w-14 h-14 rounded-2xl object-cover border border-[#E5EDE8]"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-[#0B3326] font-heading">
                                  {auction.commodity}
                                </h3>
                                <Badge variant="dark" size="sm">
                                  Grade {auction.grade}
                                </Badge>
                              </div>
                              <span className="text-xs text-[#566861] block">
                                Lot: <strong>{auction.quantity} {auction.unit}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Status Badges */}
                          <div className="text-right space-y-1">
                            {isLive && (
                              <Badge variant="amber" size="sm" dot={true}>
                                LIVE
                              </Badge>
                            )}
                            {isCompleted && (
                              <Badge variant="emerald" size="sm">
                                ✓ WON
                              </Badge>
                            )}
                            {isUnsold && (
                              <Badge variant="dark" size="sm">
                                RESERVE NOT MET
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Middle Stats: Base vs Current Bid */}
                        <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#566861]">Starting Bid:</span>
                            <span className="font-semibold text-[#14211D]">
                              ₹{auction.basePrice || auction.startingBid} / {auction.unit}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#566861]">Reserve Price:</span>
                            <span className="font-semibold text-[#14211D]">
                              ₹{auction.reservePrice} / {auction.unit}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-[#E5EDE8] flex items-center justify-between">
                            <span className="text-xs font-bold text-[#0B3326]">
                              {isCompleted ? 'Winning Knockdown:' : 'Current Highest Bid:'}
                            </span>
                            <div className="text-right">
                              <span className="text-lg font-extrabold text-[#10B981] font-heading">
                                ₹{auction.winningBid || auction.currentBid || auction.basePrice}
                              </span>
                              <span className="text-[10px] text-[#566861] block">
                                /{auction.unit} ({auction.totalBids || 0} bids)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Highest Bidder & Timer status */}
                        <div className="flex items-center justify-between text-xs pt-1">
                          <div className="flex items-center gap-1.5 text-[#566861]">
                            <User className="w-3.5 h-3.5 text-[#10B981]" />
                            <span className="truncate max-w-[140px]">
                              {auction.highestBidderName || 'No bids yet'}
                            </span>
                          </div>

                          {isLive && (
                            <div className="flex items-center gap-1.5 text-amber-700 font-bold bg-[#FEF3C7] px-2.5 py-1 rounded-xl">
                              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                              <span>{formatRemainingTime(auction.endsAt)}</span>
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-4 border-t border-[#E5EDE8] flex items-center justify-between gap-2">
                        {isLive ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onNavigate('auction-room', { auctionId: auction.id, auction })}
                            icon={Eye}
                            iconPosition="left"
                            className="text-xs font-bold py-2 border-[#E5EDE8] hover:border-[#10B981] cursor-pointer"
                          >
                            Live Room
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onNavigate('auction-room', { auctionId: auction.id, auction })}
                            icon={Eye}
                            iconPosition="left"
                            className="text-xs font-bold py-2 border-[#E5EDE8] hover:border-[#10B981] cursor-pointer"
                          >
                            View Live Room
                          </Button>
                        )}

                        <div className="flex items-center gap-2">
                          {isLive && (auction.highestBidderId || auction.totalBids > 0) && (
                            <Button
                              variant="accent"
                              size="sm"
                              onClick={() => setSelectedAuctionForEarlyAccept(auction)}
                              icon={Zap}
                              iconPosition="left"
                              className="text-xs font-bold py-2 shadow-xs cursor-pointer"
                            >
                              Accept ₹{auction.winningBid || auction.currentBid}/{auction.unit} & Close
                            </Button>
                          )}

                          {isCompleted && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => onNavigate('farmer-orders')}
                              icon={ShoppingBag}
                              iconPosition="left"
                              className="text-xs font-bold py-2 cursor-pointer"
                            >
                              View Order
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedAuctions.map((auction) => (
                  <AuctionRow
                    key={auction.id}
                    auction={auction}
                    timeNow={timeNow}
                    onNavigate={onNavigate}
                    onEarlyAccept={(a) => setSelectedAuctionForEarlyAccept(a)}
                  />
                ))}
              </div>
            )}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAuctions.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        ) : (
          <Card className="p-12 text-center border-2 border-dashed border-[#E5EDE8] rounded-3xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center mx-auto">
              <Gavel className="w-6 h-6 text-[#10B981]" />
            </div>
            <h3 className="text-base font-bold text-[#0B3326] font-heading">
              No {activeTab} auctions found
            </h3>
            <p className="text-xs text-[#566861] max-w-sm mx-auto">
              Launch a live digital auction to let verified buyers compete for your harvest lots in real time.
            </p>
            <div className="pt-2">
              <Button
                variant="accent"
                size="md"
                onClick={() => onNavigate('farmer-create-auction')}
                icon={Plus}
              >
                Launch Live Auction
              </Button>
            </div>
          </Card>
        )}

        {/* Early Accept Knockdown Confirmation Modal */}
        <AcceptBidEarlyModal
          isOpen={!!selectedAuctionForEarlyAccept}
          onClose={() => setSelectedAuctionForEarlyAccept(null)}
          auction={selectedAuctionForEarlyAccept}
          onSuccess={(updatedAuction, createdOrder) => {
            fetchAuctions();
            setEarlyAcceptSuccess({
              auction: updatedAuction,
              order: createdOrder,
            });
          }}
        />

        {/* Success Modal / Banner */}
        {earlyAcceptSuccess && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E5EDE8] space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#EBF5F0] text-[#10B981] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#0B3326] font-heading">
                  Auction Closed & Order Created!
                </h3>
                <p className="text-xs text-[#566861]">
                  You have accepted the offer of <b>₹{earlyAcceptSuccess.auction?.winningBid || earlyAcceptSuccess.auction?.currentBid}/{earlyAcceptSuccess.auction?.unit}</b>. The order is now Escrow-funded.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEarlyAcceptSuccess(null)}
                  className="font-bold text-xs"
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEarlyAcceptSuccess(null);
                    onNavigate('farmer-orders');
                  }}
                  icon={ShoppingBag}
                  iconPosition="right"
                  className="font-bold text-xs"
                >
                  View Order & Ship
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Auction History Record Modal */}
        <AuctionHistoryModal
          isOpen={Boolean(selectedHistoryAuction)}
          onClose={() => setSelectedHistoryAuction(null)}
          auction={selectedHistoryAuction}
          onNavigate={onNavigate}
        />

      </div>
    </DashboardLayout>
  );
}
