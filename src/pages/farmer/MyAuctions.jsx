import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
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
  RotateCcw
} from 'lucide-react';
import { getFarmerAuctions } from '../../utils/auctions';

export default function MyAuctions({ currentUser, onNavigate }) {
  const user = currentUser || { name: 'Sakthi Vel', id: 'usr_farmer_01', role: 'farmer' };
  const [auctions, setAuctions] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [timeNow, setTimeNow] = useState(Date.now());

  useEffect(() => {
    let isMounted = true;
    const fetchAuctions = async () => {
      try {
        const data = await getFarmerAuctions(user.id);
        if (isMounted) setAuctions(data || []);
      } catch (err) {
        console.error('Error fetching farmer auctions:', err);
      }
    };
    fetchAuctions();

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

  const tabs = [
    { id: 'all', label: 'All Auctions', count: auctions.length },
    {
      id: 'live',
      label: 'Live Now',
      count: auctions.filter((a) => a.status === 'live').length,
    },
    {
      id: 'completed',
      label: 'Completed / Won',
      count: auctions.filter((a) => a.status === 'completed').length,
    },
    {
      id: 'unsold',
      label: 'Reserve Not Met',
      count: auctions.filter((a) => a.status === 'reserve_not_met' || a.status === 'ended_unsold').length,
    },
  ];

  const filteredAuctions = auctions.filter((a) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'live') return a.status === 'live';
    if (activeTab === 'completed') return a.status === 'completed';
    if (activeTab === 'unsold')
      return a.status === 'reserve_not_met' || a.status === 'ended_unsold';
    return true;
  });

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

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E5EDE8]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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

        {/* Auctions Grid */}
        {filteredAuctions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredAuctions.map((auction) => {
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

                    {/* Dynamic Countdown Clock Pill */}
                    {isLive && (
                      <div className="p-3 rounded-2xl bg-[#0B3326] text-white flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-[#34D399] font-medium">
                          <Clock className="w-4 h-4" />
                          <span>Closing In:</span>
                        </div>
                        <span className="text-base font-extrabold font-mono tracking-widest text-[#FCD34D]">
                          ⏱ {formatRemainingTime(auction.endsAt)}
                        </span>
                      </div>
                    )}

                    {/* Bidding Metrics Matrix */}
                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs">
                      <div>
                        <span className="text-[10px] text-[#566861] block font-medium">
                          {isLive ? 'Current Highest Bid' : 'Final Closing Price'}
                        </span>
                        <span className="text-xl font-extrabold text-[#0B3326] font-heading">
                          ₹{auction.winningBid || auction.currentBid}
                        </span>
                        <span className="text-[11px] text-[#566861]"> / {auction.unit}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#566861] block font-medium">
                          Reserve Price (Floor)
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-sm font-bold text-[#14211D]">
                            ₹{auction.reservePrice} / {auction.unit}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold block mt-0.5 ${
                            reserveMet ? 'text-[#10B981]' : 'text-[#D97706]'
                          }`}
                        >
                          {reserveMet ? '✓ Reserve Met' : '⏳ Below Reserve'}
                        </span>
                      </div>
                    </div>

                    {/* Winner / Leader Snapshot */}
                    <div className="flex items-center justify-between text-xs text-[#566861] pt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-[#10B981]" />
                        <span>
                          {isCompleted ? 'Winner:' : 'Leader:'}{' '}
                          <strong>
                            {auction.winnerName ||
                              auction.highestBidderName ||
                              'Starting floor'}
                          </strong>
                        </span>
                      </span>
                      <span>
                        Total:{' '}
                        <strong className="text-[#0B3326]">
                          ₹
                          {(
                            auction.quantity * (auction.winningBid || auction.currentBid)
                          ).toLocaleString('en-IN')}
                        </strong>
                      </span>
                    </div>

                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-[#E5EDE8] flex items-center justify-between gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onNavigate('auction-room', { auctionId: auction.id, auction })}
                      icon={Eye}
                      iconPosition="left"
                      className="text-xs font-bold py-2 border-[#E5EDE8] hover:border-[#10B981]"
                    >
                      View Live Room
                    </Button>

                    {isCompleted && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onNavigate('farmer-orders')}
                        icon={ShoppingBag}
                        iconPosition="left"
                        className="text-xs font-bold py-2"
                      >
                        View Order
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
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

      </div>
    </DashboardLayout>
  );
}
