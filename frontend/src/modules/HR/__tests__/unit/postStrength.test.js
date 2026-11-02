/* global describe, it, expect, jest */
import { render, screen, fireEvent } from '@testing-library/react';
import ReducePostStrengthModal from '../../components/ReducePostStrengthModal';
import { readStrengthConflict, validateDeletionReason, validateReduction } from '../../utils/postStrength';

const conflictBody = {
  code: 'SELECT_POST_CODES',
  currentStrength: 5,
  requestedStrength: 3,
  postsToDelete: 2,
  vacantPosts: [
    { post_code: '01007054001', date_of_arise_in_vacancy: '2025-03-01T00:00:00.000Z', method_of_appointment: 'Promotion' },
    { post_code: '01007054002', date_of_arise_in_vacancy: null, method_of_appointment: null },
    { post_code: '01007054004', date_of_arise_in_vacancy: null, method_of_appointment: null },
  ],
};

describe('readStrengthConflict', () => {
  it('reads the 409 asking for post codes to be chosen', () => {
    const c = readStrengthConflict({ response: { status: 409, data: conflictBody } });
    expect(c).toMatchObject({ currentStrength: 5, requestedStrength: 3, postsToDelete: 2 });
    expect(c.vacantPosts).toHaveLength(3);
  });

  it('ignores every other error', () => {
    expect(readStrengthConflict({ response: { status: 400, data: conflictBody } })).toBeNull();
    expect(readStrengthConflict({ response: { status: 409, data: { message: 'x' } } })).toBeNull();
    expect(readStrengthConflict(new Error('network'))).toBeNull();
  });
});

describe('validateReduction / validateDeletionReason', () => {
  it('needs exactly the required number of codes and remarks', () => {
    expect(validateReduction({ selected: ['a'], required: 2, reason: 'r' }).selection).toMatch('exactly 2');
    expect(validateReduction({ selected: ['a', 'b'], required: 2, reason: '  ' }).reason).toBeTruthy();
    expect(validateReduction({ selected: ['a', 'b'], required: 2, reason: 'x'.repeat(201) }).reason).toMatch('200');
    expect(validateReduction({ selected: ['a', 'b'], required: 2, reason: 'Surrendered' })).toEqual({});
  });

  it('needs a delete reason of at most 200 characters', () => {
    expect(validateDeletionReason('')).toBeTruthy();
    expect(validateDeletionReason('x'.repeat(201))).toBeTruthy();
    expect(validateDeletionReason('Post abolished')).toBe('');
  });
});

describe('ReducePostStrengthModal', () => {
  const setup = (body = conflictBody) => {
    const onConfirm = jest.fn();
    render(
      <ReducePostStrengthModal
        postName="QA Post"
        conflict={readStrengthConflict({ response: { status: 409, data: body } })}
        isSubmitting={false}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />
    );
    return { onConfirm, box: (code) => screen.getByLabelText(`Delete post code ${code}`) };
  };

  it('lists the vacant codes and stops at the required number', () => {
    const { box } = setup();
    expect(screen.getByText('0 of 2 selected')).toBeTruthy();
    fireEvent.click(box('01007054001'));
    fireEvent.click(box('01007054004'));
    expect(screen.getByText('2 of 2 selected')).toBeTruthy();
    expect(box('01007054002').disabled).toBe(true);
    expect(screen.getByText('01-03-2025')).toBeTruthy();
  });

  it('does not save without the codes and remarks, then sends both', () => {
    const { onConfirm, box } = setup();
    fireEvent.click(screen.getByText('Delete & Update'));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(/Select exactly 2 post codes/)).toBeTruthy();
    expect(screen.getByText(/Enter the remarks/)).toBeTruthy();

    fireEvent.click(box('01007054002'));
    fireEvent.click(box('01007054004'));
    fireEvent.change(screen.getByLabelText(/Remarks \/ Reason for deletion/), { target: { value: '  Surplus posts  ' } });
    fireEvent.click(screen.getByText('Delete & Update'));
    expect(onConfirm).toHaveBeenCalledWith(['01007054002', '01007054004'], 'Surplus posts');
  });

  it('explains when there are not enough vacant codes', () => {
    setup({ ...conflictBody, postsToDelete: 4 });
    expect(screen.getByText(/Only 3 post codes are vacant/)).toBeTruthy();
    expect(screen.queryByText('Delete & Update')).toBeNull();
  });
});
