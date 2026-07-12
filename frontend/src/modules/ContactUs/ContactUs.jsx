import { useState, useMemo } from "react";
import { Mail, Phone, Copy, Check, Search, Filter, HelpCircle, ShieldAlert } from "lucide-react";
import PageBanner from "../../components/PageBanner";

const CONTACTS_DATA = [
  {
    initials: "US",
    name: "Under Secretary(PD-III)",
    division: "Ports Division",
    modules: ["Projects", "KPI Major Ports", "Form Builder", "CSR Projects"],
    email: "usports-psw@gov.in",
    phone: "011-23724653"
  },
  {
    initials: "DD",
    name: "Deputy Director",
    division: "Special Initiatives & Projects",
    modules: ["MIV 2030", "AKV 2047", "GMIS MOU tracking"],
    email: "ddports-psw@gov.in",
    phone: "011-23705360"
  },
  {
    initials: "US",
    name: "Under Secretary",
    division: "IC Division",
    modules: ["Foreign Visit", "KPI CMEC"],
    email: "usic-psw@gov.in",
    phone: "011-23719207"
  },
  {
    initials: "US",
    name: "Under Secretary",
    division: "Budget & Finance Division",
    modules: ["Capex", "Expenditure"],
    email: "usifw-psw@gov.in",
    phone: "011-23710456"
  },
  {
    initials: "US",
    name: "Under Secreatry(MA)",
    division: "Shipping Division",
    modules: ["KPI DGS"],
    email: "usma-psw@gov.in",
    phone: "011-23717731"
  },
  {
    initials: "US",
    name: "Under Secretary(IWT-I&II)",
    division: "IWT Division",
    modules: ["KPI IWAI"],
    email: "psw-usiw2@gov.in",
    phone: "011-23357558"
  },
  {
    initials: "US",
    name: "Under Secretary",
    division: "DGLL Division",
    modules: ["KPI DGLL"],
    email: "usparl-psw@gov.in",
    phone: "011-23719480"
  },
  {
    initials: "US",
    name: "Under Secretary",
    division: "Parliament Division",
    modules: ["Parliamentary Issues"],
    email: "usparl-psw@gov.in",
    phone: "011-23719480"
  },
  {
    initials: "US",
    name: "Under Secretary(SBR & CSL)",
    division: "Shipping Division",
    modules: ["KPI-CSL"],
    email: "usshipping2-psw@gov.in",
    phone: "011-23311659"
  },
  {
    initials: "US",
    name: "Under Secretary(Marine Developemnt and SU)",
    division: "Shipping Division",
    modules: ["KPI-SCI"],
    email: "ussml-psw@gov.in",
    phone: "011-23356711"
  },
  {
    initials: "US",
    name: "Under Secretary(CS & MT)",
    division: "Shipping Division",
    modules: ["KPI-IMU", "Cruise Shipping", "Flagship/FOB basis"],
    email: "uscsit-psw@gov.in",
    phone: "011-23356711"
  },
  {
    initials: "US",
    name: "Under Secretary(ALHW & Media)",
    division: "ALHW Division",
    modules: ["Media outreach"],
    email: "usalhw-psw@gov.in",
    phone: "011-23731270"
  },
  {
    initials: "US",
    name: "Under Secretary",
    division: "Administration Division",
    modules: ["HR Management", "Young Professionals", "Consultant Appointment", "Attendance", "E office", "Court Cases", "Acts and rules", "Bills,pre-constitution acts"],
    email: "us.admn-ship@gov.in",
    phone: "011-23356711"
  },
  {
    initials: "US",
    name: "Under Secretary(Coord-I&II)",
    division: "Coordination Division",
    modules: ["Gem procurement", "CPGRAMS", "Cabinet notes-MOPSW", "Cabinet notes-other ministries", "VIP reference", "Audit paras", "Mom of Ministry Meetings", "Interstate and Interministerial Issues", "Drishti portal", "Knowledge repository", "Senior Officer Meetings", "Review Items", "MOPSW Tracker"],
    email: "uscoord1-psw@gov.in",
    phone: "011-23711139"
  }
];

// Extract all unique modules for filter select options
const ALL_MODULES = Array.from(
  new Set(CONTACTS_DATA.flatMap((contact) => contact.modules))
).sort();

export default function ContactUs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState("all");
  const [copiedId, setCopiedId] = useState(null);

  // Filter contacts list based on search query and selected module
  const filteredContacts = useMemo(() => {
    return CONTACTS_DATA.filter((contact) => {
      // 1. Search Query Filter
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        query === "" ||
        contact.name.toLowerCase().includes(query) ||
        contact.division.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query);

      // 2. Module Filter
      const matchesModule =
        selectedModule === "all" ||
        contact.modules.some(
          (mod) => mod.toLowerCase() === selectedModule.toLowerCase()
        );

      return matchesSearch && matchesModule;
    });
  }, [searchQuery, selectedModule]);

  const handleCopy = (contact, idx) => {
    const textToCopy = `Designation: ${contact.name}\nDivision: ${contact.division}\nEmail: ${contact.email}\nPhone: ${contact.phone}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedId(idx);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Title & General Support Info */}
      <PageBanner
        title="Contact Us"
        description="Have questions about modules or systems? Reach out to the respective Under Secretary or Division in charge listed below."
        info={
          <>
            <span className="text-blue-200 dark:text-blue-300">Technical Queries:</span>
            <a
              href="mailto:support@ntcpwc.iitm.ac.in"
              className="text-white hover:underline cursor-pointer font-bold"
            >
              support@ntcpwc.iitm.ac.in
            </a>
          </>
        }
        icon={HelpCircle}
      />

      {/* Filtering System */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Filter className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 font-display uppercase tracking-wider">
            Search & Filter Controls
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, designation or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-slate-800 dark:text-slate-150 font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Module Filter */}
          <div className="relative">
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-slate-800 dark:text-slate-150 font-semibold"
            >
              <option value="all">Filter by module (all)</option>
              {ALL_MODULES.map((mod) => (
                <option key={mod} value={mod}>
                  {mod}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Contacts Grid Layout */}
      {filteredContacts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredContacts.map((contact, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-5 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col justify-between space-y-4"
            >
              {/* Header Info */}
              <div className="flex items-start space-x-3.5">
                {/* Profile Icon / Initials */}
                <div className="h-12 w-12 rounded-full bg-blue-900 dark:bg-blue-800 flex-shrink-0 flex items-center justify-center text-white font-extrabold text-xs select-none">
                  {contact.initials}
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-150 leading-tight">
                    {contact.name}
                  </h4>
                  <p className="text-[11px] text-slate-550 dark:text-slate-400 font-semibold">
                    {contact.division}
                  </p>
                </div>
              </div>

              {/* Modules Undertaken */}
              <div className="space-y-1.5">
                <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Modules
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {contact.modules.map((mod, mIdx) => (
                    <span
                      key={mIdx}
                      className="px-2 py-1 text-[10px] font-bold rounded-lg bg-blue-50/60 dark:bg-slate-800 text-blue-700 dark:text-slate-300 border border-blue-100/50 dark:border-slate-700"
                    >
                      {mod}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer contact info & Copy button */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between gap-3">
                <div className="flex flex-col space-y-1 min-w-0">
                  <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-[11px] font-semibold truncate leading-none"
                    >
                      {contact.email}
                    </a>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                    <a
                      href={`tel:${contact.phone}`}
                      className="text-[11px] font-semibold leading-none"
                    >
                      {contact.phone}
                    </a>
                  </div>
                </div>

                <button
                  onClick={() => handleCopy(contact, idx)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    copiedId === idx
                      ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-750 dark:hover:bg-slate-750"
                  }`}
                >
                  {copiedId === idx ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-455" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-xl mx-auto shadow-sm animate-fade-in">
          <div className="h-12 w-12 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center mb-4 border border-red-100 dark:border-red-900/30">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-display">
            No Contacts Found
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-455 max-w-xs mt-1 leading-relaxed">
            No officers match your search terms or chosen module. Try adjusting your filters.
          </p>
        </div>
      )}
    </div>
  );
}
