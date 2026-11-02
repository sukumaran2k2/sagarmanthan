import { useEffect, useMemo, useState } from 'react';
import { FileBarChart2, ShieldCheck } from 'lucide-react';
import RestrictedAccess from '../../../components/RestrictedAccess';
import { useProjectsPermissions } from '../hooks/useProjectsPermissions';
import DataQcGapAnalysis, { DataQcMinistryOnlyNotice } from '../components/reports/DataQcGapAnalysis';
import MisReports from '../components/reports/mis/MisReports';

const CATEGORIES = [
  {
    id: 'mis',
    label: 'MIS Reports',
    audience: 'Organisation & Ministry',
    icon: FileBarChart2,
  },
  {
    id: 'data-qc',
    label: 'Data QC Reports',
    audience: 'Ministry only',
    icon: ShieldCheck,
  },
];

export default function ProjectReportsPage() {
  const permissions = useProjectsPermissions();
  const canAccessReports = Boolean(permissions.canView);
  const isMinistryAudience = Boolean(!permissions.isOrgScope);

  const availableCategories = useMemo(() => {
    if (isMinistryAudience) return CATEGORIES;
    return CATEGORIES.filter((c) => c.id === 'mis');
  }, [isMinistryAudience]);

  const [activeCategory, setActiveCategory] = useState(() =>
    isMinistryAudience ? 'data-qc' : 'mis'
  );

  useEffect(() => {
    if (!availableCategories.some((c) => c.id === activeCategory)) {
      setActiveCategory(availableCategories[0]?.id || 'mis');
    }
  }, [availableCategories, activeCategory]);

  if (!canAccessReports) {
    return <RestrictedAccess moduleName="Projects Reports" />;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto select-none">
        {availableCategories.map((cat) => {
          const active = cat.id === activeCategory;
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'border-[#4b2424] text-[#4b2424] dark:border-[#eadede] dark:text-[#eadede] bg-[#f7f3f3] dark:bg-slate-800 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="text-[11px] text-slate-500 font-medium px-1">
        {availableCategories.find((c) => c.id === activeCategory)?.label}
        {' · '}
        {availableCategories.find((c) => c.id === activeCategory)?.audience}
      </div>

      <div>
        {activeCategory === 'mis' ? <MisReports /> : null}

        {activeCategory === 'data-qc' ? (
          isMinistryAudience ? <DataQcGapAnalysis /> : <DataQcMinistryOnlyNotice />
        ) : null}
      </div>
    </div>
  );
}
