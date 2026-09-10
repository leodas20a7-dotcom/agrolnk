import React from 'react';
import { MapPin, Eye, ShoppingCart, ShieldCheck, Tag, Gavel, ArrowRight } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function MarketplaceRow({ listing, onSelect }) {
  const isAuction = listing.saleType === 'auction';

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-2xs hover:border-[#10B981]/50 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-left group">
      
      {/* Thumbnail + Commodity Info */}
      <div className="flex items-center gap-3.5 min-w-[220px]">
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

        <div className="space-y-0.5 truncate">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#0B3326] font-heading group-hover:text-[#10B981] transition-colors truncate">
              {listing.commodity}
            </h3>
            <Badge
              variant={isAuction ? 'amber' : 'emerald'}
              size="xs"
              dot={isAuction}
            >
              {isAuction ? 'Auction' : 'Direct'}
            </Badge>
          </div>
          <p className="text-xs text-[#566861] font-medium truncate">
            {listing.variety || 'Standard Variety'} • Grade {listing.grade}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-[#566861] truncate">
            <MapPin className="w-3 h-3 text-[#10B981] shrink-0" />
            <span className="truncate">
              {listing.district || 'Salem'}, {listing.state || 'Tamil Nadu'}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics: Volume & Price */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-2 md:py-0 border-t md:border-t-0 md:border-l md:border-r border-[#E5EDE8] md:px-6 shrink-0">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#566861] block">
            Lot Volume
          </span>
          <span className="text-xs font-extrabold text-[#14211D]">
            {Number(listing.quantity || 0).toLocaleString()} {listing.unit || 'kg'}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#566861] block">
            {isAuction ? 'Starting Bid' : 'Price / Unit'}
          </span>
          <span className="text-xs font-extrabold text-[#0B3326]">
            ₹{listing.price || listing.pricePerUnit || listing.startingBid || 0}
            <span className="text-[10px] font-normal text-[#566861]">/{listing.unit || 'kg'}</span>
          </span>
        </div>

        <div className="hidden sm:block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#566861] block">
            Lot Total
          </span>
          <span className="text-xs font-bold text-[#14211D]">
            ₹{((Number(listing.quantity) || 0) * (Number(listing.price || listing.startingBid) || 0)).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex items-center justify-end gap-2 shrink-0">
        <Button
          variant={isAuction ? 'dark' : 'accent'}
          size="sm"
          onClick={() => onSelect?.(listing)}
          icon={isAuction ? Gavel : ArrowRight}
          iconPosition="right"
          className="text-xs font-bold shadow-xs whitespace-nowrap cursor-pointer"
        >
          {isAuction ? 'Join Auction' : 'Buy Now'}
        </Button>
      </div>

    </div>
  );
}
