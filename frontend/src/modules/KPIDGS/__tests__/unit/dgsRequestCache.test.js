/* global jest, describe, it, expect, beforeEach, afterEach */
import { cachedGet, clearDgsCache } from '../../store/dgsRequestCache';
import { resetAllStores } from '../../../../stores/resetRegistry';

describe('KPI DGS request cache', () => {
  beforeEach(() => {
    clearDgsCache();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('reuses a response for a minute, then asks again', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: [1] });
    await cachedGet('list', fetcher);
    await cachedGet('list', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(61 * 1000);
    await cachedGet('list', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('shares a request that is already on its way', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: [] });
    await Promise.all([cachedGet('list', fetcher), cachedGet('list', fetcher)]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('keeps different keys apart', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: [] });
    await cachedGet('kpi2-3-1-list', fetcher);
    await cachedGet('kpi2-3-2-list', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('does not keep a failed request', async () => {
    const fetcher = jest.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue({ data: [] });
    await expect(cachedGet('list', fetcher)).rejects.toThrow('down');
    await cachedGet('list', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('is emptied by a save (clearDgsCache) and on logout (resetAllStores)', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: [] });
    await cachedGet('list', fetcher);
    clearDgsCache();
    await cachedGet('list', fetcher);
    resetAllStores();
    await cachedGet('list', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
