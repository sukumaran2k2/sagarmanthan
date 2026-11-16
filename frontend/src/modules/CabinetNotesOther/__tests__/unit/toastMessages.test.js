/* global describe, it, expect */
import { CABINET_NOTES_OTHER_TOASTS as TOASTS } from '../../toastMessages';

// One sample call per message, with a server reason where the message accepts one
const SAMPLES = {
  created: [],
  updated: [],
  saveFailed: [false, 'Please select a valid ministry'],
  missingRequired: [],
  remarksTooLong: [],
  deleted: [],
  deleteFailed: ['Cabinet note not found'],
  editNotAllowed: [],
  deleteNotAllowed: [],
};

describe('CABINET_NOTES_OTHER_TOASTS', () => {
  it('has a sample for every message', () => {
    expect(Object.keys(SAMPLES).sort()).toEqual(Object.keys(TOASTS).sort());
  });

  it.each(Object.entries(SAMPLES))('%s follows the toast writing rules', (name, args) => {
    const toast = TOASTS[name](...args);
    expect(['success', 'error', 'warning', 'info']).toContain(toast.type);

    const words = toast.title.split(/\s+/);
    expect(words.length).toBeGreaterThanOrEqual(2);
    expect(words.length).toBeLessThanOrEqual(4);

    expect(toast.message).toMatch(/\.$/);
    expect(`${toast.title} ${toast.message}`).not.toMatch(/!/);
  });

  // Green for done, red for failed, amber for "you still have to do something"
  it('colours each outcome by its type', () => {
    expect(TOASTS.created().type).toBe('success');
    expect(TOASTS.updated().type).toBe('success');
    expect(TOASTS.deleted().type).toBe('success');

    expect(TOASTS.saveFailed(true).type).toBe('error');
    expect(TOASTS.deleteFailed().type).toBe('error');
    expect(TOASTS.editNotAllowed().type).toBe('error');
    expect(TOASTS.deleteNotAllowed().type).toBe('error');

    // Nothing has failed yet - the form is simply incomplete
    expect(TOASTS.missingRequired().type).toBe('warning');
    expect(TOASTS.remarksTooLong().type).toBe('warning');
  });

  it('words a save failure for the action the user took', () => {
    expect(TOASTS.saveFailed(false).title).toBe('Save Failed');
    expect(TOASTS.saveFailed(false).message).toContain('could not be saved');
    expect(TOASTS.saveFailed(true).title).toBe('Update Failed');
    expect(TOASTS.saveFailed(true).message).toContain('could not be updated');
  });

  it('appends the server reason to failures', () => {
    expect(TOASTS.saveFailed(false, 'Please select a valid ministry').message)
      .toContain('Reason: Please select a valid ministry.');
    expect(TOASTS.deleteFailed('Cabinet note not found').message)
      .toContain('Reason: Cabinet note not found.');
  });

  it('leaves out the reason clause when the server gave none', () => {
    expect(TOASTS.deleteFailed('').message).not.toContain('Reason:');
    expect(TOASTS.saveFailed(true).message).not.toContain('Reason:');
  });
});
