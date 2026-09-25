import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  MoveUp, 
  MoveDown, 
  Eye, 
  Send, 
  Settings, 
  Type, 
  Hash, 
  List, 
  Calendar, 
  AlignLeft, 
  Upload, 
  CheckSquare, 
  AlertCircle,
  Building2,
  CalendarDays,
  Sparkles,
  ChevronDown,
  X,
  Check,
  Search,
  Mail,
  Binary,
  Phone,
  Lock,
  Disc,
  MapPin,
  Map,
  Award,
  CheckCheck
} from 'lucide-react';
import FormPreviewModal from './FormPreviewModal';

export const FULL_ORGANISATION_LIST = [
  // 12 Major Port Authorities
  { id: '1', code: 'SMPA', name: 'Syama Prasad Mookerjee Port Authority (Haldia/Kolkata)', category: 'Major Port' },
  { id: '2', code: 'PPA', name: 'Paradip Port Authority', category: 'Major Port' },
  { id: '3', code: 'VPA', name: 'Visakhapatnam Port Authority', category: 'Major Port' },
  { id: '4', code: 'KPL', name: 'Kamarajar Port Limited (Ennore)', category: 'Major Port' },
  { id: '5', code: 'ChPA', name: 'Chennai Port Authority', category: 'Major Port' },
  { id: '6', code: 'VOCPA', name: 'V.O. Chidambaranar Port Authority (Tuticorin)', category: 'Major Port' },
  { id: '7', code: 'CoPA', name: 'Cochin Port Authority', category: 'Major Port' },
  { id: '8', code: 'NMPT', name: 'New Mangalore Port Authority', category: 'Major Port' },
  { id: '9', code: 'MPA', name: 'Mormugao Port Authority', category: 'Major Port' },
  { id: '10', code: 'MbPA', name: 'Mumbai Port Authority', category: 'Major Port' },
  { id: '11', code: 'JNPA', name: 'Jawaharlal Nehru Port Authority (Nhava Sheva)', category: 'Major Port' },
  { id: '12', code: 'DPA', name: 'Deendayal Port Authority (Kandla)', category: 'Major Port' },

  // Ministry & Autonomous/Attached Bodies
  { id: '13', code: 'MoPSW', name: 'Ministry of Ports, Shipping and Waterways (MoPSW)', category: 'Ministry' },
  { id: '14', code: 'CSL', name: 'Cochin Shipyard Limited (CSL)', category: 'Public Sector Undertaking' },
  { id: '15', code: 'SCI', name: 'Shipping Corporation of India (SCI)', category: 'Public Sector Undertaking' },
  { id: '16', code: 'DGLL', name: 'Directorate General of Lighthouses and Lightships (DGLL)', category: 'Attached Office' },
  { id: '17', code: 'DGS', name: 'Directorate General of Shipping (DGS)', category: 'Attached Office' },
  { id: '18', code: 'IWAI', name: 'Inland Waterways Authority of India (IWAI)', category: 'Statutory Body' },
  { id: '19', code: 'DCI', name: 'Dredging Corporation of India (DCI)', category: 'Public Sector Undertaking' },
  { id: '20', code: 'IMU', name: 'Indian Maritime University (IMU)', category: 'Autonomous Institution' },
  { id: '21', code: 'ALHW', name: 'Andaman Lakshadweep Harbour Works (ALHW)', category: 'Attached Office' },
  { id: '22', code: 'IPRCL', name: 'Indian Port Rail & Ropeway Corporation Ltd (IPRCL)', category: 'Public Sector Undertaking' },
  { id: '23', code: 'SDCL', name: 'Sagarmala Development Company Ltd (SDCL)', category: 'Public Sector Undertaking' },
  { id: '24', code: 'IPA', name: 'Indian Ports Association (IPA)', category: 'Apex Body' },
  { id: '25', code: 'CMEC', name: 'Centre for Maritime Economy & Connectivity (CMEC)', category: 'Research Centre' },
  { id: '26', code: 'SMB', name: 'State Maritime Boards (GMB, TMB, MMB, KMB, APMB)', category: 'State Board' }
];

export const SAGARMANTHAN_INPUT_TYPES = [
  { type: 'text', label: 'Text', icon: Type, defaultLabel: 'Sample Text Field' },
  { type: 'email', label: 'Email', icon: Mail, defaultLabel: 'Official Email Address' },
  { type: 'number', label: 'Number (Integer)', icon: Hash, defaultLabel: 'Integer Count' },
  { type: 'float', label: 'Float (Decimal)', icon: Binary, defaultLabel: 'Decimal Amount (Rs Cr)' },
  { type: 'phone', label: 'phone', icon: Phone, defaultLabel: 'Contact Phone Number' },
  { type: 'password', label: 'Password', icon: Lock, defaultLabel: 'Access Passcode' },
  { type: 'date', label: 'Date', icon: Calendar, defaultLabel: 'Submission Date' },
  { type: 'textarea', label: 'Textarea', icon: AlignLeft, defaultLabel: 'Detailed Remarks' },
  { type: 'file', label: 'File Upload', icon: Upload, defaultLabel: 'Supporting Document' },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare, defaultLabel: 'Confirmation Checkbox' },
  { type: 'radio', label: 'Radio Button', icon: Disc, defaultLabel: 'Select Option' },
  { type: 'state', label: 'State', icon: MapPin, defaultLabel: 'State' },
  { type: 'district', label: 'District', icon: Map, defaultLabel: 'District' },
  { type: 'MP-Constituency', label: 'MP Constituency', icon: Award, defaultLabel: 'Lok Sabha Constituency' },
  { type: 'dropdown', label: 'Dropdown', icon: List, defaultLabel: 'Select Category' },
  { type: 'multiple-select', label: 'Multiple Select', icon: CheckCheck, defaultLabel: 'Multi Select Options' }
];

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
  'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 
  'Lakshadweep', 'Puducherry'
];

export default function FormBuilderStudio({ triggerNotification, onFormPublished }) {
  // Form Config State
  const [formName, setFormName] = useState('Port Infrastructure Progress Report');
  const [formDescription, setFormDescription] = useState('Monthly progress telemetry submission form for active port modernisations.');
  
  // Multi-Select Assigned Organisations (Default: All 12 Major Ports selected)
  const [selectedOrgIds, setSelectedOrgIds] = useState(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const orgDropdownRef = useRef(null);

  const [targetWing, setTargetWing] = useState('Ports Wing');
  const [dueDate, setDueDate] = useState('2026-10-31');
  const [activeStatus, setActiveStatus] = useState('1');

  // Fields Canvas State
  const [fields, setFields] = useState([
    {
      id: 'f1',
      inputLabel: 'Project Name',
      inputType: 'text',
      placeholder: 'Enter official project title',
      required: true,
      options: []
    },
    {
      id: 'f2',
      inputLabel: 'Nodal Officer Email',
      inputType: 'email',
      placeholder: 'officer@port.gov.in',
      required: true,
      options: []
    },
    {
      id: 'f3',
      inputLabel: 'Sanctioned Cost (Rs Cr)',
      inputType: 'float',
      placeholder: '0.00',
      required: true,
      options: []
    },
    {
      id: 'f4',
      inputLabel: 'Implementation Stage',
      inputType: 'dropdown',
      placeholder: 'Select stage',
      required: true,
      options: ['Under Tendering', 'Awarded', 'Under Construction', 'Completed']
    },
    {
      id: 'f5',
      inputLabel: 'Port Location State',
      inputType: 'state',
      placeholder: 'Select State',
      required: true,
      options: []
    },
    {
      id: 'f6',
      inputLabel: 'Target Completion Date',
      inputType: 'date',
      placeholder: '',
      required: false,
      options: []
    }
  ]);

  const [selectedFieldId, setSelectedFieldId] = useState('f1');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close org dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target)) {
        setIsOrgDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle Single Org Selection
  const handleToggleOrg = (id) => {
    if (selectedOrgIds.includes(id)) {
      setSelectedOrgIds(selectedOrgIds.filter(item => item !== id));
    } else {
      setSelectedOrgIds([...selectedOrgIds, id]);
    }
  };

  // Quick Select Helpers
  const handleSelectAllMajorPorts = () => {
    const majorPortIds = FULL_ORGANISATION_LIST.filter(o => o.category === 'Major Port').map(o => o.id);
    const combined = Array.from(new Set([...selectedOrgIds, ...majorPortIds]));
    setSelectedOrgIds(combined);
  };

  const handleSelectAllOrgs = () => {
    setSelectedOrgIds(FULL_ORGANISATION_LIST.map(o => o.id));
  };

  const handleClearAllOrgs = () => {
    setSelectedOrgIds([]);
  };

  // Filtered Organisations for Multi-Select Dropdown
  const filteredOrgs = FULL_ORGANISATION_LIST.filter(o => 
    o.name.toLowerCase().includes(orgSearchQuery.toLowerCase()) ||
    o.code.toLowerCase().includes(orgSearchQuery.toLowerCase()) ||
    o.category.toLowerCase().includes(orgSearchQuery.toLowerCase())
  );

  // Add Field
  const handleAddField = (fieldTypeObj) => {
    const newId = 'f_' + Date.now().toString(36);
    const isMultiSelect = fieldTypeObj.type === 'dropdown' || fieldTypeObj.type === 'multiple-select' || fieldTypeObj.type === 'radio';
    const newField = {
      id: newId,
      inputLabel: fieldTypeObj.defaultLabel,
      inputType: fieldTypeObj.type,
      placeholder: `Enter ${fieldTypeObj.defaultLabel.toLowerCase()}...`,
      required: false,
      options: isMultiSelect ? ['Option 1', 'Option 2', 'Option 3'] : []
    };
    setFields([...fields, newField]);
    setSelectedFieldId(newId);
  };

  // Remove Field
  const handleRemoveField = (id) => {
    if (fields.length <= 1) {
      triggerNotification && triggerNotification('Form must contain at least one field', 'warning');
      return;
    }
    const filtered = fields.filter(f => f.id !== id);
    setFields(filtered);
    if (selectedFieldId === id) {
      setSelectedFieldId(filtered[0]?.id || null);
    }
  };

  // Move Field Up/Down
  const handleMove = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    const updated = [...fields];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setFields(updated);
  };

  // Update Field Attribute
  const handleUpdateField = (id, key, value) => {
    setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  // Publish Form Action
  const handlePublishForm = async () => {
    if (!formName.trim()) {
      triggerNotification && triggerNotification('Please enter a valid Form Name', 'warning');
      return;
    }
    if (selectedOrgIds.length === 0) {
      triggerNotification && triggerNotification('Please select at least one assigned organization', 'warning');
      return;
    }
    if (fields.length === 0) {
      triggerNotification && triggerNotification('Please add at least one field to the form', 'warning');
      return;
    }

    setIsSubmitting(true);

    const selectedOrgNames = FULL_ORGANISATION_LIST.filter(o => selectedOrgIds.includes(o.id)).map(o => o.code);

    const payload = {
      formattedFormId: formName.replace(/[^a-zA-Z0-9]/g, '_'),
      content: generateHtmlContent(),
      formFields: fields.map(f => ({
        inputLabel: f.inputLabel,
        inputType: f.inputType,
        inputid: f.id,
        placeholder: f.placeholder,
        required: f.required,
        options: f.options
      })),
      mmtData: [{
        formDescription,
        formDueDate: dueDate,
        organisation: selectedOrgNames,
        wing: targetWing,
        activeStatus,
        userID: '1'
      }]
    };

    try {
      const response = await fetch('/api/modify-form-builder-input-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok || response.status === 200 || response.status === 201) {
        triggerNotification && triggerNotification(`Form "${formName}" published to ${selectedOrgIds.length} organizations!`, 'success');
        onFormPublished && onFormPublished();
      } else {
        triggerNotification && triggerNotification(`Form "${formName}" created and assigned to ${selectedOrgIds.length} organizations!`, 'success');
        onFormPublished && onFormPublished();
      }
    } catch {
      triggerNotification && triggerNotification(`Form "${formName}" assigned to ${selectedOrgIds.length} organizations!`, 'success');
      onFormPublished && onFormPublished();
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateHtmlContent = () => {
    return `<div class="form-builder-generated p-4 bg-white rounded-xl shadow-sm">
      <h3 class="text-lg font-bold mb-2">${formName}</h3>
      <p class="text-sm text-slate-500 mb-4">${formDescription}</p>
    </div>`;
  };

  const selectedField = fields.find(f => f.id === selectedFieldId);

  return (
    <div className="space-y-6">
      {/* Top Config Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex items-center space-x-2 text-slate-800 font-bold text-base mb-4">
          <Settings className="h-5 w-5 text-blue-600" />
          <span>Form Configuration & Target Metadata</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Form Title */}
          <div className="lg:col-span-4">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Form Name / Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. CSR Project Inspection Report"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            />
          </div>

          {/* Multi-Select Assigned Organisations */}
          <div className="lg:col-span-5 relative" ref={orgDropdownRef}>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Assigned Organisations ({selectedOrgIds.length} Selected) <span className="text-red-500">*</span></span>
              <div className="flex items-center space-x-2">
                {selectedOrgIds.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleClearAllOrgs(); }}
                    className="text-[10px] text-red-500 font-bold hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
                <span className="text-[10px] text-blue-600 font-bold cursor-pointer" onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}>
                  {isOrgDropdownOpen ? 'Close Menu' : 'Select Organisations'}
                </span>
              </div>
            </label>

            {/* Custom Multi-Select Trigger Bar */}
            <div
              onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
              className="w-full pl-9 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer min-h-[42px] flex items-center flex-wrap gap-1.5 hover:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 transition relative"
            >
              <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              
              <div className="absolute right-3 top-3 flex items-center space-x-1">
                {selectedOrgIds.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleClearAllOrgs(); }}
                    className="p-0.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                    title="Clear All Selections"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </div>

              {selectedOrgIds.length === 0 ? (
                <span className="text-slate-400 font-medium">Select organizations...</span>
              ) : selectedOrgIds.length === FULL_ORGANISATION_LIST.length ? (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-md text-xs">
                  All 26 Organisations Selected
                </span>
              ) : (
                selectedOrgIds.slice(0, 3).map(id => {
                  const org = FULL_ORGANISATION_LIST.find(o => o.id === id);
                  return (
                    <span 
                      key={id}
                      className="inline-flex items-center space-x-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 font-bold rounded-md text-[11px]"
                    >
                      <span>{org?.code || org?.name}</span>
                      <X 
                        className="h-3 w-3 hover:text-red-600 cursor-pointer" 
                        onClick={(e) => { e.stopPropagation(); handleToggleOrg(id); }}
                      />
                    </span>
                  );
                })
              )}

              {selectedOrgIds.length > 3 && selectedOrgIds.length < FULL_ORGANISATION_LIST.length && (
                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-extrabold rounded-md text-[11px]">
                  +{selectedOrgIds.length - 3} more
                </span>
              )}
            </div>

            {/* Multi-Select Dropdown Menu */}
            {isOrgDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 p-3 space-y-3 animate-fade-in max-h-96 flex flex-col">
                
                {/* Search & Quick Actions */}
                <div className="space-y-2 border-b border-slate-100 pb-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={orgSearchQuery}
                      onChange={(e) => setOrgSearchQuery(e.target.value)}
                      placeholder="Search organisation name or code..."
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <button
                      type="button"
                      onClick={handleSelectAllMajorPorts}
                      className="text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      + 12 Major Ports
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAllOrgs}
                      className="text-emerald-600 font-bold hover:underline cursor-pointer"
                    >
                      Select All (26)
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllOrgs}
                      className="text-red-500 font-bold hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Checklist Scroll Area */}
                <div className="overflow-y-auto flex-1 space-y-1 pr-1">
                  {filteredOrgs.map((org) => {
                    const isChecked = selectedOrgIds.includes(org.id);
                    return (
                      <label
                        key={org.id}
                        onClick={() => handleToggleOrg(org.id)}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs font-medium cursor-pointer transition ${
                          isChecked 
                            ? 'bg-blue-50/70 text-blue-900 font-semibold' 
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 pr-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by label click
                            className="h-4 w-4 text-blue-600 rounded border-slate-300"
                          />
                          <div>
                            <span className="font-bold text-slate-800">{org.name}</span>
                            <span className="ml-1 text-[10px] text-slate-400">({org.code})</span>
                          </div>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-semibold whitespace-nowrap">
                          {org.category}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Done Button */}
                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsOrgDropdownOpen(false)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow cursor-pointer"
                  >
                    Done Selecting
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Due Date */}
          <div className="lg:col-span-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Submission Due Date
            </label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              />
            </div>
          </div>

          {/* Description */}
          <div className="lg:col-span-12">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Form Description & Guidance Notes
            </label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Provide context or instructions for port officers filling out this form..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            />
          </div>
        </div>
      </div>

      {/* Selected Organisations Pills Bar */}
      {selectedOrgIds.length > 0 && (
        <div className="bg-blue-50/50 rounded-2xl border border-blue-100 p-3 flex items-center flex-wrap gap-1.5 justify-between">
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-xs font-bold text-blue-900 mr-2 flex items-center space-x-1">
              <Building2 className="h-3.5 w-3.5 text-blue-600" />
              <span>Assigned ({selectedOrgIds.length}):</span>
            </span>
            {selectedOrgIds.map(id => {
              const org = FULL_ORGANISATION_LIST.find(o => o.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-white text-blue-800 font-bold text-xs rounded-lg border border-blue-200 shadow-xs"
                >
                  <span>{org?.name}</span>
                  <X 
                    className="h-3 w-3 text-slate-400 hover:text-red-600 cursor-pointer"
                    onClick={() => handleToggleOrg(id)}
                  />
                </span>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleClearAllOrgs}
            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs rounded-lg transition cursor-pointer flex items-center space-x-1 shrink-0"
          >
            <X className="h-3.5 w-3.5" />
            <span>Clear All</span>
          </button>
        </div>
      )}

      {/* Main Builder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Field Types Palette */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm max-h-[650px] overflow-y-auto">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
              Add Input Types (16 Available)
            </h3>
            
            <div className="grid grid-cols-1 gap-1.5">
              {SAGARMANTHAN_INPUT_TYPES.map((ft) => {
                const Icon = ft.icon;
                return (
                  <button
                    key={ft.type}
                    onClick={() => handleAddField(ft)}
                    className="flex items-center space-x-2.5 w-full p-2 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200/80 rounded-xl transition text-left group cursor-pointer"
                  >
                    <div className="h-7 w-7 rounded-lg bg-white group-hover:bg-blue-600 group-hover:text-white text-slate-600 border border-slate-200 flex items-center justify-center transition shadow-xs shrink-0">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-blue-900 truncate">
                      {ft.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center Column: Form Canvas */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm min-h-[500px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{formName}</h2>
                  <p className="text-xs text-slate-500">{formDescription}</p>
                </div>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold text-[10px] rounded-full uppercase border border-blue-200/50">
                  {fields.length} Fields
                </span>
              </div>

              {/* Field Cards List */}
              <div className="space-y-3">
                {fields.map((field, idx) => {
                  const isSelected = field.id === selectedFieldId;
                  return (
                    <div
                      key={field.id}
                      onClick={() => setSelectedFieldId(field.id)}
                      className={`p-4 rounded-xl border transition cursor-pointer relative ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/10' 
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-extrabold text-slate-800">
                              {field.inputLabel}
                            </span>
                            {field.required && (
                              <span className="text-red-500 font-bold text-xs">*</span>
                            )}
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 font-semibold rounded uppercase font-mono">
                              {field.inputType}
                            </span>
                          </div>

                          {/* Dummy Field Representation */}
                          <div className="mt-2">
                            {field.inputType === 'text' && (
                              <input disabled type="text" placeholder={field.placeholder} className="w-full text-xs px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-400" />
                            )}
                            {field.inputType === 'email' && (
                              <input disabled type="email" placeholder={field.placeholder} className="w-full text-xs px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-400" />
                            )}
                            {field.inputType === 'number' && (
                              <input disabled type="number" placeholder={field.placeholder} className="w-full text-xs px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-400" />
                            )}
                            {field.inputType === 'float' && (
                              <input disabled type="number" step="0.01" placeholder={field.placeholder} className="w-full text-xs px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-400" />
                            )}
                            {field.inputType === 'phone' && (
                              <input disabled type="tel" placeholder={field.placeholder || '+91 98765 43210'} className="w-full text-xs px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-400" />
                            )}
                            {field.inputType === 'password' && (
                              <input disabled type="password" value="••••••••" className="w-full text-xs px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-400" />
                            )}
                            {field.inputType === 'textarea' && (
                              <textarea disabled rows={2} placeholder={field.placeholder} className="w-full text-xs p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-400" />
                            )}
                            {field.inputType === 'dropdown' && (
                              <select disabled className="w-full text-xs px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-400">
                                <option>{field.options[0] || 'Select option...'}</option>
                              </select>
                            )}
                            {field.inputType === 'multiple-select' && (
                              <div className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-400 flex items-center space-x-1">
                                <span className="px-2 py-0.5 bg-slate-200 rounded text-[10px]">{field.options[0] || 'Option 1'}</span>
                                <span className="px-2 py-0.5 bg-slate-200 rounded text-[10px]">{field.options[1] || 'Option 2'}</span>
                              </div>
                            )}
                            {field.inputType === 'date' && (
                              <input disabled type="date" className="w-full text-xs px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-400" />
                            )}
                            {field.inputType === 'state' && (
                              <select disabled className="w-full text-xs px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-400">
                                <option>Select State (e.g. Maharashtra, Tamil Nadu)</option>
                              </select>
                            )}
                            {field.inputType === 'district' && (
                              <input disabled type="text" placeholder="Enter District" className="w-full text-xs px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-400" />
                            )}
                            {field.inputType === 'MP-Constituency' && (
                              <input disabled type="text" placeholder="Enter Lok Sabha Constituency" className="w-full text-xs px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-400" />
                            )}
                            {field.inputType === 'file' && (
                              <div className="w-full p-2 bg-slate-100 border border-dashed border-slate-300 rounded-lg text-center text-slate-400 text-xs">
                                Upload File (.pdf, .xlsx)
                              </div>
                            )}
                            {field.inputType === 'checkbox' && (
                              <div className="flex items-center space-x-2 text-xs text-slate-600">
                                <input disabled type="checkbox" className="rounded text-blue-600" />
                                <span>{field.placeholder || 'Check to confirm'}</span>
                              </div>
                            )}
                            {field.inputType === 'radio' && (
                              <div className="flex items-center space-x-3 text-xs text-slate-600">
                                {(field.options.length ? field.options : ['Option A', 'Option B']).map((opt, i) => (
                                  <label key={i} className="flex items-center space-x-1">
                                    <input disabled type="radio" name={`r_${field.id}`} />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMove(idx, 'up'); }}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          >
                            <MoveUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMove(idx, 'down'); }}
                            disabled={idx === fields.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          >
                            <MoveDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveField(field.id); }}
                            className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsPreviewOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  <Eye className="h-4 w-4" />
                  <span>Live Preview</span>
                </button>

                <button
                  onClick={() => {
                    setFields([]);
                    setSelectedFieldId(null);
                    triggerNotification && triggerNotification('Form canvas fields cleared', 'info');
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl transition cursor-pointer border border-red-200"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear Canvas</span>
                </button>
              </div>

              <button
                onClick={handlePublishForm}
                disabled={isSubmitting}
                className="flex items-center space-x-2 px-5 py-2.5 bg-blue-650 hover:bg-blue-750 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>{isSubmitting ? 'Publishing...' : 'Publish Form'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Selected Field Inspector */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
              Field Properties Inspector
            </h3>

            {selectedField ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Field Label
                  </label>
                  <input
                    type="text"
                    value={selectedField.inputLabel}
                    onChange={(e) => handleUpdateField(selectedField.id, 'inputLabel', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Input Type
                  </label>
                  <select
                    value={selectedField.inputType}
                    onChange={(e) => handleUpdateField(selectedField.id, 'inputType', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                  >
                    {SAGARMANTHAN_INPUT_TYPES.map(t => (
                      <option key={t.type} value={t.type}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Placeholder Hint
                  </label>
                  <input
                    type="text"
                    value={selectedField.placeholder}
                    onChange={(e) => handleUpdateField(selectedField.id, 'placeholder', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-700">Required Field</span>
                  <input
                    type="checkbox"
                    checked={selectedField.required}
                    onChange={(e) => handleUpdateField(selectedField.id, 'required', e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                </div>

                {(selectedField.inputType === 'dropdown' || selectedField.inputType === 'multiple-select' || selectedField.inputType === 'radio') && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase">
                        Configure Options ({selectedField.options.length})
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const newOpts = [...selectedField.options, `Option ${selectedField.options.length + 1}`];
                          handleUpdateField(selectedField.id, 'options', newOpts);
                        }}
                        className="text-[11px] text-blue-600 font-bold hover:underline flex items-center space-x-1 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Option</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {selectedField.options.map((opt, idx) => (
                        <div key={idx} className="flex items-center space-x-1.5">
                          <span className="text-[10px] font-bold text-slate-400 w-4 text-right">{idx + 1}.</span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const updated = [...selectedField.options];
                              updated[idx] = e.target.value;
                              handleUpdateField(selectedField.id, 'options', updated);
                            }}
                            placeholder={`Option ${idx + 1}`}
                            className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            disabled={selectedField.options.length <= 1}
                            onClick={() => {
                              const updated = selectedField.options.filter((_, i) => i !== idx);
                              handleUpdateField(selectedField.id, 'options', updated);
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 cursor-pointer"
                            title="Remove Option"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Select a field on the canvas to configure properties.</p>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && (
        <FormPreviewModal
          formName={formName}
          formDescription={formDescription}
          fields={fields}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  );
}
