import React from "react";
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { Home, ChevronRight, Handshake, Gavel, Users, FileEdit, FilePieChart } from "lucide-react";

import ArbitrationList from "./pages/ArbitrationList";
import LitigationList from "./pages/LitigationList";
import ConciliationList from "./pages/ConciliationList";
import ArbitrationForm from "./forms/ArbitrationForm";
import LitigationForm from "./forms/LitigationForm";
import ConciliationForm from "./forms/ConciliationForm";
import CourtCaseReports from "./pages/Reports";

export const BASE_PATH = "/legal/court-cases";

const MAIN_TABS = [
  { key: "arbitration",  label: "Arbitration",  icon: Handshake },
  { key: "litigation",   label: "Litigation",   icon: Gavel },
  { key: "conciliation", label: "Conciliation", icon: Users },
  { key: "input-form",   label: "Input Forms",  icon: FileEdit },
  { key: "reports",      label: "Reports",      icon: FilePieChart },
];

const FORM_TABS = [
  { key: "arbitration",  label: "Arbitration Data",  icon: Handshake },
  { key: "litigation",   label: "Litigation Data",   icon: Gavel },
  { key: "conciliation", label: "Conciliation Data", icon: Users },
];

const TITLES = {
  arbitration: "Arbitration Cases",
  litigation: "Litigation Cases",
  conciliation: "Conciliation Cases",
  "input-form": "Input Forms",
  reports: "Reports",
};

const TabButton = ({ active, onClick, icon: Icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition whitespace-nowrap
      ${active ? "bg-[#0f3d7a] text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}
  >
    <Icon size={16} /> {label}
  </button>
);

function Breadcrumb({ items }) {
  return (
    <nav className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-500 shadow-sm">
      <Link to="/" className="hover:text-[#0f3d7a]"><Home size={16} /></Link>
      {items.map((it, i) => (
        <React.Fragment key={it.label}>
          <ChevronRight size={14} className="text-slate-300" />
          {i === items.length - 1
            ? <span className="font-bold text-[#0f3d7a]">{it.label}</span>
            : <Link to={it.to} className="hover:text-[#0f3d7a]">{it.label}</Link>}
        </React.Fragment>
      ))}
    </nav>
  );
}

function InputFormPage({ triggerNotification }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = pathname.split("/").filter(Boolean).pop();

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        {FORM_TABS.map((t) => (
          <TabButton
            key={t.key}
            active={active === t.key}
            icon={t.icon}
            label={t.label}
            onClick={() => navigate(`${BASE_PATH}/input-form/${t.key}`)}
          />
        ))}
      </div>

      <Routes>
        <Route path="arbitration"  element={<ArbitrationForm  triggerNotification={triggerNotification} />} />
        <Route path="litigation"   element={<LitigationForm   triggerNotification={triggerNotification} />} />
        <Route path="conciliation" element={<ConciliationForm triggerNotification={triggerNotification} />} />
        <Route path="*" element={<Navigate to="arbitration" replace />} />
      </Routes>
    </>
  );
}

export default function CourtCases({ triggerNotification }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const section = pathname.replace(BASE_PATH, "").split("/").filter(Boolean)[0] || "arbitration";
  const isForm = section === "input-form";

  return (
    <div className="p-6">
      <Breadcrumb
        items={[
          { label: "Legal", to: BASE_PATH },
          { label: "Court Cases", to: BASE_PATH },
          { label: TITLES[section] || "Arbitration Cases" },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-6 border-b border-slate-200 pb-5">
        <div className="max-w-xl">
          <h1 className="text-2xl font-extrabold uppercase tracking-wide text-[#0f3d7a]">Court Cases</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage arbitration, litigation and conciliation cases, input forms and reports.
          </p>
        </div>

        <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {MAIN_TABS.map((t) => (
            <TabButton
              key={t.key}
              active={section === t.key}
              icon={t.icon}
              label={t.label}
              onClick={() =>
                navigate(t.key === "input-form" ? `${BASE_PATH}/input-form/arbitration` : `${BASE_PATH}/${t.key}`)
              }
            />
          ))}
        </div>
      </div>

      {!isForm && (
        <h2 className="mb-5 text-xl font-extrabold uppercase tracking-wide text-[#0f3d7a]">
          {TITLES[section]}
        </h2>
      )}

      <Routes>
        <Route index element={<Navigate to="arbitration" replace />} />
        <Route path="arbitration"  element={<ArbitrationList />} />
        <Route path="litigation"   element={<LitigationList />} />
        <Route path="conciliation" element={<ConciliationList />} />
        <Route path="input-form/*" element={<InputFormPage triggerNotification={triggerNotification} />} />
        <Route path="reports"      element={<CourtCaseReports />} />
        <Route path="*" element={<Navigate to="arbitration" replace />} />
      </Routes>
    </div>
  );
}