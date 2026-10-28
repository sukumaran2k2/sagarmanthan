/* global describe, it, expect */
/**
 * Contract between the vacancy activity popup and PUT /update-post-strength-log
 * (backend/src/controllers/HR/revisedHrPost.js, updatePostStrengthLog). Pure functions only:
 * no API is called and nothing is saved.
 *
 * BACKEND mirrors the controller, per backend method code:
 *  - fill: payload keys that must all be non-null for the post to become 'filled'
 *    (the CASE WHEN ... THEN 'filled' of each branch)
 *  - moves: the payload key whose presence makes the branch move the employee onto the post
 *    (employee transaction / employee_id update), whether or not the post becomes filled
 * If the controller changes, update this table with it.
 */
import { getNormalizedMode } from '../../vacancyActivity/config';
import { EMPTY_FORM, buildPayload, validateActivity } from '../../vacancyActivity/form';

const BACKEND = {
  promotion: {
    fill: ['employeeJoinedDate', 'vigilanceClearanceDatePromotion', 'dpcConductedDatePromotion',
      'approvalByAuthorityDatePromotion', 'orderDatePromotion', 'selectEmployeeId', 'dateOfAriseInVacancy'],
    moves: 'selectEmployeeId',
  },
  deputationIn: {
    fill: ['deputedEmpId', 'deputedEmpMasterId', 'processInitiatedDate', 'notificationIssuedDate',
      'applicationReceivedDeputation', 'reviewOfApplicationDeputation', 'approvalReceivedDeputation',
      'orderIssuedDeputation', 'dateOfAriseInVacancy'],
    moves: 'deputedEmpId',
  },
  composite: {
    fill: ['processInitiatedDate', 'notificationIssuedDate', 'applicationReceivedDeputation',
      'reviewOfApplicationDeputation', 'selectEmployeeId', 'employeeJoinedDate', 'dateOfAriseInVacancy'],
    moves: 'selectEmployeeId',
  },
  prevredeployedFromCHD: {
    fill: ['approvalCompetentAuthorityDateCHD', 'orderIssuedDateCHD', 'dateOfJoiningCHD', 'fromWhichPostCHD', 'dateOfAriseInVacancy'],
    moves: 'selectEmployeeId',
  },
  transferIn: {
    fill: ['transferEmpId', 'transferEmpMasterId', 'dateOfJoiningTransferIn', 'dateOfAriseInVacancy'],
    moves: 'transferEmpId',
  },
  prevredeployedFromredeployedIn: {
    fill: ['selectEmployeeId', 'dateOfJoiningCHD', 'dateOfAriseInVacancy'],
    moves: 'selectEmployeeId',
  },
  prevredeployedFromprevredeployedPromotionbyDR: {
    fill: ['selectEmployeeId', 'dateOfJoiningCHD', 'dateOfAriseInVacancy'],
    moves: 'selectEmployeeId',
  },
};

const ctx = { organisationID: 7, userID: 3, postId: 'P1', postCode: 'C-1' };
const employee = { employeeId: 'E-101', empMasterId: 501, joiningDate: '2026-03-01' };
const base = { dateOfAriseInVacancy: '2025-12-01', processInitiatedDate: '2026-01-01' };
const deputationStages = {
  notificationIssuedDate: '2026-01-05',
  applicationReceivedDeputation: '2026-01-10',
  reviewOfApplicationDeputation: '2026-01-15',
  approvalReceivedDeputation: '2026-01-20',
  orderIssuedDeputation: '2026-02-01',
};

// A complete save for each method that moves an employee onto the post
const COMPLETE = {
  Promotion: {
    ...base, ...employee,
    vigilanceClearanceDatePromotion: '2026-01-05', dpcConductedDatePromotion: '2026-01-10',
    approvalByAuthorityDatePromotion: '2026-01-15', orderDatePromotion: '2026-02-01',
  },
  'Deputation In': { ...base, ...deputationStages, ...employee, organisationOfEmp: '4' },
  'Composite Method': { ...base, ...deputationStages, ...employee, employeeExistComposite: '1' },
  'Redeployed from CHD Category': {
    dateOfAriseInVacancy: '2025-12-01', ...employee,
    approvalCompetentAuthorityDateCHD: '2026-01-05', orderIssuedDateCHD: '2026-02-01', fromWhichPostCHD: 'Khalasi',
  },
  'Transfer In': { dateOfAriseInVacancy: '2025-12-01', ...employee, organisationOfEmp: '4' },
  'Redeployed-in': { dateOfAriseInVacancy: '2025-12-01', ...employee },
  'Promotion-in by Direct Recruitment': { dateOfAriseInVacancy: '2025-12-01', ...employee },
};

const run = (method, values, target = 'vacant') => {
  const mode = getNormalizedMode(method);
  const form = { ...EMPTY_FORM, ...values };
  return { errors: validateActivity(form, mode.key, { target }), payload: buildPayload(form, mode, ctx) };
};
const present = (v) => v !== null && v !== undefined && v !== '';
const missingFill = (payload) => BACKEND[payload.methodOfAppointment].fill.filter((k) => !present(payload[k]));

describe('vacancy activity ↔ update-post-strength-log contract', () => {
  describe.each(Object.keys(COMPLETE))('%s', (method) => {
    it('a complete save passes validation and fills the post', () => {
      const { errors, payload } = run(method, COMPLETE[method]);
      expect(errors).toEqual({});
      expect(BACKEND).toHaveProperty(payload.methodOfAppointment);
      expect(present(payload[BACKEND[payload.methodOfAppointment].moves])).toBe(true);
      expect(missingFill(payload)).toEqual([]);
    });

    it('never sends an employee for a post that would stay vacant (each field removed in turn)', () => {
      Object.keys(COMPLETE[method]).forEach((field) => {
        const { errors, payload } = run(method, { ...COMPLETE[method], [field]: '' });
        const movesEmployee = present(payload[BACKEND[payload.methodOfAppointment].moves]);
        const blocked = Object.keys(errors).length > 0;
        // Either the save is blocked, or it fills the post, or it moves no employee
        if (!blocked && movesEmployee) {
          expect({ field, missing: missingFill(payload) }).toEqual({ field, missing: [] });
        }
      });
    });
  });

  it('still records progress without an employee', () => {
    expect(run('Promotion', { ...base, vigilanceClearanceDatePromotion: '2026-01-05' }).errors).toEqual({});
    expect(run('Deputation In', { ...base, notificationIssuedDate: '2026-01-05' }).errors).toEqual({});
    expect(run('Composite Method', { ...base, notificationIssuedDate: '2026-01-05', employeeExistComposite: '0' }).errors).toEqual({});
    expect(run('Redeployed from CHD Category', {
      dateOfAriseInVacancy: '2025-12-01', approvalCompetentAuthorityDateCHD: '2026-01-05', orderIssuedDateCHD: '2026-02-01',
    }).errors).toEqual({});
  });

  it('names exactly the missing fill-rule fields', () => {
    const { errors } = run('Promotion', { ...base, ...employee, orderDatePromotion: '2026-02-01' });
    expect(Object.keys(errors).sort()).toEqual(['approvalByAuthorityDatePromotion', 'dpcConductedDatePromotion', 'vigilanceClearanceDatePromotion']);

    const chd = run('Redeployed from CHD Category', { ...COMPLETE['Redeployed from CHD Category'], fromWhichPostCHD: '' });
    expect(Object.keys(chd.errors)).toEqual(['fromWhichPostCHD']);
  });

  it('needs the employee master id where the backend uses it', () => {
    const { errors } = run('Deputation In', { ...COMPLETE['Deputation In'], empMasterId: '' });
    expect(errors).toEqual({ employeeId: 'Select the employee again from the list.' });
    expect(run('Redeployed from CHD Category', { ...COMPLETE['Redeployed from CHD Category'], empMasterId: '' }).errors)
      .toHaveProperty('employeeId');
  });

  it('explains a missing vacancy date, which is entered in the vacancy table', () => {
    const { errors } = run('Composite Method', { ...COMPLETE['Composite Method'], dateOfAriseInVacancy: '' });
    expect(Object.keys(errors)).toEqual(['dateOfAriseInVacancy']);
    expect(errors.dateOfAriseInVacancy).toMatch(/vacancy table/);
  });

  it('deputation from another organisation needs the stages and joining date, not an employee', () => {
    const other = { ...base, ...deputationStages, organisationOfEmp: '73', joiningDate: '2026-03-01' };
    expect(run('Deputation In', other).errors).toEqual({});
    expect(Object.keys(run('Deputation In', { ...other, notificationIssuedDate: '' }).errors)).toEqual(['notificationIssuedDate']);
  });

  it('Anticipated Vacancies ignores the employee, so it does not require the appointment', () => {
    const anticipated = run('Promotion', { ...base, ...employee }, 'anticipated');
    expect(anticipated.errors).toEqual({});
  });
});
