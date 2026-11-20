import React from "react";
import CaseListTable from "./CaseList";
import { useArbitrationListStore } from "../store/caseListStore";

export default function ArbitrationList() {
  return <CaseListTable useStore={useArbitrationListStore} formKey="arbitration" showCaseInfo />;
}
