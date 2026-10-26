import { useCallback, useEffect, useMemo } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { ArrowLeft } from 'lucide-react';
import InternalNavigation from '../../../../components/InternalNavigation';
import RestrictedAccess from '../../../../components/RestrictedAccess';
import { useCruisePassengerPermissions } from '../../hooks/useCruisePassengerPermissions';
import { useCruisePassengerStore } from '../../store/useCruisePassengerStore';
import { useNotifier, COMMON_TOASTS } from '../../../../utils/notify';
import { getSessionOrganisationName } from '../../../../utils/authSession';
import { useLatestRef } from '../Traffic/usePagedList';
import CruisePassengerDataList from './DataList';
import CruisePassengerInputForm from './InputForm';
import CruisePassengerTargetForm from './TargetForm';
import CruisePassengerTargets from './Targets';

export const CRUISE_PASSENGER_BASE_PATH = '/kpi/major-ports/major-ports-input-form/cruise-passenger-traffic';

const TAB_PATHS = {
  'input-form': `${CRUISE_PASSENGER_BASE_PATH}/input-form`,
  actuals: `${CRUISE_PASSENGER_BASE_PATH}/actuals`,
  targets: `${CRUISE_PASSENGER_BASE_PATH}/targets`,
};

/**
 * KPI Major Ports → Cruise and Passenger Traffic.
 * Ministry users: Input Form = target form, Targets opens first, Actuals to review.
 * Organisation users: Input Form = monthly form, Actuals opens first, Targets to track.
 * There is no monthly entry window, so this section has no Entry Access page.
 */
export default function CruisePassengerSection({ triggerNotification, onBackToSections }) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    canView, canEnterActuals, canEditActuals, canDeleteActuals, isMinistryView,
    canAddTarget, canEditTarget, canDeleteTarget,
  } = useCruisePassengerPermissions();
  const notify = useNotifier(triggerNotification);

  const { organisations, mastersError, loadMasters } = useCruisePassengerStore(
    useShallow((state) => ({
      organisations: state.organisations,
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
  const editActual = isMinistryView ? null : location.state?.item ?? null;
  const editTarget = isMinistryView ? location.state?.target ?? null : null;
  const isEditing = Boolean(editActual || editTarget);

  const canAddViaForm = isMinistryView ? canAddTarget : canEnterActuals;
  const canOpenForm = canAddViaForm
    || (Boolean(editActual) && canEditActuals)
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

  const homeTab = isMinistryView ? 'targets' : 'actuals';
  // Absolute: a relative target inside a nested route would resolve below it and loop
  const defaultPath = TAB_PATHS[canView ? homeTab : 'input-form'];

  const handleEditActual = useCallback((row) => {
    navigate(TAB_PATHS['input-form'], { state: { item: { id: row.id, fiscal_year: row.fiscal_year, month: row.month } } });
  }, [navigate]);

  const handleEditTarget = useCallback((row) => {
    navigate(TAB_PATHS['input-form'], { state: { target: row } });
  }, [navigate]);

  // Add found an existing record: swap this entry for its update form
  const handleOpenExistingActual = useCallback((item) => {
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
    return <RestrictedAccess moduleName="KPI - Major Ports · Cruise and Passenger Traffic" />;
  }

  const organisationName = isMinistryView
    ? null
    : organisations[0]?.organisation_name || getSessionOrganisationName();
  const subtitle = isMinistryView
    ? 'Set financial-year cruise and ferry call targets for each port and review the monthly traffic of every organisation.'
    : 'Enter monthly cruise vessel calls, cruise passengers and passenger ferry traffic, and track your financial-year targets.';

  const inputForm = isMinistryView ? (
    <CruisePassengerTargetForm
      key={editTarget ? `target-${editTarget.id}` : 'new-target'}
      record={editTarget}
      organisations={organisations}
      onOpenExisting={canEditTarget ? handleOpenExistingTarget : undefined}
      onBack={handleBack}
      onSuccess={handleSuccess}
      triggerNotification={triggerNotification}
    />
  ) : (
    <CruisePassengerInputForm
      key={editActual ? `actual-${editActual.id}` : 'new'}
      editData={editActual}
      organisationName={organisationName}
      onOpenExisting={canEditActuals ? handleOpenExistingActual : undefined}
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
              Cruise and Passenger Traffic{currentTab === 'input-form' && isEditing ? ' · Update' : ''}
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
            <CruisePassengerDataList
              organisations={organisations}
              isMinistryView={isMinistryView}
              canEdit={canEditActuals}
              canDelete={canDeleteActuals}
              onEdit={handleEditActual}
              triggerNotification={triggerNotification}
            />
          )} />

          <Route path="input-form" element={canOpenForm ? inputForm : <Navigate to={defaultPath} replace />} />

          <Route path="targets" element={!canView ? <Navigate to={defaultPath} replace /> : (
            <CruisePassengerTargets
              organisations={organisations}
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
