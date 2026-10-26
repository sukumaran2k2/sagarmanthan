import stalledStageReport from './reports/stalledStage';
import delayedProgressReport from './reports/delayedProgress';
import awardedCurrentFyReport from './reports/awardedCurrentFy';
import completionCurrentFyReport from './reports/completionCurrentFy';
import toBeAwardedCurrentFyReport from './reports/toBeAwardedCurrentFy';
import progressGapReport from './reports/progressGap';

export const MIS_REPORTS = [
  stalledStageReport,
  delayedProgressReport,
  awardedCurrentFyReport,
  completionCurrentFyReport,
  toBeAwardedCurrentFyReport,
  progressGapReport,
];

export function getMisReport(reportId) {
  return MIS_REPORTS.find((report) => report.id === reportId) || null;
}
