import {
  isCompletedStageName,
  isCompletedCabinetNote,
  statusNamesFromStages,
} from '../../utils/stageHelpers';

const stages = [
  { mopsw_stage_id: 1, mopsw_stage_name: 'Preliminary DCN Prepared' },
  { mopsw_stage_id: 9, mopsw_stage_name: 'On hold' },
  { mopsw_stage_id: 10, mopsw_stage_name: 'Completed' },
];

describe('isCompletedStageName', () => {
  it('treats Completed as completed', () => {
    expect(isCompletedStageName('Completed')).toBe(true);
    expect(isCompletedStageName('On hold')).toBe(false);
    expect(isCompletedStageName('Preliminary DCN Prepared')).toBe(false);
  });
});

describe('isCompletedCabinetNote', () => {
  it('uses stage name, stage id, or completed date', () => {
    expect(isCompletedCabinetNote({ status: 'On hold' })).toBe(false);
    expect(isCompletedCabinetNote({ mopsw_stage_name: 'Completed' })).toBe(true);
    expect(isCompletedCabinetNote({ stage_id: 10 })).toBe(true);
    expect(isCompletedCabinetNote({ completed_date: '2026-01-01' })).toBe(true);
  });
});

describe('statusNamesFromStages', () => {
  it('returns stage names and can hide completed', () => {
    expect(statusNamesFromStages(stages)).toEqual([
      'Preliminary DCN Prepared',
      'On hold',
      'Completed',
    ]);
    expect(statusNamesFromStages(stages, { excludeCompleted: true })).toEqual([
      'Preliminary DCN Prepared',
      'On hold',
    ]);
  });
});
