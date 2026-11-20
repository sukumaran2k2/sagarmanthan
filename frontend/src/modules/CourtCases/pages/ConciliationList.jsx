import React from "react";
import CaseListTable from "./CaseList";
import { useConciliationListStore } from "../store/caseListStore";

export default function ConciliationList() {
  return <CaseListTable useStore={useConciliationListStore} formKey="conciliation" />;
}
