import React, { createContext, useContext, useState, useCallback } from 'react';

const AICopilotContext = createContext(null);

export function AICopilotProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReportMode, setIsReportMode] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const [pendingPrompt, setPendingPrompt] = useState(null);

  // SagarBot has no per-module permission settings any more
  const isCopilotEnabledForRoute = useCallback(() => true, []);

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
      isCopilotEnabledForRoute: () => true
    };
  }
  return context;
}

export default AICopilotContext;
