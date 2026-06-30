import React from 'react';
import { FileSpreadsheet, FolderOpen, Plus } from 'lucide-react';

export default function ProjectListActions({ 
  onExportTrigger, 
  onAddProjectClick, 
  onAddSubProjectClick 
}) {
  return (
    <div className="flex flex-row items-center justify-between gap-4 w-full">
      {/* Left Side: Data exports logs */}
      <div className="flex flex-wrap gap-2.5">
        <button 
          onClick={() => onExportTrigger('All Data Excel')}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100/50 transition cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          <span>All Data</span>
        </button>
        <button 
          onClick={() => onExportTrigger('Expenditure Logs')}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100/50 transition cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          <span>Expenditure Logs</span>
        </button>
        <button 
          onClick={() => onExportTrigger('Media Files folder view')}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100/50 transition cursor-pointer"
        >
          <FolderOpen className="h-4 w-4 text-blue-600" />
          <span>Media Files</span>
        </button>
      </div>

      {/* Right Side: Operations / Add Button */}
      <div className="flex flex-wrap gap-2.5">
        <button 
          onClick={onAddProjectClick}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Project</span>
        </button>
        <button 
          onClick={onAddSubProjectClick}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Sub Project</span>
        </button>
      </div>
    </div>
  );
}
