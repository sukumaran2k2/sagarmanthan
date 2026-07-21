import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ReportTable from '../../../components/ReportTable';

export default function Reports({ triggerNotification }) {
  const [drillDownPath, setDrillDownPath] = useState([
    { type: 'summary', title: 'Report - Ministry-wise Cabinet Notes Stage Matrix' }
  ]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);

  const currentView = drillDownPath[drillDownPath.length - 1];

  const handleBack = () => {
    if (drillDownPath.length > 1) {
      setDrillDownPath(prev => prev.slice(0, -1));
    }
  };

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      if (currentView.type === 'summary') {
        const response = await axios.get("http://localhost:3000/cabinet-ministry/1");
        const rawData = response.data || [];
        
        const ministryMap = {};
        rawData.forEach(row => {
          const ministryName = row.ministry_name || 'Unknown';
          const stageName = row.stage_name || (row.reply_furnished_date ? 'Reply Furnished' : row.comments_rec_date ? 'Comments Received' : 'Pending');

          if (!ministryMap[ministryName]) {
            ministryMap[ministryName] = {
              ministry: ministryName,
              recMin: 0,
              sentComm: 0,
              commRec: 0,
              fileSub: 0,
              replyFurn: 0,
              total: 0
            };
          }

          if (row.received_ministry_date) ministryMap[ministryName].recMin += 1;
          if (row.sent_for_comments_date) ministryMap[ministryName].sentComm += 1;
          if (row.comments_rec_date) ministryMap[ministryName].commRec += 1;
          if (row.file_submitted_date) ministryMap[ministryName].fileSub += 1;
          if (row.reply_furnished_date) ministryMap[ministryName].replyFurn += 1;

          ministryMap[ministryName].total += 1;
        });

        const rows = Object.values(ministryMap).map((m, idx) => ({ ...m, 'S No': idx + 1 }));
        setData(rows);
      } else if (currentView.type === 'detail') {
        const response = await axios.get("http://localhost:3000/cabinet-ministry/1");
        const list = (response.data || []).filter(note => note.ministry_name === currentView.ministryName);
        setData(list.map((n, idx) => ({ ...n, 'S No': idx + 1 })));
      }
    } catch (err) {
      console.error("Error loading Cabinet Notes Other Ministry reports:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [currentView]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleCellClick = (row, colKey) => {
    if (currentView.type === 'summary') {
      const count = row[colKey];
      if (typeof count === 'number' && count > 0) {
        setDrillDownPath(prev => [
          ...prev,
          {
            type: 'detail',
            title: `Detailed Notes - ${row.ministry}`,
            ministryName: row.ministry
          }
        ]);
      }
    }
  };

  const getColumns = () => {
    if (currentView.type === 'summary') {
      return [
        { key: 'S No', label: 'S No', isClickable: false },
        { key: 'ministry', label: 'Ministry Name', isClickable: false },
        { key: 'recMin', label: 'Received at Ministry', isClickable: true },
        { key: 'sentComm', label: 'Sent for Comments', isClickable: true },
        { key: 'commRec', label: 'Comments Received', isClickable: true },
        { key: 'fileSub', label: 'File Submitted for Approval', isClickable: true },
        { key: 'replyFurn', label: 'Reply Furnished', isClickable: true },
        { key: 'total', label: 'Total Notes', isClickable: true }
      ];
    } else {
      return [
        { key: 'S No', label: 'S No' },
        { key: 'subject', label: 'Name of Subject' },
        { key: 'ministry_name', label: 'Ministry Name' },
        { key: 'eoffice_file_number', label: 'E-Office File No' },
        { key: 'stage_name', label: 'Current Status' },
        { key: 'remarks', label: 'Remarks' }
      ];
    }
  };

  return (
    <div className="space-y-6">
      <ReportTable
        title={currentView.title}
        data={data}
        columns={getColumns()}
        loading={loading}
        onCellClick={handleCellClick}
        showBack={drillDownPath.length > 1}
        onBack={handleBack}
        reportType={`Cabinet_Notes_Other_${currentView.type}`}
        triggerNotification={triggerNotification}
      />
    </div>
  );
}
