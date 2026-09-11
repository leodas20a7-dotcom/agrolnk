import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import FlashLoadingScreen from '../components/ui/FlashLoadingScreen';

const LoadingContext = createContext({
  isLoading: false,
  message: 'Loading Agrolnk...',
  subMessage: 'Synchronizing verified exchange data...',
  showLoader: (msg, subMsg) => {},
  hideLoader: () => {},
  withLoader: async (asyncFn, msg, subMsg) => {},
});

/**
 * Global triggers accessible anywhere in the application
 */
export function showGlobalLoader(message = 'Loading Agrolnk...', subMessage = 'Synchronizing verified exchange data...') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('agrolnk_show_loading', {
        detail: { message, subMessage },
      })
    );
  }
}

export function hideGlobalLoader() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agrolnk_hide_loading'));
  }
}

export function withGlobalLoader(asyncFn, message = 'Loading Data...', subMessage = 'Fetching verified records from network...') {
  showGlobalLoader(message, subMessage);
  return Promise.resolve()
    .then(asyncFn)
    .finally(() => {
      setTimeout(() => {
        hideGlobalLoader();
      }, 150);
    });
}

export function LoadingProvider({ children }) {
  const [loadingState, setLoadingState] = useState({
    isOpen: false,
    message: 'Loading Agrolnk...',
    subMessage: 'Synchronizing verified exchange data...',
  });

  const activeCountRef = useRef(0);
  const timeoutRef = useRef(null);
  const showTimeRef = useRef(0);

  const showLoader = useCallback((message = 'Loading Agrolnk...', subMessage = 'Synchronizing verified exchange data...') => {
    activeCountRef.current += 1;
    showTimeRef.current = Date.now();

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setLoadingState({
      isOpen: true,
      message,
      subMessage,
    });

    // Failsafe auto-hide after 12 seconds in case a promise hangs indefinitely
    timeoutRef.current = setTimeout(() => {
      activeCountRef.current = 0;
      setLoadingState((prev) => ({ ...prev, isOpen: false }));
    }, 12000);
  }, []);

  const hideLoader = useCallback((force = false) => {
    if (force) {
      activeCountRef.current = 0;
    } else {
      activeCountRef.current = Math.max(0, activeCountRef.current - 1);
    }

    if (activeCountRef.current === 0) {
      const elapsed = Date.now() - showTimeRef.current;
      const minDuration = 250; // Minimum smooth display time
      const remaining = Math.max(0, minDuration - elapsed);

      setTimeout(() => {
        if (activeCountRef.current === 0) {
          setLoadingState((prev) => ({ ...prev, isOpen: false }));
        }
      }, remaining);
    }
  }, []);

  const withLoader = useCallback(
    async (asyncFn, message = 'Processing...', subMessage = 'Executing verified transaction on network...') => {
      showLoader(message, subMessage);
      try {
        const res = await asyncFn();
        return res;
      } finally {
        hideLoader();
      }
    },
    [showLoader, hideLoader]
  );

  // Listen to global window loader events
  useEffect(() => {
    const handleShow = (e) => {
      showLoader(e.detail?.message, e.detail?.subMessage);
    };

    const handleHide = () => {
      hideLoader();
    };

    window.addEventListener('agrolnk_show_loading', handleShow);
    window.addEventListener('agrolnk_hide_loading', handleHide);

    return () => {
      window.removeEventListener('agrolnk_show_loading', handleShow);
      window.removeEventListener('agrolnk_hide_loading', handleHide);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [showLoader, hideLoader]);

  return (
    <LoadingContext.Provider
      value={{
        isLoading: loadingState.isOpen,
        message: loadingState.message,
        subMessage: loadingState.subMessage,
        showLoader,
        hideLoader,
        withLoader,
      }}
    >
      {children}
      {loadingState.isOpen && (
        <FlashLoadingScreen
          message={loadingState.message}
          subMessage={loadingState.subMessage}
        />
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}
