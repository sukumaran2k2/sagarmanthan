import React, { createContext, useContext, useState, useCallback } from 'react';

const AICopilotContext = createContext(null);

export function AICopilotProvider({ children }) {
  const [activeReport, setActiveReport] = useState(null);
  const [pendingPrompt, setPendingPrompt] = useState(null);

  const registerReport = useCallback((reportConfig) => {
    setActiveReport(reportConfig);
  }, []);

  const clearReport = useCallback(() => {
    setActiveReport(null);
  }, []);

  const isReportMode = Boolean(activeReport);

  const value = {
    activeReport,
    isReportMode,
    registerReport,
    clearReport,
    pendingPrompt,
    setPendingPrompt
  };

  return (
    <AICopilotContext.Provider value={value}>
      {children}
    </AICopilotContext.Provider>
  );
}

export function useAICopilot() {
  const context = useContext(AICopilotContext);
  if (!context) {
    // Return safe fallback if provider is not wrapped
    return {
      activeReport: null,
      isReportMode: false,
      registerReport: () => {},
      clearReport: () => {},
      pendingPrompt: null,
      setPendingPrompt: () => {}
    };
  }
  return context;
}

export default AICopilotContext;
