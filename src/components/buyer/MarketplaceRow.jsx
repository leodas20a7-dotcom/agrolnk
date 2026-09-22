import React from 'react';
import { MapPin, Eye, ShoppingCart, ShieldCheck, Tag, Gavel, ArrowRight } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function MarketplaceRow({ listing, onSelect }) {
  const isAuction = listing.saleType === 'auction';
  const lotTotal = (Number(listing.quantity) || 0) * (Number(listing.price || listing.startingBid) || 0);
  const locationText = [listing.district, listing.state].filter(Boolean).join(', ') || 'Salem, Tamil Nadu';

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-2xs hover:border-[#10B981]/50 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-left group">
      
      {/* Thumbnail + Commodity Info */}
      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-0 md:pr-4">
        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-[#F8FAF8] border border-[#E5EDE8] shrink-0">
          <img
            src={
              listing.images?.[0] ||
              'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80'
            }
            alt={listing.commodity}
            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
          />
        </div>

        <div className="space-y-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#0B3326] font-heading group-hover:text-[#10B981] transition-colors truncate">
              {listing.commodity}
            </h3>
            <Badge
              variant={isAuction ? 'amber' : 'emerald'}
              size="xs"
              dot={isAuction}
              className="shrink-0"
            >
              {isAuction ? 'Auction' : 'Direct'}
            </Badge>
          </div>
          <p className="text-xs text-[#566861] font-medium truncate">
            {listing.variety || 'Standard Variety'} • Grade {listing.grade || 'A'}
          </p>
          <div 
            className="flex items-center gap-1 text-[11px] text-[#566861] min-w-0"
            title={locationText}
          >
            <MapPin className="w-3 h-3 text-[#10B981] shrink-0" />
            <span className="truncate">
              {locationText}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics: Evenly locked 3-column Bay (Uniform width and aligned across all cards) */}
      <div className="w-full md:w-[350px] lg:w-[380px] shrink-0 grid grid-cols-3 gap-2 sm:gap-3 py-2.5 md:py-0 border-y md:border-y-0 md:border-l md:border-r border-[#E5EDE8] md:px-5 lg:px-6">
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#566861] block truncate">
            Lot Volume
          </span>
          <span className="text-xs font-extrabold text-[#14211D] block truncate">
            {Number(listing.quantity || 0).toLocaleString()} {listing.unit || 'kg'}
          </span>
        </div>

        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#566861] block truncate">
            {isAuction ? 'Starting Bid' : 'Price / Unit'}
          </span>
          <span className="text-xs font-extrabold text-[#0B3326] block truncate">
            ₹{listing.price || listing.pricePerUnit || listing.startingBid || 0}
            <span className="text-[10px] font-normal text-[#566861]">/{listing.unit || 'kg'}</span>
          </span>
        </div>

        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#566861] block truncate">
            Lot Total
          </span>
          <span className="text-xs font-bold text-[#14211D] block truncate">
            ₹{lotTotal.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Action Button */}
      <div className="w-full md:w-[120px] flex items-center justify-end shrink-0">
        <Button
          variant={isAuction ? 'dark' : 'accent'}
          size="sm"
          onClick={() => onSelect?.(listing)}
          icon={isAuction ? Gavel : ArrowRight}
          iconPosition="right"
          className="w-full md:w-auto text-xs font-bold shadow-xs whitespace-nowrap cursor-pointer justify-center"
        >
          {isAuction ? 'Join Auction' : 'Buy Now'}
        </Button>
      </div>

    </div>
  );
}
