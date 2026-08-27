import React from 'react';
import { MapPin, Tag, Gavel, Clock, ShieldCheck, Eye, Edit3 } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function ListingCard({ listing, onView, onEdit }) {
  const isAuction = listing.saleType === 'auction';

  return (
    <Card hoverEffect className="p-5 bg-white border border-[#E5EDE8] shadow-xs flex flex-col justify-between space-y-4">
      {/* Top Media & Header */}
      <div className="space-y-3.5">
        <div className="relative h-44 rounded-2xl overflow-hidden bg-[#F8FAF8] border border-[#E5EDE8]">
          <img
            src={
              listing.images?.[0] ||
              'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80'
            }
            alt={listing.commodity}
            className="w-full h-full object-cover"
          />

          {/* Top Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <Badge variant="dark" size="sm">
              Grade {listing.grade}
            </Badge>
            <Badge
              variant={isAuction ? 'amber' : 'accent'}
              size="sm"
              dot={isAuction}
            >
              {isAuction ? 'Live Auction' : 'Direct Sale'}
            </Badge>
          </div>

          <div className="absolute top-3 right-3">
            <Badge variant="emerald" size="sm" dot={true}>
              Active
            </Badge>
          </div>

          {/* Auction Countdown pill if auction */}
          {isAuction && listing.auctionEndsIn && (
            <div className="absolute bottom-2 left-2 right-2 p-1.5 rounded-xl bg-[#0B3326]/90 text-white text-xs text-center font-bold flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Ends in {listing.auctionEndsIn}</span>
            </div>
          )}
        </div>

        {/* Title & Origin */}
        <div className="space-y-1 text-left">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold text-[#0B3326] font-heading">
              {listing.commodity}
            </h4>
            <span className="text-xs text-[#566861] font-semibold">
              {listing.variety || 'Standard'}
            </span>
          </div>

          <p className="text-xs text-[#566861] flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
            <span>
              {listing.district ? `${listing.district}, ` : ''}
              {listing.state}
            </span>
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-center text-xs">
          <div>
            <span className="text-[10px] text-[#566861] block font-medium">Quantity</span>
            <span className="font-bold text-[#14211D]">
              {listing.quantity} {listing.unit}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[#566861] block font-medium">
              {isAuction ? 'Current Bid' : 'Direct Price'}
            </span>
            <span className="font-bold text-[#0B3326]">
              ₹{listing.price} / {listing.unit}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-[#E5EDE8] flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onView?.(listing)}
          icon={Eye}
          iconPosition="left"
          className="flex-1 justify-center text-xs font-semibold py-2"
        >
          View
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit?.(listing)}
          icon={Edit3}
          iconPosition="left"
          className="justify-center text-xs font-semibold py-2"
        >
          Edit
        </Button>
      </div>
    </Card>
  );
}
