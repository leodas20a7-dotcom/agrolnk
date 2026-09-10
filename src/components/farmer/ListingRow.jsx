import React from 'react';
import { MapPin, Tag, Gavel, Clock, ShieldCheck, Eye, Edit3 } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { COMMODITY_IMAGES } from '../../utils/listings';

export default function ListingRow({ listing, onView, onEdit }) {
  const isAuction = listing.saleType === 'auction';
  const isSoldOut = listing.status === 'sold' || Number(listing.quantity || 0) <= 0;
  const fallbackImg = COMMODITY_IMAGES[listing.commodity] || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80';
  const totalVal = Math.round((Number(listing.quantity) || 0) * (Number(listing.price) || 0));

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-[#10B981]/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-left ${
        isSoldOut ? 'opacity-90' : ''
      }`}
    >
      {/* Left: Thumbnail & Commodity Details */}
      <div className="flex items-start sm:items-center gap-4 min-w-[260px]">
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-[#F8FAF8] border border-[#E5EDE8] shrink-0">
          <img
            src={listing.images?.[0] || fallbackImg}
            alt={listing.commodity}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = fallbackImg;
            }}
            className={`w-full h-full object-cover ${isSoldOut ? 'grayscale-25' : ''}`}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-base font-bold text-[#0B3326] font-heading">
              {listing.commodity}
            </h4>
            <Badge variant="dark" size="sm">
              Grade {listing.grade || 'A'}
            </Badge>
            <Badge
              variant={isAuction ? 'amber' : 'accent'}
              size="sm"
              dot={isAuction}
            >
              {isAuction ? 'Live Auction' : 'Direct Sale'}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#566861] flex-wrap">
            <span className="font-semibold text-[#14211D]">
              {listing.variety || 'Standard Variety'}
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#10B981]" />
              {listing.district ? `${listing.district}, ` : ''}{listing.state}
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Lot Quantity, Price & Total Value */}
      <div className="grid grid-cols-3 gap-3 sm:gap-6 py-2 md:py-0 border-y md:border-y-0 md:border-x md:px-6 border-[#E5EDE8] text-xs">
        <div>
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">Lot Qty</span>
          <span className={`font-extrabold text-sm ${isSoldOut ? 'text-amber-700' : 'text-[#0B3326]'}`}>
            {isSoldOut ? '0 (Sold)' : `${listing.quantity} ${listing.unit || 'kg'}`}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">Unit Price</span>
          <span className="font-extrabold text-sm text-[#0B3326]">
            ₹{listing.price}/{listing.unit || 'kg'}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">Total Est.</span>
          <span className="font-extrabold text-sm text-[#10B981]">
            ₹{totalVal.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Right: Status Badge & Actions */}
      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
        <div>
          {isSoldOut ? (
            <Badge variant="dark" size="sm" dot={false}>
              Sold Out
            </Badge>
          ) : (
            <Badge variant="emerald" size="sm" dot={true}>
              Active
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onEdit && !isSoldOut && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEdit(listing)}
              icon={Edit3}
              iconPosition="left"
              className="text-xs font-semibold py-1.5 px-3 border-[#E5EDE8] hover:border-[#10B981] cursor-pointer"
            >
              Edit
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(listing)}
            icon={Eye}
            iconPosition="left"
            className="text-xs font-bold py-1.5 px-3 bg-[#F2FBF6] text-[#0B3326] hover:bg-[#E5EDE8] cursor-pointer"
          >
            Details
          </Button>
        </div>
      </div>
    </div>
  );
}
