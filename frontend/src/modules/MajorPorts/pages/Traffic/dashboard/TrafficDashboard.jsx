import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import RestrictedAccess from '../../../../../components/RestrictedAccess';
import { fetchTrafficDashboardPart } from '../../../api';
import { useTrafficPermissions } from '../../../hooks/useTrafficPermissions';
import { useTrafficStore } from '../../../store/useTrafficStore';
import { useNotifier, COMMON_TOASTS } from '../../../../../utils/notify';
import { buildFinancialYearOptions } from '../trafficConstants';
import { useCachedRequest } from '../usePagedList';
import { RefreshBar } from '../components/ListToolbar';
import {
  DASHBOARD_PANELS,
  SUMMARY_COMMODITIES,
  allMonthsFor,
  fiscalYearLabels,
  shortFiscalYear,
} from './dashboardConfig';
import {
  CardGrid, DASHBOARD_CONTENT_CLASS, DashboardSelect, DashboardSidebar, KpiCard, MonthPicker, PanelHeading,
  SectionDivider, SubSectionTitle,
} from './DashboardParts';
import { OverallKpiTable, TrafficKpiSummaryTable } from './DashboardTables';
import KpiDrillDown from './KpiDrillDown';

const FY_OPTIONS = [
  { value: '', label: '--Select Financial year--' },
  ...buildFinancialYearOptions({ back: 3 }).reverse().map((fy) => ({ value: fy, label: shortFiscalYear(fy) })),
];

/** One cached, cancellable request per dashboard data source. */
function useDashboardPart(part, params, enabled, onError) {
  return useCachedRequest(
    `dashboard-${part}:${JSON.stringify(params)}`,
    (signal) => fetchTrafficDashboardPart(part, params, { signal }).then((res) => res.data),
    { onError, enabled }
  );
}

/**
 * KPI Major Ports → Traffic & Port Performance dashboard: a copy of the earlier portal's
 * trafficDashboard.html (sidebar panels, KPI cards, Overall table, Traffic KPI Summary and
 * the "Detail of KPI" drill-downs), with Overall at the top of the sidebar.
 * Organisation users see their own organisation only (the server enforces it).
 */
export default function TrafficDashboard({ triggerNotification }) {
  const { canView, isMinistryView } = useTrafficPermissions();
  const notify = useNotifier(triggerNotification);
  const { organisations, commodities, loadMasters } = useTrafficStore(
    useShallow((state) => ({
      organisations: state.organisations,
      commodities: state.commodities,
      loadMasters: state.loadMasters,
    }))
  );

  const [panelId, setPanelId] = useState(DASHBOARD_PANELS[0].id);
  // Drill stack: a card's detail, then optionally its commodity-wise table
  const [drills, setDrills] = useState([]);
  const [organisationId, setOrganisationId] = useState('0');
  const [fiscalYear, setFiscalYear] = useState('');
  const [months, setMonths] = useState([]);
  const [commodity, setCommodity] = useState('4');
  const [subcategoryId, setSubcategoryId] = useState('');

  useEffect(() => {
    if (canView) loadMasters();
  }, [canView, loadMasters]);

  const panel = DASHBOARD_PANELS.find((p) => p.id === panelId) || DASHBOARD_PANELS[0];
  const labels = fiscalYearLabels(fiscalYear);

  const baseFilters = useMemo(() => ({
    fy: fiscalYear || 'all',
    months: months.length ? months.join(',') : 'all',
  }), [fiscalYear, months]);
  const cardParams = useMemo(() => ({
    ...baseFilters,
    ...(isMinistryView && organisationId !== '0' ? { organisationId } : {}),
  }), [baseFilters, isMinistryView, organisationId]);
  // The summary always covers every organisation the user may see
  const summaryParams = useMemo(() => ({
    ...baseFilters,
    commodity,
    ...(subcategoryId ? { subcategoryId } : {}),
  }), [baseFilters, commodity, subcategoryId]);

  const onError = useCallback(() => notify(COMMON_TOASTS.loadFailed('Dashboard data')), [notify]);
  const needsCards = canView && panel.type !== 'summary' && !drills.length;
  const traffic = useDashboardPart('traffic', cardParams, needsCards, onError);
  const cargo = useDashboardPart('cargo', cardParams, needsCards, onError);
  const performance = useDashboardPart('performance', cardParams, needsCards, onError);
  const coastal = useDashboardPart('coastal', cardParams, needsCards && panel.type !== 'overall', onError);
  const summary = useDashboardPart('summary', summaryParams, canView && panel.type === 'summary' && !drills.length, onError);

  const organisationOptions = useMemo(() => (isMinistryView
    ? [{ value: '0', label: 'All Organisations' }, ...organisations.map((o) => ({ value: String(o.organisation_id), label: o.organisation_name }))]
    : organisations.map((o) => ({ value: String(o.organisation_id), label: o.organisation_name }))),
  [isMinistryView, organisations]);

  const groupId = SUMMARY_COMMODITIES.find((c) => c.value === commodity)?.groupId;
  const cargoTypeOptions = useMemo(() => [
    { value: '', label: '--All Sub Commodities--' },
    ...commodities
      .filter((c) => Number(c.commodity_group_id) === groupId)
      .map((c) => ({ value: String(c.commodity_id), label: c.commodity_name })),
  ], [commodities, groupId]);

  if (!canView) return <RestrictedAccess moduleName="KPI - Major Ports · Traffic Dashboard" />;

  const data = { traffic: traffic.value, cargo: cargo.value, performance: performance.value, coastal: coastal.value };
  const refreshing = [traffic, cargo, performance, coastal].some((r) => r.refreshing);

  // A year change keeps "all twelve months" meaning the whole of the new year
  const changeFiscalYear = (value) => {
    if (months.length === 12) setMonths(allMonthsFor(value));
    setFiscalYear(value);
  };
  const selectPanel = (id) => {
    setPanelId(id);
    setDrills([]);
  };
  const ownOrganisationId = isMinistryView ? Number(organisationId) : Number(organisations[0]?.organisation_id) || 0;
  const drillFilters = { ...baseFilters, organisationId: ownOrganisationId };
  const activeDrill = drills[drills.length - 1];

  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:gap-0 min-h-[70vh]">
      <DashboardSidebar panels={DASHBOARD_PANELS} active={panel.id} onSelect={selectPanel} />

      <div className={DASHBOARD_CONTENT_CLASS}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {panel.type !== 'summary' && (
            <DashboardSelect
              label="Organisation"
              value={isMinistryView ? organisationId : organisationOptions[0]?.value ?? ''}
              onChange={(value) => { setOrganisationId(value); setDrills([]); }}
              options={organisationOptions.length ? organisationOptions : [{ value: '', label: '--Organisation--' }]}
              disabled={!isMinistryView}
            />
          )}
          <DashboardSelect label="Financial Year" value={fiscalYear} onChange={changeFiscalYear} options={FY_OPTIONS} />
          <MonthPicker value={months} onChange={setMonths} fiscalYear={fiscalYear} />
          {panel.type === 'summary' && (
            <>
              <DashboardSelect
                label="Commodity"
                value={commodity}
                onChange={(value) => { setCommodity(value); setSubcategoryId(''); }}
                options={SUMMARY_COMMODITIES}
              />
              {groupId && cargoTypeOptions.length > 1 ? (
                <DashboardSelect label="Cargo Type" value={subcategoryId} onChange={setSubcategoryId} options={cargoTypeOptions} />
              ) : null}
            </>
          )}
        </div>

        {activeDrill ? (
          <KpiDrillDown
            key={JSON.stringify(activeDrill)}
            drill={activeDrill}
            filters={drillFilters}
            labels={labels}
            onBack={() => setDrills((stack) => stack.slice(0, -1))}
            onOpenCargoWise={(cargoCode) => setDrills((stack) => [...stack, { type: 'cargoWise', cargo: cargoCode }])}
            triggerNotification={triggerNotification}
          />
        ) : (
          <section className="relative" aria-label={panel.heading}>
            <RefreshBar active={refreshing || summary.refreshing} />
            <PanelHeading icon={panel.icon} title={panel.heading} sub={panel.sub} />

            {panel.type === 'overall' && (
              <OverallKpiTable data={data} fiscalYear={fiscalYear} months={months} labels={labels} triggerNotification={triggerNotification} />
            )}

            {panel.type === 'summary' && (
              <TrafficKpiSummaryTable
                summary={summary.value}
                loading={summary.loading}
                title={`Traffic KPI Summary (YoY) - ${SUMMARY_COMMODITIES.find((c) => c.value === commodity)?.label}`}
                fiscalYear={fiscalYear}
                months={months}
                labels={labels}
                triggerNotification={triggerNotification}
              />
            )}

            {panel.sections?.map((section, index) => (
              <div key={section.title || index}>
                {section.title ? (
                  section.small ? <SubSectionTitle title={section.title} /> : <SectionDivider title={section.title} />
                ) : null}
                <CardGrid>
                  {section.cards.map((cardConfig) => (
                    <KpiCard
                      key={cardConfig.title}
                      config={cardConfig}
                      data={data}
                      labels={labels}
                      onOpen={(c) => setDrills([{ type: c.drill.type, kpi: c.drill.kpi }])}
                    />
                  ))}
                </CardGrid>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
