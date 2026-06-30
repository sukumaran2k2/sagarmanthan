import React from 'react';
import { Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { CATEGORIES } from '../../constants';

const CATEGORY_IMAGES = {
  'All Categories': 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=300&q=80',
  'Capacity Enhancement': 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=300&q=80',
  'Connectivity Enhancement': 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=300&q=80',
  'Digital Infrastructure': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=300&q=80',
  'Dredging Projects': 'https://images.unsplash.com/photo-1505705694340-019e1e335916?auto=format&fit=crop&w=300&q=80',
  'Green Initiatives': 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=300&q=80',
  'Coastal Berth': 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=300&q=80',
  'Port Modernization': 'https://images.unsplash.com/photo-1520262454473-a1a82276a574?auto=format&fit=crop&w=300&q=80',
  'Inland Waterways': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=300&q=80',
  'Shipyard Development': 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=300&q=80',
  'Security & Surveillance': 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=300&q=80',
  'Smart Port Solutions': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=300&q=80',
  'Renewable Energy': 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=300&q=80',
  'Liquid Cargo Handling': 'https://images.unsplash.com/photo-1542362567-b07eac790abc?auto=format&fit=crop&w=300&q=80',
  'Dry Bulk Handling': 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=300&q=80',
  'Logistics & Warehousing': 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=300&q=80'
};

export default function ProjectListFilters({
  isFiltersExpanded,
  setIsFiltersExpanded,
  selectedStage,
  setSelectedStage,
  selectedCategory,
  setSelectedCategory,
  setCurrentPage
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <button 
        onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
        className={`w-full flex items-center justify-between text-left transition cursor-pointer ${
          isFiltersExpanded ? 'pb-3 border-b border-slate-100 mb-4' : ''
        }`}
      >
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-800 font-display">Project Categories & Filters</span>
        </div>
        <div className="flex items-center space-x-1.5 text-slate-400">
          <span className="text-[10px] font-normal">Click to {isFiltersExpanded ? 'collapse' : 'expand'}</span>
          {isFiltersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>
      
      {isFiltersExpanded && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
          {/* Stage Selection */}
          <div className="space-y-1.5 lg:border-r lg:border-slate-150 lg:pr-6 flex flex-col justify-center">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Stage Selection</label>
            <select 
              value={selectedStage}
              onChange={(e) => { setSelectedStage(e.target.value); setCurrentPage(1); }}
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
            >
              <option value="All">All Stages</option>
              <option value="Project Initiated">Project Initiated</option>
              <option value="Under Implementation">Under Implementation</option>
              <option value="Under Tendering">Under Tendering</option>
            </select>
          </div>

          {/* Project Categories Selection */}
          <div className="lg:col-span-3 space-y-1.5">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Project Categories Selection</span>
            <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
              {CATEGORIES.map((cat, i) => {
                const isActive = selectedCategory === cat;
                const imageUrl = CATEGORY_IMAGES[cat];

                return (
                  <button
                    key={i}
                    onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
                    className={`relative w-44 h-20 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer shadow border transition-all duration-300 ${
                      isActive 
                        ? 'ring-4 ring-[#0f417a] scale-95 shadow-md font-bold' 
                        : 'border-slate-200 opacity-80 hover:opacity-100 hover:scale-[1.02]'
                    }`}
                  >
                    {/* Background Image */}
                    <img 
                      src={imageUrl} 
                      alt={cat} 
                      className="w-full h-full object-cover"
                    />
                    {/* Dark Overlay */}
                    <div className="absolute inset-0 bg-slate-950/45 transition-colors"></div>
                    {/* Centered Category Text */}
                    <div className="absolute inset-0 flex items-center justify-center p-2 text-center">
                      <span className="text-[10px] font-black text-white uppercase tracking-wider leading-tight">
                        {cat}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
