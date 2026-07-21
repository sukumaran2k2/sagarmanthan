import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import ReportTable from '../../../components/ReportTable';

const STAGE_MAPPING = {
  "No Status": 0,
  "Received but yet to be sent for Comments": 1,
  "Submitted for Approval": 2,
  "Comments Sought": 3,
  "Comments Received": 4,
  "Reply Furnished": 5,
  "Disposed": 6
};

export default function Reports({ triggerNotification }) {
  const [drillDownPath, setDrillDownPath] = useState([
    {
      type: 'summary',
      url: 'http://localhost:3000/vipwingwise-report',
      title: 'Report No. 5.1A - Wing-wise VIP Reference Stage Matrix'
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [reportCols, setReportCols] = useState([]);

  const currentView = drillDownPath[drillDownPath.length - 1];

  const handleBack = () => {
    if (drillDownPath.length > 1) {
      setDrillDownPath(prev => prev.slice(0, -1));
    }
  };

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(currentView.url);
      const data = response.data || {};
      
      const rawRows = data.rowData || [];
      const rawCols = data.columnDefs || [];
      
      setReportData(rawRows);
      setReportCols(rawCols);
    } catch (err) {
      console.error("Error loading live VIP Reference reports:", err);
      setReportData([]);
      setReportCols([]);
    } finally {
      setLoading(false);
    }
  }, [currentView.url]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Recursively map cell renderers for drilldown links
  const mapColumnRenderers = useCallback((cols) => {
    return cols.map((col) => {
      // Handle nested column children
      if (col.children) {
        return {
          ...col,
          children: mapColumnRenderers(col.children)
        };
      }

      const colName = col.headerName || '';
      const fieldName = col.field || '';

      // 1. Click Wing Name to drilldown to Division-wise report
      if (fieldName === 'Wing Name' && currentView.type === 'summary') {
        return {
          ...col,
          pinned: 'left',
          cellRenderer: (p) => {
            const wingId = p.data['Wing Id'] || p.data['Wing ID'];
            const wingName = p.value;
            if (!wingId || !wingName || wingName === 'Total') return p.value;
            return (
              <button
                onClick={() => {
                  setDrillDownPath(prev => [
                    ...prev,
                    {
                      type: 'division',
                      wingId,
                      url: `http://localhost:3000/vipdivisionwise-report/${wingId}/`,
                      title: `Report No. 5.1B - Division-wise VIP Reference Matrix (Wing: ${wingName})`
                    }
                  ]);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4b2424',
                  fontWeight: 800,
                  textAlign: 'left',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '13px'
                }}
              >
                {p.value}
              </button>
            );
          }
        };
      }

      // 2. Click count cell value to drilldown to Detail view
      const isStageCount = STAGE_MAPPING[fieldName] !== undefined;
      const isTotalCount = fieldName === 'No of VIP Reference';

      if (isStageCount || isTotalCount) {
        return {
          ...col,
          cellRenderer: (p) => {
            const countVal = parseInt(p.value, 10);
            if (isNaN(countVal) || countVal <= 0) {
              return <span style={{ color: '#94a3b8', fontWeight: 700 }}>—</span>;
            }

            const wingId = p.data['Wing Id'] || p.data['Wing ID'] || currentView.wingId;
            const divisionId = p.data['Division ID'] || p.data['Division Id'];
            
            // Map stage
            const stageId = isTotalCount ? '' : STAGE_MAPPING[fieldName];
            const stageLabel = isTotalCount ? 'All Stages' : fieldName;

            // Define url
            let detailUrl = '';
            let detailTitle = '';

            if (currentView.type === 'division' && divisionId) {
              const divName = p.data['Division Name'] || 'Division';
              detailUrl = `http://localhost:3000/getvip-divisionwise/${divisionId}/${stageId}`;
              detailTitle = `VIP Reference Details - Division: ${divName} | Stage: ${stageLabel}`;
            } else if (wingId) {
              const wingName = p.data['Wing Name'] || 'Wing';
              detailUrl = `http://localhost:3000/getvip-wingwise/${wingId}/${stageId}`;
              detailTitle = `VIP Reference Details - Wing: ${wingName} | Stage: ${stageLabel}`;
            }

            if (!detailUrl) return p.value;

            return (
              <button
                onClick={() => {
                  setDrillDownPath(prev => [
                    ...prev,
                    {
                      type: 'detail',
                      url: detailUrl,
                      title: detailTitle
                    }
                  ]);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4b2424',
                  fontWeight: 800,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {p.value}
              </button>
            );
          }
        };
      }

      // Styled Monospace S.No
      if (fieldName === 'S No' || fieldName === 'S.No') {
        return {
          ...col,
          pinned: 'left',
          width: 70,
          cellRenderer: (p) => (
            <span style={{ fontWeight: 800, color: '#1e293b', fontSize: 11, fontFamily: 'monospace' }}>
              {p.value}
            </span>
          )
        };
      }

      // Wrap text for subjects
      if (fieldName === 'Subject') {
        return {
          ...col,
          flex: 2,
          minWidth: 280,
          wrapText: true,
          autoHeight: true,
          cellStyle: { whiteSpace: 'normal', lineHeight: '1.5', padding: '10px 5px' }
        };
      }

      return col;
    });
  }, [currentView]);

  const mappedCols = useMemo(() => {
    // Hide Wing ID, Division ID
    const filterIds = reportCols.filter(col => {
      const fieldLower = col.field?.toLowerCase() || '';
      return fieldLower !== 'wing id' && fieldLower !== 'division id';
    });
    return mapColumnRenderers(filterIds);
  }, [reportCols, mapColumnRenderers]);

  const subtitle = useMemo(() => (
    <>
      <span>As on date: <strong style={{ color: '#4b2424' }}>01-07-2026</strong></span>
      <span style={{ color: '#eadede' }}>•</span>
      <span>Report for the month — <strong style={{ color: '#4b2424' }}>July 2026</strong></span>
    </>
  ), []);

  return (
    <ReportTable
      title={currentView.title}
      subtitle={subtitle}
      rawData={reportData}
      viewData={reportData}
      columns={mappedCols}
      showBackButton={drillDownPath.length > 1}
      onBack={handleBack}
      themeClass="yp-pro-grid"
      brandColor="#4b2424"
      brandColorHover="#6b3535"
      accentColor="#f7f3f3"
      oddRowColor="#f8faf6"
      totalLabel="Total Rows"
      pagination={currentView.type === 'detail'}
      loading={loading}
      onRefresh={fetchReportData}
      triggerNotification={triggerNotification}
    />
  );
}
