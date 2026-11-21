import React from 'react';
import { Download } from 'lucide-react';
import { downloadPaymentReceipt } from '../../utils/paymentReceipt';

/**
 * Compact icon-only receipt download button.
 * Pass either a ready `receipt` config or a `buildReceipt` function (evaluated lazily on click).
 */
export default function ReceiptDownloadButton({
  receipt,
  buildReceipt,
  title = 'Download receipt',
  className = '',
  size = 'sm', // 'sm' | 'md'
  tone = 'light', // 'light' | 'dark'
}) {
  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const config = typeof buildReceipt === 'function' ? buildReceipt() : receipt;
      if (config) downloadPaymentReceipt(config);
    } catch (err) {
      console.error('Receipt generation failed:', err);
    }
  };

  const sizeCls = size === 'md' ? 'w-9 h-9' : 'w-7 h-7';
  const iconCls = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  const toneCls =
    tone === 'dark'
      ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
      : 'border-[#E5EDE8] bg-white text-[#0B3326] hover:border-[#10B981]/50 hover:bg-[#EBF5F0]';

  return (
    <button
      type="button"
      onClick={handleClick}
      title={title}
      aria-label={title}
      className={`inline-flex items-center justify-center shrink-0 rounded-lg border transition-all cursor-pointer ${sizeCls} ${toneCls} ${className}`}
    >
      <Download className={iconCls} />
    </button>
  );
}
