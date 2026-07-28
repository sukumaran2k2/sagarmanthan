import React from "react";
import ModuleUploadView from "../../../components/ModuleUploadView";

export default function AttendanceUploadView(props) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      <ModuleUploadView
        {...props}
        resetFile={() => {
          props.setSelectedFile(null);
          props.setPreviewRows([]);
          props.setUploadFinancialYear("");
          props.setUploadMonth("");
          props.setUploadWeek("");
          props.setFileValidationError("");
        }}
        accentColor="#0f417a"
        themeClass="ag-theme-quartz"
      />
    </div>
  );
}
