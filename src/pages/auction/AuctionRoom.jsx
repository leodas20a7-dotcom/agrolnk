import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import CurrentBid from '../../components/auction/CurrentBid';
import AuctionTimer from '../../components/auction/AuctionTimer';
import BidHistory from '../../components/auction/BidHistory';
import BidForm from '../../components/auction/BidForm';
import BidConfirmModal from '../../components/auction/BidConfirmModal';
import AlertModal from '../../components/ui/AlertModal';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  ArrowLeft,
  MapPin,
  ShieldCheck,
  Award,
  Sparkles,
  Trophy,
  AlertTriangle,
  User,
  ShoppingBag,
  RotateCcw,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import {
  getAuctionById,
  getBidsForAuction,
  placeBid,
  finalizeAuction
} from '../../utils/auctions';

export default function AuctionRoom({ currentUser, onNavigate, navState }) {
  const user = currentUser || { id: 'usr_buyer_02', name: 'Ananya Agro Foods', role: 'buyer' };
  const auctionId = navState?.auctionId || navState?.auction?.id || 'auc_demo_01';

  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingBidAmount, setPendingBidAmount] = useState(0);
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  const fetchAuctionData = async () => {
    try {
      let lot = await getAuctionById(auctionId);
      if (lot) {
        // Check if endsAt has expired in real time
        if (lot.status === 'live' && new Date(lot.endsAt).getTime() <= Date.now()) {
          const finalized = await finalizeAuction(lot.id);
          lot = finalized || lot;
        }
        setAuction(lot);
        const lotBids = await getBidsForAuction(lot.id);
        setBids(Array.isArray(lotBids) ? lotBids : []);
      }
    } catch (err) {
      console.error('Error fetching auction data:', err);
    }
  };

  useEffect(() => {
    fetchAuctionData();
  }, [auctionId]);

  if (!auction) {
    return (
      <DashboardLayout currentUser={user} onNavigate={onNavigate}>
        <div className="py-16 text-center space-y-4">
          <p className="text-sm text-[#566861]">Auction not found or concluded.</p>
          <Button
            variant="primary"
            onClick={() =>
              onNavigate(user.role === 'farmer' ? 'farmer-my-auctions' : 'buyer-live-auctions')
            }
          >
            Back to Auctions
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isFarmer = user.role === 'farmer' || user.id === auction.farmerId;
  const isAuctionEnded =
    auction.status !== 'live' || new Date(auction.endsAt).getTime() <= Date.now();
  const isCurrentUserWinner =
    auction.status === 'completed' &&
    (auction.winnerId === user.id || auction.highestBidderId === user.id);
  const isCurrentUserLeading = auction.highestBidderId === user.id;

  const safeBids = Array.isArray(bids) ? bids : [];
  const hasUserBid = safeBids.some((b) => b.bidderId === user.id || b.buyerId === user.id);
  const isUserOutbid = hasUserBid && !isCurrentUserLeading && !isAuctionEnded;

  const handleInitiateBid = (amount) => {
    setPendingBidAmount(amount);
    setConfirmModalOpen(true);
  };

  const handleConfirmBid = async () => {
    setIsSubmittingBid(true);
    try {
      await placeBid(auction.id, user.id, user.name, pendingBidAmount);
      await fetchAuctionData();
      setIsSubmittingBid(false);
      setConfirmModalOpen(false);
      setActionSuccessMsg(`Your bid of ₹${pendingBidAmount}/${auction.unit} is now leading!`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: 'Bid Not Accepted',
        message: err.message || 'Unable to place your bid. Please verify the amount meets minimum increments.',
        type: 'error'
      });
      setIsSubmittingBid(false);
    }
  };

  const handleAuctionTimeUp = async () => {
    await finalizeAuction(auction.id);
    await fetchAuctionData();
  };

  const winningRate = auction.winningBid || auction.currentBid;
  const totalWinningValuation = auction.quantity * winningRate;

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="max-w-6xl mx-auto space-y-6 text-left">
        
        {/* Top Breadcrumb & Live Timer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() =>
              onNavigate(
                isFarmer ? 'farmer-my-auctions' : 'buyer-live-auctions'
              )
            }
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#566861] hover:text-[#0B3326] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />{' '}
            {isFarmer ? 'Back to My Auctions' : 'Back to Live Auctions'}
          </button>

          <div className="flex items-center gap-3">
            <AuctionTimer
              endsAt={auction.endsAt}
              status={auction.status}
              onTimeUp={handleAuctionTimeUp}
            />
          </div>
        </div>

        {/* Live Leading or Outbid Status Banner */}
        {!isFarmer && isCurrentUserLeading && !isAuctionEnded && (
          <div className="p-4 rounded-2xl bg-[#EBF5F0] border border-[#10B981]/30 text-[#0B3326] text-xs flex items-center justify-between shadow-2xs">
            <span className="flex items-center gap-2 font-bold">
              <Sparkles className="w-4 h-4 text-[#10B981]" />
              🎉 You are currently leading with the highest bid of ₹{auction.currentBid}/{auction.unit}!
            </span>
            <span className="font-semibold text-[#10B981]">Top Bidder</span>
          </div>
        )}

        {!isFarmer && isUserOutbid && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between shadow-2xs">
            <span className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              ⚠️ You've been outbid! Current highest bid is ₹{auction.currentBid}/{auction.unit}.
            </span>
            <span className="text-[11px] font-bold text-red-700 underline">
              Place higher bid below
            </span>
          </div>
        )}

        {actionSuccessMsg && (
          <div className="p-4 rounded-2xl bg-[#10B981] text-white text-xs font-bold flex items-center gap-2 shadow-xs">
            <Sparkles className="w-4 h-4" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* CASE 1: SUCCESSFUL AUCTION (COMPLETED) */}
        {auction.status === 'completed' && (
          <div className="p-6 sm:p-7 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#10B981] flex items-center justify-center text-white shrink-0 shadow-md">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-1 text-left">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-extrabold font-heading text-white">
                    {isCurrentUserWinner
                      ? '🏆 Auction Won! Congratulations!'
                      : 'Auction Completed'}
                  </h3>
                  <Badge variant="emerald" size="sm">
                    ✓ Reserve Met
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-[#DCFCE7]/90 font-normal">
                  {auction.commodity} ({auction.quantity} {auction.unit}) • Winning price:{' '}
                  <strong className="text-white">₹{winningRate} / {auction.unit}</strong>{' '}
                  • Winner:{' '}
                  <span className="font-semibold text-white">
                    {isCurrentUserWinner ? 'You' : auction.winnerName || auction.highestBidderName}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-[#14624A] pt-4 md:pt-0">
              <div className="text-left md:text-right">
                <span className="text-[11px] text-[#DCFCE7]/80 block">Order Total</span>
                <span className="text-2xl font-extrabold font-heading text-white">
                  ₹{totalWinningValuation.toLocaleString('en-IN')}
                </span>
              </div>

              <Button
                variant="accent"
                size="md"
                onClick={() =>
                  onNavigate(isFarmer ? 'farmer-orders' : 'buyer-orders')
                }
                icon={ShoppingBag}
                iconPosition="left"
                className="font-bold py-3 px-5 shadow-sm text-xs cursor-pointer"
              >
                View Order
              </Button>
            </div>
          </div>
        )}

        {/* CASE 2: RESERVE NOT MET (UNSUCCESSFUL) */}
        {(auction.status === 'reserve_not_met' ||
          (isAuctionEnded && auction.status !== 'completed')) && (
          <div className="p-6 rounded-3xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <XCircle className="w-6 h-6 text-[#D97706] shrink-0 mt-0.5" />
              <div className="space-y-1 text-left">
                <h3 className="text-base font-bold font-heading text-[#92400E]">
                  Auction Ended — Reserve Price Was Not Met
                </h3>
                <p className="text-xs text-[#92400E]/90">
                  Highest bid: <strong>₹{auction.currentBid}/{auction.unit}</strong> | Reserve floor: <strong>₹{auction.reservePrice}/{auction.unit}</strong>. No order was created.
                </p>
              </div>
            </div>

            {isFarmer && (
              <Button
                variant="secondary"
                size="sm"
                icon={RotateCcw}
                iconPosition="left"
                onClick={() => onNavigate('farmer-create-listing', { editListing: auction })}
                className="font-bold text-xs bg-white border-[#FDE68A] text-[#92400E] hover:bg-[#FEF3C7] shrink-0"
              >
                Relist Produce
              </Button>
            )}
          </div>
        )}

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Produce Specifications & Origin */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Produce Media Card */}
            <div className="relative h-64 sm:h-80 rounded-3xl overflow-hidden bg-[#F8FAF8] border border-[#E5EDE8] shadow-xs">
              <img
                src={
                  auction.images?.[0] ||
                  'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80'
                }
                alt={auction.commodity}
                className="w-full h-full object-cover"
              />

              <div className="absolute top-4 left-4 flex items-center gap-2">
                <Badge variant="dark" size="md" className="font-bold">
                  Grade {auction.grade}
                </Badge>
                {auction.status === 'live' ? (
                  <Badge variant="amber" size="md" dot={true}>
                    LIVE AUCTION
                  </Badge>
                ) : auction.status === 'completed' ? (
                  <Badge variant="emerald" size="md">
                    ✓ AUCTION WON
                  </Badge>
                ) : (
                  <Badge variant="dark" size="md">
                    ENDED
                  </Badge>
                )}
              </div>

              <div className="absolute bottom-4 left-4 right-4 p-3 rounded-2xl bg-[#0B3326]/90 text-white flex items-center justify-between text-xs backdrop-blur-xs">
                <span className="flex items-center gap-1.5 text-[#34D399] font-medium">
                  <ShieldCheck className="w-4 h-4 text-[#10B981]" /> Escrow Secured Auction
                </span>
                <span className="font-bold">Immediate Payout on Delivery</span>
              </div>
            </div>

            {/* Produce Header & Location */}
            <Card className="p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-extrabold text-[#0B3326] font-heading">
                    {auction.commodity}
                  </h2>
                  <span className="text-xs font-bold text-[#10B981]">
                    Variety: {auction.variety || 'Standard Producer Grade'}
                  </span>
                </div>
                <p className="text-xs text-[#566861] flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                  <span>
                    Location: <strong>{auction.district ? `${auction.district}, ` : ''}{auction.state}</strong>
                  </span>
                </p>
                <div className="flex items-center gap-1.5 text-[#10B981] font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verified Lot</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Dynamic Action Area */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Bid Input Control (Active only when auction live) */}
            <BidForm
              currentBid={auction.currentBid}
              unit={auction.unit}
              isFarmer={isFarmer}
              isAuctionEnded={isAuctionEnded}
              onInitiateBid={handleInitiateBid}
            />

            {/* Live Bid History Stream */}
            <BidHistory
              bids={bids}
              currentUserId={user.id}
              unit={auction.unit}
            />

          </div>

        </div>

      </div>

      {/* Bid Confirmation Dialog */}
      <BidConfirmModal
        isOpen={confirmModalOpen}
        auction={auction}
        bidAmount={pendingBidAmount}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirmBid}
        isSubmitting={isSubmittingBid}
      />

      {/* Modern Alert Overlay Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </DashboardLayout>
  );
}
