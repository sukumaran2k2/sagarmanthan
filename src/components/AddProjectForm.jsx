import { useState } from 'react';
import { ChevronDown, ArrowLeft } from 'lucide-react';

const CATEGORIES = [
  'Capacity Enhancement',
  'Connectivity Enhancement',
  'Digital Infrastructure',
  'Dredging Projects',
  'Green Initiatives',
  'Coastal Berth',
  'Port Modernization',
  'Inland Waterways',
  'Shipyard Development',
  'Security & Surveillance',
  'Smart Port Solutions',
  'Renewable Energy',
  'Liquid Cargo Handling',
  'Dry Bulk Handling',
  'Logistics & Warehousing'
];

export default function AddProjectForm({ onAdd, onClose }) {
  const [formData, setFormData] = useState({
    projectName: '',
    projectBrief: '',
    cost: '',
    projectType: '',
    implementationType: '',
    category: '',
    initiatedDate: '',
    completionDate: '',
    agency: '',
    secondaryAgency: '',
    scheme: '',
    initiative: '',
    output: '',
    outcome: '',
    capacity: '',
    fundingSource: '',
    primaryFundingAgency: '',
    secondaryFundingAgency: '',
    state: '',
    district: '',
    taluka: '',
    village: '',
    mpConstituency: '',
    hasSubProject: 'No',
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.projectName.trim()) newErrors.projectName = 'Project Name is required';
    if (!formData.cost || parseFloat(formData.cost) <= 0) newErrors.cost = 'Valid Estimated Cost is required';
    if (!formData.category) newErrors.category = 'Project Category is required';
    if (!formData.initiatedDate) newErrors.initiatedDate = 'Initiated Date is required';
    if (!formData.completionDate) newErrors.completionDate = 'Completion Date is required';
    if (!formData.agency.trim()) newErrors.agency = 'Primary Implementing Agency is required';
    if (!formData.fundingSource) newErrors.fundingSource = 'Funding Source is required';
    if (!formData.state) newErrors.state = 'State is required';
    if (!formData.district) newErrors.district = 'District is required';
    if (!formData.mpConstituency) newErrors.mpConstituency = 'MP Constituency is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      const idStr = 'PR' + Math.floor(1000 + Math.random() * 9000);
      onAdd({
        id: Date.now(),
        projectId: idStr,
        subProjectId: '-',
        projectName: formData.projectName,
        subProjectName: '-',
        cost: parseFloat(formData.cost).toFixed(2),
        agency: formData.agency,
        stage: 'Project Initiated',
        category: formData.category,
        physicalProgress: '0',
        financialProgress: '0',
      });
      onClose();
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-fade-in max-w-7xl mx-auto my-4 text-slate-800">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
        <div className="flex items-center space-x-3">
          <button 
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition cursor-pointer text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight font-display">Add Project</h2>
            <p className="text-xs text-slate-500 mt-0.5">Register new port development schemes and infrastructure programs</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* SECTION 1: General Details */}
        <div className="space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">General Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Project Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Project Name <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                placeholder="Enter complete project description"
                value={formData.projectName}
                onChange={(e) => setFormData({...formData, projectName: e.target.value})}
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.projectName ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:ring-blue-100'} rounded-xl focus:outline-none focus:ring-2 focus:border-blue-500 transition`}
              />
              {errors.projectName && <p className="text-[10px] text-red-500 font-semibold">{errors.projectName}</p>}
            </div>

            {/* Project Brief */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Project Brief <span className="text-red-400 font-normal">(Max length of words should not exceed 20)</span></label>
              <textarea 
                rows="1"
                placeholder="Enter brief description"
                value={formData.projectBrief}
                onChange={(e) => setFormData({...formData, projectBrief: e.target.value})}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
              />
            </div>

            {/* Estimated Cost */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Estimated Cost (In Cr.) <span className="text-red-500">*</span></label>
              <input 
                type="number" 
                step="0.01"
                placeholder="Enter estimated budget"
                value={formData.cost}
                onChange={(e) => setFormData({...formData, cost: e.target.value})}
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.cost ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:ring-blue-100'} rounded-xl focus:outline-none focus:ring-2 focus:border-blue-500 transition`}
              />
              {errors.cost && <p className="text-[10px] text-red-500 font-semibold">{errors.cost}</p>}
            </div>

            {/* Project Type */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Project Type <span className="text-red-500">*</span></label>
              <div className="relative">
                <select 
                  value={formData.projectType}
                  onChange={(e) => setFormData({...formData, projectType: e.target.value})}
                  className="w-full text-xs pl-3.5 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition cursor-pointer"
                >
                  <option value="">--Select Proposal Type--</option>
                  <option value="General">General</option>
                  <option value="Capital">Capital</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Implementation Type */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Implementation Type <span className="text-red-500">*</span></label>
              <div className="relative">
                <select 
                  value={formData.implementationType}
                  onChange={(e) => setFormData({...formData, implementationType: e.target.value})}
                  className="w-full text-xs pl-3.5 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition cursor-pointer"
                >
                  <option value="">--Select Implementation Type--</option>
                  <option value="EPC">EPC</option>
                  <option value="PPP">PPP</option>
                  <option value="Lumpsum">Lumpsum</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Project Category */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Project Category <span className="text-red-500">*</span></label>
              <div className="relative">
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className={`w-full text-xs pl-3.5 pr-9 py-2.5 bg-slate-50 border ${errors.category ? 'border-red-400' : 'border-slate-200'} rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition cursor-pointer`}
                >
                  <option value="">Select Project Category</option>
                  {CATEGORIES.map((cat, i) => (
                    <option key={i} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
              {errors.category && <p className="text-[10px] text-red-500 font-semibold">{errors.category}</p>}
            </div>

            {/* Initiated Date */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Project Initiated Date <span className="text-red-500">*</span></label>
              <div className="relative">
                <input 
                  type="date"
                  value={formData.initiatedDate}
                  onChange={(e) => setFormData({...formData, initiatedDate: e.target.value})}
                  className={`w-full text-xs pl-3.5 pr-9 py-2.5 bg-slate-50 border ${errors.initiatedDate ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition text-slate-700`}
                />
              </div>
              {errors.initiatedDate && <p className="text-[10px] text-red-500 font-semibold">{errors.initiatedDate}</p>}
            </div>

            {/* Completion Date */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Targeted Completion Date <span className="text-red-500">*</span></label>
              <div className="relative">
                <input 
                  type="date"
                  value={formData.completionDate}
                  onChange={(e) => setFormData({...formData, completionDate: e.target.value})}
                  className={`w-full text-xs pl-3.5 pr-9 py-2.5 bg-slate-50 border ${errors.completionDate ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition text-slate-700`}
                />
              </div>
              {errors.completionDate && <p className="text-[10px] text-red-500 font-semibold">{errors.completionDate}</p>}
            </div>

            {/* Primary Implementing Agency */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Primary Implementing Agency <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                placeholder="e.g. Jawaharlal Nehru Port Authority"
                value={formData.agency}
                onChange={(e) => setFormData({...formData, agency: e.target.value})}
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.agency ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:ring-blue-100'} rounded-xl focus:outline-none focus:ring-2 focus:border-blue-500 transition`}
              />
              {errors.agency && <p className="text-[10px] text-red-500 font-semibold">{errors.agency}</p>}
            </div>

            {/* Secondary Implementing Agency */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Secondary Implementing Agency</label>
              <input 
                type="text" 
                placeholder="Enter secondary agency (optional)"
                value={formData.secondaryAgency}
                onChange={(e) => setFormData({...formData, secondaryAgency: e.target.value})}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
              />
            </div>

            {/* Scheme */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Scheme <span className="text-red-500">*</span></label>
              <div className="relative">
                <select 
                  value={formData.scheme}
                  onChange={(e) => setFormData({...formData, scheme: e.target.value})}
                  className="w-full text-xs pl-3.5 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition cursor-pointer"
                >
                  <option value="">--Select Scheme--</option>
                  <option value="Sagarmala">Sagarmala Program</option>
                  <option value="GatiShakti">PM Gati Shakti</option>
                  <option value="MIV2030">Maritime India Vision 2030</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Initiative */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Initiative</label>
              <div className="relative">
                <select 
                  value={formData.initiative}
                  onChange={(e) => setFormData({...formData, initiative: e.target.value})}
                  className="w-full text-xs pl-3.5 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition cursor-pointer"
                >
                  <option value="">--Select Initiative--</option>
                  <option value="Modernization">Port Modernization</option>
                  <option value="Community">Coastal Community Development</option>
                  <option value="Connectivity">Port Connectivity</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Project Output */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Project Output</label>
              <div className="relative">
                <select 
                  value={formData.output}
                  onChange={(e) => setFormData({...formData, output: e.target.value})}
                  className="w-full text-xs pl-3.5 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition cursor-pointer"
                >
                  <option value="">--Select Output--</option>
                  <option value="Berth Built">Berth Construction</option>
                  <option value="Channel Dredged">Channel Deepening</option>
                  <option value="IT System">IT System Deployed</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Project Outcome */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Project Outcome</label>
              <input 
                type="text" 
                placeholder="Enter expected outcomes"
                value={formData.outcome}
                onChange={(e) => setFormData({...formData, outcome: e.target.value})}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
              />
            </div>

            {/* Capacity Addition */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Capacity Addition (In MTPA)</label>
              <input 
                type="text" 
                placeholder="e.g. 5.5"
                value={formData.capacity}
                onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Source of Funding */}
        <div className="space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Source of Funding</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Source of Funding Select */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Source of Funding <span className="text-red-500">*</span></label>
              <div className="relative">
                <select 
                  value={formData.fundingSource}
                  onChange={(e) => setFormData({...formData, fundingSource: e.target.value})}
                  className={`w-full text-xs pl-3.5 pr-9 py-2.5 bg-slate-50 border ${errors.fundingSource ? 'border-red-400' : 'border-slate-200'} rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition cursor-pointer`}
                >
                  <option value="">--Select Source of Funding--</option>
                  <option value="Budgetary">Budgetary Support</option>
                  <option value="Internal">Internal Resources</option>
                  <option value="ExtraBudgetary">Extra Budgetary Resources</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
              {errors.fundingSource && <p className="text-[10px] text-red-500 font-semibold">{errors.fundingSource}</p>}
            </div>

            {/* Primary Funding Agency */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Primary Funding Agency <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                placeholder="e.g. Ministry of Finance"
                value={formData.primaryFundingAgency}
                onChange={(e) => setFormData({...formData, primaryFundingAgency: e.target.value})}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
              />
            </div>

            {/* Secondary Funding Agency */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Secondary Funding Agency</label>
              <input 
                type="text" 
                placeholder="e.g. World Bank (optional)"
                value={formData.secondaryFundingAgency}
                onChange={(e) => setFormData({...formData, secondaryFundingAgency: e.target.value})}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Project Location */}
        <div className="space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Project Location</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* State */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">State <span className="text-red-500">*</span></label>
              <div className="relative">
                <select 
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  className={`w-full text-xs pl-3.5 pr-9 py-2.5 bg-slate-50 border ${errors.state ? 'border-red-400' : 'border-slate-200'} rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition cursor-pointer`}
                >
                  <option value="">--Select State--</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="TamilNadu">Tamil Nadu</option>
                  <option value="Kerala">Kerala</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
              {errors.state && <p className="text-[10px] text-red-500 font-semibold">{errors.state}</p>}
            </div>

            {/* District */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">District <span className="text-red-500">*</span></label>
              <div className="relative">
                <select 
                  value={formData.district}
                  onChange={(e) => setFormData({...formData, district: e.target.value})}
                  className={`w-full text-xs pl-3.5 pr-9 py-2.5 bg-slate-50 border ${errors.district ? 'border-red-400' : 'border-slate-200'} rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition cursor-pointer`}
                >
                  <option value="">--Select District--</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Chennai">Chennai</option>
                  <option value="Kochi">Kochi</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
              {errors.district && <p className="text-[10px] text-red-500 font-semibold">{errors.district}</p>}
            </div>

            {/* Taluka */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Taluka</label>
              <input 
                type="text" 
                placeholder="Enter taluka"
                value={formData.taluka}
                onChange={(e) => setFormData({...formData, taluka: e.target.value})}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
              />
            </div>

            {/* Village */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Village</label>
              <input 
                type="text" 
                placeholder="Enter village"
                value={formData.village}
                onChange={(e) => setFormData({...formData, village: e.target.value})}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
              />
            </div>

            {/* MP Constituency */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">MP Constituency <span className="text-red-500">*</span></label>
              <div className="relative">
                <select 
                  value={formData.mpConstituency}
                  onChange={(e) => setFormData({...formData, mpConstituency: e.target.value})}
                  className={`w-full text-xs pl-3.5 pr-9 py-2.5 bg-slate-50 border ${errors.mpConstituency ? 'border-red-400' : 'border-slate-200'} rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition cursor-pointer`}
                >
                  <option value="">--Select MP Constituency--</option>
                  <option value="MumbaiSouth">Mumbai South</option>
                  <option value="ChennaiSouth">Chennai South</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
              {errors.mpConstituency && <p className="text-[10px] text-red-500 font-semibold">{errors.mpConstituency}</p>}
            </div>
          </div>
        </div>

        {/* SECTION 4: Sub Project Selection */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Does this project have sub project?</h3>
          </div>

          <div className="flex items-center space-x-6 text-xs pt-1.5">
            <label className="flex items-center space-x-2 cursor-pointer font-bold">
              <input 
                type="radio" 
                name="hasSubProject" 
                value="Yes" 
                checked={formData.hasSubProject === 'Yes'}
                onChange={(e) => setFormData({...formData, hasSubProject: e.target.value})}
                className="h-4 w-4 text-blue-650 focus:ring-blue-500 border-slate-350 cursor-pointer"
              />
              <span>Yes</span>
            </label>
            
            <label className="flex items-center space-x-2 cursor-pointer font-bold">
              <input 
                type="radio" 
                name="hasSubProject" 
                value="No" 
                checked={formData.hasSubProject === 'No'}
                onChange={(e) => setFormData({...formData, hasSubProject: e.target.value})}
                className="h-4 w-4 text-blue-650 focus:ring-blue-500 border-slate-350 cursor-pointer"
              />
              <span>No</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t border-slate-150 flex items-center justify-end space-x-3.5">
          <button 
            type="submit" 
            className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            Submit
          </button>
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            Exit
          </button>
        </div>

      </form>
    </div>
  );
}
