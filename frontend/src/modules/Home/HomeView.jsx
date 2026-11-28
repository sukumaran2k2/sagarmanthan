import { AlertTriangle, RefreshCw } from 'lucide-react';
import ExportDropdown from '../../components/ExportDropdown';
import LandingView from '../Landing/Landing';
import WelcomeHero from '../Landing/WelcomeHero';
import { getSessionOrganisationName, getSessionWingId, isSuperAdmin } from '../../utils/authSession';
import useHomeDashboard from './hooks/useHomeDashboard';
import { WING_ROW_CONFIG } from './config/dashboardModules';
import { formatDay } from './utils/dataEntryStatus';
import { exportDataEntryExcel, exportDataEntryPdf } from './utils/exportDataEntryReport';
import DashboardSkeleton from './components/DashboardSkeleton';
import OrganisationSection from './components/OrganisationSection';
import SectionCard from './components/SectionCard';
import StatusLegend from './components/StatusLegend';
import StatusMatrix from './components/StatusMatrix';
import UploadCards from './components/UploadCards';

const SECTION_NUMERALS = ['I', 'II', 'III'];

function LoadError({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center dark:border-rose-500/30 dark:bg-rose-500/10">
      <AlertTriangle className="h-6 w-6 text-rose-500" aria-hidden="true" />
      <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f417a] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-900"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Try again
      </button>
    </div>
  );
}

function HomeDashboard({ onNavigate }) {
  const { data, loading, error, reload } = useHomeDashboard();
  const ministryView = data?.view === 'MINISTRY';
  const organisationName = getSessionOrganisationName();
  // Sections are numbered I, II, III in the order they appear
  const sectionOrder = [
    data?.cards?.length > 0 && 'cards',
    data?.wings && 'wings',
    ministryView && data?.organisations && 'organisations',
  ].filter(Boolean);
  const sectionNo = (key) => SECTION_NUMERALS[sectionOrder.indexOf(key)];

  return (
    <div className="space-y-5 pb-4">
      <WelcomeHero className="h-[190px] rounded-2xl shadow-lg shadow-slate-900/15 md:h-[230px]">
        <p className="text-xs font-medium text-sky-100/90 md:text-sm">
          {data?.view === 'ORGANISATION' && organisationName ? `${organisationName} · ` : ''}
          Data entry status{data?.asOn ? ` as on ${formatDay(data.asOn)}` : ''}
        </p>
      </WelcomeHero>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-base font-bold text-slate-800 dark:text-slate-100">Data Entry Status</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            When each module was last updated{data?.asOn ? `, as on ${formatDay(data.asOn)}` : ''}. Open a module from its name.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          <StatusLegend />
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
          {data && (
            <ExportDropdown
              onExportExcel={() => exportDataEntryExcel(data)}
              onExportPdf={() => exportDataEntryPdf(data)}
              title="Data Entry Report"
              chevron
            />
          )}
        </div>
      </div>

      {loading && !data && <DashboardSkeleton />}
      {error && !loading && <LoadError message={error} onRetry={reload} />}

      {data && (
        <>
          {data.cards?.length > 0 && (
            <SectionCard
              index={sectionNo('cards')}
              title="File Upload Modules"
              description="Latest reporting week uploaded for E-Office and Attendance."
            >
              <UploadCards cards={data.cards} asOn={data.asOn} onNavigate={onNavigate} />
            </SectionCard>
          )}

          {data.wings && (
            <SectionCard
              index={sectionNo('wings')}
              title="Data Entry Modules - Wing-wise"
              description="Latest update in each wing. For modules that track open items, only open items count."
            >
              <StatusMatrix
                columns={data.wings.columns}
                rows={data.wings.rows}
                rowConfig={WING_ROW_CONFIG}
                asOn={data.asOn}
                cornerLabel="Module / Wing"
                highlightColumnId={getSessionWingId()}
                onNavigate={onNavigate}
              />
            </SectionCard>
          )}

          {data.organisations && (
            <SectionCard
              index={sectionNo('organisations')}
              title={ministryView ? 'Organisation Modules' : `Organisation Modules - ${data.organisations.columns[0]?.name || ''}`}
              description={
                ministryView
                  ? 'Latest update by each organisation. Switch between Major Ports and other organisations.'
                  : 'Latest update in each module your organisation reports on.'
              }
            >
              <OrganisationSection
                section={data.organisations}
                asOn={data.asOn}
                ministryView={ministryView}
                onNavigate={onNavigate}
              />
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}

/**
 * The page shown after login. Super Admin has no module data in this portal, so it keeps the
 * welcome page; everyone else gets the welcome banner with the data entry status below it.
 */
export default function HomeView({ onNavigate }) {
  if (isSuperAdmin()) return <LandingView onNavigate={onNavigate} />;
  return <HomeDashboard onNavigate={onNavigate} />;
}
