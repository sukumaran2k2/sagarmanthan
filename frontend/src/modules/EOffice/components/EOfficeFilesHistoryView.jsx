import React from "react";
import ModuleFilesHistoryView from "../../../components/ModuleFilesHistoryView";

export default function EOfficeFilesHistoryView(props) {
  return (
    <ModuleFilesHistoryView
      {...props}
      title="Uploaded E-Office Spreadsheet Files"
      themeClass="eoffice-blue-grid"
    />
  );
}
