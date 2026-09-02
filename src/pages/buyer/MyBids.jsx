import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  Gavel,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Trophy,
  ShoppingBag,
  XCircle
} from 'lucide-react';
import { getUserBids } from '../../utils/auctions';

export default function MyBids({ currentUser, onNavigate }) {
  const user = currentUser || { id: 'usr_buyer_02', name: 'Ananya Agro Foods', role: 'buyer' };
  const [bids, setBids] = useState([]);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    let isMounted = true;
    const fetchBids = async () => {
      try {
        const data = await getUserBids(user.id);
        if (isMounted) setBids(data || []);
      } catch (err) {
        console.error('Error fetching user bids:', err);
      }
    };
    fetchBids();
    return () => {
      isMounted = false;
    };
  }, [user.id]);

  const safeBids = Array.isArray(bids) ? bids : [];

  const tabs = [
    { id: 'all', label: 'All Bids', count: safeBids.length },
    {
      id: 'won',
      label: 'Won 🎉',
      count: safeBids.filter((b) => b.isWinner).length,
    },
    {
      id: 'leading',
      label: 'Leading 🟢',
      count: safeBids.filter((b) => b.isLeading && b.auction?.status === 'live').length,
    },
    {
      id: 'outbid',
      label: 'Outbid / Lost',
      count: safeBids.filter((b) => (!b.isLeading && b.auction?.status === 'live') || b.isOutbid).length,
    },
  ];

  const filteredBids = safeBids.filter((b) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'won') return b.isWinner;
    if (activeTab === 'leading') return b.isLeading && b.auction?.status === 'live';
    if (activeTab === 'outbid')
      return (!b.isLeading && b.auction?.status === 'live') || b.isOutbid;
    return true;
  });

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={() => onNavigate('buyer-live-auctions')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#566861] hover:text-[#0B3326] transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Live Auctions
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              My Bids Activity
            </h1>
            <p className="text-xs sm:text-sm text-[#566861]">
              Track your active auction participation, winning procurement orders, and live positions.
            </p>
          </div>

          <Button
            variant="accent"
            size="md"
            icon={Gavel}
            iconPosition="left"
            onClick={() => onNavigate('buyer-live-auctions')}
            className="font-bold py-2.5 px-5 shadow-xs shrink-0 cursor-pointer"
          >
            Explore Live Auctions
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

        {/* Bids List */}
        {filteredBids.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredBids.map((b) => {
              const lot = b.auction || { commodity: 'Commodity Lot', grade: 'A', quantity: 500, unit: 'kg' };
              const isLive = lot.status === 'live';
              const isWon = b.isWinner;
              const isReserveFailed = lot.status === 'reserve_not_met';
              const isLost = lot.status === 'completed' && !isWon;

              return (
                <Card
                  key={b.id}
                  hoverEffect
                  className={`p-6 bg-white border shadow-xs space-y-4 text-left transition-all ${
                    isWon
                      ? 'border-[#10B981] bg-gradient-to-b from-[#F2FBF6] to-white'
                      : 'border-[#E5EDE8]'
                  }`}
                >
                  {/* Top Header & Status Badges */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-[#0B3326] font-heading">
                        {lot.commodity}
                      </h4>
                      <Badge variant="dark" size="sm">
                        Grade {lot.grade}
                      </Badge>
                    </div>

                    {isWon && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981] text-white text-xs font-bold shadow-2xs">
                        <Trophy className="w-3.5 h-3.5" /> 🏆 Won
                      </span>
                    )}

                    {isLive && b.isLeading && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EBF5F0] text-[#10B981] text-xs font-bold border border-[#10B981]/30">
                        <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" /> Leading
                      </span>
                    )}

                    {isLive && !b.isLeading && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" /> Outbid
                      </span>
                    )}

                    {isLost && (
                      <Badge variant="dark" size="sm">
                        Outbid / Concluded
                      </Badge>
                    )}

                    {isReserveFailed && (
                      <Badge variant="amber" size="sm">
                        Reserve Not Met
                      </Badge>
                    )}
                  </div>

                  {/* Pricing Comparison Matrix */}
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs">
                    <div>
                      <span className="text-[10px] text-[#566861] block font-medium">
                        Your Submitted Bid
                      </span>
                      <span className="text-lg font-extrabold text-[#14211D] font-heading">
                        ₹{b.amount} / {lot.unit}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#566861] block font-medium">
                        {isLive ? 'Current Highest Bid' : 'Final Closing Price'}
                      </span>
                      <span className="text-lg font-extrabold text-[#0B3326] font-heading">
                        ₹{b.currentHighestBid} / {lot.unit}
                      </span>
                    </div>
                  </div>

                  {/* Action Link Footer */}
                  <div className="pt-2 flex items-center justify-between border-t border-[#E5EDE8]">
                    <span className="text-xs text-[#566861]">
                      Lot: <strong>{lot.quantity} {lot.unit}</strong>
                    </span>

                    {isWon ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onNavigate('buyer-orders')}
                        icon={ShoppingBag}
                        iconPosition="left"
                        className="text-xs font-bold"
                      >
                        View Order
                      </Button>
                    ) : (
                      <Button
                        variant={b.isLeading && isLive ? 'secondary' : 'accent'}
                        size="sm"
                        onClick={() =>
                          onNavigate('auction-room', { auctionId: b.auctionId, auction: b.auction })
                        }
                        icon={ArrowRight}
                        iconPosition="right"
                        className="text-xs font-bold"
                      >
                        {isLive ? (b.isLeading ? 'View Auction' : 'Increase Bid') : 'View Result'}
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
              No bids found in {activeTab}
            </h3>
            <p className="text-xs text-[#566861] max-w-sm mx-auto">
              You have not placed any bids in this category yet.
            </p>
            <div className="pt-2">
              <Button
                variant="accent"
                size="md"
                onClick={() => onNavigate('buyer-live-auctions')}
                icon={Gavel}
              >
                Browse Live Auctions
              </Button>
            </div>
          </Card>
        )}

      </div>
    </DashboardLayout>
  );
}
