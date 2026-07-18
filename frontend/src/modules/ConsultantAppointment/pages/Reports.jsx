import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import ReportTable from '../../../components/ReportTable';

export default function Reports({ wings = [], triggerNotification }) {
  const [localWings, setLocalWings] = useState(wings);

  useEffect(() => {
    if (wings && wings.length > 0) {
      setLocalWings(wings);
    } else {
      axios.get("http://localhost:3000/mmt-dropdown/mmt_wings")
        .then(res => setLocalWings(res.data || []))
        .catch(err => console.error("Error loading wings in report:", err));
    }
  }, [wings]);

  const [drillDownPath, setDrillDownPath] = useState([
    { type: 'abstract', title: 'Report No.: 2.3A - Abstract ( Wing Wise ) - Consultant Appointment' }
  ]);
  const [drillDownData, setDrillDownData] = useState([]);
  const [drillDownColDefs, setDrillDownColDefs] = useState([]);
  const [drillDownLoading, setDrillDownLoading] = useState(false);
  const [drillDownError, setDrillDownError] = useState(null);
  const [wingFilter, setWingFilter] = useState('');

  const currentView = drillDownPath[drillDownPath.length - 1];

  const handleBack = () => {
    if (drillDownPath.length > 1) {
      setDrillDownPath(prev => prev.slice(0, -1));
    }
  };

  const mapColDefs = useCallback((cols) => {
    return cols
      .filter(col => {
        const fieldLower = col.field?.toLowerCase() || '';
        return fieldLower !== 'wing id' && fieldLower !== 'wing_id';
      })
      .map((col) => {
        if (col.children) {
          return { ...col, children: mapColDefs(col.children) };
        }

        const fieldLower = col.field?.toLowerCase() || '';
        const isWingName = fieldLower === 'wing name' || fieldLower === 'wing';
        const isSNo = fieldLower === 's no' || fieldLower === 's.no' || fieldLower === 'sno';

        const pinned = (isSNo || isWingName) ? 'left' : undefined;

        return {
          ...col,
          pinned,
          filter: true,
          sortable: true,
          resizable: true,
          minWidth: col.width || 120,
          cellRenderer: (params) => {
            if (params.value === null || params.value === undefined) return '';

            // 1. Click Wing Name -> go to Division Report
            if (isWingName && currentView.type === 'abstract') {
              return (
                <button
                  onClick={() => {
                    const wingId = params.data["Wing ID"] || params.data["wing_id"] || 0;
                    setDrillDownPath(prev => [...prev, {
                      type: 'division',
                      wingId,
                      title: `Division Wise Report - ${params.value}`
                    }]);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4b2424',
                    fontWeight: 800,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  {params.value}
                </button>
              );
            }

            return params.value;
          }
        };
      });
  }, [currentView]);

  const fetchDrillDownData = useCallback(() => {
    setDrillDownLoading(true);
    setDrillDownError(null);
    let endpoint = '';

    if (currentView.type === 'abstract') {
      endpoint = '/consultantapp-report';
    } else if (currentView.type === 'division') {
      endpoint = `/cadivision-report/${currentView.wingId}/`;
    } else if (currentView.type === 'candidates_wing') {
      endpoint = `/wingwise-cacandidate/${currentView.wingId}/`;
    } else if (currentView.type === 'candidates_div') {
      endpoint = `/divisionwise-cacandidate/${currentView.divisionId}/`;
    }

    if (!endpoint) return;

    axios.get(`http://localhost:3000${endpoint}`)
      .then(res => {
        const fetchedData = res.data?.rowData || res.data?.value || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setDrillDownData(fetchedData);

        if (res.data?.columnDefs) {
          setDrillDownColDefs(mapColDefs(res.data.columnDefs));
        } else {
          if (fetchedData.length > 0) {
            const fallbackDefs = Object.keys(fetchedData[0])
              .filter(key => {
                const keyLower = key.toLowerCase();
                return keyLower !== 'wing id' && keyLower !== 'wing_id';
              })
              .map((key) => {
                const isNumerical = fetchedData.some(row => typeof row[key] === 'number');
                const isIdColumn = key.toLowerCase().includes('id');

                const keyLower = key.toLowerCase();
                const isWingName = keyLower === 'wing name' || keyLower === 'wing';
                const isSNo = keyLower === 's no' || keyLower === 's.no' || keyLower === 'sno';
                const pinned = (isSNo || isWingName) ? 'left' : undefined;

                return {
                  field: key,
                  headerName: key.replace(/_/g, ' ').toUpperCase(),
                  minWidth: 150,
                  filter: true,
                  sortable: true,
                  pinned,
                  cellRenderer: (isNumerical && !isIdColumn) ? (params) => {
                    if (params.value === null || params.value === undefined) return '';
                    return params.value;
                  } : undefined
                };
              });
            setDrillDownColDefs(fallbackDefs);
          } else {
            setDrillDownColDefs([]);
          }
        }
      })
      .catch(err => {
        console.error("Error loading CA drill-down data:", err);
        setDrillDownError("Failed to load report data.");
      })
      .finally(() => setDrillDownLoading(false));
  }, [currentView, mapColDefs]);

  useEffect(() => {
    fetchDrillDownData();
  }, [drillDownPath, fetchDrillDownData]);

  const viewData = useMemo(() => {
    if (currentView.type === 'abstract') {
      return drillDownData.filter(item => !wingFilter || item["Wing Name"] === wingFilter);
    }
    return drillDownData;
  }, [currentView.type, drillDownData, wingFilter]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
  }), []);

  const subtitle = useMemo(() => (
    <>
      <span>As on date: <strong style={{ color: '#4b2424' }}>30-06-2026</strong></span>
      <span style={{ color: '#eadede' }}>•</span>
      <span>Report for the month — <strong style={{ color: '#4b2424' }}>June 2026</strong></span>
    </>
  ), []);

  if (drillDownError) {
    return (
      <div className="text-red-500 font-bold p-4 bg-red-50 rounded-xl border border-red-200 animate-fade-in">
        {drillDownError}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReportTable
        title={currentView.type === 'abstract' ? 'Report No.: 2.3A - Abstract ( Wing Wise ) - Consultant Appointment' : currentView.title}
        subtitle={subtitle}
        onBack={handleBack}
        showBackButton={drillDownPath.length > 1}
        rawData={drillDownData}
        viewData={viewData}
        columns={drillDownColDefs}
        defaultColDef={defaultColDef}
        loading={drillDownLoading}
        onRefresh={fetchDrillDownData}
        triggerNotification={triggerNotification}
        pagination={true}
        themeClass="yp-pro-grid"
        brandColor="#4b2424"
        brandColorHover="#6b3535"
        accentColor="#f7f3f3"
        oddRowColor="#f8faf6"
        totalLabel="Total Rows"
      />
    </div>
  );
}
