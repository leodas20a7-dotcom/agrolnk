import React, { useState } from 'react';
import {
  X,
  MapPin,
  Tag,
  Gavel,
  Clock,
  ShieldCheck,
  Package,
  Calendar,
  Layers,
  Edit3,
  CheckCircle2,
  Share2,
  Copy,
  Check
} from 'lucide-react';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

import { COMMODITY_IMAGES } from '../../utils/listings';

export default function ProduceDetailModal({
  listing,
  isOpen,
  onClose,
  onEdit,
}) {
  const [copied, setCopied] = useState(false);

  if (!listing) return null;

  const isAuction = listing.saleType === 'auction';
  const totalValue =
    Number(listing.quantity || 0) * Number(listing.price || 0);
  const fallbackImg = COMMODITY_IMAGES[listing.commodity] || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80';

  const handleCopy = () => {
    const text = `Agramaz Produce Lot #${listing.id}: ${listing.commodity} (${listing.variety || 'Standard'}), ${listing.quantity} ${listing.unit} at ₹${listing.price}/${listing.unit} from ${listing.district || ''}, ${listing.state}. Grade ${listing.grade}.`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Produce Lot Details"
      subtitle={`Lot Reference #${listing.id} • Live on National Marketplace`}
      icon={Package}
      iconColor="text-[#10B981]"
      iconBg="bg-[#EBF5F0]"
      maxWidth="max-w-2xl"
      footer={
        <div className="flex items-center justify-between w-full gap-3">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#566861] hover:text-[#0B3326] px-3 py-2 rounded-xl hover:bg-[#F2FBF6] transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#10B981]" />
                <span className="text-[#10B981]">Copied details</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Share Lot Reference</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="px-4 py-2"
            >
              Close
            </Button>
            <Button
              variant="accent"
              size="sm"
              icon={Edit3}
              iconPosition="left"
              onClick={() => {
                onClose();
                onEdit?.(listing);
              }}
              className="px-5 py-2 font-bold"
            >
              Edit Listing
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Hero Section with Image & Badges */}
        <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden bg-[#F8FAF8] border border-[#E5EDE8]">
          <img
            src={listing.images?.[0] || fallbackImg}
            alt={listing.commodity}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = fallbackImg;
            }}
            className="w-full h-full object-cover"
          />

          {/* Floating Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
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
              Active & Visible
            </Badge>
          </div>

          {/* Bottom Banner */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex items-end justify-between text-white">
            <div>
              <h4 className="text-xl font-black font-heading text-white">
                {listing.commodity}
              </h4>
              <p className="text-xs text-white/90 font-medium">
                {listing.variety ? `Variety: ${listing.variety}` : 'Commercial Standard Grade'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-white/80 block uppercase tracking-wider font-semibold">
                Est. Lot Value
              </span>
              <span className="text-lg font-black text-[#34D399]">
                ₹{totalValue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Highlight Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8]">
            <span className="text-[10px] text-[#566861] uppercase tracking-wider font-bold block">
              Total Quantity
            </span>
            <span className="text-base font-extrabold text-[#14211D]">
              {listing.quantity} {listing.unit}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8]">
            <span className="text-[10px] text-[#566861] uppercase tracking-wider font-bold block">
              {isAuction ? 'Base / Bid Price' : 'Direct Price'}
            </span>
            <span className="text-base font-extrabold text-[#0B3326]">
              ₹{listing.price} / {listing.unit}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8]">
            <span className="text-[10px] text-[#566861] uppercase tracking-wider font-bold block">
              Quality Grade
            </span>
            <span className="text-base font-extrabold text-[#10B981] flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Grade {listing.grade}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8]">
            <span className="text-[10px] text-[#566861] uppercase tracking-wider font-bold block">
              Market Status
            </span>
            <span className="text-base font-extrabold text-[#0B3326] flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" /> Active
            </span>
          </div>
        </div>

        {/* Detailed Information Rows */}
        <div className="p-4 rounded-2xl bg-white border border-[#E5EDE8] space-y-3">
          <h5 className="text-xs font-bold uppercase tracking-wider text-[#566861]">
            Lot Specifications & Location
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-[#14211D]">
              <MapPin className="w-4 h-4 text-[#10B981] shrink-0" />
              <div>
                <span className="text-[#566861] block text-[11px]">Origin Location</span>
                <span className="font-semibold">
                  {listing.district ? `${listing.district}, ` : ''}{listing.state}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-[#14211D]">
              <Calendar className="w-4 h-4 text-[#10B981] shrink-0" />
              <div>
                <span className="text-[#566861] block text-[11px]">Harvest Date</span>
                <span className="font-semibold">
                  {listing.harvestDate || 'Recently Harvested'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-[#14211D]">
              <Layers className="w-4 h-4 text-[#10B981] shrink-0" />
              <div>
                <span className="text-[#566861] block text-[11px]">Packaging Type</span>
                <span className="font-semibold">
                  {listing.packaging || 'Crates / Standard Ag Packaging'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-[#14211D]">
              <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
              <div>
                <span className="text-[#566861] block text-[11px]">Assay Verification</span>
                <span className="font-semibold text-[#10B981]">
                  NABL Quality Assayed
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Marketplace Notice */}
        <div className="p-3.5 rounded-2xl bg-[#F2FBF6] border border-[#DCFCE7] flex items-start gap-3">
          <div className="w-7 h-7 rounded-xl bg-[#DCFCE7] text-[#10B981] flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-xs text-[#0F4A37] leading-relaxed">
            This produce lot is currently <strong>Active</strong> in the national exchange. Verified institutional buyers, processors, and aggregators can discover and purchase it directly through instant escrow contracts.
          </p>
        </div>
      </div>
    </Modal>
  );
}
