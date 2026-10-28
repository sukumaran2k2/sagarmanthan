/** "Show all" sentinel used by every OVOD filter dropdown. */
export const ALL = '0';

/** Accepts a value or an updater function, like React's setState. */
export const resolve = (updater, prev) => (typeof updater === 'function' ? updater(prev) : updater);

/**
 * Immutably merge `patch` into one view's state namespace (for example `dataList`).
 * `patch` is an object, or a function of the current namespace.
 */
export const patchNamespace = (set, key, patch) =>
  set((state) => ({ [key]: { ...state[key], ...resolve(patch, state[key]) } }));

/** Build a `{ key: '0' }` filter object so every filter starts on "show all". */
export const allFilters = (keys) => Object.fromEntries(keys.map((key) => [key, ALL]));
