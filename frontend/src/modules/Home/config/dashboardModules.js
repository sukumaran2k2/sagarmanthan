/**
 * How each home-dashboard row is presented. Keys match the row keys sent by GET /home-dashboard.
 *
 *   statusText  wording for statuses on this row (the defaults live in utils/dataEntryStatus.js)
 *   tab         menu tab the module name links to (resolved through ROUTE_MAP); shown as a link
 *               only when the user can read the module
 *   readCode    module code checked for that link (defaults to the row's moduleCode)
 */

import { CalendarCheck, FileCheck2, FileClock, Inbox } from 'lucide-react';

const NOTHING_PENDING = (what) => ({ NONE_ACTIVE: `No pending ${what}` });

export const CARD_CONFIG = {
  filePendency: { tab: 'E Office', icon: FileClock },
  receiptPendency: { tab: 'E Office', icon: Inbox },
  fileDisposal: { tab: 'E Office', icon: FileCheck2 },
  attendance: { tab: 'Attendance', icon: CalendarCheck },
};

export const CARD_STATUS_TEXT = { NO_DATA: 'No uploads yet' };

export const WING_ROW_CONFIG = {
  youngProfessionals: { tab: 'Young Professionals', statusText: { NONE_ACTIVE: 'None engaged' } },
  consultantAppointment: { tab: 'Consultant Appointment', statusText: NOTHING_PENDING('appointments') },
  vipReference: { tab: 'VIP Reference', statusText: NOTHING_PENDING('references') },
  cabinetNotesOther: { tab: 'Cabinet Notes - Other Ministries', statusText: { NO_DATA: 'No notes received' } },
  cabinetNotesMopsw: { tab: 'Cabinet Notes - MoPSW', statusText: NOTHING_PENDING('notes') },
  auditPara: { tab: 'Audit Paras', statusText: NOTHING_PENDING('paras') },
  bills: { tab: 'Bills/PreConstitutions Act', statusText: NOTHING_PENDING('bills') },
  parliamentaryIssues: { tab: 'Parliamentary Issues', statusText: NOTHING_PENDING('matters') },
  foreignVisitWing: { tab: 'Foreign Visit' },
  formBuilderWing: { tab: 'Form Builder', statusText: { NONE_ACTIVE: 'No forms assigned', NO_DATA: 'Not submitted' } },
};

export const ORGANISATION_ROW_CONFIG = {
  projects: { tab: 'projects' },
  csr: { tab: 'CSR Projects' },
  capex: { tab: 'Capex' },
  kpi: { tab: 'Major Ports Dashboard', readCode: 'KPI_MAJOR_PORTS' },
  hr: { tab: 'HR Management' },
  gemGoods: { tab: 'GEM Procurements' },
  gemServices: { tab: 'GEM Procurements' },
  gemWorks: { tab: 'GEM Procurements' },
  courtCases: { tab: 'Court cases' },
  miv: { tab: 'MIV 2030' },
  ovod: { tab: 'OVOD' },
  gmis: { tab: 'GMIS & IMW MoUs' },
  mediaOutreach: { tab: 'Media Outreach' },
  foreignVisit: { tab: 'Foreign Visit' },
  nmp: { tab: 'National Monetisation Pipeline' },
  formBuilder: { tab: 'Form Builder', statusText: { NONE_ACTIVE: 'No forms assigned', NO_DATA: 'Not submitted' } },
};

export const ORGANISATION_GROUPS = [
  { key: 'MAJOR_PORTS', label: 'Major Ports' },
  { key: 'OTHER_ORGANISATIONS', label: 'Other Organisations' },
];
