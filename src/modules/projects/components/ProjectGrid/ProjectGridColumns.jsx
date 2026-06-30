export const getProjectGridColumns = (isPinned) => [
  {
    headerName: 'S.No',
    valueGetter: (params) => params.node.rowIndex + 1,
    maxWidth: 60,
    flex: 0.4,
    pinned: isPinned ? 'left' : null,
    cellClass: 'text-center font-semibold text-slate-500 flex items-center justify-center'
  },
  {
    headerName: 'Project ID',
    field: 'projectId',
    minWidth: 95,
    flex: 0.8,
    pinned: isPinned ? 'left' : null,
    cellRenderer: (params) => (
      <span className="font-bold text-orange-600 hover:text-orange-700 cursor-pointer hover:underline flex items-center gap-1.5 h-full">
        <span className="h-1.5 w-1.5 rounded-full bg-orange-500 inline-block"></span>
        {params.value}
      </span>
    )
  },
  {
    headerName: 'Sub Project ID',
    field: 'subProjectId',
    minWidth: 105,
    flex: 0.8,
    cellClass: 'text-center text-slate-400 font-medium flex items-center justify-center',
    valueFormatter: (params) => params.value && params.value !== '-' ? params.value : '-'
  },
  {
    headerName: 'Project Name',
    field: 'projectName',
    minWidth: 180,
    flex: 2,
    wrapText: true,
    autoHeight: true,
    cellRenderer: (params) => {
      const project = params.data;
      if (!project) return null;
      return (
        <div className="flex flex-col justify-center py-2 h-full">
          <span className="font-bold text-slate-800 block text-xs hover:text-blue-600 cursor-pointer transition-colors leading-relaxed whitespace-normal">
            {project.projectName}
          </span>
          {project.subProjectName && project.subProjectName !== '-' && (
            <span className="text-[10px] text-slate-500 font-bold block mt-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded w-fit">
              Sub-Project: {project.subProjectName}
            </span>
          )}
        </div>
      );
    }
  },
  {
    headerName: 'Category',
    field: 'category',
    minWidth: 110,
    flex: 1,
    cellRenderer: (params) => (
      <div className="flex items-center h-full">
        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-100">
          {params.value || 'Uncategorized'}
        </span>
      </div>
    )
  },
  {
    headerName: 'Sanctioned Cost (In Cr.)',
    field: 'cost',
    minWidth: 110,
    flex: 1,
    cellClass: 'text-right font-extrabold text-slate-700 flex items-center justify-end',
    valueFormatter: (params) => params.value ? parseFloat(params.value).toFixed(2) : '-'
  },
  {
    headerName: 'Implementing Agency',
    field: 'agency',
    minWidth: 130,
    flex: 1.2,
    cellClass: 'text-slate-600 font-medium flex items-center'
  },
  {
    headerName: 'Stage',
    field: 'stage',
    minWidth: 120,
    flex: 1,
    cellRenderer: (params) => {
      const stage = params.value;
      let style = 'bg-slate-50 text-slate-700 border-slate-200';
      if (stage === 'Under Implementation') {
        style = 'bg-blue-50 text-blue-700 border-blue-200';
      } else if (stage === 'Project Initiated') {
        style = 'bg-amber-50 text-amber-700 border-amber-200';
      } else if (stage === 'Under Tendering') {
        style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      }
      return (
        <div className="flex items-center h-full">
          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full border ${style}`}>
            {stage}
          </span>
        </div>
      );
    }
  },
  {
    headerName: 'Physical (%)',
    field: 'physicalProgress',
    minWidth: 80,
    flex: 0.6,
    cellRenderer: (params) => {
      const pct = params.value || 0;
      return (
        <div className="flex items-center space-x-1.5 h-full">
          <span className="font-bold text-slate-700 min-w-8">{pct}%</span>
        </div>
      );
    }
  },
  {
    headerName: 'Financial (%)',
    field: 'financialProgress',
    minWidth: 80,
    flex: 0.6,
    cellRenderer: (params) => {
      const pct = params.value || 0;
      return (
        <div className="flex items-center space-x-1.5 h-full">
          <span className="font-bold text-slate-700 min-w-8">{pct}%</span>
        </div>
      );
    }
  }
];
