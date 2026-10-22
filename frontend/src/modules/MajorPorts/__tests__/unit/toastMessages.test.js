/* global describe, it, expect */
import { TRAFFIC_TOASTS } from '../../toastMessages';

const PERIOD = { fiscalYear: '2026-2027', monthLabel: 'May' };

// One sample call per message, with a server reason where the message accepts one
const SAMPLES = {
  pageSaved: ['Dry Bulk', PERIOD, false],
  periodCompleted: [PERIOD, true],
  saveFailed: ['Dry Bulk', 'Data entry for May 2026-2027 is closed'],
  periodRequired: [],
  periodExists: [PERIOD],
  periodLocked: [PERIOD],
  emptyPage: ['Dry Bulk'],
  invalidValues: [],
  periodLoadFailed: ['Network down'],
  periodDeleted: [PERIOD],
  periodDeleteFailed: [PERIOD, 'Not found'],
  targetAdded: ['JNPA', '2026-2027'],
  targetExists: ['JNPA', '2026-2027'],
  targetUpdated: ['JNPA', '2026-2027'],
  targetSaveFailed: [false, 'Already exists'],
  targetDeleted: ['JNPA', '2026-2027'],
  targetDeleteFailed: ['Not found'],
  accessGranted: [2],
  accessGrantFailed: ['Already unlocked'],
  accessRevoked: ['JNPA'],
  accessRevokeFailed: ['No longer active'],
};

describe('TRAFFIC_TOASTS', () => {
  it('has a sample for every message', () => {
    expect(Object.keys(SAMPLES).sort()).toEqual(Object.keys(TRAFFIC_TOASTS).sort());
  });

  it.each(Object.entries(SAMPLES))('%s follows the toast writing rules', (name, args) => {
    const toast = TRAFFIC_TOASTS[name](...args);
    expect(['success', 'error', 'warning', 'info']).toContain(toast.type);

    const words = toast.title.split(/\s+/);
    expect(words.length).toBeGreaterThanOrEqual(2);
    expect(words.length).toBeLessThanOrEqual(4);

    expect(toast.message).toMatch(/\.$/);
    expect(`${toast.title} ${toast.message}`).not.toMatch(/!/);
  });

  it('appends the server reason to failures', () => {
    const toast = TRAFFIC_TOASTS.saveFailed('Dry Bulk', 'Entry closed');
    expect(toast.message).toContain('Reason: Entry closed.');
  });
});
