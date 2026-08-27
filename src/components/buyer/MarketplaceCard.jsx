import React from 'react';
import { MapPin, Eye, ShoppingCart, ShieldCheck, Tag, Gavel } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function MarketplaceCard({ listing, onSelect }) {
  const isAuction = listing.saleType === 'auction';

  return (
    <Card
      hoverEffect
      className="p-5 bg-white border border-[#E5EDE8] shadow-xs flex flex-col justify-between space-y-4 group"
    >
      <div className="space-y-3">
        {/* Photo with Grade & Sale Type Badge */}
        <div className="relative h-44 rounded-2xl overflow-hidden bg-[#F8FAF8] border border-[#E5EDE8]">
          <img
            src={
              listing.images?.[0] ||
              'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80'
            }
            alt={listing.commodity}
            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
          />

          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <Badge variant="dark" size="sm" className="font-bold">
              Grade {listing.grade}
            </Badge>
            <Badge
              variant={isAuction ? 'amber' : 'emerald'}
              size="sm"
              dot={isAuction}
            >
              {isAuction ? 'Live Auction' : 'Direct Sale'}
            </Badge>
          </div>

          <div className="absolute bottom-2 right-2">
            <Badge variant="accent" size="sm">
              Verified Lot
            </Badge>
          </div>
        </div>

        {/* Title, Variety & Origin */}
        <div className="space-y-1 text-left">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#0B3326] font-heading group-hover:text-[#10B981] transition-colors">
              {listing.commodity}
            </h3>
            <span className="text-xs text-[#566861] font-semibold">
              {listing.variety || 'Standard'}
            </span>
          </div>

          <p className="text-xs text-[#566861] flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
            <span className="truncate">
              {listing.district ? `${listing.district}, ` : ''}
              {listing.state}
            </span>
          </p>
        </div>

        {/* Clean Metrics: Quantity & Price */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-center text-xs">
          <div>
            <span className="text-[10px] text-[#566861] block font-medium">Available</span>
            <span className="font-bold text-[#14211D]">
              {listing.quantity} {listing.unit}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[#566861] block font-medium">
              {isAuction ? 'Current Bid' : 'Price'}
            </span>
            <span className="font-bold text-[#0B3326]">
              ₹{listing.price} / {listing.unit}
            </span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="pt-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onSelect(listing)}
          icon={Eye}
          iconPosition="left"
          className="w-full justify-center text-xs font-semibold py-2.5 border-[#E5EDE8] group-hover:border-[#10B981] group-hover:bg-[#F2FBF6]"
        >
          View Lot Details
        </Button>
      </div>
    </Card>
  );
}
