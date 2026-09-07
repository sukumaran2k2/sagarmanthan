import { useEffect, useMemo, useState } from 'react';
import {
  fetchDelayReason,
  fetchExpenditureDetails,
  fetchFundingComponents,
  fetchInaugurationDates,
  fetchPhysicalProgress,
  fetchUnderImplementationMilestones,
} from '../api';
import { getProjectIdentity } from '../utils/mapProject';
import { DEFAULT_MILESTONES, mapMilestonesFromApi, sliceDate } from '../utils/stageMappers';

const COMPONENT_KEYS = [
  { key: 'gbsComponents', label: 'GBS Components (In Cr.)', apiField: 'gbs_components' },
  { key: 'iebrComponents', label: 'IEBR Components (In Cr.)', apiField: 'iebr_components' },
  { key: 'pppComponents', label: 'PPP-Private Components (In Cr.)', apiField: 'ppp_components' },
  { key: 'loansComponents', label: 'Loans Components (In Cr.)', apiField: 'loans_components' },
  { key: 'multilateralComponents', label: 'Multilateral Funding Components (In Cr.)', apiField: 'multilateral_components' },
  { key: 'stateGovFundComponents', label: 'State Govt. Fund Components (In Cr.)', apiField: 'state_gov_fund_components' },
  { key: 'pmmsyComponents', label: 'PMMSY Components (In Cr.)', apiField: 'pmmsy_components' },
  { key: 'sagarmalaComponents', label: 'Sagarmala Components (In Cr.)', apiField: 'sagarmala_components' },
  { key: 'otherSourceFunding', label: 'Other Components (In Cr.)', apiField: 'other_source_funding_comp' },
];

export default function UnderImplementationStage({
  projectID: projectIDProp,
  subProjectID: subProjectIDProp,
  initialData,
  canSubmit,
  readOnly,
  onSubmitStage,
  notify,
  refreshKey = 0,
}) {
  const identity = useMemo(() => {
    if (projectIDProp) {
      return {
        projectID: projectIDProp,
        subProjectID: subProjectIDProp || '-1',
      };
    }
    return getProjectIdentity(initialData || {});
  }, [projectIDProp, subProjectIDProp, initialData]);

  const { projectID, subProjectID } = identity;
  const [progressDate, setProgressDate] = useState('');
  const [progressValue, setProgressValue] = useState('0');
  const [progressLocked, setProgressLocked] = useState(false);
  const [delayReason, setDelayReason] = useState('');
  const [inauguration, setInauguration] = useState('');
  const [inaugurationDate, setInaugurationDate] = useState('');
  const [tentativeInaugurationDate, setTentativeInaugurationDate] = useState('');
  const [milestones, setMilestones] = useState(DEFAULT_MILESTONES);
  const [financialYear, setFinancialYear] = useState('');
  const [month, setMonth] = useState('');
  const [components, setComponents] = useState(() =>
    COMPONENT_KEYS.reduce((acc, item) => ({ ...acc, [item.key]: '' }), {})
  );
  const [visibleComponents, setVisibleComponents] = useState(() =>
    COMPONENT_KEYS.reduce((acc, item) => ({ ...acc, [item.key]: true }), {})
  );
  const [awardProjectCost, setAwardProjectCost] = useState(0);
  const [expenditureLogs, setExpenditureLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [loading, setLoading] = useState(false);

  const disabled = !canSubmit || readOnly;
  const progressDisabled = disabled || progressLocked;

  const visibleFields = useMemo(
    () => COMPONENT_KEYS.filter((item) => visibleComponents[item.key]),
    [visibleComponents]
  );

  useEffect(() => {
    if (!projectID) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const [milestoneRes, progressRes, delayRes, inaugRes, fundRes, expRes] = await Promise.all([
          fetchUnderImplementationMilestones(projectID, subProjectID),
          fetchPhysicalProgress(projectID, subProjectID),
          fetchDelayReason(projectID, subProjectID),
          fetchInaugurationDates(projectID, subProjectID),
          fetchFundingComponents(projectID, subProjectID),
          fetchExpenditureDetails(projectID, subProjectID),
        ]);
        if (!mounted) return;

        setMilestones(mapMilestonesFromApi(Array.isArray(milestoneRes?.data) ? milestoneRes.data : []));

        const progressRow = Array.isArray(progressRes?.data) ? progressRes.data[0] : null;
        if (progressRow) {
          setProgressDate(sliceDate(progressRow.progress_date || progressRow.as_on_date));
          setProgressValue(String(progressRow.physical_progress ?? progressRow.progress_value ?? '0'));
          setProgressLocked(true);
        }

        const delayRow = Array.isArray(delayRes?.data) ? delayRes.data[0] : null;
        if (delayRow) setDelayReason(delayRow.delay_reason || delayRow.reason || '');

        const inaugRow = Array.isArray(inaugRes?.data) ? inaugRes.data[0] : null;
        if (inaugRow) {
          if (inaugRow.inauguration_value === 1 || inaugRow.inauguration_value === true) {
            setInauguration('yes');
            setInaugurationDate(sliceDate(inaugRow.inauguration_date));
          } else if (inaugRow.inauguration_value === 0 || inaugRow.inauguration_value === false) {
            setInauguration('no');
            setTentativeInaugurationDate(sliceDate(inaugRow.tentative_inauguration_date));
          }
        }

        const fundRow = Array.isArray(fundRes?.data) ? fundRes.data[0] : null;
        if (fundRow) {
          setAwardProjectCost(Number(fundRow.award_project_cost || 0));
          const visibility = {};
          COMPONENT_KEYS.forEach((item) => {
            const val = fundRow[item.apiField];
            visibility[item.key] = val != null && val !== '' && Number(val) > 0;
          });
          if (!Object.values(visibility).some(Boolean)) {
            COMPONENT_KEYS.forEach((item) => {
              visibility[item.key] = true;
            });
          }
          setVisibleComponents(visibility);
        }

        setExpenditureLogs(Array.isArray(expRes?.data) ? expRes.data : []);
      } catch (error) {
        console.error(error);
        notify?.('Failed to load under implementation details.', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [projectID, subProjectID, refreshKey, notify]);

  const updateMilestone = (id, patch) => {
    setMilestones((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  return (
    <div className="space-y-5">
      {loading ? (
        <div className="text-xs font-semibold text-slate-500">Loading implementation details...</div>
      ) : null}

      <div className="border border-slate-200 rounded-2xl p-4 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr_auto] gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Physical Progress as on</label>
            <input type="date" value={progressDate} disabled={progressDisabled} onChange={(e) => setProgressDate(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Physical Progress (%)</label>
            <input type="number" min="0" max="100" value={progressValue} disabled={progressDisabled} onChange={(e) => setProgressValue(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setProgressLocked(false)}
              className="px-3 py-2 text-xs font-bold rounded-lg border border-blue-200 text-blue-700 bg-blue-50 disabled:opacity-60"
            >
              Edit
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setProgressLocked(true)}
              className="px-3 py-2 text-xs font-bold rounded-lg border border-rose-200 text-rose-700 bg-rose-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-[#0f417a] text-white">
            <tr>
              <th className="text-left px-3 py-2.5">Milestone</th>
              <th className="text-left px-3 py-2.5">Targeted End Date</th>
              <th className="text-left px-3 py-2.5">Actual End Date</th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((row) => (
              <tr key={row.id} className="border-t border-slate-200">
                <td className="px-3 py-2.5 font-semibold text-slate-800">{row.milestone}</td>
                <td className="px-3 py-2.5"><input type="date" value={row.targetedEndDate} disabled={disabled} onChange={(e) => updateMilestone(row.id, { targetedEndDate: e.target.value })} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" /></td>
                <td className="px-3 py-2.5"><input type="date" value={row.actualEndDate} disabled={disabled} onChange={(e) => updateMilestone(row.id, { actualEndDate: e.target.value })} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-slate-200 rounded-xl bg-white p-4">
          <label className="block text-xs font-bold text-slate-700 mb-1">Reasons for Delay (if any)</label>
          <input type="text" value={delayReason} disabled={disabled} onChange={(e) => setDelayReason(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" />
        </div>

        <div className="border border-slate-200 rounded-xl bg-white p-4 space-y-3">
          <p className="text-xs font-bold text-slate-700">Whether the Project is Inaugurated?</p>
          <div className="flex gap-6 text-xs font-semibold text-slate-700">
            <label className="inline-flex items-center gap-2"><input type="radio" value="yes" checked={inauguration === 'yes'} disabled={disabled} onChange={(e) => setInauguration(e.target.value)} /> Yes</label>
            <label className="inline-flex items-center gap-2"><input type="radio" value="no" checked={inauguration === 'no'} disabled={disabled} onChange={(e) => setInauguration(e.target.value)} /> No</label>
          </div>
          {inauguration === 'yes' && <input type="date" value={inaugurationDate} disabled={disabled} onChange={(e) => setInaugurationDate(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" />}
          {inauguration === 'no' && <input type="date" value={tentativeInaugurationDate} disabled={disabled} onChange={(e) => setTentativeInaugurationDate(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50" />}
        </div>
      </div>

      <div className="border border-slate-200 rounded-2xl bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-[#0f417a] uppercase">Expenditure Logs</h3>
          <button
            type="button"
            onClick={() => setShowLogs((prev) => !prev)}
            className="px-3 py-1.5 text-xs font-bold border border-blue-200 rounded-lg text-blue-700 bg-blue-50"
          >
            {showLogs ? 'Hide Expenditure Log' : 'View Expenditure Log'}
          </button>
        </div>

        {showLogs ? (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="min-w-full text-[11px]">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-2 py-1.5 text-left">Year</th>
                  <th className="px-2 py-1.5 text-left">Month</th>
                  <th className="px-2 py-1.5 text-left">GBS</th>
                  <th className="px-2 py-1.5 text-left">IEBR</th>
                  <th className="px-2 py-1.5 text-left">PPP</th>
                </tr>
              </thead>
              <tbody>
                {expenditureLogs.length ? (
                  expenditureLogs.map((row, idx) => (
                    <tr key={`${row.year}-${row.month}-${idx}`} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">{row.year || row.financial_year || '-'}</td>
                      <td className="px-2 py-1.5">{row.month || '-'}</td>
                      <td className="px-2 py-1.5">{row.gbs_components ?? '-'}</td>
                      <td className="px-2 py-1.5">{row.iebr_components ?? '-'}</td>
                      <td className="px-2 py-1.5">{row.ppp_components ?? '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-2 py-2 text-slate-500">No expenditure logs found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Financial Year</label>
            <select value={financialYear} disabled={disabled} onChange={(e) => setFinancialYear(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50">
              <option value="">--Select Financial Year--</option>
              <option value="2024-2025">2024-2025</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
              <option value="2027-2028">2027-2028</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Month</label>
            <select value={month} disabled={disabled} onChange={(e) => setMonth(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50">
              <option value="">--Select Month--</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibleFields.map((field) => (
            <div key={field.key}>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">{field.label}</label>
              <input
                type="number"
                value={components[field.key]}
                disabled={disabled}
                onChange={(e) => setComponents((prev) => ({ ...prev, [field.key]: e.target.value }))}
                className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onSubmitStage?.('implementation', {
              progressDate,
              progressValue,
              milestones,
              delayReason,
              inauguration,
              inaugurationDate,
              tentativeInaugurationDate,
              financialYear,
              month,
              components,
              awardProjectCost,
            })
          }
          className="px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-60"
        >
          Submit Under Implementation
        </button>
      </div>
    </div>
  );
}
