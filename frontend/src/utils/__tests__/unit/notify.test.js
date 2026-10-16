/* global jest, describe, it, expect */
import {
  createNotifier,
  getErrorMessage,
  withReason,
  COMMON_TOASTS,
  TOAST_DURATIONS,
} from '../../notify';
import { YP_TOASTS } from '../../../modules/YoungProfessionals/toastMessages';
import { CA_TOASTS } from '../../../modules/ConsultantAppointment/toastMessages';

describe('createNotifier', () => {
  it('sends message, type, title and the standard variant with a per-type duration', () => {
    const trigger = jest.fn();
    createNotifier(trigger)(COMMON_TOASTS.fileTooLarge(10));

    expect(trigger).toHaveBeenCalledWith(
      'The selected file is larger than 10 MB. Please choose a smaller file.',
      'warning',
      'File Too Large',
      { variant: 'standard', duration: TOAST_DURATIONS.warning }
    );
  });

  it('keeps errors on screen longer than successes', () => {
    expect(TOAST_DURATIONS.error).toBeGreaterThan(TOAST_DURATIONS.success);
  });

  it('falls back to info for an unknown type and ignores a missing trigger', () => {
    const trigger = jest.fn();
    createNotifier(trigger)({ type: 'bogus', title: 'T', message: 'M' });
    expect(trigger.mock.calls[0][1]).toBe('info');

    expect(() => createNotifier(undefined)(COMMON_TOASTS.filtersReset())).not.toThrow();
  });
});

describe('getErrorMessage / withReason', () => {
  it('reads the server message from an axios error', () => {
    expect(getErrorMessage({ response: { data: { message: 'Duplicate name' } } })).toBe('Duplicate name');
    expect(getErrorMessage({ response: { data: { error: 'Bad request' } } })).toBe('Bad request');
    expect(getErrorMessage(new Error('Network Error'))).toBe('');
  });

  it('appends the reason only when there is one', () => {
    expect(withReason('Could not save.', 'Duplicate name')).toBe('Could not save. Reason: Duplicate name.');
    expect(withReason('Could not save.', '')).toBe('Could not save.');
  });
});

describe('module toast catalogs', () => {
  const all = [
    ...Object.values(COMMON_TOASTS).map(fn => fn('X', 'Y', 'Z')),
    ...Object.values(YP_TOASTS).map(fn => fn('Asha', 'reason')),
    ...Object.values(CA_TOASTS).map(fn => fn('Ports', 'PD-I', 'reason')),
  ];

  it('every message has a valid type, a short title and a full-sentence message', () => {
    all.forEach(t => {
      expect(['success', 'error', 'warning', 'info']).toContain(t.type);
      expect(t.title.split(' ').length).toBeLessThanOrEqual(4);
      expect(t.message).toMatch(/[.]$/);
      expect(t.message).not.toMatch(/!/);
    });
  });

  it('names the record involved', () => {
    expect(YP_TOASTS.relieved('Asha').message).toContain('"Asha"');
    expect(CA_TOASTS.deleted('Ports', 'PD-I').message).toContain('Ports / PD-I');
  });

  it('includes the server reason on failures', () => {
    expect(YP_TOASTS.saveFailed(true, 'Duplicate name').message).toContain('Reason: Duplicate name');
    expect(YP_TOASTS.saveFailed(false).title).toBe('Registration Failed');
  });
});
