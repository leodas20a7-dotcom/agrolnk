import React from 'react';

export default function Card({
  children,
  className = '',
  hoverEffect = false,
  dark = false,
  ...props
}) {
  const baseStyles = 'rounded-2xl transition-all duration-200';
  const surfaceStyles = dark
    ? 'bg-[#0B3326] text-white border border-[#14624A] shadow-md'
    : 'bg-white text-[#14211D] border border-[#E5EDE8] shadow-xs';

  const hoverStyles = hoverEffect
    ? 'hover:-translate-y-0.5 hover:shadow-md hover:border-[#10B981]/50'
    : '';

  return (
    <div
      className={`${baseStyles} ${surfaceStyles} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
