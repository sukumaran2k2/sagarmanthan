import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import RestrictedAccess from '../../../../../components/RestrictedAccess';
import { fetchFinancialDashboardOrganisations, fetchFinancialDashboardPart } from '../../../api';
import { useFinancialParametersPermissions } from '../../../hooks/useFinancialParametersPermissions';
import { useFinancialParametersStore } from '../../../store/useFinancialParametersStore';
import { useNotifier, COMMON_TOASTS } from '../../../../../utils/notify';
import { buildFinancialYearOptions } from '../../Traffic/trafficConstants';
import { useCachedRequest } from '../../Traffic/usePagedList';
import { RefreshBar } from '../../Traffic/components/ListToolbar';
import { allMonthsFor, fiscalYearLabels, shortFiscalYear } from '../../Traffic/dashboard/dashboardConfig';
import {
  CardGrid, DASHBOARD_CONTENT_CLASS, DashboardSelect, DashboardSidebar, KpiCard, MonthPicker, PanelHeading,
} from '../../Traffic/dashboard/DashboardParts';
import { FINANCIAL_CARDS, FINANCIAL_DASHBOARD_PANELS } from './financialDashboardConfig';
import FinancialDrillDown from './FinancialDrillDown';

const FY_OPTIONS = [
  { value: '', label: '--Select Financial year--' },
  ...buildFinancialYearOptions({ back: 5 }).reverse().map((fy) => ({ value: fy, label: shortFiscalYear(fy) })),
];

/**
 * KPI Major Ports → Financial Dashboard: a copy of the earlier portal's financialDashboard.html
 * (Organisation, Financial Year and Month filters; eight cards with current and last FY YTD and
 * YoY; each card opens its "Detail of KPI"). It uses the same parts as the Traffic &
 * Port Performance dashboard. Organisation users start on their own organisation and may
 * switch to any other (or All Organisations) to view it.
 */
export default function FinancialDashboard({ triggerNotification }) {
  const { canView, isMinistryView } = useFinancialParametersPermissions();
  const notify = useNotifier(triggerNotification);
  const { organisations, loadMasters } = useFinancialParametersStore(
    useShallow((state) => ({ organisations: state.organisations, loadMasters: state.loadMasters }))
  );

  const [organisationId, setOrganisationId] = useState('0');
  const [fiscalYear, setFiscalYear] = useState('');
  const [months, setMonths] = useState([]);
  const [drillKpi, setDrillKpi] = useState(null);

  // Organisation users: their own organisation (masters hold only it) until they pick another
  const [orgPick, setOrgPick] = useState(null);
  const [allOrganisations, setAllOrganisations] = useState([]);

  useEffect(() => {
    if (canView) loadMasters();
  }, [canView, loadMasters]);

  // The masters give organisation users only their own organisation; the dropdown lists all
  useEffect(() => {
    if (!canView || isMinistryView) return undefined;
    let active = true;
    fetchFinancialDashboardOrganisations()
      .then((res) => { if (active) setAllOrganisations(res.data?.organisations || []); })
      .catch(() => {}); // the dropdown then keeps just their own organisation
    return () => { active = false; };
  }, [canView, isMinistryView]);

  const panel = FINANCIAL_DASHBOARD_PANELS[0];
  const labels = fiscalYearLabels(fiscalYear);

  const baseFilters = useMemo(() => ({
    fy: fiscalYear || 'all',
    months: months.length ? months.join(',') : 'all',
  }), [fiscalYear, months]);
  const ownOrganisation = organisations[0]?.organisation_id;
  const orgUserPick = orgPick ?? (ownOrganisation != null ? String(ownOrganisation) : '');
  const selectedOrganisationId = isMinistryView ? organisationId : orgUserPick;
  const cardParams = useMemo(() => ({
    ...baseFilters,
    ...(isMinistryView
      ? (organisationId !== '0' ? { organisationId } : {})
      : (orgUserPick ? { organisationId: orgUserPick } : {})),
  }), [baseFilters, isMinistryView, organisationId, orgUserPick]);

  const onError = useCallback(() => notify(COMMON_TOASTS.loadFailed('Financial dashboard data')), [notify]);
  const summary = useCachedRequest(
    `financial-dashboard-summary:${JSON.stringify(cardParams)}`,
    (signal) => fetchFinancialDashboardPart('summary', cardParams, { signal }).then((res) => res.data),
    { onError, enabled: canView && !drillKpi }
  );

  const organisationOptions = useMemo(() => {
    const toOptions = (list) => list.map((o) => ({ value: String(o.organisation_id), label: o.organisation_name }));
    if (isMinistryView) return [{ value: '0', label: 'All Organisations' }, ...toOptions(organisations)];
    if (!allOrganisations.length) return toOptions(organisations);
    return [{ value: '0', label: 'All Organisations' }, ...toOptions(allOrganisations)];
  }, [isMinistryView, organisations, allOrganisations]);

  if (!canView) return <RestrictedAccess moduleName="KPI - Major Ports · Financial Dashboard" />;

  // A year change keeps "all twelve months" meaning the whole of the new year
  const changeFiscalYear = (value) => {
    if (months.length === 12) setMonths(allMonthsFor(value));
    setFiscalYear(value);
  };
  const data = { summary: summary.value };

  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:gap-0 min-h-[70vh]">
      <DashboardSidebar panels={FINANCIAL_DASHBOARD_PANELS} active={panel.id} onSelect={() => setDrillKpi(null)} />

      <div className={DASHBOARD_CONTENT_CLASS}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <DashboardSelect
            label="Organisation"
            value={selectedOrganisationId}
            onChange={(value) => {
              if (isMinistryView) setOrganisationId(value);
              else setOrgPick(value);
              setDrillKpi(null);
            }}
            options={organisationOptions.length ? organisationOptions : [{ value: '', label: '--Organisation--' }]}
          />
          <DashboardSelect label="Financial Year" value={fiscalYear} onChange={changeFiscalYear} options={FY_OPTIONS} />
          <MonthPicker value={months} onChange={setMonths} fiscalYear={fiscalYear} />
        </div>

        {drillKpi ? (
          <FinancialDrillDown
            key={drillKpi}
            kpi={drillKpi}
            filters={{ ...baseFilters, organisationId: Number(selectedOrganisationId) || 0 }}
            labels={labels}
            onBack={() => setDrillKpi(null)}
            triggerNotification={triggerNotification}
          />
        ) : (
          <section className="relative" aria-label={panel.heading}>
            <RefreshBar active={summary.refreshing} />
            <PanelHeading icon={panel.icon} title={panel.heading} sub={panel.sub} />
            <CardGrid>
              {FINANCIAL_CARDS.map((cardConfig) => (
                <KpiCard
                  key={cardConfig.kpi}
                  config={cardConfig}
                  data={data}
                  labels={labels}
                  onOpen={(c) => setDrillKpi(c.kpi)}
                />
              ))}
            </CardGrid>
          </section>
        )}
      </div>
    </div>
  );
}
