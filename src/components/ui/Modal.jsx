import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-[#10B981]',
  iconBg = 'bg-[#EBF5F0]',
  children,
  maxWidth = 'max-w-2xl',
  showClose = true,
  footer,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-white rounded-3xl w-full ${maxWidth} max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] flex flex-col border border-[#E5EDE8] shadow-2xl text-left my-auto animate-in zoom-in-95 duration-200 relative overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed at Top */}
        {(title || showClose) && (
          <div className="flex items-start justify-between p-5 sm:p-6 pb-4 border-b border-[#E5EDE8] gap-4 shrink-0 bg-white z-10">
            <div className="flex items-center gap-3">
              {Icon && (
                <div
                  className={`w-10 h-10 rounded-2xl ${iconBg} flex items-center justify-center shrink-0`}
                >
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
              )}
              <div>
                {title && (
                  <h3 className="text-lg sm:text-xl font-extrabold text-[#0B3326] font-heading">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-[#566861] mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>

            {showClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content - Smoothly Scrollable */}
        <div className="text-sm text-[#14211D] p-5 sm:p-6 overflow-y-auto flex-1 overscroll-contain">
          {children}
        </div>

        {/* Footer - Fixed at Bottom */}
        {footer && (
          <div className="p-4 sm:p-6 pt-4 border-t border-[#E5EDE8] flex flex-wrap items-center justify-end gap-3 shrink-0 bg-[#FAFBF9] z-10">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
