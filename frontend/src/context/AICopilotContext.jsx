import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AICopilotContext = createContext(null);
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export function getModuleKeyFromPath(pathname = '', moduleName = '') {
  const p = (pathname || '').toLowerCase();
  const m = (moduleName || '').toLowerCase();

  if (p === '/' || p === '/dashboard' || p.includes('/landing') || p.includes('/dashboard')) return 'dashboard';
  if (p.includes('/csr') || m.includes('csr')) return 'CSR_PROJECTS';
  if (p.includes('/miv') || p.includes('/miv-2030') || m.includes('miv') || m.includes('vision 2030')) return 'MIV_2030';
  if (p.includes('/gmis') || p.includes('/gmis-mou') || m.includes('gmis') || m.includes('mou')) return 'GMIS_MOU';
  if (p.includes('/ovod') || p.includes('/one-vision') || p.includes('/drishti') || m.includes('ovod') || m.includes('one vision')) return 'ONE_VISION_ONE_DOCUMENT';
  if (p.includes('/capex') || m.includes('capex')) return 'CAPEX';
  if (p.includes('/expenditure') || m.includes('expenditure')) return 'EXPENDITURE';
  if (p.includes('/projects') || m.includes('project')) return 'PROJECTS';
  if (p.includes('/major-ports') || p.includes('/ports') || m.includes('major ports')) return 'KPI_MAJOR_PORTS';
  if (p.includes('/dgs') || m.includes('dgs')) return 'KPI_DGS';
  if (p.includes('/iwai') || m.includes('iwai')) return 'KPI_IWAI';
  if (p.includes('/dgll') || m.includes('dgll')) return 'KPI_DGLL';
  if (p.includes('/csl') || m.includes('csl')) return 'KPI_CSL';
  if (p.includes('/imu') || m.includes('imu')) return 'KPI_IMU';
  if (p.includes('/sci') || m.includes('sci')) return 'KPI_SCI';
  if (p.includes('/attendance') || m.includes('attendance')) return 'ATTENDANCE';
  if (p.includes('/eoffice') || p.includes('/e-office') || m.includes('eoffice')) return 'EOFFICE';
  if (p.includes('/cpgrams') || m.includes('cpgrams')) return 'CPGRAMS';
  if (p.includes('/vip-reference') || p.includes('/vip') || m.includes('vip')) return 'VIP_REFERENCE';
  if (p.includes('/mopsw-cabinet') || p.includes('/cabinet-notes') || m.includes('cabinet')) return 'CABINET_NOTES';
  if (p.includes('/parliamentary') || m.includes('parliamentary')) return 'PARLIAMENTARY_ISSUES';
  if (p.includes('/gem') || m.includes('gem')) return 'GEM_PROCUREMENT';
  if (p.includes('/media') || m.includes('media')) return 'MEDIA_OUTREACH';
  if (p.includes('/audit') || m.includes('audit')) return 'AUDIT_PARA';
  if (p.includes('/decision') || m.includes('decision')) return 'DECISION_IMPLEMENTATION';
  if (p.includes('/inter-state') || m.includes('inter-state')) return 'INTER_STATE';
  if (p.includes('/inter-ministerial') || m.includes('inter-ministerial')) return 'INTER_MINISTERIAL';
  if (p.includes('/foreign-visit') || m.includes('foreign visit')) return 'OFFICIAL_FOREIGN_VISIT';
  if (p.includes('/flagged-ship') || m.includes('flagged')) return 'FLAGGED_SHIPS';
  if (p.includes('/cruise') || m.includes('cruise')) return 'CRUISE_PORTS';
  if (p.includes('/review-items') || m.includes('review')) return 'REVIEW_ITEMS';
  if (p.includes('/young-professional') || p.includes('/yp') || m.includes('young professional')) return 'YOUNG_PROFESSIONALS';
  if (p.includes('/consultant') || m.includes('consultant')) return 'CONSULTANT_APPOINTMENT';
  if (p.includes('/hr') || m.includes('hr')) return 'HR_MANAGEMENT';
  if (p.includes('/court-case') || p.includes('/arbitration') || p.includes('/litigation') || m.includes('court')) return 'COURT_CASES';
  if (p.includes('/acts') || p.includes('/bills') || m.includes('acts')) return 'ACTS_AND_RULES';

  return 'dashboard';
}

export function AICopilotProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReportMode, setIsReportMode] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const [pendingPrompt, setPendingPrompt] = useState(null);

  // Copilot Permissions state
  const [copilotPermissions, setCopilotPermissions] = useState({
    globalEnabled: true,
    permissions: []
  });

  // Fetch permissions from server
  const fetchCopilotPermissions = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/rbac/sagarbot-permissions`);
      if (res.data) {
        setCopilotPermissions({
          globalEnabled: res.data.globalEnabled !== undefined ? res.data.globalEnabled : true,
          permissions: Array.isArray(res.data.permissions) ? res.data.permissions : []
        });
      }
    } catch (err) {
      console.warn('[AICopilotContext] Could not fetch permissions:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchCopilotPermissions();
  }, [fetchCopilotPermissions]);

  // Check if Copilot is enabled for a given route / module
  const isCopilotEnabledForRoute = useCallback((pathname = '', moduleName = '') => {
    if (copilotPermissions.globalEnabled === false) return false;
    
    // If no specific permissions loaded yet, default to enabled
    if (!copilotPermissions.permissions || copilotPermissions.permissions.length === 0) {
      return true;
    }

    const key = getModuleKeyFromPath(pathname, moduleName);
    const found = copilotPermissions.permissions.find(
      p => p.itemKey.toUpperCase() === key.toUpperCase()
    );

    if (found) {
      return Boolean(found.isEnabled);
    }

    return true;
  }, [copilotPermissions]);

  // Called by any Report component when it mounts or changes report data
  const registerReport = useCallback((reportInfo) => {
    setActiveReport(reportInfo);
    setIsReportMode(true);
    
    // Auto-open chatbot if autoOpen is not explicitly disabled
    if (reportInfo?.autoOpen !== false) {
      setIsOpen(true);
    }
  }, []);

  // Called when leaving reports
  const clearReport = useCallback(() => {
    setIsReportMode(false);
  }, []);

  const openWithPrompt = useCallback((promptText) => {
    setPendingPrompt(promptText);
    setIsOpen(true);
  }, []);

  return (
    <AICopilotContext.Provider
      value={{
        isOpen,
        setIsOpen,
        isReportMode,
        activeReport,
        registerReport,
        clearReport,
        openWithPrompt,
        pendingPrompt,
        setPendingPrompt,
        copilotPermissions,
        fetchCopilotPermissions,
        isCopilotEnabledForRoute
      }}
    >
      {children}
    </AICopilotContext.Provider>
  );
}

export function useAICopilot() {
  const context = useContext(AICopilotContext);
  if (!context) {
    // Return safe fallback if not wrapped
    return {
      isOpen: false,
      setIsOpen: () => {},
      isReportMode: false,
      activeReport: null,
      registerReport: () => {},
      clearReport: () => {},
      openWithPrompt: () => {},
      pendingPrompt: null,
      setPendingPrompt: () => {},
      copilotPermissions: { globalEnabled: true, permissions: [] },
      fetchCopilotPermissions: () => {},
      isCopilotEnabledForRoute: () => true
    };
  }
  return context;
}

export default AICopilotContext;
