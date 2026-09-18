// Agrolnk Cross-Tab & In-App Real-Time Sync Channel (100% Free)
// Uses native browser BroadcastChannel and CustomEvents for zero-latency, zero-cost cross-tab synchronization.

const CHANNEL_NAME = 'agrolnk_realtime_sync';

let broadcastChannel = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  } catch (e) {
    console.info('BroadcastChannel not supported in current environment:', e);
  }
}

/**
 * Broadcast a real-time data change event to:
 * 1. Other open browser tabs/windows (via BroadcastChannel)
 * 2. Current window components (via CustomEvent)
 * 
 * @param {string} domain - e.g. 'orders', 'deliveries', 'financing', 'listings', 'receipts'
 * @param {string} action - e.g. 'INSERT', 'UPDATE', 'DELETE', 'STATUS_CHANGE'
 * @param {any} data - The updated record or payload
 */
export function broadcastDataChange(domain, action, data) {
  if (typeof window === 'undefined') return;

  const payload = {
    domain,
    action,
    data,
    timestamp: Date.now(),
  };

  // 1. Dispatch locally in current window
  try {
    window.dispatchEvent(new CustomEvent(`agrolnk_${domain}_updated`, { detail: data }));
    window.dispatchEvent(new CustomEvent('agrolnk_sync_event', { detail: payload }));
  } catch (err) {
    console.warn('Local dispatch notice:', err);
  }

  // 2. Broadcast to other open browser tabs
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload);
    } catch (err) {
      console.warn('Cross-tab broadcast notice:', err);
    }
  }
}

/**
 * Subscribe to cross-tab broadcast events in a component or utility
 * 
 * @param {Function} callback - Called when a broadcast message is received
 * @returns {Function} cleanup unsubscribe function
 */
export function subscribeToCrossTabSync(callback) {
  if (typeof window === 'undefined' || !callback) {
    return () => {};
  }

  const handleBroadcastMessage = (event) => {
    try {
      if (event?.data) {
        callback(event.data);
      }
    } catch (err) {
      console.warn('Error in cross-tab sync callback:', err);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcastMessage);
  }

  // Also listen for local custom events
  const handleLocalSync = (event) => {
    try {
      if (event?.detail) {
        callback(event.detail);
      }
    } catch (err) {
      console.warn('Error in local sync callback:', err);
    }
  };

  window.addEventListener('agrolnk_sync_event', handleLocalSync);

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcastMessage);
    }
    window.removeEventListener('agrolnk_sync_event', handleLocalSync);
  };
}
