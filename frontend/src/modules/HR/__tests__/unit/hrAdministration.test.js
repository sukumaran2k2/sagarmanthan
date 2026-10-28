/* global describe, it, expect */
import {
  ACTIVITY,
  activityOptionsFor,
  buildActivityPayload,
  buildDeputationBackPayload,
  emptyActivityForm,
  filterEmployees,
  separationConfirmMessage,
  validateActivityForm,
} from '../../utils/hrAdministration';

const ids = { employeeId: 11, empMasterId: 22, organisationID: 7, userID: 3 };
const form = (patch) => ({ ...emptyActivityForm(), ...patch });

describe('activityOptionsFor', () => {
  it('offers absorption flows only to deputation-in employees', () => {
    expect(activityOptionsFor('Deputation In').map((o) => o.value)).toEqual([
      ACTIVITY.ABSORPTION, ACTIVITY.END_OF_DEPUTATION, ACTIVITY.DEPUTATION_OUT,
    ]);
    expect(activityOptionsFor('Direct Recruitment').map((o) => o.value)).toEqual([
      ACTIVITY.TRANSFER_OUT, ACTIVITY.DEPUTATION_OUT, ACTIVITY.SEPARATION, ACTIVITY.PROMOTION,
    ]);
  });
});

describe('validateActivityForm', () => {
  it('requires an activity', () => {
    expect(validateActivityForm(form({}))).toHaveProperty('activityName');
  });

  it('requires the start date for deputation out unless already on deputation-in', () => {
    const f = form({ activityName: ACTIVITY.DEPUTATION_OUT, orgToBeDeputed: '5', dateOfDeputingOut: '2026-01-01' });
    expect(validateActivityForm(f, { methodOfAppointment: 'Promotion' })).toHaveProperty('deputationStartDate');
    expect(validateActivityForm(f, { methodOfAppointment: 'Deputation In' })).toEqual({});
  });

  it('checks deputation date ordering', () => {
    const errors = validateActivityForm(form({
      activityName: ACTIVITY.DEPUTATION_OUT,
      orgToBeDeputed: '5',
      deputationStartDate: '2026-02-01',
      deputationEndDate: '2026-01-15',
      dateOfDeputingOut: '2026-02-05',
    }));
    expect(errors).toHaveProperty('deputationEndDate');
    expect(errors).toHaveProperty('dateOfDeputingOut');
  });

  it('asks for the separation date on non-retirement reasons and SVRS choice on SVRS', () => {
    expect(validateActivityForm(form({ activityName: ACTIVITY.SEPARATION, separationReason: 'Others' })))
      .toHaveProperty('separationDate');
    expect(validateActivityForm(form({
      activityName: ACTIVITY.SEPARATION,
      separationReason: 'Special Voluntary Retirement Scheme',
      retirementDate: '2026-03-31',
    }))).toHaveProperty('deleteSVRS');
  });

  it('blocks promotion into a post code whose vacancy activities are incomplete', () => {
    const f = form({
      activityName: ACTIVITY.PROMOTION,
      promotionDepartment: '1',
      promotionPostId: '2',
      promotionPostCode: 'P-01',
      dateOfPromotion: '2026-04-01',
    });
    expect(validateActivityForm(f, { postCodeReady: false })).toHaveProperty('promotionPostCode');
    expect(validateActivityForm(f, { postCodeReady: true })).toEqual({});
  });
});

describe('buildActivityPayload', () => {
  it('does not send the prefilled retirement date for non-retirement separations', () => {
    const payload = buildActivityPayload(
      form({ activityName: ACTIVITY.SEPARATION, separationReason: 'Resignation', separationDate: '2026-05-01', retirementDate: '2040-01-31' }),
      ids
    );
    expect(payload).toMatchObject({ separationReason: 'Resignation', separationDate: '2026-05-01', employeeId: 11, userID: 3 });
    expect(payload.retirementDate).toBeNull();
  });

  it('sends SVRS delete choice as a number', () => {
    const payload = buildActivityPayload(
      form({ activityName: ACTIVITY.SEPARATION, separationReason: 'Special Voluntary Retirement Scheme', retirementDate: '2026-03-31', deleteSVRS: '1' }),
      ids
    );
    expect(payload).toMatchObject({ retirementDate: '2026-03-31', deleteSVRS: 1 });
  });

  it('maps empty optional dates to null', () => {
    const payload = buildActivityPayload(
      form({ activityName: ACTIVITY.DEPUTATION_OUT, orgToBeDeputed: '5', dateOfDeputingOut: '2026-01-01' }),
      ids
    );
    expect(payload.deputationEndDate).toBeNull();
    expect(payload.deputationStartDate).toBeNull();
  });
});

describe('separationConfirmMessage', () => {
  const base = { activityName: ACTIVITY.SEPARATION, separationReason: 'Retirement' };
  it('confirms only when the retirement date changed or the post is deleted', () => {
    expect(separationConfirmMessage(form({ ...base, retirementDate: '2040-01-31' }), '2040-01-31T00:00:00.000Z')).toBeNull();
    expect(separationConfirmMessage(form({ ...base, retirementDate: '2039-12-31' }), '2040-01-31')).toMatch(/retirement date/);
    expect(separationConfirmMessage(
      form({ ...base, separationReason: 'Special Voluntary Retirement Scheme', retirementDate: '2040-01-31', deleteSVRS: '1' }),
      '2040-01-31'
    )).toMatch(/delete the post/);
  });
});

describe('buildDeputationBackPayload', () => {
  it('uses the backend field names', () => {
    const payload = buildDeputationBackPayload(
      { activityName: 'Deputation Back', departmentId: '4', postId: '9', postCode: 'C-9', joiningDate: '2026-06-01' },
      { employee_id: 1, emp_master_id: 2, emp_reference_id: 'R-1' },
      { departmentName: 'Admin', postName: 'Clerk', organisationID: 7, userID: 3 }
    );
    expect(payload).toEqual({
      currentEmployeeId: 1, currentEmpMasterId: 2, currentReferenceId: 'R-1',
      promotionActivityName: 'Deputation Back', departmentValue: '4', departmentName: 'Admin',
      promotionPostCode: 'C-9', postName: 'Clerk', promotionPostID: '9', promotionOrderDate: '2026-06-01',
      userID: 3, organisationID: 7,
    });
  });
});

describe('filterEmployees', () => {
  const rows = [
    { department_id: 1, post_id: 10, class: 'I/A', emp_name: 'Asha Rao', emp_post_code: 'P-1' },
    { department_id: 2, post_id: 20, class: 'III/C', emp_name: 'Ravi', emp_post_code: 'P-12' },
  ];
  it('filters by department, post, class and search', () => {
    expect(filterEmployees(rows, { departmentId: '2' })).toHaveLength(1);
    expect(filterEmployees(rows, { className: 'I/A' })[0].emp_name).toBe('Asha Rao');
    expect(filterEmployees(rows, { search: 'p-1' })).toHaveLength(2);
    expect(filterEmployees(rows, { search: 'p-1', exactMatch: true })).toHaveLength(1);
  });
});
