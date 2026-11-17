import React, { useState, useEffect } from "react";
import { Handshake, Gavel, Users, FileEdit, FilePieChart } from "lucide-react";

import ArbitrationList from "./lists/ArbitrationList";
import LitigationList from "./lists/LitigationList";
import ConciliationList from "./lists/ConciliationList";
import ArbitrationForm from "./forms/ArbitrationForm";
import LitigationForm from "./forms/LitigationForm";
import ConciliationForm from "./forms/ConciliationForm";
import CourtCaseReports from "./CourtCaseReports";

const MAIN_TABS = [
  { key: "Arbitration",  label: "Arbitration",  icon: Handshake },
  { key: "Litigation",   label: "Litigation",   icon: Gavel },
  { key: "Conciliation", label: "Conciliation", icon: Users },
  { key: "Input Form",   label: "Input Form",   icon: FileEdit },
  { key: "Reports",      label: "Reports",      icon: FilePieChart },
];

const FORM_TABS = [
  { key: "Arbitration",  label: "Arbitration",  icon: Handshake },
  { key: "Litigation",   label: "Litigation",   icon: Gavel },
  { key: "Conciliation", label: "Conciliation", icon: Users },
];

const TabButton = ({ active, onClick, icon: Icon, label, small }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 rounded-lg font-semibold uppercase tracking-wide transition
      ${small ? "px-4 py-2 text-xs" : "px-4 py-2.5 text-sm"}
      ${active ? "bg-[#0f3d7a] text-white shadow" : "text-slate-500 hover:bg-slate-100"}`}
  >
    <Icon size={16} /> {label}
  </button>
);

export default function CourtCases({ targetSubTab }) {
  const [mainTab, setMainTab] = useState(targetSubTab || "Arbitration");
  const [formTab, setFormTab] = useState("Arbitration");

  // react when the navbar dropdown changes the sub tab
  useEffect(() => {
    if (targetSubTab) setMainTab(targetSubTab);
  }, [targetSubTab]);

  const renderContent = () => {
    switch (mainTab) {
      case "Arbitration":  return <ArbitrationList />;
      case "Litigation":   return <LitigationList />;
      case "Conciliation": return <ConciliationList />;
      case "Reports":      return <CourtCaseReports />;
      case "Input Form":
        return (
          <>
            {/* second-level tabs, only inside Input Form */}
            <div className="flex gap-2 border-b border-slate-200 pb-3 mb-6">
              {FORM_TABS.map((t) => (
                <TabButton
                  key={t.key} small
                  active={formTab === t.key}
                  onClick={() => setFormTab(t.key)}
                  icon={t.icon} label={`${t.label} Data`}
                />
              ))}
            </div>

            {formTab === "Arbitration"  && <ArbitrationForm />}
            {formTab === "Litigation"   && <LitigationForm />}
            {formTab === "Conciliation" && <ConciliationForm />}
          </>
        );
      default: return null;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wide text-[#0f3d7a]">Court Cases</h1>
          <p className="text-sm text-slate-500">Manage arbitration, litigation and conciliation cases.</p>
        </div>

        <div className="flex gap-1 rounded-xl bg-white p-1.5 shadow">
          {MAIN_TABS.map((t) => (
            <TabButton
              key={t.key}
              active={mainTab === t.key}
              onClick={() => setMainTab(t.key)}
              icon={t.icon} label={t.label}
            />
          ))}
        </div>
      </div>

      {renderContent()}
    </div>
  );
}