import React from 'react';

export default function Badge({
  children,
  variant = 'emerald',
  size = 'md',
  dot = false,
  className = '',
}) {
  const variants = {
    emerald: 'bg-[#F2FBF6] text-[#0B3326] border border-[#10B981]/25',
    dark: 'bg-[#0B3326] text-white border border-[#14624A]',
    accent: 'bg-[#10B981] text-white',
    amber: 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]',
    blue: 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]',
    neutral: 'bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 font-medium tracking-wide',
    md: 'text-xs px-2.5 py-1 font-semibold tracking-wide',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  };

  const dotColors = {
    emerald: 'bg-[#10B981]',
    dark: 'bg-[#10B981]',
    accent: 'bg-white',
    amber: 'bg-[#F59E0B]',
    blue: 'bg-[#3B82F6]',
    neutral: 'bg-gray-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${variants[variant] || variants.emerald} ${sizes[size] || sizes.md} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotColors[variant] || 'bg-[#10B981]'}`}
        />
      )}
      {children}
    </span>
  );
}
