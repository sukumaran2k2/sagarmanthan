import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Handshake, Gavel, Users, FileEdit, FilePieChart } from "lucide-react";

import ArbitrationList from "./pages/ArbitrationList";
import LitigationList from "./pages/LitigationList";
import ConciliationList from "./pages/ConciliationList";
import ArbitrationForm from "./forms/ArbitrationForm";
import LitigationForm from "./forms/LitigationForm";
import ConciliationForm from "./forms/ConciliationForm";
import CourtCaseReports from "./pages/Reports";

const MAIN_TABS = [
  { key: "arbitration",   label: "Arbitration",  icon: Handshake },
  { key: "litigation",    label: "Litigation",   icon: Gavel },
  { key: "conciliation",  label: "Conciliation", icon: Users },
  { key: "input-form",    label: "Input Form",   icon: FileEdit },
  { key: "reports",       label: "Reports",      icon: FilePieChart },
];

const FORM_TABS = [
  { key: "Arbitration",  label: "Arbitration",  icon: Handshake },
  { key: "Litigation",   label: "Litigation",   icon: Gavel },
  { key: "Conciliation", label: "Conciliation", icon: Users },
];

const BASE_PATH = "/legal/court-cases";

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

export default function CourtCases() {
  const location = useLocation();
  const navigate = useNavigate();
  const [formTab, setFormTab] = useState("Arbitration");

  const subPath = location.pathname.replace(/^\/legal\/court-cases\/?/, "").replace(/\/$/, "") || "arbitration";
  const mainTab = MAIN_TABS.find((t) => t.key === subPath)?.key || "arbitration";

  const goToTab = (key) => navigate(`${BASE_PATH}/${key}`);

  const renderContent = () => {
    switch (mainTab) {
      case "arbitration":  return <ArbitrationList />;
      case "litigation":   return <LitigationList />;
      case "conciliation": return <ConciliationList />;
      case "reports":      return <CourtCaseReports />;
      case "input-form":
        return (
          <>
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
              onClick={() => goToTab(t.key)}
              icon={t.icon} label={t.label}
            />
          ))}
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
