import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import AuctionTimer from '../../components/auction/AuctionTimer';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  Gavel,
  ArrowLeft,
  Search,
  TrendingUp,
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
  ShoppingBag
} from 'lucide-react';
import { getLiveAuctions } from '../../utils/auctions';

export default function LiveAuctions({ currentUser, onNavigate }) {
  const user = currentUser || { id: 'usr_buyer_02', name: 'Ananya Agro Foods', role: 'buyer' };
  const [auctions, setAuctions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchAuctions = async () => {
      try {
        const data = await getLiveAuctions();
        if (isMounted) setAuctions(data || []);
      } catch (err) {
        console.error('Error fetching live auctions:', err);
      }
    };
    fetchAuctions();
    return () => {
      isMounted = false;
    };
  }, []);

  const safeAuctions = Array.isArray(auctions) ? auctions : [];

  const filteredAuctions = safeAuctions.filter((a) => {
    return (
      searchQuery === '' ||
      a.commodity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.district?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

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
                Live Auctions
              </h1>
              <Badge variant="amber" size="sm" dot={true}>
                {auctions.length} Active Now
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-[#566861]">
              Watch, compete, and place real-time bids on verified agricultural harvest lots.
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

        {/* Search Input Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#566861]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search active auctions by commodity, state..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5EDE8] text-sm text-[#14211D] placeholder:text-[#566861]/50 bg-white focus:outline-none focus:ring-2 focus:ring-[#10B981] transition-all"
          />
        </div>

        {/* Live Auction Lots Grid */}
        {filteredAuctions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAuctions.map((lot) => {
              const totalValuation = lot.quantity * lot.currentBid;
              const reserveMet = lot.currentBid >= lot.reservePrice;

              return (
                <Card
                  key={lot.id}
                  hoverEffect
                  className="p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-4 flex flex-col justify-between group"
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
                          Grade {lot.grade}
                        </Badge>
                        <Badge variant="amber" size="sm" dot={true}>
                          Live Bidding
                        </Badge>
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
                          {lot.state}
                        </span>
                      </p>
                    </div>

                    {/* Price & Quantity Matrix */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs text-center">
                      <div>
                        <span className="text-[10px] text-[#566861] block font-medium">
                          Current Highest Bid
                        </span>
                        <span className="text-base font-extrabold text-[#0B3326] font-heading">
                          ₹{lot.currentBid} / {lot.unit}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#566861] block font-medium">
                          Available Lot
                        </span>
                        <span className="text-sm font-bold text-[#14211D]">
                          {lot.quantity} {lot.unit}
                        </span>
                      </div>
                    </div>

                    {/* Reserve Status Callout */}
                    <div className="flex items-center justify-between text-xs text-[#566861] px-1">
                      <span>Reserve: ₹{lot.reservePrice}/{lot.unit}</span>
                      <span className={`font-bold ${reserveMet ? 'text-[#10B981]' : 'text-[#D97706]'}`}>
                        {reserveMet ? '✓ Reserve Met' : '⏳ Below Reserve'}
                      </span>
                    </div>

                  </div>

                  {/* Join Auction Button */}
                  <div className="pt-2">
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
              No live auctions found
            </h3>
            <p className="text-xs text-[#566861] max-w-sm mx-auto">
              There are currently no active auctions matching your search criteria.
            </p>
          </Card>
        )}

      </div>
    </DashboardLayout>
  );
}
