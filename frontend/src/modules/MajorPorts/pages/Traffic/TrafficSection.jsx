import { useCallback, useEffect, useMemo } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { ArrowLeft } from 'lucide-react';
import InternalNavigation from '../../../../components/InternalNavigation';
import RestrictedAccess from '../../../../components/RestrictedAccess';
import { useTrafficPermissions } from '../../hooks/useTrafficPermissions';
import { useTrafficStore } from '../../store/useTrafficStore';
import { useNotifier, COMMON_TOASTS } from '../../../../utils/notify';
import { getSessionOrganisationName } from '../../../../utils/authSession';
import TrafficDataList from './DataList';
import TrafficInputForm from './InputForm';
import TrafficTargetForm from './TargetForm';
import TrafficTargets from './Targets';
import { useLatestRef } from './usePagedList';

export const TRAFFIC_BASE_PATH = '/kpi/major-ports/major-ports-input-form/traffic';

const TAB_PATHS = {
  'input-form': `${TRAFFIC_BASE_PATH}/input-form`,
  actuals: `${TRAFFIC_BASE_PATH}/actuals`,
  targets: `${TRAFFIC_BASE_PATH}/targets`,
};

/**
 * KPI Major Ports → Traffic.
 * Ministry users: Input Form = target form, Targets opens first, Actuals to review.
 * Organisation users: Input Form = commodity form, Actuals opens first, Targets to track.
 * Entry Access and the Dashboard are separate Major Ports pages, as in the earlier portal.
 */
export default function TrafficSection({ triggerNotification, onBackToSections }) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    canView, canEnterActuals, canEditActuals, canDeleteActuals, isMinistryView,
    canAddTarget, canEditTarget, canDeleteTarget,
  } = useTrafficPermissions();
  const notify = useNotifier(triggerNotification);

  const { commodityGroups, commodities, organisations, mastersError, loadMasters } = useTrafficStore(
    useShallow((state) => ({
      commodityGroups: state.commodityGroups,
      commodities: state.commodities,
      organisations: state.organisations,
      mastersError: state.mastersError,
      loadMasters: state.loadMasters,
    }))
  );

  useEffect(() => {
    if (canView) loadMasters();
  }, [canView, loadMasters]);

  // notify via ref: App recreates it on every toast, which would repeat this message
  const notifyRef = useLatestRef(notify);
  useEffect(() => {
    if (mastersError) notifyRef.current(COMMON_TOASTS.loadFailed(mastersError));
  }, [mastersError, notifyRef]);

  // The record being edited travels with the route entry, so it is gone as soon as
  // the form is opened any other way (tab, sidebar, new session)
  const editPeriod = isMinistryView ? null : location.state?.item ?? null;
  const editTarget = isMinistryView ? location.state?.target ?? null : null;
  const isEditing = Boolean(editPeriod || editTarget);

  const canAddViaForm = isMinistryView ? canAddTarget : canEnterActuals;
  const canOpenForm = canAddViaForm
    || (Boolean(editPeriod) && canEditActuals)
    || (Boolean(editTarget) && canEditTarget);

  const tabs = useMemo(() => {
    const list = [];
    if (canAddViaForm) list.push({ id: 'input-form', label: 'Input Form' });
    if (canView) {
      if (isMinistryView) list.push({ id: 'targets', label: 'Targets' }, { id: 'actuals', label: 'Actuals' });
      else list.push({ id: 'actuals', label: 'Actuals' }, { id: 'targets', label: 'Targets' });
    }
    return list;
  }, [canAddViaForm, canView, isMinistryView]);

  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    return Object.keys(TAB_PATHS).find((id) => path.startsWith(TAB_PATHS[id])) || 'actuals';
  }, [location.pathname]);

  // Ministry lands on Targets, organisations on Actuals
  const homeTab = isMinistryView ? 'targets' : 'actuals';
  // Absolute: a relative target inside a nested route would resolve below it and loop
  const defaultPath = TAB_PATHS[canView ? homeTab : 'input-form'];

  const handleEditPeriod = useCallback((row) => {
    navigate(TAB_PATHS['input-form'], { state: { item: { fiscal_year: row.fiscal_year, month: row.month } } });
  }, [navigate]);

  const handleEditTarget = useCallback((row) => {
    navigate(TAB_PATHS['input-form'], { state: { target: row } });
  }, [navigate]);

  // Add found an existing record: swap this entry for its update form
  const handleOpenExistingPeriod = useCallback((item) => {
    navigate(TAB_PATHS['input-form'], { state: { item }, replace: true });
  }, [navigate]);

  const handleOpenExistingTarget = useCallback((target) => {
    navigate(TAB_PATHS['input-form'], { state: { target }, replace: true });
  }, [navigate]);

  // replace: true so browser Back can't reopen the pre-save snapshot
  const handleSuccess = useCallback(() => {
    navigate(TAB_PATHS[homeTab], { replace: true });
  }, [navigate, homeTab]);

  const handleBack = useCallback(() => {
    navigate(TAB_PATHS[homeTab]);
  }, [navigate, homeTab]);

  if (!canView && !canAddViaForm) {
    return <RestrictedAccess moduleName="KPI - Major Ports · Traffic" />;
  }

  const organisationName = isMinistryView
    ? null
    : organisations[0]?.organisation_name || getSessionOrganisationName();
  const subtitle = isMinistryView
    ? 'Set financial-year traffic targets and review the monthly traffic of every organisation.'
    : 'Enter monthly commodity and Ro-Ro / Ro-Pax traffic, and track progress against your targets.';

  const inputForm = isMinistryView ? (
    <TrafficTargetForm
      key={editTarget ? `target-${editTarget.id}` : 'new-target'}
      record={editTarget}
      organisations={organisations}
      onOpenExisting={canEditTarget ? handleOpenExistingTarget : undefined}
      onBack={handleBack}
      onSuccess={handleSuccess}
      triggerNotification={triggerNotification}
    />
  ) : (
    <TrafficInputForm
      key={editPeriod ? `${editPeriod.fiscal_year}-${editPeriod.month}` : 'new'}
      editData={editPeriod}
      commodities={commodities}
      organisationName={organisationName}
      onOpenExisting={canEditActuals ? handleOpenExistingPeriod : undefined}
      onBack={handleBack}
      onSuccess={handleSuccess}
      triggerNotification={triggerNotification}
    />
  );

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="module-header-container">
        <div className="flex items-start gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToSections}
            className="mt-0.5 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 transition cursor-pointer flex-shrink-0"
            title="Back to KPI sections"
            aria-label="Back to KPI sections"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="module-header-title">
              Traffic{currentTab === 'input-form' && isEditing ? ' · Update' : ''}
            </h1>
            <p className="module-header-subtitle">{subtitle}</p>
          </div>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={currentTab}
          onTabChange={(tabId) => navigate(TAB_PATHS[tabId])}
        />
      </div>

      <div className="space-y-8">
        <Routes>
          <Route path="actuals" element={!canView ? <Navigate to={defaultPath} replace /> : (
            <TrafficDataList
              organisations={organisations}
              commodityGroups={commodityGroups}
              commodities={commodities}
              isMinistryView={isMinistryView}
              canEdit={canEditActuals}
              canDelete={canDeleteActuals}
              onEdit={handleEditPeriod}
              triggerNotification={triggerNotification}
            />
          )} />

          <Route path="input-form" element={canOpenForm ? inputForm : <Navigate to={defaultPath} replace />} />

          <Route path="targets" element={!canView ? <Navigate to={defaultPath} replace /> : (
            <TrafficTargets
              organisations={organisations}
              isMinistryView={isMinistryView}
              canEdit={canEditTarget}
              canDelete={canDeleteTarget}
              onEdit={handleEditTarget}
              triggerNotification={triggerNotification}
            />
          )} />

          {/* Older links */}
          <Route path="list-view" element={<Navigate to={TAB_PATHS.actuals} replace />} />
          <Route path="entry-access" element={<Navigate to="/kpi/major-ports/major-ports-entry-access" replace />} />

          <Route index element={<Navigate to={defaultPath} replace />} />
          <Route path="*" element={<Navigate to={defaultPath} replace />} />
        </Routes>
      </div>
    </div>
  );
}
