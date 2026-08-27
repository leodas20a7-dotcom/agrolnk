import React, { useState } from 'react';
import { X, Sparkles, Building2, Package, Gavel, ArrowRight, AlertCircle, ShieldCheck, Tag } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { listProduceFromInventory } from '../../utils/warehouses';

export default function ListFromInventoryModal({
  inventory,
  currentUser,
  onClose,
  onSuccess,
}) {
  const [saleType, setSaleType] = useState('direct'); // 'direct' | 'auction'
  const [quantity, setQuantity] = useState(String(inventory?.availableQuantity || 500));
  const [pricePerUnit, setPricePerUnit] = useState('45');
  const [reservePrice, setReservePrice] = useState('48');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (inventory?.availableQuantity) {
      setQuantity(String(inventory.availableQuantity));
    }
  }, [inventory]);

  if (!inventory) return null;

  const maxAvailable = inventory.availableQuantity || 0;
  const totalListedValue = (Number(quantity) || 0) * (Number(pricePerUnit) || 0);

  const handleSubmit = (e) => {
    e.preventDefault();

    const numQty = Number(quantity);
    if (!numQty || numQty <= 0) {
      setError('Please enter a valid quantity.');
      return;
    }

    if (numQty > maxAvailable) {
      setError(`Cannot list more than available stored quantity (${maxAvailable} ${inventory.unit}).`);
      return;
    }

    setIsSubmitting(true);

    try {
      const tradeData = {
        saleType,
        quantity: numQty,
        pricePerUnit: Number(pricePerUnit),
        reservePrice: Number(reservePrice),
      };

      const result = listProduceFromInventory(inventory.id, tradeData);
      setIsSubmitting(false);
      onSuccess?.(result, saleType);
      onClose();
    } catch (err) {
      console.error('Failed to list from warehouse inventory:', err);
      setError('Failed to create listing from warehouse. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-4 sm:p-6 flex min-h-full items-start justify-center">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-[#E5EDE8] shadow-2xl space-y-6 text-left my-6 animate-in fade-in zoom-in-95 duration-200 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#34D399]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0B3326] font-heading">
                Sell Directly from Warehouse
              </h3>
              <span className="text-xs text-[#566861]">
                Trade stored lot without physical movement ({inventory.receiptNumber})
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stored Lot Summary */}
        <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-bold text-[#14211D]">
                {inventory.commodity}
              </h4>
              <span className="text-[#566861]">
                Grade {inventory.grade} • {inventory.variety}
              </span>
            </div>
            <Badge variant="emerald" size="sm">
              {inventory.receiptNumber}
            </Badge>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#E5EDE8]">
            <span className="text-[#566861]">Stored At:</span>
            <span className="font-semibold text-[#14211D]">{inventory.warehouseName}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#566861]">Available Storage Balance:</span>
            <span className="font-extrabold text-[#0B3326] text-sm">
              {maxAvailable} {inventory.unit}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Sale Format Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
              Marketplace Trade Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSaleType('direct')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  saleType === 'direct'
                    ? 'border-[#10B981] bg-[#F2FBF6] shadow-xs'
                    : 'border-[#E5EDE8] bg-white hover:border-[#10B981]/40'
                }`}
              >
                <Tag className={`w-5 h-5 ${saleType === 'direct' ? 'text-[#10B981]' : 'text-[#566861]'}`} />
                <div>
                  <span className="text-xs font-bold text-[#0B3326] block">Fixed-Price Direct Sale</span>
                  <span className="text-[10px] text-[#566861]">Instant buyer checkout</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSaleType('auction')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  saleType === 'auction'
                    ? 'border-[#10B981] bg-[#F2FBF6] shadow-xs'
                    : 'border-[#E5EDE8] bg-white hover:border-[#10B981]/40'
                }`}
              >
                <Gavel className={`w-5 h-5 ${saleType === 'auction' ? 'text-[#10B981]' : 'text-[#566861]'}`} />
                <div>
                  <span className="text-xs font-bold text-[#0B3326] block">Live Clock Auction</span>
                  <span className="text-[10px] text-[#566861]">Competitive bidding lot</span>
                </div>
              </button>
            </div>
          </div>

          {/* Quantity to List */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                Quantity to List ({inventory.unit})
              </label>
              <button
                type="button"
                onClick={() => setQuantity(String(maxAvailable))}
                className="text-[11px] font-bold text-[#10B981] hover:underline cursor-pointer"
              >
                Max ({maxAvailable} {inventory.unit})
              </button>
            </div>

            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="50"
              max={maxAvailable}
              step="50"
              className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E5EDE8] text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] shadow-xs"
              required
            />
          </div>

          {/* Pricing Parameters */}
          {saleType === 'direct' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                Selling Price per {inventory.unit} (₹)
              </label>
              <input
                type="number"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                min="1"
                step="0.5"
                className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E5EDE8] text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] shadow-xs"
                required
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                  Starting Bid (₹/{inventory.unit})
                </label>
                <input
                  type="number"
                  value={pricePerUnit}
                  onChange={(e) => setPricePerUnit(e.target.value)}
                  min="1"
                  step="0.5"
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E5EDE8] text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] shadow-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                  Reserve Floor (₹/{inventory.unit})
                </label>
                <input
                  type="number"
                  value={reservePrice}
                  onChange={(e) => setReservePrice(e.target.value)}
                  min="1"
                  step="0.5"
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E5EDE8] text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] shadow-xs"
                  required
                />
              </div>
            </div>
          )}

          {/* Trade Value Preview */}
          <div className="p-4 rounded-2xl bg-[#EBF5F0] border border-[#10B981]/25 flex items-center justify-between text-xs">
            <div>
              <span className="text-[#0B3326] font-semibold block">Total Trade Volume Value</span>
              <span className="text-[11px] text-[#566861]">100% Escrow deposit protected</span>
            </div>
            <span className="text-xl font-extrabold text-[#0B3326] font-heading">
              ₹{totalListedValue.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#E5EDE8] flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onClose}
              className="text-xs text-[#566861]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="md"
              disabled={isSubmitting}
              icon={ArrowRight}
              iconPosition="right"
              className="font-bold py-2.5 px-6 shadow-xs cursor-pointer"
            >
              {isSubmitting ? 'Publishing...' : 'Publish to Exchange'}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
}
