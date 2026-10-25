import AttendanceUploadView from '../pages/AttendanceUploadView';
import Reports from '../pages/Reports';
import AttendanceDataListView from '../components/AttendanceDataListView';
import AttendanceFilesHistoryView from '../components/AttendanceFilesHistoryView';

// Each of the 4 tabs takes a genuinely different prop shape (Upload ~15 props,
// DataList ~20, Files ~5, Reports 24), unlike the KPI modules' registries where
// every section shared one identical prop spread. So this registry exists to
// satisfy the PI folder model's views/ requirement and to give callers one place
// to resolve a tab -> component, but Attendance.jsx still passes each
// component's own explicit prop list rather than a single generic spread.
const VIEW_REGISTRY = {
  upload: AttendanceUploadView,
  data: AttendanceDataListView,
  files: AttendanceFilesHistoryView,
  report: Reports,
};

export function resolveAttendanceView(subTab) {
  return VIEW_REGISTRY[subTab] || null;
}

export default resolveAttendanceView;
