import React, { useState } from 'react';
import { X, ShieldCheck, Check, AlertCircle, ShoppingBag } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

export default function OrderModal({ listing, isOpen, onClose, onConfirm }) {
  const [purchaseQty, setPurchaseQty] = useState(listing ? Math.min(100, listing.quantity) : 100);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (listing?.quantity) {
      setPurchaseQty(Math.min(100, listing.quantity));
    }
  }, [listing]);

  if (!isOpen || !listing) return null;

  const subtotal = Number(purchaseQty || 0) * Number(listing.price || 0);

  const handleConfirmOrder = () => {
    setError('');
    const qty = Number(purchaseQty);

    if (!qty || qty <= 0) {
      setError('Please enter a valid purchase quantity.');
      return;
    }
    if (qty > listing.quantity) {
      setError(`Cannot purchase more than available quantity (${listing.quantity} ${listing.unit}).`);
      return;
    }

    setIsSubmitting(true);
    onConfirm({
      listingId: listing.id,
      farmerId: listing.farmerId,
      farmerName: listing.farmerName,
      commodity: listing.commodity,
      variety: listing.variety,
      grade: listing.grade,
      quantity: qty,
      unit: listing.unit,
      pricePerUnit: listing.price,
      totalAmount: subtotal,
      state: listing.state,
      district: listing.district,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] flex flex-col border border-[#E5EDE8] shadow-2xl text-left my-auto animate-in zoom-in-95 duration-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-[#E5EDE8] shrink-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0B3326] font-heading">
                Confirm Purchase
              </h3>
              <span className="text-xs text-[#566861]">Direct Procurement Order</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 overscroll-contain">

          {/* Error Alert */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Produce Overview Snapshot */}
          <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-[#0B3326] font-heading">
                  {listing.commodity}
                </h4>
                <Badge variant="emerald" size="sm">
                  Grade {listing.grade}
                </Badge>
              </div>
              <p className="text-xs text-[#566861] mt-0.5">
                Available lot: <strong className="text-[#14211D]">{listing.quantity} {listing.unit}</strong>
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-[#566861] block">Price</span>
              <span className="text-base font-bold text-[#0B3326]">
                ₹{listing.price} / {listing.unit}
              </span>
            </div>
          </div>

          {/* Quantity Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#14211D]">
              Quantity to Purchase ({listing.unit})
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max={listing.quantity}
                value={purchaseQty}
                onChange={(e) => setPurchaseQty(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#E5EDE8] text-base font-bold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981] transition-all"
              />
              <button
                type="button"
                onClick={() => setPurchaseQty(listing.quantity)}
                className="px-3 py-2.5 rounded-xl text-xs font-bold bg-[#EBF5F0] text-[#0B3326] hover:bg-[#10B981] hover:text-white transition-colors cursor-pointer"
              >
                Buy Entire Lot
              </button>
            </div>
            <span className="text-[11px] text-[#566861] block">
              Max available: {listing.quantity} {listing.unit}
            </span>
          </div>

          {/* Subtotal Calculation Box */}
          <div className="p-4 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#DCFCE7]/80">
              <span>Calculation</span>
              <span>
                {purchaseQty || 0} {listing.unit} × ₹{listing.price}
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-1 border-t border-[#14624A]">
              <span className="text-sm font-semibold text-white">Subtotal</span>
              <span className="text-2xl font-extrabold font-heading text-white">
                ₹{subtotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Escrow Notice */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#EBF5F0] border border-[#10B981]/25 text-xs text-[#0B3326]">
            <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
            <span>Payment is held safely in escrow until produce delivery is verified.</span>
          </div>

        </div>

        {/* Fixed Actions Footer */}
        <div className="p-4 sm:p-6 pt-4 border-t border-[#E5EDE8] flex items-center gap-3 shrink-0 bg-[#FAFBF9]">
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 justify-center font-semibold text-xs py-3 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleConfirmOrder}
            disabled={isSubmitting}
            icon={Check}
            iconPosition="right"
            className="flex-1 justify-center font-bold text-xs py-3 shadow-xs cursor-pointer"
          >
            {isSubmitting ? 'Confirming...' : 'Confirm Order'}
          </Button>
        </div>

      </div>
    </div>
  );
}
