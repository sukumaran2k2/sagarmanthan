import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Table from '../../../components/Table';
import { Search, X, Edit, Eye, Download, FileText } from 'lucide-react';
import axios from 'axios';

export default function DataList({
  rowData,
  loading,
  onEdit,
  onRefresh,
  triggerNotification,
  wings = [],
  divisions = []
}) {
  const [selectedWing, setSelectedWing] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');

  // Category state: 'active' or 'completed'
  const [activeCategory, setActiveCategory] = useState('active');

  // Document Modal state
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [activeNote, setActiveNote] = useState(null);
  const [noteDocs, setNoteDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const fetchNoteDocs = async (noteId) => {
    setLoadingDocs(true);
    try {
      const res = await axios.get(`http://localhost:3000/mopsw-document/${noteId}`);
      setNoteDocs(res.data || []);
    } catch (err) {
      console.error("Error loading note documents:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleOpenDownloadModal = (note) => {
    setActiveNote(note);
    setDocModalOpen(true);
    fetchNoteDocs(note.cabinet_notes_mopsw_id);
  };

  // Derive Wing and Division Options
  const wingOptions = useMemo(() => {
    return wings.map(w => ({
      value: w.wing_id,
      label: w.wing_name
    }));
  }, [wings]);

  const divisionOptions = useMemo(() => {
    return divisions.map(d => ({
      value: d.division_id,
      label: d.division_name
    }));
  }, [divisions]);

  const filteredData = useMemo(() => {
    return rowData.filter(item => {
      const isCompleted = !!item.completed_date;
      const matchesCategory = activeCategory === 'completed' ? isCompleted : !isCompleted;

      if (!matchesCategory) return false;

      const matchesWing = selectedWing
        ? String(item.wing) === String(selectedWing)
        : true;

      const matchesDivision = selectedDivision
        ? String(item.division) === String(selectedDivision)
        : true;

      return matchesWing && matchesDivision;
    });
  }, [rowData, selectedWing, selectedDivision, activeCategory]);

  const columnDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: (params) => params.node.rowIndex + 1,
      width: 60,
      minWidth: 60,
      maxWidth: 70,
      pinned: 'left',
      cellClass: 'font-mono text-slate-600 dark:text-slate-400 text-center border-r border-slate-100 dark:border-slate-800',
      headerClass: 'text-center border-r border-slate-100 dark:border-slate-800'
    },
    {
      field: 'subject',
      headerName: 'Name of the Subject',
      flex: 1,
      minWidth: 220,
      pinned: 'left',
      cellStyle: { textAlign: 'left' },
      cellClass: 'text-left font-semibold text-slate-800 dark:text-slate-200 whitespace-normal leading-normal py-2 border-r border-slate-150 dark:border-slate-800',
      headerClass: 'border-r border-slate-150 dark:border-slate-800',
      autoHeight: true
    },
    {
      field: 'wing_name',
      headerName: 'Wing',
      flex: 1.2,
      minWidth: 130,
      cellStyle: { textAlign: 'left' },
      cellClass: 'text-slate-700 dark:text-slate-300 font-medium'
    },
    {
      field: 'division_name',
      headerName: 'Division',
      flex: 1.2,
      minWidth: 130,
      cellStyle: { textAlign: 'left' },
      cellClass: 'text-slate-700 dark:text-slate-300 font-medium'
    },
    {
      field: 'mopsw_stage_name',
      headerName: 'Status',
      flex: 1.2,
      minWidth: 130,
      cellClass: 'text-slate-700 dark:text-slate-300 font-bold text-center'
    },
    {
      headerName: 'Documents',
      flex: 1.5,
      minWidth: 180,
      cellClass: 'text-center',
      cellRenderer: (params) => {
        const note = params.data;
        const hasDocs = note.doc_count > 0;
        return (
          <div className="flex items-center justify-center space-x-2">
            {hasDocs ? (
              <button
                onClick={() => handleOpenDownloadModal(note)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0f417a] dark:text-blue-400 rounded-lg transition cursor-pointer"
                title="View Documents"
              >
                <Eye className="h-4.5 w-4.5" />
              </button>
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-600 font-medium">-</span>
            )}
          </div>
        );
      }
    },
    {
      headerName: 'Update',
      minWidth: 95,
      flex: 0.5,
      cellClass: 'text-center',
      cellRenderer: (params) => {
        const note = params.data;
        return (
          <button
            onClick={() => onEdit(note)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0f417a] dark:text-blue-400 rounded-lg transition cursor-pointer"
            title="Update Note"
          >
            <Edit className="h-4 w-4" />
          </button>
        );
      }
    }
  ], [onEdit, activeCategory]);

  const activeCount = useMemo(() => rowData.filter(r => !r.completed_date).length, [rowData]);
  const completedCount = useMemo(() => rowData.filter(r => !!r.completed_date).length, [rowData]);

  return (
    <div className="space-y-6">

      {/* Category selector tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1 mb-4 select-none">
        <button
          onClick={() => setActiveCategory('active')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeCategory === 'active'
            ? 'border-[#0f417a] text-[#0f417a] dark:text-blue-400 dark:border-blue-400'
            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
            }`}
        >
          Active Notes ({activeCount})
        </button>
        <button
          onClick={() => setActiveCategory('completed')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeCategory === 'completed'
            ? 'border-[#0f417a] text-[#0f417a] dark:text-blue-400 dark:border-blue-400'
            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
            }`}
        >
          Completed Notes ({completedCount})
        </button>
      </div>

      {/* Main Ag Grid Table & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          {/* Wing Dropdown */}
          <div className="w-48 relative">
            <select
              value={selectedWing}
              onChange={(e) => setSelectedWing(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-850 dark:text-slate-200 cursor-pointer"
            >
              <option value="">Show all Wings</option>
              {wingOptions.map(w => (
                <option key={w.value} value={w.value}>{w.label}</option>
              ))}
            </select>
          </div>

          {/* Division Dropdown */}
          <div className="w-48 relative">
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-850 dark:text-slate-200 cursor-pointer"
            >
              <option value="">Show all Divisions</option>
              {divisionOptions.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Clear Button */}
          {(selectedWing || selectedDivision) && (
            <button
              onClick={() => { setSelectedWing(''); setSelectedDivision(''); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 px-3.5 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 dark:border-rose-900/30 dark:hover:bg-rose-950/20 transition cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
        <Table
          rowData={filteredData}
          columnDefs={columnDefs}
          loading={loading}
          pagination={true}
          paginationPageSize={10}
          enableExport={false}
          autoSizeStrategy={{
            type: 'fitGridWidth'
          }}
          defaultColDef={{
            minWidth: 100,
            filter: true,
            sortable: true,
            resizable: true,
            autoHeight: true,
            wrapHeaderText: true,
            autoHeaderHeight: true
          }}
        />
      </div>

      {/* Document Management Modal */}
      {docModalOpen && activeNote && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-xl overflow-hidden animate-fade-in">
            <div className="bg-[#0f417a] text-white px-5 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider font-display">
                  View Cabinet Note Documents
                </h3>
                <p className="text-[10px] text-blue-200 font-semibold truncate max-w-[320px] mt-0.5">{activeNote.subject}</p>
              </div>
              <button
                onClick={() => setDocModalOpen(false)}
                className="text-white hover:bg-white/10 p-1 rounded-lg transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Submitted Documents</h4>
              {loadingDocs ? (
                <div className="text-center py-4 text-xs font-bold text-slate-500">Loading files...</div>
              ) : noteDocs.length === 0 ? (
                <div className="text-center py-4 text-xs font-medium text-slate-400 bg-slate-50 dark:bg-slate-950 rounded-xl">No files uploaded yet.</div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {noteDocs.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border border-slate-150 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-xs">
                      <div className="flex-1 min-w-0 pr-3">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={doc.cabinet_notes_mopsw_document}>
                          {doc.cabinet_notes_mopsw_document}
                        </p>
                      </div>
                      <a
                        href={`http://localhost:3000/cabinet_notes_mopsw/download/${activeNote.cabinet_notes_mopsw_id}?file=${encodeURIComponent(doc.cabinet_notes_mopsw_document)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase transition cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
