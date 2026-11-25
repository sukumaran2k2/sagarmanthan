import React from "react";
import CaseListTable from "./CaseList";
import { useConciliationListStore } from "../store/caseListStore";

export default function ConciliationList({ triggerNotification }) {
  return <CaseListTable useStore={useConciliationListStore} formKey="conciliation" triggerNotification={triggerNotification} />;
}