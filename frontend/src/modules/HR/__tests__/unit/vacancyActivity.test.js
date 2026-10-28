/* global describe, it, expect */
import { getChain, getNormalizedMode, isStageDisabled } from '../../vacancyActivity/config';
import {
  EMPTY_FORM,
  buildFormFromLog,
  buildPayload,
  initialForm,
  toInputDate,
  validateActivity,
} from '../../vacancyActivity/form';

const ctx = { organisationID: 7, userID: 3, postId: 'P1', postCode: 'C-1' };
const form = (patch) => ({ ...EMPTY_FORM, ...patch });
const payloadFor = (method, patch) => buildPayload(form(patch), getNormalizedMode(method), ctx);

describe('getNormalizedMode', () => {
  it('maps every method of appointment', () => {
    expect(getNormalizedMode('Direct Recruitment').key).toBe('directRecruitment');
    expect(getNormalizedMode('Promotion').key).toBe('promotion');
    expect(getNormalizedMode('Promotion-in by Direct Recruitment').key).toBe('promotionDR');
    expect(getNormalizedMode('Deputation In').key).toBe('deputation');
    expect(getNormalizedMode('Composite Method').key).toBe('composite');
    expect(getNormalizedMode('Transfer In').key).toBe('transfer');
    expect(getNormalizedMode('Redeployed from CHD Category').key).toBe('redeployedCHD');
    expect(getNormalizedMode('Redeployed-in').key).toBe('redeployedIn');
    expect(getNormalizedMode('Direct Recruitment (Compassionate Method)').key).toBe('directCompassionate');
  });
});

describe('stage chain', () => {
  it('picks the Direct Recruitment chain from the recruiting body', () => {
    expect(getChain('directRecruitment', form({}))).toHaveLength(0);
    expect(getChain('directRecruitment', form({ recruitmentThrough: '1' })).map((s) => s.key)).toEqual(['appointmentLetterIssuedDate']);
    expect(getChain('directRecruitment', form({ recruitmentThrough: '0' }))).toHaveLength(7);
    expect(getChain('composite', form({}))).toEqual(getChain('deputation', form({})));
  });

  it('locks Direct Recruitment stages until the process date is entered', () => {
    expect(isStageDisabled('directRecruitment', form({}))).toBe(true);
    expect(isStageDisabled('directRecruitment', form({ processInitiatedDate: '2026-01-01' }))).toBe(false);
    expect(isStageDisabled('promotion', form({}))).toBe(false);
  });
});

describe('buildPayload (pinned to the pre-refactor modal output)', () => {
  it('sends the base fields and nulls for everything else', () => {
    const p = payloadFor('Promotion', {});
    expect(p).toMatchObject({
      organisationID: 7, userID: 3, postId: 'P1', postCode: 'C-1',
      methodOfAppointment: 'promotion', method_of_appointment: 'Promotion',
      vacancyType: 'Regular', exceptionAbolish: '0', reasonForExemption: null,
      isEmployeeJoined: null, dischargeReason: null, transferEmpMasterId: null,
    });
  });

  it('Direct Recruitment through the port authority sends the port stages', () => {
    const p = payloadFor('Direct Recruitment', {
      processInitiatedDate: '2026-01-01', recruitmentThrough: '0', notificationIssuedDate: '2026-01-05',
      numberOfEligibleApplication: '12', appointmentLetterIssuedDate: '2026-03-01',
    });
    expect(p).toMatchObject({
      methodOfAppointment: 'directRecruitment', recruitmentThrough: '0', processInitiatedDate: '2026-01-01',
      notificationIssuedDate: '2026-01-05', numberOfEligibleApplication: '12', appointmentLetterIssuedDate: '2026-03-01',
    });
  });

  it('Direct Recruitment through IPA does not send port stages', () => {
    const p = payloadFor('Direct Recruitment', { recruitmentThrough: '1', notificationIssuedDate: '2026-01-05' });
    expect(p.notificationIssuedDate).toBeNull();
  });

  it('Promotion sends the employee only once one is chosen', () => {
    expect(payloadFor('Promotion', { orderDatePromotion: '2026-02-01' }).selectEmployeeId).toBeNull();
    expect(payloadFor('Promotion', { orderDatePromotion: '2026-02-01', employeeId: 'E1', joiningDate: '2026-02-10' }))
      .toMatchObject({ selectEmployeeId: 'E1', employeeJoinedDate: '2026-02-10', orderDatePromotion: '2026-02-01' });
  });

  it('Deputation and Composite map their employee fields', () => {
    expect(payloadFor('Deputation In', { organisationOfEmp: '5', employeeId: 'E2', empMasterId: '9', joiningDate: '2026-04-01' }))
      .toMatchObject({ methodOfAppointment: 'deputationIn', organisationOfEmp: '5', deputedEmpId: 'E2', deputedEmpMasterId: '9', employeeJoinedDate: '2026-04-01' });
    expect(payloadFor('Composite Method', { employeeExistComposite: '0', employeeId: 'E3' }))
      .toMatchObject({ methodOfAppointment: 'composite', isEmployeeJoinedExist: '0', selectEmployeeId: null });
  });

  it('Transfer, CHD and redeployed modes use their backend method codes', () => {
    expect(payloadFor('Transfer In', { organisationOfEmp: '5', employeeId: 'E4', empMasterId: '8', joiningDate: '2026-05-01' }))
      .toMatchObject({ methodOfAppointment: 'transferIn', transferEmpId: 'E4', transferEmpMasterId: '8', dateOfJoiningTransferIn: '2026-05-01' });
    expect(payloadFor('Redeployed from CHD Category', { approvalCompetentAuthorityDateCHD: '2026-01-02', employeeId: 'E5', chdCategoryEmpMasterId: '11' }))
      .toMatchObject({ methodOfAppointment: 'prevredeployedFromCHD', selectEmployeeId: 'E5', chdCategoryEmpMasterId: '11' });
    expect(payloadFor('Redeployed-in', {}).methodOfAppointment).toBe('prevredeployedFromredeployedIn');
    expect(payloadFor('Promotion-in by Direct Recruitment', {}).methodOfAppointment).toBe('prevredeployedFromprevredeployedPromotionbyDR');
    expect(payloadFor('Direct Recruitment (Compassionate Method)', {}).methodOfAppointment).toBe('directRecruitmentCompassionate');
  });

  it('marks exempted vacancies', () => {
    expect(payloadFor('Promotion', { reasonForExemption: 'Court case' })).toMatchObject({ exceptionAbolish: '1', reasonForExemption: 'Court case' });
  });
});

describe('validateActivity', () => {
  it('requires the process date for every staged method (there is no "not initiated" reason)', () => {
    ['directRecruitment', 'promotion', 'deputation', 'composite'].forEach((mode) => {
      expect(validateActivity(form({}), mode)).toEqual({ processInitiatedDate: 'Enter the date the process was initiated.' });
    });
  });

  it('makes the user choose whether the Composite employee already exists', () => {
    expect(EMPTY_FORM.employeeExistComposite).toBe('');
    const started = { processInitiatedDate: '2026-01-01' };
    expect(Object.keys(validateActivity(form(started), 'composite'))).toEqual(['employeeExistComposite']);
    expect(validateActivity(form({ ...started, employeeExistComposite: '0' }), 'composite')).toEqual({});
    // "Yes" brings in the backend's fill rule (see vacancyActivityContract.test.js)
    expect(Object.keys(validateActivity(form({ ...started, employeeExistComposite: '1' }), 'composite')).sort())
      .toEqual(['applicationReceivedDeputation', 'dateOfAriseInVacancy', 'employeeId', 'joiningDate', 'notificationIssuedDate', 'reviewOfApplicationDeputation']);
  });

  it('applies the mode rules', () => {
    expect(validateActivity(form({ processInitiatedDate: '2026-01-01' }), 'directRecruitment')).toHaveProperty('recruitmentThrough');
    expect(validateActivity(form({ processInitiatedDate: '2026-01-01', recruitmentThrough: '0', numberOfEligibleApplication: '1.5' }), 'directRecruitment'))
      .toHaveProperty('numberOfEligibleApplication');
    // An issued order needs every earlier stage and the appointment (backend fill rule)
    expect(Object.keys(validateActivity(form({ processInitiatedDate: '2026-01-01', orderIssuedDeputation: '2026-02-01', dateOfAriseInVacancy: '2025-12-01' }), 'deputation')).sort())
      .toEqual(['applicationReceivedDeputation', 'approvalReceivedDeputation', 'employeeId', 'joiningDate', 'notificationIssuedDate', 'organisationOfEmp', 'reviewOfApplicationDeputation']);
    expect(validateActivity(form({
      processInitiatedDate: '2026-01-01', notificationIssuedDate: '2026-01-05', applicationReceivedDeputation: '2026-01-10',
      reviewOfApplicationDeputation: '2026-01-15', approvalReceivedDeputation: '2026-01-20', orderIssuedDeputation: '2026-02-01',
      organisationOfEmp: '73', joiningDate: '2026-02-03', dateOfAriseInVacancy: '2025-12-01',
    }), 'deputation')).toEqual({});
    expect(Object.keys(validateActivity(form({}), 'transfer')).sort()).toEqual(['employeeId', 'joiningDate', 'organisationOfEmp']);
    expect(Object.keys(validateActivity(form({}), 'redeployedCHD')).sort()).toEqual(['approvalCompetentAuthorityDateCHD', 'orderIssuedDateCHD']);
  });
});

describe('buildFormFromLog', () => {
  // One log row holds both the actual vacancy's stage dates and the anticipated vacancy's (A_)
  const both = {
    process_initiated_date: '2026-01-01T00:00:00.000Z',
    A_process_initiated_date: '2027-03-03',
    dpc_conducted_date: null,
    A_dpc_conducted_date: '2026-02-01',
    is_recruitment_through_ipa: [null, 0],
    A_is_recruitment_through_ipa: 1,
    number_of_eligible_application: 4,
    A_number_of_eligible_application: 9,
    employee_id: [null],
    select_employee_id: 'E7',
    is_employee_joined_exist: 0,
    organisation_id: 1,
  };

  it('Vacant Details reads only the actual vacancy columns, unwrapping arrays', () => {
    expect(buildFormFromLog(both, { target: 'vacant' })).toMatchObject({
      processInitiatedDate: '2026-01-01',
      dpcConductedDatePromotion: '', // never the anticipated A_dpc_conducted_date
      recruitmentThrough: '0',
      numberOfEligibleApplication: '4',
      employeeId: 'E7',
      employeeExistComposite: '0',
    });
    expect(buildFormFromLog(both)).toMatchObject({ processInitiatedDate: '2026-01-01' }); // default target
  });

  it('Anticipated Vacancies reads only the A_ columns', () => {
    expect(buildFormFromLog(both, { target: 'anticipated' })).toMatchObject({
      processInitiatedDate: '2027-03-03',
      dpcConductedDatePromotion: '2026-02-01',
      recruitmentThrough: '1',
      numberOfEligibleApplication: '9',
    });
  });

  it("does not take the post's own organisation as the employee's organisation", () => {
    expect(buildFormFromLog(both).organisationOfEmp).toBe('');
  });

  it('lets the opening screen override vacancy type, date and exemption', () => {
    const f = initialForm({ vacancy_type: 'Backlog', date_of_arise_in_vacancy: '2025-01-01' }, {
      vacancyType: 'Promotion', dateOfVacancy: '2026-06-30T00:00:00Z', reasonForExemption: 'Stay order',
    });
    expect(f).toMatchObject({ vacancyType: 'Promotion', dateOfAriseInVacancy: '2026-06-30', reasonForExemption: 'Stay order' });
    expect(toInputDate(null)).toBe('');
  });
});
