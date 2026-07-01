import { createContext } from 'react';
import { defineAbility } from '@casl/ability';

export const AbilityContext = createContext();

export const defineAbilityFor = (role, permissionsConfig) => {
  return defineAbility((can) => {
    if (permissionsConfig && permissionsConfig[role]) {
      const config = permissionsConfig[role];
      
      // Projects Sub-sections
      if (config.projects?.dashboard) can('read', 'ProjectsDashboard');
      if (config.projects?.list) can('read', 'ProjectsList');
      if (config.projects?.less5cr) can('read', 'ProjectsLess5cr');
      if (config.projects?.lumpsum) can('read', 'ProjectsLumpsum');
      if (config.projects?.dropRequests) can('read', 'ProjectsDropRequests');
      if (config.projects?.reports) can('read', 'ProjectsReports');
      if (config.projects?.create) can('create', 'Projects');
      if (config.projects?.update) can('update', 'Projects');
      if (config.projects?.delete) can('delete', 'Projects');
      
      // KPI Sub-sections
      if (config.kpi?.dashboard) can('read', 'KPIDashboard');
      if (config.kpi?.inputForm) can('read', 'KPIInputForm');
      if (config.kpi?.reports) can('read', 'KPIReports');
      if (config.kpi?.create) can('create', 'KPI');
      if (config.kpi?.update) can('update', 'KPI');
      if (config.kpi?.delete) can('delete', 'KPI');
      
      // Governance Sub-sections
      if (config.governance?.eOffice) can('read', 'GovernanceEOffice');
      if (config.governance?.attendance) can('read', 'GovernanceAttendance');
      if (config.governance?.cpgrams) can('read', 'GovernanceCPGRAMS');
      if (config.governance?.cabinetNotes) can('read', 'CabinetNotes');
      if (config.governance?.vipReference) can('read', 'GovernanceVipReference');
      if (config.governance?.createCabinetNotes) can('create', 'CabinetNote');
      if (config.governance?.updateCabinetNotes) can('update', 'CabinetNote');
      
      // Legal Sub-sections
      if (config.legal?.courtCases) can('read', 'LegalCourtCases');
      if (config.legal?.actsRules) can('read', 'LegalActsRules');
      
      // Strategies Sub-sections
      if (config.strategies?.vision2047) can('read', 'StrategiesVision2047');
      if (config.strategies?.mis) can('read', 'StrategiesMIS');
      if (config.strategies?.blueEconomy) can('read', 'StrategiesBlueEconomy');
      
      // Knowledge Sub-sections
      if (config.knowledge?.researchPapers) can('read', 'KnowledgeResearchPapers');
      if (config.knowledge?.policyDocuments) can('read', 'KnowledgePolicyDocuments');
      if (config.knowledge?.guidelines) can('read', 'KnowledgeGuidelines');
      
      // Form Builder Sub-sections
      if (config.formBuilder?.createForm) can('read', 'FormBuilderCreateForm');
      if (config.formBuilder?.viewSubmissions) can('read', 'FormBuilderViewSubmissions');
      
      // Tracker Sub-sections
      if (config.tracker?.milestones) can('read', 'TrackerMilestones');
      if (config.tracker?.delayAnalysis) can('read', 'TrackerDelayAnalysis');
      
      // Meetings Sub-sections
      if (config.meeting?.schedule) can('read', 'MeetingSchedule');
      if (config.meeting?.mom) can('read', 'MeetingMOM');
      if (config.meeting?.atr) can('read', 'MeetingATR');
      
      // Contacts Sub-sections
      if (config.contact?.ministryContacts) can('read', 'ContactMinistryContacts');
      if (config.contact?.helpdesk) can('read', 'ContactHelpdesk');
      
      // User Access
      if (config.userAccess?.manage) can('manage', 'UserAccess');
      
      return;
    }

    // Default Fallbacks
    if (role === 'Super Admin' || role === 'NTCPWC Admin') {
      can('manage', 'all');
      can('manage', 'UserAccess');
    } else {
      // Basic Read fallback for others
      can('read', 'ProjectsDashboard');
      can('read', 'ProjectsList');
      can('read', 'ProjectsLess5cr');
      can('read', 'ProjectsLumpsum');
      can('read', 'ProjectsDropRequests');
      can('read', 'ProjectsReports');
      can('read', 'KPIDashboard');
      can('read', 'KPIInputForm');
      can('read', 'KPIReports');
      can('read', 'GovernanceEOffice');
      can('read', 'GovernanceAttendance');
      can('read', 'GovernanceCPGRAMS');
      can('read', 'CabinetNotes');
      can('read', 'GovernanceVipReference');
      can('create', 'CabinetNote');
      can('update', 'CabinetNote');
      can('read', 'LegalCourtCases');
      can('read', 'LegalActsRules');
      can('read', 'StrategiesVision2047');
      can('read', 'StrategiesMIS');
      can('read', 'StrategiesBlueEconomy');
      can('read', 'KnowledgeResearchPapers');
      can('read', 'KnowledgePolicyDocuments');
      can('read', 'KnowledgeGuidelines');
      can('read', 'FormBuilderCreateForm');
      can('read', 'FormBuilderViewSubmissions');
      can('read', 'TrackerMilestones');
      can('read', 'TrackerDelayAnalysis');
      can('read', 'MeetingSchedule');
      can('read', 'MeetingMOM');
      can('read', 'MeetingATR');
      can('read', 'ContactMinistryContacts');
      can('read', 'ContactHelpdesk');
    }
  });
};
