import React from "react";
import ModuleUploadView from "../../../components/ModuleUploadView";

export default function EOfficeUploadView(props) {
  return (
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
      themeClass="eoffice-blue-grid"
      sampleFileName="Sample Template"
    />
  );
}
