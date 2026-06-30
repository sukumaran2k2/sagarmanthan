import React, { createContext, useState } from 'react';

export const NavigationContext = createContext(null);

export const NavigationProvider = ({ children }) => {
  const [activeTab, setActiveTab] = useState('landing');
  const [eOfficeKpi, setEOfficeKpi] = useState('file-pendency');

  return (
    <NavigationContext.Provider value={{ activeTab, setActiveTab, eOfficeKpi, setEOfficeKpi }}>
      {children}
    </NavigationContext.Provider>
  );
};
