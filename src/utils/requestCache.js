/**
 * Lightweight in-memory request deduplication & short-TTL cache.
 * Eliminates duplicate identical Supabase REST queries fired simultaneously
 * by multiple mounted components, event listeners, and Realtime handlers.
 */

const valueCache = new Map();
const inFlightCache = new Map();
const prefixInvalidatedSeq = new Map();
let invalidationSeq = 0;

function getInvalidatedSeq(key) {
  let latest = 0;
  for (const [prefix, seq] of prefixInvalidatedSeq.entries()) {
    if (key === prefix || key.startsWith(prefix)) {
      if (seq > latest) latest = seq;
    }
  }
  return latest;
}

/**
 * Deduplicate in-flight fetches and optionally cache resolved data for ttlMs.
 * @param {string} key
 * @param {Function} fetcher
 * @param {number} [ttlMs=3000]
 */
export function cachedFetch(key, fetcher, ttlMs = 3000) {
  const now = Date.now();
  const hit = valueCache.get(key);
  if (hit && hit.expiresAt > now) {
    return Promise.resolve(hit.data);
  }

  const currentSeq = getInvalidatedSeq(key);
  const existing = inFlightCache.get(key);
  if (existing && existing.seq >= currentSeq) {
    return existing.promise;
  }

  const promise = Promise.resolve()
    .then(() => fetcher())
    .then((result) => {
      if (inFlightCache.get(key)?.promise === promise) {
        inFlightCache.delete(key);
      }
      if (ttlMs > 0 && getInvalidatedSeq(key) === currentSeq) {
        valueCache.set(key, { data: result, expiresAt: Date.now() + ttlMs });
      }
      return result;
    })
    .catch((err) => {
      if (inFlightCache.get(key)?.promise === promise) {
        inFlightCache.delete(key);
      }
      throw err;
    });

  inFlightCache.set(key, { promise, seq: currentSeq });
  return promise;
}

/**
 * Invalidate cached entries matching any of the given prefixes (or all if omitted).
 * Uses a monotonic sequence counter to prevent any in-flight query from repopulating stale data.
 */
export function invalidateCache(...prefixes) {
  const nextSeq = ++invalidationSeq;
  if (!prefixes || prefixes.length === 0) {
    valueCache.clear();
    inFlightCache.clear();
    prefixInvalidatedSeq.set('', nextSeq);
    return;
  }

  for (const prefix of prefixes) {
    if (!prefix) continue;
    prefixInvalidatedSeq.set(prefix, nextSeq);
    for (const key of Array.from(valueCache.keys())) {
      if (key === prefix || key.startsWith(prefix)) {
        valueCache.delete(key);
      }
    }
    for (const key of Array.from(inFlightCache.keys())) {
      if (key === prefix || key.startsWith(prefix)) {
        inFlightCache.delete(key);
      }
    }
  }
}

// Auto-invalidate domain caches synchronously whenever mutation events fire anywhere in the app
if (typeof window !== 'undefined') {
  const EVENT_CACHE_MAP = {
    agrolnk_orders_updated: ['orders:', 'notifications:', 'admin:'],
    agrolnk_order_updated: ['orders:', 'notifications:', 'admin:'],
    agrolnk_escrow_updated: ['orders:', 'notifications:', 'admin:'],
    agrolnk_deliveries_updated: ['deliveries:', 'notifications:', 'admin:'],
    agrolnk_delivery_updated: ['deliveries:', 'notifications:', 'admin:'],
    agrolnk_delivery_created: ['deliveries:', 'notifications:', 'admin:'],
    agrolnk_financing_updated: ['financing:', 'notifications:', 'admin:'],
    agrolnk_listings_updated: ['listings:', 'admin:'],
    agrolnk_auctions_updated: ['auctions:', 'admin:'],
    agrolnk_warehouse_receipt_created: ['warehouses:', 'notifications:', 'admin:'],
    agrolnk_warehouse_quote_updated: ['warehouses:', 'notifications:', 'admin:'],
    agrolnk_warehouse_receipt_stored: ['warehouses:', 'notifications:', 'admin:'],
    agrolnk_warehouse_receipt_deleted: ['warehouses:', 'notifications:', 'admin:'],
    agrolnk_warehouse_profile_updated: ['warehouses:', 'profile:', 'admin:'],
    agrolnk_kyc_updated: ['admin:', 'profile:', 'warehouses:'],
  };

  Object.entries(EVENT_CACHE_MAP).forEach(([eventName, prefixes]) => {
    window.addEventListener(eventName, () => invalidateCache(...prefixes));
  });
}
