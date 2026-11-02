/**
 * Store Reset Registry
 * Each Zustand store registers its reset action when its module loads, so the
 * app shell can clear every loaded store on logout without eagerly importing
 * (and un-lazy-loading) the modules that own them.
 */
const resetters = new Set();

export function registerStoreReset(reset) {
  resetters.add(reset);
}

export function resetAllStores() {
  resetters.forEach(reset => reset());
}
