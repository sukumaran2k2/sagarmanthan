/* global jest, describe, it, expect, beforeEach */
import { act, renderHook, waitFor } from '@testing-library/react';
import { usePagedList } from '../../pages/Traffic/usePagedList';
import { clearTrafficCache, readCache } from '../../store/trafficRequestCache';
import { resetAllStores } from '../../../../stores/resetRegistry';

const pageOf = (page, totalPages = 3) => Promise.resolve({
  data: { data: [{ id: `p${page}` }], pagination: { total: totalPages * 10, totalPages } },
});

// Resolves only when told to, so a test can hold a request in flight
function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

const render = (initialPage, request) => renderHook(
  ({ page }) => usePagedList({ scope: 'test', params: { page }, request }),
  { initialProps: { page: initialPage } }
);

beforeEach(() => clearTrafficCache());

describe('usePagedList', () => {
  it('loads a page, then prefetches the next one', async () => {
    const request = jest.fn((params) => pageOf(params.page));
    const { result } = render(1, request);

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.rows).toEqual([{ id: 'p1' }]));
    expect(result.current.loading).toBe(false);
    expect(result.current.totalPages).toBe(3);

    await waitFor(() => expect(readCache('test:{"page":2}')).not.toBeNull());
    expect(request).toHaveBeenCalledWith({ page: 2 });
  });

  it('opens a prefetched or recently seen page without a new request', async () => {
    const request = jest.fn((params) => pageOf(params.page));
    const { result, rerender } = render(1, request);
    await waitFor(() => expect(readCache('test:{"page":2}')).not.toBeNull());
    const callsBefore = request.mock.calls.filter(([p]) => p.page === 2).length;

    rerender({ page: 2 });
    await waitFor(() => expect(result.current.rows).toEqual([{ id: 'p2' }]));
    rerender({ page: 1 });
    await waitFor(() => expect(result.current.rows).toEqual([{ id: 'p1' }]));

    expect(request.mock.calls.filter(([p]) => p.page === 2)).toHaveLength(callsBefore);
    expect(request.mock.calls.filter(([p]) => p.page === 1)).toHaveLength(1);
  });

  it('keeps the current rows on screen while a new page loads, and cancels superseded requests', async () => {
    const slow = { 2: deferred(), 3: deferred() };
    const signals = {};
    const request = jest.fn((params, config = {}) => {
      if (params.page === 1) return pageOf(1, 5);
      if (config.signal) signals[params.page] = config.signal;
      // Prefetches (no signal) of page 2 never resolve in this test
      return slow[params.page]?.promise ?? new Promise(() => {});
    });
    const { result, rerender } = render(1, request);
    await waitFor(() => expect(result.current.rows).toEqual([{ id: 'p1' }]));

    rerender({ page: 3 });
    expect(result.current.refreshing).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.rows).toEqual([{ id: 'p1' }]);

    rerender({ page: 4 });
    expect(signals[3].aborted).toBe(true);
  });

  it('reload() fetches the current page again, skipping the cache', async () => {
    const request = jest.fn((params) => pageOf(params.page, 1));
    const { result } = render(1, request);
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect(request).toHaveBeenCalledTimes(1);

    act(() => result.current.reload());
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.refreshing).toBe(false));
  });

  it('is cleared on logout so nothing carries over to the next user', async () => {
    const request = jest.fn((params) => pageOf(params.page, 1));
    const { result } = render(1, request);
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect(readCache('test:{"page":1}')).not.toBeNull();

    resetAllStores();
    expect(readCache('test:{"page":1}')).toBeNull();
  });
});
