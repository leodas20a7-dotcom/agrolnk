import React, { createContext, useContext, useState, useCallback } from 'react';
import FlashLoadingScreen from '../components/ui/FlashLoadingScreen';

const LoadingContext = createContext({
  isLoading: false,
  message: 'Loading Agrolnk...',
  showLoader: (msg) => {},
  hideLoader: () => {},
  withLoader: async (asyncFn, msg) => {},
});

export function LoadingProvider({ children }) {
  const [loadingState, setLoadingState] = useState({
    isOpen: false,
    message: 'Loading Agrolnk...',
  });

  const showLoader = useCallback((message = 'Loading Agrolnk...') => {
    setLoadingState({ isOpen: true, message });
  }, []);

  const hideLoader = useCallback(() => {
    setLoadingState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const withLoader = useCallback(async (asyncFn, message = 'Processing...') => {
    showLoader(message);
    try {
      const res = await asyncFn();
      return res;
    } finally {
      setTimeout(() => {
        hideLoader();
      }, 200);
    }
  }, [showLoader, hideLoader]);

  return (
    <LoadingContext.Provider
      value={{
        isLoading: loadingState.isOpen,
        message: loadingState.message,
        showLoader,
        hideLoader,
        withLoader,
      }}
    >
      {children}
      {loadingState.isOpen && <FlashLoadingScreen message={loadingState.message} />}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}
