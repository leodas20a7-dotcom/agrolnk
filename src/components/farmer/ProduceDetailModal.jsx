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
  Check,
  Trash2
} from 'lucide-react';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

import { COMMODITY_IMAGES } from '../../utils/listings';
import { copyToClipboard } from '../../context/ToastContext';
import { hasSpecificVariety } from '../../data/commodityTaxonomy';
import ProductMediaSlider from '../ui/ProductMediaSlider';

export default function ProduceDetailModal({
  listing,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) {
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  if (!listing) return null;

  const isAuction = listing.saleType === 'auction';
  const isSoldOut = listing.status === 'sold' || Number(listing.quantity || 0) <= 0;
  const totalValue =
    Number(listing.quantity || 0) * Number(listing.price || 0);
  const fallbackImg = COMMODITY_IMAGES[listing.commodity] || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80';

  const shortLotId = listing.id ? (listing.id.length > 12 ? listing.id.slice(0, 8) : listing.id) : '---';

  const handleCopyId = async (e) => {
    e?.stopPropagation?.();
    const ok = await copyToClipboard(listing.id, `Lot #${shortLotId} ID`);
    if (ok) {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleCopy = async () => {
    const text = `AgroLnk Produce Lot #${listing.id}: ${listing.commodity} (${listing.variety || 'Standard'}), ${listing.quantity} ${listing.unit} at ₹${listing.price}/${listing.unit} from ${listing.district || ''}, ${listing.state}. Grade ${listing.grade}.`;
    const ok = await copyToClipboard(text, `Lot #${shortLotId} Specifications`);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Produce Lot Details"
      subtitle={
        <span className="flex flex-wrap items-center gap-1.5 text-xs text-[#566861]">
          <span>Lot Reference</span>
          <button
            type="button"
            onClick={handleCopyId}
            title={`Full UUID: ${listing.id} (Click to copy)`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#EBF5F0] hover:bg-[#D5EFE3] text-[#0B3326] border border-[#10B981]/30 font-mono text-[11px] font-bold transition-all cursor-pointer shadow-2xs group"
          >
            <span>#{shortLotId}</span>
            {copiedId ? (
              <Check className="w-3 h-3 text-[#10B981]" />
            ) : (
              <Copy className="w-3 h-3 text-[#566861] group-hover:text-[#10B981]" />
            )}
          </button>
          <span className="text-[#A3B3AA]">•</span>
          <span>{isSoldOut ? 'Sold Out Produce Lot' : 'Live on National Marketplace'}</span>
        </span>
      }
      icon={Package}
      iconColor="text-[#10B981]"
      iconBg="bg-[#EBF5F0]"
      maxWidth="max-w-2xl"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
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

            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete?.(listing);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="px-4 py-2"
            >
              Close
            </Button>
            {onEdit && (
              <Button
                variant="accent"
                size="sm"
                icon={Edit3}
                iconPosition="left"
                onClick={() => {
                  onClose();
                  onEdit(listing);
                }}
                className="px-5 py-2 font-bold"
              >
                Edit Listing
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Hero Section with ProductMediaSlider & Badges */}
        <ProductMediaSlider
          media={listing.images || []}
          commodity={listing.commodity}
          aspectClassName="h-56 sm:h-64"
          overlayBadges={
            <>
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
              {isSoldOut ? (
                <Badge variant="dark" size="sm" dot={false}>
                  Sold Out
                </Badge>
              ) : (
                <Badge variant="emerald" size="sm" dot={true}>
                  Active &amp; Visible
                </Badge>
              )}
            </>
          }
          bottomOverlay={
            <div className="rounded-2xl bg-[#0B3326] border border-[#14624A] shadow-xl p-3.5 sm:p-4 flex items-center justify-between text-white">
              <div>
                <h4 className="text-lg sm:text-xl font-extrabold font-heading text-white tracking-tight">
                  {listing.commodity}
                </h4>
                {hasSpecificVariety(listing.variety) && (
                  <p className="text-xs text-[#DCFCE7]/90 font-medium mt-0.5">
                    Variety: {listing.variety}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#DCFCE7]/70 block uppercase tracking-wider font-bold">
                  Est. Lot Value
                </span>
                <span className="text-lg sm:text-xl font-extrabold text-[#34D399]">
                  ₹{totalValue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          }
        />

        {/* Highlight Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8]">
            <span className="text-[10px] text-[#566861] uppercase tracking-wider font-bold block">
              Total Quantity
            </span>
            <span className="text-base font-extrabold text-[#14211D]">
              {listing.quantity} {listing.unit}
            </span>
            {Number(listing.minOrderQuantity || 0) > 0 && (
              <span className="text-[10px] font-bold text-[#0F5238] block mt-0.5">
                MOQ: {listing.minOrderQuantity} {listing.unit}
              </span>
            )}
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
              {isSoldOut ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  <span className="text-amber-700">Sold Out</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  <span>Active</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Produce Detailing & Farmer Notes */}
        {listing.description && (
          <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-1.5 text-xs text-[#2D5A47]">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#0B3326] flex items-center gap-1.5">
              Produce Detailing & Special Notes
            </h5>
            <p className="leading-relaxed whitespace-pre-line text-[#14211D]">
              {listing.description}
            </p>
          </div>
        )}

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
                  {listing.district ? `${listing.district}, ` : ''}{listing.state || 'India'}
                </span>
              </div>
            </div>

            {listing.village && Boolean(onEdit) && (
              <div className="flex items-center gap-2.5 text-[#14211D]">
                <MapPin className="w-4 h-4 text-[#10B981] shrink-0" />
                <div>
                  <span className="text-[#566861] block text-[11px]">Pickup Address / Depot (Private)</span>
                  <span className="font-semibold">
                    {listing.village}{listing.landmark ? ` (Near: ${listing.landmark})` : ''}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5 text-[#14211D]">
              <Tag className="w-4 h-4 text-[#10B981] shrink-0" />
              <div>
                <span className="text-[#566861] block text-[11px]">Trading Method</span>
                <span className="font-semibold">
                  {isAuction ? 'Live Digital Auction' : 'Direct Fixed-Price'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-[#14211D]">
              <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
              <div>
                <span className="text-[#566861] block text-[11px]">Producer Identity</span>
                <span className="font-semibold text-[#10B981]">
                  KYC Verified Farmer ✓
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2.5 text-[#14211D] col-span-1 sm:col-span-2 p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
              <div className="flex items-center gap-2.5 min-w-0">
                <Package className="w-4 h-4 text-[#10B981] shrink-0" />
                <div className="min-w-0">
                  <span className="text-[#566861] block text-[10px] uppercase font-bold tracking-wider">
                    Full System Lot UID
                  </span>
                  <span className="font-mono text-xs text-[#0B3326] font-semibold break-all">
                    {listing.id}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyId}
                className="p-1.5 px-2 rounded-lg border border-[#E5EDE8] hover:border-[#10B981] bg-white text-[#566861] hover:text-[#0B3326] transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                title="Copy full UID"
              >
                {copiedId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#10B981]" />
                    <span className="text-[#10B981] text-[10px] font-bold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Live Marketplace Notice */}
        <div className="p-3.5 rounded-2xl bg-[#F2FBF6] border border-[#DCFCE7] flex items-start gap-3">
          <div className="w-7 h-7 rounded-xl bg-[#DCFCE7] text-[#10B981] flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-xs text-[#0F4A37] leading-relaxed">
            {isSoldOut ? (
              <span>This produce lot has been <strong>100% procured and sold</strong>. It is no longer listed in the buyer marketplace.</span>
            ) : (
              <span>This produce lot is currently <strong>Active</strong> in the national exchange. Verified institutional buyers, processors, and aggregators can discover and purchase it directly through instant escrow contracts.</span>
            )}
          </p>
        </div>
      </div>
    </Modal>
  );
}
