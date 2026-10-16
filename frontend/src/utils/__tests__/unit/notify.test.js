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
import { OVOD_TOASTS } from '../../../modules/OVOD/toastMessages';

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

  it('uses short plain-text bodies but never a gateway error page', () => {
    expect(getErrorMessage({ response: { data: 'Record is locked' } })).toBe('Record is locked');
    expect(getErrorMessage({ response: { data: '<html><body>502 Bad Gateway</body></html>' } })).toBe('');
    expect(getErrorMessage({ response: { data: 'x'.repeat(500) } })).toBe('');
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
    ...Object.values(OVOD_TOASTS).map(fn => fn('B2', 'reason')),
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

describe('shared wording that adapts to the caller', () => {
  it('picks "a" or "an" before the field name', () => {
    expect(COMMON_TOASTS.requiredSelect('Wing').message).toContain('select a Wing');
    expect(COMMON_TOASTS.requiredSelect('Implementing Agency').message).toContain('select an Implementing Agency');
  });

  it('describes what a copy or export covers instead of always saying "current page"', () => {
    expect(COMMON_TOASTS.copySuccess(3).message).toContain('3 rows from the current page copied');
    expect(COMMON_TOASTS.copySuccess(12, 'matching the current filters').message).toContain('12 rows matching the current filters copied');
    expect(COMMON_TOASTS.excelExported('a.csv').message).toBe('The current page was downloaded as a.csv.');
    expect(COMMON_TOASTS.excelExported('a.xlsx', 'The filtered list').message).toBe('The filtered list was downloaded as a.xlsx.');
  });
});

describe('OVOD toast messages', () => {
  it('uses a warning, not an error, for a missing required field', () => {
    expect(COMMON_TOASTS.requiredSelect('Goal (B1)').type).toBe('warning');
    expect(OVOD_TOASTS.actionableItemRequired().type).toBe('warning');
  });

  it('names whether an initiative or an actionable item was added', () => {
    expect(OVOD_TOASTS.added('B2').title).toBe('Initiative Added');
    expect(OVOD_TOASTS.added('B3').title).toBe('Actionable Item Added');
  });

  it('treats a failed upload after a successful save as a warning, not a failed save', () => {
    const toast = OVOD_TOASTS.documentUploadFailed('Too large');
    expect(toast.type).toBe('warning');
    expect(toast.message).toContain('was updated');
    expect(toast.message).toContain('Reason: Too large.');
  });

  it('does not claim the remarks were saved to the server', () => {
    const toast = OVOD_TOASTS.remarksUpdated();
    expect(toast.type).toBe('info');
    expect(toast.message).toContain('not saved to the server');
  });
});
