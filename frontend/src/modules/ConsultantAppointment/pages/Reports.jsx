import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchConsultantReport, fetchConsultantDivisionReport, fetchCaWingWiseCandidates, fetchCaDivisionWiseCandidates } from '../api';
import ReportTable from '../../../components/ReportTable';

const ABSTRACT_TITLE = 'Report No.: 2.3A - Abstract ( Wing Wise ) - Consultant Appointment';

const lower = (value) => String(value ?? '').toLowerCase();
const isWingNameField = (f) => lower(f) === 'wing name' || lower(f) === 'wing';
const isDivisionNameField = (f) => lower(f) === 'division name';
const isCountField = (f) => lower(f) === 'no of consultant officer';
const isSNoField = (f) => ['s no', 's.no', 'sno'].includes(lower(f));
const isHiddenIdField = (f) => ['wing id', 'wing_id'].includes(lower(f));

/**
 * Renders a drill-down link in a grid cell. Declared at module scope rather than inside the
 * component so the recursive call for grouped columns refers to an already-declared binding.
 */
function DrillLink({ value, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-transparent border-none text-[#4b2424] font-extrabold underline cursor-pointer text-[13px] hover:opacity-70 transition-opacity"
    >
      {value}
    </button>
  );
}

function decorateColumn(col, currentView, drillTo) {
  if (col.children) {
    return { ...col, children: col.children.filter(c => !isHiddenIdField(c.field)).map(c => decorateColumn(c, currentView, drillTo)) };
  }

  const field = col.field;
  const pinned = (isSNoField(field) || isWingNameField(field)) ? 'left' : undefined;

  return {
    ...col,
    pinned,
    filter: true,
    sortable: true,
    resizable: true,
    wrapText: true,
    autoHeight: true,
    cellClass: 'yp-wrap-cell',
    minWidth: col.width || 120,
    cellRenderer: (params) => {
      if (params.value === null || params.value === undefined) return '';
      if (params.node && params.node.rowPinned) {
        return <strong className="font-extrabold text-[#4b2424]">{params.value}</strong>;
      }

      const row = params.data || {};
      const wingId = row['Wing ID'] ?? row['wing_id'] ?? 0;
      const divisionId = row['Division ID'] ?? row['division_id'] ?? 0;

      // Wing name on the abstract -> that wing's divisions
      if (isWingNameField(field) && currentView.type === 'abstract') {
        return <DrillLink value={params.value} onClick={() => drillTo({
          type: 'division', wingId, title: `Division Wise Report - ${params.value}`
        })} />;
      }

      // Appointment count on the abstract -> the candidates appointed in that wing
      if (isCountField(field) && currentView.type === 'abstract' && Number(params.value) > 0) {
        return <DrillLink value={params.value} onClick={() => drillTo({
          type: 'candidates_wing', wingId, title: `Candidates - ${row['Wing Name'] ?? ''}`
        })} />;
      }

      // Division name on a division report -> the candidates appointed in that division
      if (isDivisionNameField(field) && currentView.type === 'division') {
        return <DrillLink value={params.value} onClick={() => drillTo({
          type: 'candidates_div', divisionId, title: `Candidates - ${params.value}`
        })} />;
      }

      return params.value;
    }
  };
}

export default function Reports({ triggerNotification }) {
  const [drillDownPath, setDrillDownPath] = useState([
    { type: 'abstract', title: ABSTRACT_TITLE }
  ]);
  const [drillDownData, setDrillDownData] = useState([]);
  const [drillDownColDefs, setDrillDownColDefs] = useState([]);
  const [drillDownLoading, setDrillDownLoading] = useState(false);
  const [drillDownError, setDrillDownError] = useState(null);
  const currentView = drillDownPath[drillDownPath.length - 1];

  const handleBack = () => {
    if (drillDownPath.length > 1) {
      setDrillDownPath(prev => prev.slice(0, -1));
    }
  };

  const drillTo = useCallback((view) => {
    setDrillDownPath(prev => [...prev, view]);
  }, []);

  const mapColDefs = useCallback(
    (cols) => cols.filter(col => !isHiddenIdField(col.field)).map(col => decorateColumn(col, currentView, drillTo)),
    [currentView, drillTo]
  );

  const fetchDrillDownData = useCallback(() => {
    let fetchFn;
    if (currentView.type === 'abstract') {
      fetchFn = fetchConsultantReport;
    } else if (currentView.type === 'division') {
      fetchFn = () => fetchConsultantDivisionReport(currentView.wingId);
    } else if (currentView.type === 'candidates_wing') {
      fetchFn = () => fetchCaWingWiseCandidates(currentView.wingId);
    } else if (currentView.type === 'candidates_div') {
      fetchFn = () => fetchCaDivisionWiseCandidates(currentView.divisionId);
    }

    // Guard before the loading flag is raised, so an unknown view cannot leave the page spinning
    if (!fetchFn) {
      setDrillDownData([]);
      setDrillDownColDefs([]);
      setDrillDownLoading(false);
      return;
    }

    setDrillDownLoading(true);
    setDrillDownError(null);

    fetchFn()
      .then(res => {
        const fetchedData = res.data?.rowData || res.data?.value || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setDrillDownData(fetchedData);

        if (res.data?.columnDefs?.length) {
          setDrillDownColDefs(mapColDefs(res.data.columnDefs));
        } else if (fetchedData.length > 0) {
          const fallbackDefs = Object.keys(fetchedData[0])
            .filter(key => !isHiddenIdField(key))
            .map((key) => decorateColumn(
              { field: key, headerName: key.replace(/_/g, ' ').toUpperCase(), width: 150 },
              currentView,
              drillTo
            ));
          setDrillDownColDefs(fallbackDefs);
        } else {
          setDrillDownColDefs([]);
        }
      })
      .catch(err => {
        console.error("Error loading CA drill-down data:", err);
        setDrillDownError("Failed to load report data.");
      })
      .finally(() => setDrillDownLoading(false));
  }, [currentView, mapColDefs, drillTo]);

  useEffect(() => {
    fetchDrillDownData();
  }, [fetchDrillDownData]);

  const viewData = drillDownData;

  const pinnedBottomRowData = useMemo(() => {
    if (!viewData || viewData.length === 0) return undefined;

    const totalRow = {};
    const keys = Object.keys(viewData[0]);
    let firstTextKeySet = false;

    keys.forEach(key => {
      const keyLower = lower(key);
      const isIdCol = keyLower.includes('id') || isSNoField(key);
      const isNumeric = viewData.some(row => typeof row[key] === 'number');

      if (isNumeric && !isIdCol) {
        const sum = viewData.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);
        totalRow[key] = sum;
      } else if (!firstTextKeySet && (keyLower.includes('wing') || keyLower.includes('division') || keyLower.includes('name') || keyLower.includes('subject') || keyLower.includes('officer'))) {
        totalRow[key] = 'Total';
        firstTextKeySet = true;
      } else {
        totalRow[key] = '';
      }
    });

    if (!firstTextKeySet) {
      if (totalRow['Wing Name'] !== undefined) totalRow['Wing Name'] = 'Total';
      else if (totalRow['Division Name'] !== undefined) totalRow['Division Name'] = 'Total';
      else if (totalRow['Wing'] !== undefined) totalRow['Wing'] = 'Total';
      else if (totalRow['Name'] !== undefined) totalRow['Name'] = 'Total';
    }

    return [totalRow];
  }, [viewData]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    wrapText: true,
    autoHeight: true,
    cellClass: 'yp-wrap-cell',
    cellStyle: {
      wordBreak: 'break-word',
      whiteSpace: 'normal',
      lineHeight: '1.5'
    }
  }), []);

  const subtitle = useMemo(() => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const monthStr = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    return (
      <>
        <span>As on date: <strong className="text-[#4b2424]">{dateStr}</strong></span>
        <span className="text-[#eadede]">•</span>
        <span>Report for the month — <strong className="text-[#4b2424]">{monthStr}</strong></span>
      </>
    );
  }, []);

  // Only a genuine request failure reaches this. A report with no rows renders as an empty
  // table below, which is what an empty result means.
  if (drillDownError) {
    return (
      <div className="space-y-3 animate-fade-in">
        <div className="text-red-500 font-bold p-4 bg-red-50 rounded-xl border border-red-200">
          {drillDownError}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchDrillDownData}
            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-[#4b2424] hover:bg-[#6b3535] transition cursor-pointer"
          >
            Retry
          </button>
          {drillDownPath.length > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-[#4b2424] bg-[#f7f3f3] border border-[#eadede] hover:bg-[#eadede] transition cursor-pointer"
            >
              Back
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReportTable
        title={currentView.type === 'abstract' ? ABSTRACT_TITLE : currentView.title}
        subtitle={subtitle}
        onBack={handleBack}
        showBackButton={drillDownPath.length > 1}
        rawData={drillDownData}
        viewData={viewData}
        columns={drillDownColDefs}
        defaultColDef={defaultColDef}
        pinnedBottomRowData={pinnedBottomRowData}
        loading={drillDownLoading}
        onRefresh={fetchDrillDownData}
        triggerNotification={triggerNotification}
        pagination={true}
        themeClass="yp-pro-grid"
        brandColor="var(--module-report-brand-color, #4b2424)"
        brandColorHover="var(--module-report-brand-color-hover, #6b3535)"
        accentColor="var(--module-report-accent-color, #f7f3f3)"
        oddRowColor="var(--module-report-odd-row-bg, #f8faf6)"
        totalLabel="Total"
      />
    </div>
  );
}
