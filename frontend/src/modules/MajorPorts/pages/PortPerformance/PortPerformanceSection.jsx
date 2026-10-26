import { useCallback, useEffect, useMemo } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { ArrowLeft } from 'lucide-react';
import InternalNavigation from '../../../../components/InternalNavigation';
import RestrictedAccess from '../../../../components/RestrictedAccess';
import { usePortPerformancePermissions } from '../../hooks/usePortPerformancePermissions';
import { usePortPerformanceStore } from '../../store/usePortPerformanceStore';
import { useNotifier, COMMON_TOASTS } from '../../../../utils/notify';
import { getSessionOrganisationName } from '../../../../utils/authSession';
import { useLatestRef } from '../Traffic/usePagedList';
import PortPerformanceDataList from './DataList';
import PortPerformanceInputForm from './InputForm';
import PortPerformanceTargetForm from './TargetForm';
import PortPerformanceTargets from './Targets';

export const PORT_PERFORMANCE_BASE_PATH = '/kpi/major-ports/major-ports-input-form/port-performance';

const TAB_PATHS = {
  'input-form': `${PORT_PERFORMANCE_BASE_PATH}/input-form`,
  actuals: `${PORT_PERFORMANCE_BASE_PATH}/actuals`,
  targets: `${PORT_PERFORMANCE_BASE_PATH}/targets`,
};

/**
 * KPI Major Ports → Port Performance (the earlier portal's "KPI Time Performance").
 * Ministry users: Input Form = target form, Targets opens first, Actuals to review.
 * Organisation users: Input Form = 14-step monthly form, Actuals opens first, Targets to track.
 * Entry Access is the separate Major Ports page, shared with Traffic.
 */
export default function PortPerformanceSection({ triggerNotification, onBackToSections }) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    canView, canEnterActuals, canEditActuals, canDeleteActuals, isMinistryView,
    canAddTarget, canEditTarget, canDeleteTarget,
  } = usePortPerformancePermissions();
  const notify = useNotifier(triggerNotification);

  const { organisations, kpiTypes, mastersError, loadMasters } = usePortPerformanceStore(
    useShallow((state) => ({
      organisations: state.organisations,
      kpiTypes: state.kpiTypes,
      mastersError: state.mastersError,
      loadMasters: state.loadMasters,
    }))
  );

  useEffect(() => {
    if (canView || canEnterActuals || canAddTarget) loadMasters();
  }, [canView, canEnterActuals, canAddTarget, loadMasters]);

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
    navigate(TAB_PATHS['input-form'], {
      state: { target: { row_key: row.row_key, financial_year: row.financial_year, organisation_name: row.organisation_name } },
    });
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
    return <RestrictedAccess moduleName="KPI - Major Ports · Port Performance" />;
  }

  const organisationName = isMinistryView
    ? null
    : organisations[0]?.organisation_name || getSessionOrganisationName();
  const subtitle = isMinistryView
    ? 'Set financial-year port performance targets and review the monthly port performance of every organisation.'
    : 'Enter monthly turnaround, berth output, waiting time and productivity KPIs, and track your targets.';

  const inputForm = isMinistryView ? (
    <PortPerformanceTargetForm
      key={editTarget ? `target-${editTarget.row_key}-${editTarget.financial_year}` : 'new-target'}
      record={editTarget}
      organisations={organisations}
      kpiTypes={kpiTypes}
      onOpenExisting={canEditTarget ? handleOpenExistingTarget : undefined}
      onBack={handleBack}
      onSuccess={handleSuccess}
      triggerNotification={triggerNotification}
    />
  ) : (
    <PortPerformanceInputForm
      key={editPeriod ? `${editPeriod.fiscal_year}-${editPeriod.month}` : 'new'}
      editData={editPeriod}
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
              Port Performance{currentTab === 'input-form' && isEditing ? ' · Update' : ''}
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
            <PortPerformanceDataList
              organisations={organisations}
              isMinistryView={isMinistryView}
              canEdit={canEditActuals}
              canDelete={canDeleteActuals}
              onEdit={handleEditPeriod}
              triggerNotification={triggerNotification}
            />
          )} />

          <Route path="input-form" element={canOpenForm ? inputForm : <Navigate to={defaultPath} replace />} />

          <Route path="targets" element={!canView ? <Navigate to={defaultPath} replace /> : (
            <PortPerformanceTargets
              organisations={organisations}
              kpiTypes={kpiTypes}
              isMinistryView={isMinistryView}
              canEdit={canEditTarget}
              canDelete={canDeleteTarget}
              onEdit={handleEditTarget}
              triggerNotification={triggerNotification}
            />
          )} />

          <Route index element={<Navigate to={defaultPath} replace />} />
          <Route path="*" element={<Navigate to={defaultPath} replace />} />
        </Routes>
      </div>
    </div>
  );
}
