import { useState, useEffect } from 'react';
import { X, Check, Plus, Trash, ArrowLeft, Upload, FileText, Image as ImageIcon } from 'lucide-react';

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

export default function UpdateProjectOverlay({ isOpen, onClose, project, onSave }) {
  const [activeTab, setActiveTab] = useState('Basic Information');
  const [formData, setFormData] = useState({
    projectId: '',
    subProjectId: '',
    projectName: '',
    projectBrief: '',
    cost: '',
    projectType: '',
    implementationType: '',
    category: '',
    initiatedDate: '',
    completionDate: '',
    revisedCompletionDate: '',
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
    isLandAcquiredRequired: 'No',
    percentageLandAcquired: '',
    otherLandDetails: '',
    targetExpenditure: [{ sn: 1, year: '2025-26', target: '' }]
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (project) {
      setFormData({
        projectId: project.projectId || '',
        subProjectId: project.subProjectId || '-',
        projectName: project.projectName || '',
        projectBrief: project.projectBrief || '',
        cost: project.cost || '',
        projectType: project.projectType || '',
        implementationType: project.implementationType || '',
        category: project.category || '',
        initiatedDate: project.initiatedDate || '',
        completionDate: project.completionDate || '',
        revisedCompletionDate: project.revisedCompletionDate || '',
        agency: project.agency || '',
        secondaryAgency: project.secondaryAgency || '',
        scheme: project.scheme || '',
        initiative: project.initiative || '',
        output: project.output || '',
        outcome: project.outcome || '',
        capacity: project.capacity || '',
        fundingSource: project.fundingSource || '',
        primaryFundingAgency: project.primaryFundingAgency || '',
        secondaryFundingAgency: project.secondaryFundingAgency || '',
        state: project.state || '',
        district: project.district || '',
        taluka: project.taluka || '',
        village: project.village || '',
        mpConstituency: project.mpConstituency || '',
        isLandAcquiredRequired: project.isLandAcquiredRequired || 'No',
        percentageLandAcquired: project.percentageLandAcquired || '',
        otherLandDetails: project.otherLandDetails || '',
        targetExpenditure: project.targetExpenditure && project.targetExpenditure.length > 0 
          ? project.targetExpenditure 
          : [{ sn: 1, year: '2025-26', target: '' }]
      });
      setErrors({});
    }
  }, [project, isOpen]);

  if (!isOpen) return null;

  const countWords = (str) => {
    if (!str) return 0;
    return str.trim().split(/\s+/).filter(Boolean).length;
  };

  const validate = () => {
    const newErrors = {};

    // Word limits
    const nameWordCount = countWords(formData.projectName);
    if (nameWordCount > 15) {
      newErrors.projectName = `Project Name exceeds 15 words (currently ${nameWordCount} words).`;
    }
    const briefWordCount = countWords(formData.projectBrief);
    if (briefWordCount > 20) {
      newErrors.projectBrief = `Project Brief exceeds 20 words (currently ${briefWordCount} words).`;
    }

    // Required fields
    if (!formData.projectId.trim()) newErrors.projectId = 'Project ID is required';
    if (!formData.projectName.trim()) newErrors.projectName = newErrors.projectName || 'Project Name is required';
    if (!formData.projectBrief.trim()) newErrors.projectBrief = newErrors.projectBrief || 'Project Brief is required';
    if (!formData.cost || parseFloat(formData.cost) <= 0) newErrors.cost = 'Valid cost is required';
    if (!formData.projectType) newErrors.projectType = 'Project Type is required';
    if (!formData.implementationType) newErrors.implementationType = 'Implementation Type is required';
    if (!formData.category) newErrors.category = 'Project Category is required';
    if (!formData.initiatedDate) newErrors.initiatedDate = 'Project Initiated Date is required';
    if (!formData.completionDate) newErrors.completionDate = 'Targeted Completion Date is required';
    if (!formData.agency.trim()) newErrors.agency = 'Primary Implementing Agency is required';
    if (!formData.scheme) newErrors.scheme = 'Scheme is required';
    if (!formData.fundingSource) newErrors.fundingSource = 'Funding Source is required';
    if (!formData.primaryFundingAgency.trim()) newErrors.primaryFundingAgency = 'Primary Funding Agency is required';
    if (!formData.state) newErrors.state = 'State is required';
    if (!formData.district) newErrors.district = 'District is required';
    if (!formData.mpConstituency) newErrors.mpConstituency = 'MP Constituency is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) {
      setActiveTab('Basic Information');
      return;
    }

    onSave({
      ...project,
      projectId: formData.projectId,
      subProjectId: formData.subProjectId,
      projectName: formData.projectName,
      projectBrief: formData.projectBrief,
      cost: parseFloat(formData.cost).toFixed(2),
      agency: formData.agency,
      stage: project.stage === 'null' ? 'Project Initiated' : project.stage,
      category: formData.category,
      physicalProgress: project.physicalProgress || '0',
      financialProgress: project.financialProgress || '0',
      
      // Extended fields
      projectType: formData.projectType,
      implementationType: formData.implementationType,
      initiatedDate: formData.initiatedDate,
      completionDate: formData.completionDate,
      revisedCompletionDate: formData.revisedCompletionDate,
      secondaryAgency: formData.secondaryAgency,
      scheme: formData.scheme,
      initiative: formData.initiative,
      output: formData.output,
      outcome: formData.outcome,
      capacity: formData.capacity,
      fundingSource: formData.fundingSource,
      primaryFundingAgency: formData.primaryFundingAgency,
      secondaryFundingAgency: formData.secondaryFundingAgency,
      state: formData.state,
      district: formData.district,
      taluka: formData.taluka,
      village: formData.village,
      mpConstituency: formData.mpConstituency,
      isLandAcquiredRequired: formData.isLandAcquiredRequired,
      percentageLandAcquired: formData.percentageLandAcquired,
      otherLandDetails: formData.otherLandDetails,
      targetExpenditure: formData.targetExpenditure
    });
  };

  // Target Expenditure helper functions
  const addExpenditureRow = () => {
    setFormData(prev => {
      const nextList = [...prev.targetExpenditure];
      nextList.push({
        sn: nextList.length + 1,
        year: `202${nextList.length + 5}-2${nextList.length + 6}`,
        target: ''
      });
      return { ...prev, targetExpenditure: nextList };
    });
  };

  const removeExpenditureRow = (index) => {
    setFormData(prev => {
      let nextList = prev.targetExpenditure.filter((_, idx) => idx !== index);
      nextList = nextList.map((item, idx) => ({ ...item, sn: idx + 1 }));
      return { ...prev, targetExpenditure: nextList };
    });
  };

  const handleExpenditureChange = (index, field, value) => {
    setFormData(prev => {
      const nextList = [...prev.targetExpenditure];
      nextList[index] = { ...nextList[index], [field]: value };
      return { ...prev, targetExpenditure: nextList };
    });
  };

  const TABS = [
    'Basic Information',
    'Planning and Sanctioning',
    'Clearances',
    'Under Tendering',
    'Under Implementation',
    'Project Completion'
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in text-slate-800">
      
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4.5 flex items-center justify-between text-white border-b border-blue-900/20">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider font-display">
            Modify Project Detail
          </h3>
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">Ministry of Ports, Shipping and Waterways</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Project List</span>
        </button>
      </div>

      {/* Form Tabs Nav */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 flex overflow-x-auto gap-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold whitespace-nowrap rounded-lg transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#0f417a] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Modal Form Area */}
      <div className="p-6 space-y-8">
        
        {activeTab === 'Basic Information' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Context display */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Project Reference</h4>
                <p className="text-sm font-black text-slate-800 mt-0.5">
                  Project ID: {formData.projectId || 'PR0699'}
                </p>
              </div>
              <div className="text-right">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Project Name</h4>
                <p className="text-sm font-bold text-[#0f417a] mt-0.5">
                  {formData.projectName || 'Development of PPP Projects'}
                </p>
              </div>
            </div>

            {/* Subsection: General Details */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">General Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Project ID <span className="text-red-505">*</span></label>
                  <input
                    type="text"
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.projectId ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold`}
                  />
                  {errors.projectId && <p className="text-[9px] text-red-500 font-bold">{errors.projectId}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Sub Project ID <span className="text-red-505">*</span></label>
                  <input
                    type="text"
                    value={formData.subProjectId}
                    onChange={(e) => setFormData({ ...formData, subProjectId: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-400"
                    disabled
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Project Name * <span className="text-slate-400 font-normal">(Max 15 words)</span></label>
                  <input
                    type="text"
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.projectName ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold`}
                  />
                  {errors.projectName && <p className="text-[9px] text-red-500 font-bold">{errors.projectName}</p>}
                </div>

                <div className="space-y-1 lg:col-span-3">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Project Brief * <span className="text-slate-400 font-normal">(Max 20 words)</span></label>
                  <textarea
                    rows="2"
                    value={formData.projectBrief}
                    onChange={(e) => setFormData({ ...formData, projectBrief: e.target.value })}
                    className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.projectBrief ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold`}
                  />
                  {errors.projectBrief && <p className="text-[9px] text-red-500 font-bold">{errors.projectBrief}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Estimated Cost (In Cr.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.cost ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold`}
                  />
                  {errors.cost && <p className="text-[9px] text-red-500 font-bold">{errors.cost}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Project Type *</label>
                  <select
                    value={formData.projectType}
                    onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                    className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.projectType ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold`}
                  >
                    <option value="">Select Type</option>
                    <option value="General">General</option>
                    <option value="Capital">Capital</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                  {errors.projectType && <p className="text-[9px] text-red-500 font-bold">{errors.projectType}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Implementation Type *</label>
                  <select
                    value={formData.implementationType}
                    onChange={(e) => setFormData({ ...formData, implementationType: e.target.value })}
                    className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.implementationType ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold`}
                  >
                    <option value="">Select Type</option>
                    <option value="EPC">EPC</option>
                    <option value="PPP">PPP</option>
                    <option value="Lumpsum">Lumpsum</option>
                  </select>
                  {errors.implementationType && <p className="text-[9px] text-red-500 font-bold">{errors.implementationType}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Project Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.category ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold`}
                  >
                    <option value="">Select Category</option>
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  {errors.category && <p className="text-[9px] text-red-500 font-bold">{errors.category}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Project Initiated Date *</label>
                  <input
                    type="date"
                    value={formData.initiatedDate}
                    onChange={(e) => setFormData({ ...formData, initiatedDate: e.target.value })}
                    className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.initiatedDate ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold`}
                  />
                  {errors.initiatedDate && <p className="text-[9px] text-red-500 font-bold">{errors.initiatedDate}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Targeted Completion Date *</label>
                  <input
                    type="date"
                    value={formData.completionDate}
                    onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
                    className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.completionDate ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold`}
                  />
                  {errors.completionDate && <p className="text-[9px] text-red-500 font-bold">{errors.completionDate}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Revised Targeted Completion Date</label>
                  <input
                    type="date"
                    value={formData.revisedCompletionDate}
                    onChange={(e) => setFormData({ ...formData, revisedCompletionDate: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Primary Implementing Agency *</label>
                  <input
                    type="text"
                    value={formData.agency}
                    onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                    className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.agency ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold`}
                  />
                  {errors.agency && <p className="text-[9px] text-red-500 font-bold">{errors.agency}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Secondary Implementing Agency</label>
                  <input
                    type="text"
                    value={formData.secondaryAgency}
                    onChange={(e) => setFormData({ ...formData, secondaryAgency: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Scheme *</label>
                  <select
                    value={formData.scheme}
                    onChange={(e) => setFormData({ ...formData, scheme: e.target.value })}
                    className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.scheme ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold`}
                  >
                    <option value="">Select Scheme</option>
                    <option value="Sagarmala">Sagarmala Program</option>
                    <option value="GatiShakti">PM Gati Shakti</option>
                    <option value="MIV2030">Maritime India Vision 2030</option>
                  </select>
                  {errors.scheme && <p className="text-[9px] text-red-500 font-bold">{errors.scheme}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Initiative</label>
                  <select
                    value={formData.initiative}
                    onChange={(e) => setFormData({ ...formData, initiative: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                  >
                    <option value="">Select Initiative</option>
                    <option value="Modernization">Port Modernization</option>
                    <option value="Community">Coastal Community Development</option>
                    <option value="Connectivity">Port Connectivity</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Project Output</label>
                  <select
                    value={formData.output}
                    onChange={(e) => setFormData({ ...formData, output: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                  >
                    <option value="">Select Output</option>
                    <option value="Berth Built">Berth Construction</option>
                    <option value="Channel Dredged">Channel Deepening</option>
                    <option value="IT System">IT System Deployed</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Project Outcome</label>
                  <input
                    type="text"
                    value={formData.outcome}
                    onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Capacity Addition (In MTPA)</label>
                  <input
                    type="text"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Subsection: Source of Funding */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Source of Funding</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Source of Funding *</label>
                  <select
                    value={formData.fundingSource}
                    onChange={(e) => setFormData({ ...formData, fundingSource: e.target.value })}
                    className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.fundingSource ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold`}
                  >
                    <option value="">Select Source</option>
                    <option value="Budgetary">Budgetary Support</option>
                    <option value="Internal">Internal Resources</option>
                    <option value="ExtraBudgetary">Extra Budgetary Resources</option>
                    <option value="Private">Private Investment</option>
                  </select>
                  {errors.fundingSource && <p className="text-[9px] text-red-500 font-bold">{errors.fundingSource}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Primary Funding Agency *</label>
                  <input
                    type="text"
                    value={formData.primaryFundingAgency}
                    onChange={(e) => setFormData({ ...formData, primaryFundingAgency: e.target.value })}
                    className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.primaryFundingAgency ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold`}
                  />
                  {errors.primaryFundingAgency && <p className="text-[9px] text-red-500 font-bold">{errors.primaryFundingAgency}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Secondary Funding Agency</label>
                  <input
                    type="text"
                    value={formData.secondaryFundingAgency}
                    onChange={(e) => setFormData({ ...formData, secondaryFundingAgency: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Subsection: Target Expenditure */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Target Expenditure</h3>
                </div>
                <button
                  type="button"
                  onClick={addExpenditureRow}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Row</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="px-4 py-2.5 w-16">S.No</th>
                      <th className="px-4 py-2.5">Financial Year</th>
                      <th className="px-4 py-2.5">Target Expenditure (In Cr.)</th>
                      <th className="px-4 py-2.5 w-20 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formData.targetExpenditure.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2 font-semibold text-slate-500">{item.sn}</td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.year}
                            onChange={(e) => handleExpenditureChange(idx, 'year', e.target.value)}
                            className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium bg-transparent"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={item.target}
                            placeholder="0.00"
                            onChange={(e) => handleExpenditureChange(idx, 'target', e.target.value)}
                            className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium bg-transparent"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeExpenditureRow(idx)}
                            disabled={formData.targetExpenditure.length === 1}
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition disabled:opacity-40"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subsection: Project Location */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Project Location</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">State *</label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.state ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold`}
                  >
                    <option value="">Select State</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="TamilNadu">Tamil Nadu</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Karnataka">Karnataka</option>
                  </select>
                  {errors.state && <p className="text-[9px] text-red-500 font-bold">{errors.state}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">District *</label>
                  <select
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.district ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold`}
                  >
                    <option value="">Select District</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Chennai">Chennai</option>
                    <option value="Kochi">Kochi</option>
                    <option value="Ahmedabad">Ahmedabad</option>
                  </select>
                  {errors.district && <p className="text-[9px] text-red-500 font-bold">{errors.district}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Taluka</label>
                  <input
                    type="text"
                    value={formData.taluka}
                    onChange={(e) => setFormData({ ...formData, taluka: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Village</label>
                  <input
                    type="text"
                    value={formData.village}
                    onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">MP Constituency *</label>
                  <select
                    value={formData.mpConstituency}
                    onChange={(e) => setFormData({ ...formData, mpConstituency: e.target.value })}
                    className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.mpConstituency ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold`}
                  >
                    <option value="">Select Constituency</option>
                    <option value="MumbaiSouth">Mumbai South</option>
                    <option value="ChennaiSouth">Chennai South</option>
                  </select>
                  {errors.mpConstituency && <p className="text-[9px] text-red-500 font-bold">{errors.mpConstituency}</p>}
                </div>
              </div>
            </div>

            {/* Subsection: Land Details */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Land Detail</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                    Is Land Acquisition required for Project?
                  </label>
                  <div className="flex items-center space-x-4 pt-1 text-xs">
                    <label className="flex items-center space-x-2 cursor-pointer font-bold">
                      <input
                        type="radio"
                        name="isLandAcquiredRequired"
                        value="Yes"
                        checked={formData.isLandAcquiredRequired === 'Yes'}
                        onChange={(e) => setFormData({ ...formData, isLandAcquiredRequired: e.target.value })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer font-bold">
                      <input
                        type="radio"
                        name="isLandAcquiredRequired"
                        value="No"
                        checked={formData.isLandAcquiredRequired === 'No'}
                        onChange={(e) => setFormData({ ...formData, isLandAcquiredRequired: e.target.value })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Percentage of Land Acquired</label>
                  <input
                    type="text"
                    value={formData.percentageLandAcquired}
                    placeholder="e.g. 80"
                    onChange={(e) => setFormData({ ...formData, percentageLandAcquired: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Others</label>
                  <input
                    type="text"
                    value={formData.otherLandDetails}
                    placeholder="Enter other details"
                    onChange={(e) => setFormData({ ...formData, otherLandDetails: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Subsection: Document Uploads */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* PPT Upload */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Project PPT</label>
                <div className="border border-dashed border-slate-350 rounded-xl p-5 text-center bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer flex flex-col items-center justify-center min-h-32">
                  <Upload className="h-6 w-6 text-slate-400 mb-2" />
                  <span className="text-xs font-bold text-[#0f417a] hover:underline block">Upload</span>
                  <span className="text-[10px] text-slate-400 block mt-1">Drag & Drop Files</span>
                  <span className="text-[8px] text-slate-400 block mt-0.5">NOTE: Multiple PDF files, Max 10MB</span>
                </div>
              </div>

              {/* PERT Chart Upload */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">PERT Chart</label>
                <div className="border border-dashed border-slate-350 rounded-xl p-5 text-center bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer flex flex-col items-center justify-center min-h-32">
                  <Upload className="h-6 w-6 text-slate-400 mb-2" />
                  <span className="text-xs font-bold text-[#0f417a] hover:underline block">Upload</span>
                  <span className="text-[10px] text-slate-400 block mt-1">Drag & Drop Files</span>
                  <span className="text-[8px] text-slate-400 block mt-0.5">NOTE: Multiple PDF files, Max 10MB</span>
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Latest Project Image</label>
                <div className="border border-dashed border-slate-350 rounded-xl p-5 text-center bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer flex flex-col items-center justify-center min-h-32">
                  <Upload className="h-6 w-6 text-slate-400 mb-2" />
                  <span className="text-xs font-bold text-[#0f417a] hover:underline block">Upload</span>
                  <span className="text-[10px] text-slate-400 block mt-1">Drag & Drop Files</span>
                  <span className="text-[8px] text-slate-400 block mt-0.5">NOTE: Multiple images can be uploaded</span>
                </div>
              </div>

            </div>

          </div>
        )}

        {activeTab !== 'Basic Information' && (
          <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-fade-in">
            <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
              <FileText className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {activeTab} Workspace
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Forms and status indicators relating to <strong className="text-[#0f417a]">{activeTab}</strong> can be updated below. Fields are bound automatically to telemetry databases.
            </p>
            
            <div className="max-w-md mx-auto pt-4 text-left space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Stage Specific Status / Notes</label>
                <textarea
                  rows={3}
                  placeholder={`Enter details for ${activeTab}...`}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Status Category</label>
                <select className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold cursor-pointer">
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approved & Signed</option>
                  <option value="inprogress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Footer / Action Buttons */}
      <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-100 bg-slate-50">
        <button
          type="button"
          onClick={onClose}
          className="px-4.5 py-2.5 border border-slate-250 text-slate-655 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-slate-850 transition cursor-pointer"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-5.5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/10 hover:shadow-lg transition-all cursor-pointer"
        >
          Save Changes
        </button>
      </div>

    </div>
  );
}
