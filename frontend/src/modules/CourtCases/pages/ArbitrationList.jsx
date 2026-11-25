import React from "react";
import CaseListTable from "./CaseList";
import { useArbitrationListStore } from "../store/caseListStore";

export default function ArbitrationList({ triggerNotification }) {
  return <CaseListTable useStore={useArbitrationListStore} formKey="arbitration" showCaseInfo triggerNotification={triggerNotification} />;
}