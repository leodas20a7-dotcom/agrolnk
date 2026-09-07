import React from 'react';
import { calculateOrderFinancials, formatINR } from '../../utils/commission';
import { Info, ShieldCheck, Landmark } from 'lucide-react';

export default function CommissionBreakdownPill({
  amount,
  viewerRole = 'buyer', // 'buyer' | 'farmer' | 'admin'
  className = '',
}) {
  const fin = calculateOrderFinancials(amount);

  if (viewerRole === 'admin') {
    return (
      <div className={`p-3 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] text-xs space-y-1.5 ${className}`}>
        <div className="flex items-center justify-between font-bold text-[#34D399]">
          <span className="flex items-center gap-1.5">
            <Landmark className="w-3.5 h-3.5" /> AgroLnk Platform Fee (0.50%)
          </span>
          <span>{formatINR(fin.totalPlatformCommission)}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-[#DCFCE7]/80 pt-1 border-t border-[#14624A]">
          <span>Buyer Side (0.25%): {formatINR(fin.buyerFee)}</span>
          <span>Seller Side (0.25%): {formatINR(fin.sellerFee)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs text-[#566861] space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 font-medium text-[#14211D]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
          {viewerRole === 'buyer' ? 'AgroLnk Buyer Fee (0.25%)' : 'AgroLnk Seller Fee (0.25%)'}
        </span>
        <span className="font-bold text-[#0B3326]">
          {formatINR(viewerRole === 'buyer' ? fin.buyerFee : fin.sellerFee)}
        </span>
      </div>
      <p className="text-[10px] text-[#566861]">
        {viewerRole === 'buyer'
          ? 'Pure platform fee for digital escrow protection and GPS dispatch telemetry.'
          : 'Standard 0.25% transaction fee auto-deducted upon verified delivery release.'}
      </p>
    </div>
  );
}
