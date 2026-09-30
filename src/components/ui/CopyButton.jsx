import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { copyToClipboard } from '../../context/ToastContext';

export default function CopyButton({
  text,
  label = '',
  variant = 'icon', // 'icon' | 'badge' | 'inline'
  className = '',
  title = 'Copy to clipboard',
  children,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!text) return;

    const ok = await copyToClipboard(text, label);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  if (variant === 'badge') {
    return (
      <button
        type="button"
        onClick={handleCopy}
        title={title}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
          copied
            ? 'bg-[#10B981]/20 text-[#059669] border border-[#10B981]/40'
            : 'bg-[#F8FAF8] hover:bg-[#EBF5F0] text-[#0B3326] border border-[#E5EDE8] hover:border-[#10B981]/30'
        } ${className}`}
      >
        <span>{children || text}</span>
        {copied ? (
          <Check className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-[#566861] group-hover:text-[#0B3326] shrink-0" />
        )}
      </button>
    );
  }

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={handleCopy}
        title={title}
        className={`inline-flex items-center gap-1 text-xs text-[#566861] hover:text-[#0B3326] transition-colors cursor-pointer ${className}`}
      >
        {children}
        {copied ? (
          <Check className="w-3 h-3 text-[#10B981] shrink-0" />
        ) : (
          <Copy className="w-3 h-3 text-[#566861] shrink-0" />
        )}
      </button>
    );
  }

  // Default: 'icon'
  return (
    <button
      type="button"
      onClick={handleCopy}
      title={title}
      aria-label={`Copy ${label || text}`}
      className={`p-1 rounded-lg text-[#566861] hover:text-[#0B3326] hover:bg-[#EBF5F0] transition-all cursor-pointer inline-flex items-center justify-center shrink-0 ${
        copied ? 'text-[#10B981] bg-[#10B981]/10' : ''
      } ${className}`}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-[#10B981]" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {children && <span className="ml-1 text-xs">{children}</span>}
    </button>
  );
}
