import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import {
  DollarSign,
  Landmark,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Plus
} from 'lucide-react';
import { addLiquidityPoolFunds } from '../../utils/financing';

export default function AddLiquidityModal({ isOpen, onClose, onAdded }) {
  const [amount, setAmount] = useState(500000);
  const [allocating, setAllocating] = useState(false);
  const [success, setSuccess] = useState(false);

  const presets = [
    { label: '₹2.5 Lakhs', value: 250000 },
    { label: '₹5.0 Lakhs', value: 500000 },
    { label: '₹10 Lakhs', value: 1000000 },
    { label: '₹25 Lakhs', value: 2500000 },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setAllocating(true);

    try {
      addLiquidityPoolFunds(amount);
      setSuccess(true);
      setTimeout(() => {
        onAdded?.();
        onClose();
        setSuccess(false);
        setAllocating(false);
      }, 1000);
    } catch (err) {
      console.error(err);
      setAllocating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Deploy Capital to Liquidity Pool"
      subtitle="Expand your institutional lending allocation for farmgate advances & invoice financing"
      icon={Landmark}
      iconColor="text-[#10B981]"
      iconBg="bg-[#EBF5F0]"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-left">
        {success && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Successfully added ₹{amount.toLocaleString('en-IN')} to lending liquidity pool!</span>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-bold text-[#14211D] block">
            Allocation Amount (₹)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            min={50000}
            step={50000}
            className="w-full px-4 py-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-base font-bold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            required
          />

          <div className="flex flex-wrap gap-2 pt-1">
            {presets.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setAmount(p.value)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  amount === p.value
                    ? 'bg-[#0B3326] text-white border-[#0B3326]'
                    : 'bg-white text-[#566861] border-[#E5EDE8] hover:border-[#10B981]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#EBF5F0] border border-[#10B981]/25 text-xs text-[#0B3326] space-y-1.5">
          <div className="flex items-center gap-2 font-bold">
            <TrendingUp className="w-4 h-4 text-[#10B981]" />
            <span>Target Portfolio Yield: 11.4% APR</span>
          </div>
          <p className="text-[11px] text-[#566861]">
            Funds are earmarked exclusively for certified WDRA warehouse inventory loans and verified buyer escrow trade discounting.
          </p>
        </div>

        <div className="pt-2 border-t border-[#E5EDE8] flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={allocating}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="accent"
            size="sm"
            disabled={allocating}
            icon={Plus}
            iconPosition="left"
            className="font-bold cursor-pointer"
          >
            {allocating ? 'Deploying...' : `Confirm Allocation ₹${amount.toLocaleString('en-IN')}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
