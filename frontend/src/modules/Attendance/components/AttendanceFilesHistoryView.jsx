import React from "react";
import ModuleFilesHistoryView from "../../../components/ModuleFilesHistoryView";

export default function AttendanceFilesHistoryView(props) {
  return (
    <ModuleFilesHistoryView
      {...props}
      title="Uploaded Attendance Spreadsheet Files"
      themeClass="ag-theme-quartz"
    />
  );
}
