import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, Copy, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
  showToast: () => {},
  copyToClipboard: async () => false,
});

/**
 * Global toast dispatcher accessible anywhere in the app without hooks
 */
export function showGlobalToast({
  message,
  type = 'success',
  title = '',
  duration = 3200,
  action = null,
}) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('agrolnk_toast', {
        detail: {
          id: `toast_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          message,
          type,
          title,
          duration,
          action,
        },
      })
    );
  }
}

/**
 * Universal copy helper with toast notification
 */
export async function copyToClipboard(text, label = '') {
  if (!text) return false;

  let success = false;
  const stringValue = String(text).trim();

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(stringValue);
      success = true;
    }
  } catch (err) {
    console.warn('Standard clipboard write failed, trying fallback:', err);
  }

  if (!success) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = stringValue;
      textarea.style.position = 'fixed';
      textarea.style.left = '-999999px';
      textarea.style.top = '-999999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      success = document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch (fallbackErr) {
      console.error('Fallback clipboard copy failed:', fallbackErr);
    }
  }

  if (success) {
    const displayMsg = label
      ? `${label} copied to clipboard`
      : `Copied "${stringValue.length > 28 ? stringValue.slice(0, 25) + '...' : stringValue}"`;

    showGlobalToast({
      type: 'copy',
      title: 'Copied to Clipboard',
      message: displayMsg,
      duration: 2800,
    });
  } else {
    showGlobalToast({
      type: 'error',
      title: 'Copy Failed',
      message: 'Could not write to clipboard. Please copy manually.',
      duration: 3500,
    });
  }

  return success;
}

/**
 * Convenient toast namespace
 */
export const toast = {
  success: (message, options = {}) =>
    showGlobalToast({ message, type: 'success', ...options }),
  error: (message, options = {}) =>
    showGlobalToast({ message, type: 'error', ...options }),
  info: (message, options = {}) =>
    showGlobalToast({ message, type: 'info', ...options }),
  warning: (message, options = {}) =>
    showGlobalToast({ message, type: 'warning', ...options }),
  copy: (text, label = '') => copyToClipboard(text, label),
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ id, message, type = 'success', title = '', duration = 3200, action = null }) => {
      const toastId = id || `toast_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      setToasts((prev) => {
        // Keep max 4 toasts at once to prevent viewport clutter
        const filtered = prev.filter((t) => t.id !== toastId);
        return [...filtered.slice(-3), { id: toastId, message, type, title, duration, action }];
      });

      if (duration && duration > 0) {
        timersRef.current[toastId] = setTimeout(() => {
          removeToast(toastId);
        }, duration);
      }
    },
    [removeToast]
  );

  useEffect(() => {
    const handleToastEvent = (e) => {
      if (e.detail) {
        addToast(e.detail);
      }
    };

    window.addEventListener('agrolnk_toast', handleToastEvent);

    return () => {
      window.removeEventListener('agrolnk_toast', handleToastEvent);
      // Clean up any remaining timers
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, [addToast]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        showToast: showGlobalToast,
        copyToClipboard,
      }}
    >
      {children}

      {/* Floating Toast Notification Container */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-[calc(100%-2.5rem)] pointer-events-none"
      >
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isCopy = t.type === 'copy';
          const isError = t.type === 'error';
          const isWarning = t.type === 'warning';
          const isInfo = t.type === 'info';

          const IconComponent = isCopy
            ? Copy
            : isSuccess
            ? CheckCircle2
            : isError
            ? AlertCircle
            : isWarning
            ? AlertTriangle
            : Info;

          const accentColorClass = isCopy || isSuccess
            ? 'text-[#10B981] bg-[#10B981]/15'
            : isError
            ? 'text-[#EF4444] bg-[#EF4444]/15'
            : isWarning
            ? 'text-[#F59E0B] bg-[#F59E0B]/15'
            : 'text-[#3B82F6] bg-[#3B82F6]/15';

          const borderClass = isCopy || isSuccess
            ? 'border-[#10B981]/40'
            : isError
            ? 'border-[#EF4444]/40'
            : isWarning
            ? 'border-[#F59E0B]/40'
            : 'border-[#3B82F6]/40';

          return (
            <div
              key={t.id}
              role="alert"
              className={`pointer-events-auto transform transition-all duration-300 ease-out translate-y-0 opacity-100 flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#0B3326]/95 backdrop-blur-md text-white border ${borderClass} shadow-2xl shadow-black/40`}
            >
              {/* Icon Badge */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${accentColorClass}`}
              >
                <IconComponent className="w-5 h-5" />
              </div>

              {/* Text Body */}
              <div className="flex-1 min-w-0 pt-0.5 text-left">
                {t.title ? (
                  <p className="text-xs font-bold font-heading text-white tracking-wide">
                    {t.title}
                  </p>
                ) : null}
                <p className="text-xs text-[#E5EDE8] leading-relaxed break-words font-medium">
                  {t.message}
                </p>

                {t.action && (
                  <button
                    onClick={() => {
                      t.action.onClick?.();
                      removeToast(t.id);
                    }}
                    className="mt-2 text-xs font-bold text-[#10B981] hover:text-[#34D399] transition-colors underline cursor-pointer"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => removeToast(t.id)}
                aria-label="Close notification"
                className="shrink-0 p-1 text-[#A3B899] hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
