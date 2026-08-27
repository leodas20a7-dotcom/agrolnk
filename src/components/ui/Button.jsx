import React from 'react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon: Icon,
  iconPosition = 'left',
  onClick,
  disabled = false,
  type = 'button',
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const variants = {
    primary:
      'bg-[#0B3326] text-white hover:bg-[#0F4A37] focus:ring-[#10B981] shadow-sm hover:shadow-md hover:shadow-[#0B3326]/10 border border-[#0F4A37]',
    accent:
      'bg-[#10B981] text-white hover:bg-[#059669] focus:ring-[#10B981] shadow-sm shadow-[#10B981]/25 hover:shadow-md hover:shadow-[#10B981]/30 font-semibold',
    secondary:
      'bg-white text-[#14211D] border border-[#E5EDE8] hover:border-[#10B981]/40 hover:bg-[#F2FBF6] focus:ring-[#10B981] shadow-xs',
    outline:
      'bg-transparent border border-[#0B3326]/20 text-[#0B3326] hover:bg-[#0B3326]/5 focus:ring-[#10B981]',
    ghost:
      'bg-transparent text-[#566861] hover:text-[#0B3326] hover:bg-[#EBF5F0]/60 focus:ring-gray-300',
    white:
      'bg-white text-[#0B3326] hover:bg-[#F8FAF8] focus:ring-white shadow-md font-semibold border border-white/80',
  };

  const sizes = {
    sm: 'text-xs px-3.5 py-1.5 gap-1.5',
    md: 'text-sm px-5 py-2.5 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5 font-semibold',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {Icon && iconPosition === 'left' && (
        <Icon className={`w-4 h-4 ${size === 'lg' ? 'w-5 h-5' : ''}`} />
      )}
      <span>{children}</span>
      {Icon && iconPosition === 'right' && (
        <Icon className={`w-4 h-4 ${size === 'lg' ? 'w-5 h-5' : ''}`} />
      )}
    </button>
  );
}
