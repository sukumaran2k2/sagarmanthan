import React, { useMemo } from 'react';

export default function FilterBar({
  selectedWing,
  setSelectedWing,
  selectedDivision,
  setSelectedDivision,
  selectedStatus,
  setSelectedStatus,
  wings = [],
  divisions = [],
  statusSteps = {},
  setCurrentPage
}) {
  const wingNames = useMemo(() => wings.map(w => w.wing_name), [wings]);

  // Dynamically filter divisions based on selected wing
  const filteredDivisions = useMemo(() => {
    if (selectedWing === 'All') return divisions.map(d => d.division_name);
    const selectedWingObj = wings.find(w => w.wing_name === selectedWing);
    if (!selectedWingObj) return [];
    return divisions
      .filter(d => d.wing_id === selectedWingObj.wing_id)
      .map(d => d.division_name);
  }, [selectedWing, wings, divisions]);

  const selectStyle = "w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700 cursor-pointer";

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-inner">
      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Wing</label>
        <select
          value={selectedWing}
          onChange={(e) => {
            setSelectedWing(e.target.value);
            setSelectedDivision('All'); // Reset division on wing change
            setCurrentPage(1);
          }}
          className={selectStyle}
        >
          <option value="All">All Wings</option>
          {wingNames.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Division</label>
        <select
          value={selectedDivision}
          onChange={(e) => {
            setSelectedDivision(e.target.value);
            setCurrentPage(1);
          }}
          className={selectStyle}
        >
          <option value="All">All Divisions</option>
          {filteredDivisions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
        <select
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setCurrentPage(1);
          }}
          className={selectStyle}
        >
          <option value="All">All Statuses</option>
          {Object.values(statusSteps).map(status => <option key={status} value={status}>{status}</option>)}
        </select>
      </div>
    </div>
  );
}
