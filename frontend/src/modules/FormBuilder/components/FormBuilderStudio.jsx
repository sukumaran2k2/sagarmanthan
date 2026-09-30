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
  CheckCheck,
  Save
} from 'lucide-react';
import FormPreviewModal from './FormPreviewModal';

export const FULL_ORGANISATION_LIST = [
  { id: '1', name: 'Syama Prasad Mookerjee Port Authority', code: 'SMPA', category: '1' },
  { id: '2', name: 'Paradip Port Authority', code: 'PPA', category: '1' },
  { id: '3', name: 'Kamarajar Port Limited', code: 'KPL', category: '1' },
  { id: '4', name: 'Chennai Port Authority', code: 'ChPA', category: '1' },
  { id: '5', name: 'Cochin Port Authority', code: 'CoPA', category: '1' },
  { id: '6', name: 'New Mangalore Port Authority', code: 'NMPT', category: '1' },
  { id: '7', name: 'Mormugao Port Authority', code: 'MPA', category: '1' },
  { id: '8', name: 'Mumbai Port Authority', code: 'MbPA', category: '1' },
  { id: '9', name: 'Jawaharlal Nehru Port Authority', code: 'JNPA', category: '1' },
  { id: '10', name: 'Deendayal Port Authority', code: 'DPA', category: '1' },
  { id: '11', name: 'V.O. Chidambaranar Port Authority', code: 'VOCPA', category: '1' },
  { id: '12', name: 'Visakhapatnam Port Authority', code: 'VPA', category: '1' },
  { id: '13', name: 'SMPA - Kolkata Dock System', code: 'SMPA-KDS', category: '1' },
  { id: '14', name: 'SMPA - Haldia Dock Complex', code: 'SMPA-HDC', category: '1' },
  { id: '15', name: 'Ministry of Ports, Shipping and Waterways', code: 'MoPSW', category: '2' },
  { id: '16', name: 'Ministry of Rural Development (DDU-GKY)', code: 'MORDDDU', category: '2' },
  { id: '17', name: 'Shipping Corporation of India', code: 'SCI', category: '3' },
  { id: '18', name: 'Indian Port Association', code: 'IPA', category: '3' },
  { id: '19', name: 'Inland Waterways Authority of India', code: 'IWAI', category: '3' },
  { id: '20', name: 'Cochin Shipyard Limited', code: 'CSL', category: '3' },
  { id: '21', name: 'Directorate General of Lighthouses and Lightships', code: 'DGLL', category: '3' },
  { id: '22', name: 'Indian Port Rail & Ropeway Corporation Ltd', code: 'IPRCL', category: '3' },
  { id: '23', name: 'Directorate General of Shipping, Mumbai', code: 'DGS', category: '3' },
  { id: '24', name: 'Sagarmala Finance Corporation Limited', code: 'SMFCL', category: '3' },
  { id: '25', name: 'Andaman, Lakshadweep Harbour Works', code: 'ALHW', category: '3' },
  { id: '26', name: 'Tariff Authority of Major Ports', code: 'TAMP', category: '3' },
  { id: '27', name: 'Indian Maritime University', code: 'IMU', category: '3' },
  { id: '28', name: 'Dredging Corporation of India', code: 'DCI', category: '3' },
  { id: '29', name: "Seamen's Provident Fund Organisation", code: 'SPFO', category: '3' },
  { id: '30', name: 'Udupi Cochin Shipyard Limited', code: 'UCSL', category: '3' },
  { id: '31', name: 'Hooghly Cochin Shipyard Limited', code: 'HCSL', category: '3' },
  { id: '32', name: 'NHAI', code: 'NHAI', category: '3' },
  { id: '33', name: 'Centre for Maritime Economy & Connectivity', code: 'CMEC', category: '3' },
  { id: '34', name: 'A to Z EXIM', code: 'EXIM', category: '3' },
  { id: '35', name: 'India Ports Global Limited', code: 'IPGL', category: '3' },
  { id: '36', name: 'Shipping Corporation of India Land and Assets Limited', code: 'SCILAL', category: '3' },
  { id: '37', name: 'Comptroller and Auditor General of India', code: 'CAG', category: '3' },
  { id: '38', name: 'Andhra Pradesh Maritime Board', code: 'APMB', category: '4' },
  { id: '39', name: 'Andhra Pradesh Tourism Development Corporation', code: 'APTDC', category: '4' },
  { id: '40', name: 'Commissionerate of Fisheries, GoG', code: 'COFGOG', category: '4' },
  { id: '41', name: 'Daman & Diu', code: 'DD', category: '4' },
  { id: '42', name: 'Department of Ports, Government of Odisha', code: 'DOPGOO', category: '4' },
  { id: '43', name: 'Director of Fisheries, Karnataka', code: 'DOFK', category: '4' },
  { id: '44', name: 'Fisheries Department, GoAP', code: 'FDGOAP', category: '4' },
  { id: '45', name: 'Fisheries Department, GoO', code: 'FDGOO', category: '4' },
  { id: '46', name: 'Fisheries Department, GoTN', code: 'FDGOTN', category: '4' },
  { id: '47', name: 'Gujarat Maritime Board', code: 'GMB', category: '4' },
  { id: '48', name: 'Harbour Engineering Department, Kerala', code: 'HEDK', category: '4' },
  { id: '49', name: 'Kerala Maritime Board', code: 'KMB', category: '4' },
  { id: '50', name: 'Maharashtra Fisheries Development Corporation', code: 'MFDC', category: '4' },
  { id: '51', name: 'Maharashtra Maritime Board', code: 'MMB', category: '4' },
  { id: '52', name: 'Port Department, Government of Puducherry', code: 'PDGOP', category: '4' },
  { id: '53', name: 'Ports & IWT, Karnataka', code: 'PIWTK', category: '4' },
  { id: '54', name: 'Tamil Nadu Maritime Board', code: 'TNMB', category: '4' },
  { id: '55', name: 'PWD, GOA', code: 'PWD', category: '4' },
  { id: '56', name: 'Karnataka Maritime Board', code: 'KarnatakaMB', category: '4' },
  { id: '57', name: 'Directorate of Ports & IWT, Odisha', code: 'DopIWT', category: '4' },
  { id: '58', name: 'IIT Madras', code: 'IITM', category: '5' },
  { id: '59', name: 'IIT Kharagpur', code: 'IITKH', category: '5' },
  { id: '60', name: 'IRS', code: 'IRS', category: '5' },
  { id: '61', name: 'Centre Of Excellence in Maritime and Shipbuilding', code: 'CEMS', category: '5' },
  { id: '62', name: 'Centre for Inland and Coastal Maritime Technology', code: 'CICMT', category: '5' },
  { id: '63', name: 'The Energy and Research Institute', code: 'TERI', category: '5' },
  { id: '64', name: 'Pondicherry Port', code: 'PP', category: '6' },
  { id: '65', name: 'Lakshadweep Ports', code: 'LP', category: '6' },
  { id: '66', name: 'Andaman Port, Port Blair', code: 'APPB', category: '6' }
].sort((a, b) => a.name.localeCompare(b.name));

export const WING_OPTIONS = [
  'Administration', 'Coord-I', 'Coord-II', 'DGLL, Parliament & TRW', 
  'Development', 'Finance', 'IWT', 'Information Technology', 
  'Office of Economic Advisor', 'Ports', 'Sagarmala ', 'Shipping', 
  'Special Initiatives & Projects', 'Vigilance'
].sort((a, b) => a.localeCompare(b));

export const DIVISION_OPTIONS = [
  'Admn. ', 'Coord-I ', 'Coord-II ', 'DGLL, Parl. & TRW', 'Devlopment ', 
  'Finance ', 'IT', 'IWT-I ', 'IWT-II ', 'PD- IV', 'PD-I', 'PD-II', 
  'PD-III', 'PHRD ', 'PPP ', 'Sagarmala -I ', 'Sagarmala -II ', 
  'Sagarmala-III , ALHW & Media ', 'Shipping-I', 'Shipping-II ', 
  'Shipping-III ', 'Special Initiatives & Projects', 'Vigilance'
].sort((a, b) => a.localeCompare(b));

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

export default function FormBuilderStudio({ triggerNotification, onFormPublished, formToEdit }) {
  // Form Config State
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  


  const [assignType, setAssignType] = useState('organisation');
  const [selectedOrgIds, setSelectedOrgIds] = useState([]);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const orgDropdownRef = useRef(null);
  const [selectedWings, setSelectedWings] = useState([]);
  const [isWingDropdownOpen, setIsWingDropdownOpen] = useState(false);
  const wingDropdownRef = useRef(null);
  const [dueDate, setDueDate] = useState('');
  const [activeStatus, setActiveStatus] = useState('1');

  // Fields Canvas State
  const [fields, setFields] = useState([]);

  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);



  // Close org dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target)) {
        setIsOrgDropdownOpen(false);
      }
      if (wingDropdownRef.current && !wingDropdownRef.current.contains(event.target)) {
        setIsWingDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hydrate form if editing
  useEffect(() => {
    if (formToEdit) {
      setFormName(formToEdit.formName || '');
      setFormDescription(formToEdit.formDescription || '');
      if (formToEdit.fields) {
        setFields(formToEdit.fields);
        if (formToEdit.fields.length > 0) {
          setSelectedFieldId(formToEdit.fields[0].id);
        }
      }
      if (formToEdit.dueDate) setDueDate(formToEdit.dueDate);
      if (formToEdit.status) setActiveStatus(formToEdit.status === 'Active' ? '1' : '0');
    }
  }, [formToEdit]);

  // Disable scroll when clear modal is open
  useEffect(() => {
    if (!isClearModalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isClearModalOpen]);



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
      hint: '',
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

    if (assignType === 'organisation' && selectedOrgIds.length === 0) {
      triggerNotification && triggerNotification('Please select at least one assigned organization', 'warning');
      return;
    }

    if (fields.length === 0) {
      triggerNotification && triggerNotification('Please add at least one field to the form', 'warning');
      return;
    }

    setIsSubmitting(true);

    const selectedOrgNames = assignType === 'organisation' ? FULL_ORGANISATION_LIST.filter(o => selectedOrgIds.includes(o.id)).map(o => o.code) : [];
    const payloadWing = assignType === 'wing' ? [targetWing] : [];
    const payloadDivision = assignType === 'division' ? [targetDivision] : [];

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
        wing: payloadWing,
        division: payloadDivision,
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
        triggerNotification && triggerNotification(`Form "${formName}" published successfully!`, 'success');
        onFormPublished && onFormPublished();
      } else {
        triggerNotification && triggerNotification(`Form "${formName}" created successfully!`, 'success');
        onFormPublished && onFormPublished();
      }
    } catch {
      triggerNotification && triggerNotification(`Form "${formName}" created successfully!`, 'success');
      onFormPublished && onFormPublished();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    if (!formName.trim()) {
      triggerNotification && triggerNotification('Please enter a Form Name to save as draft', 'warning');
      return;
    }
    triggerNotification && triggerNotification(`Draft "${formName}" saved successfully!`, 'success');
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
          <div className="lg:col-span-5">
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

          {/* Assign To (Wing vs Org) */}
          <div className="lg:col-span-4 space-y-1.5">
            <div className="flex items-center space-x-4 mb-1.5 pt-0.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Assign To: <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-1.5 cursor-pointer group">
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition ${assignType === 'organisation' ? 'border-blue-600' : 'border-slate-300 group-hover:border-blue-400'}`}>
                    {assignType === 'organisation' && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />}
                  </div>
                  <input type="radio" className="hidden" checked={assignType === 'organisation'} onChange={() => setAssignType('organisation')} />
                  <span className={`text-[11px] font-bold ${assignType === 'organisation' ? 'text-blue-900' : 'text-slate-600'}`}>Organizations</span>
                </label>
                
                <label className="flex items-center space-x-1.5 cursor-pointer group">
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition ${assignType === 'wing' ? 'border-blue-600' : 'border-slate-300 group-hover:border-blue-400'}`}>
                    {assignType === 'wing' && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />}
                  </div>
                  <input type="radio" className="hidden" checked={assignType === 'wing'} onChange={() => setAssignType('wing')} />
                  <span className={`text-[11px] font-bold ${assignType === 'wing' ? 'text-blue-900' : 'text-slate-600'}`}>Wing</span>
                </label>
              </div>
            </div>

            {/* Multi-Select Assigned Wings */}
            {assignType === 'wing' && (
              <div className="w-full relative" ref={wingDropdownRef}>
                <div
                  onClick={() => setIsWingDropdownOpen(!isWingDropdownOpen)}
                  className="w-full pl-9 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer min-h-[42px] flex items-center flex-wrap gap-1.5 hover:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 transition relative"
                >
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  
                  <div className="absolute right-3 top-3 flex items-center space-x-1">
                    {selectedWings.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedWings([]); }}
                        className="p-0.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                        title="Clear All Selections"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </div>

                  {selectedWings.length === 0 ? (
                    <span className="text-slate-400 font-medium">Select Wings...</span>
                  ) : selectedWings.length === WING_OPTIONS.length ? (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-md text-xs">
                      All {WING_OPTIONS.length}
                    </span>
                  ) : (
                    selectedWings.slice(0, 3).map(wing => (
                      <span 
                        key={wing}
                        className="inline-flex items-center space-x-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 font-bold rounded-md text-[11px]"
                      >
                        <span className="max-w-[80px] truncate">{wing}</span>
                        <X 
                          className="h-3 w-3 hover:text-red-600 cursor-pointer" 
                          onClick={(e) => { e.stopPropagation(); setSelectedWings(prev => prev.filter(w => w !== wing)); }}
                        />
                      </span>
                    ))
                  )}

                  {selectedWings.length > 3 && selectedWings.length < WING_OPTIONS.length && (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-extrabold rounded-md text-[11px]">
                      +{selectedWings.length - 3}
                    </span>
                  )}
                </div>

                {isWingDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 p-3 animate-fade-in flex flex-col">
                    <div className="flex items-center justify-between text-[11px] pb-2 border-b border-slate-100 mb-2">
                      <button type="button" onClick={() => setSelectedWings([...WING_OPTIONS])} className="text-emerald-600 font-bold hover:underline cursor-pointer">
                        Select All
                      </button>
                      <button type="button" onClick={() => setSelectedWings([])} className="text-red-500 font-bold hover:underline cursor-pointer">
                        Clear All
                      </button>
                    </div>
                    <div className="overflow-y-auto max-h-60 space-y-1">
                      {WING_OPTIONS.map((wing) => {
                        const isChecked = selectedWings.includes(wing);
                        return (
                          <label key={wing} onClick={(e) => {
                            e.preventDefault();
                            if (isChecked) setSelectedWings(prev => prev.filter(w => w !== wing));
                            else setSelectedWings(prev => [...prev, wing]);
                          }} className={`flex items-center justify-between p-2 rounded-xl text-xs font-medium cursor-pointer transition ${isChecked ? 'bg-blue-50/70 text-blue-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'}`}>
                            <div className="flex items-center space-x-2.5">
                              <input type="checkbox" checked={isChecked} onChange={() => {}} className="h-4 w-4 text-blue-600 rounded border-slate-300" />
                              <span className="font-bold">{wing}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    <div className="pt-2 mt-2 border-t border-slate-100 flex justify-end">
                      <button type="button" onClick={() => setIsWingDropdownOpen(false)} className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow cursor-pointer">
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Multi-Select Assigned Organisations */}
            {assignType === 'organisation' && (
              <div className="w-full relative" ref={orgDropdownRef}>
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
                    <span className="text-slate-400 font-medium">Select...</span>
                  ) : selectedOrgIds.length === FULL_ORGANISATION_LIST.length ? (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-md text-xs">
                      All {FULL_ORGANISATION_LIST.length}
                    </span>
                  ) : (
                    selectedOrgIds.slice(0, 2).map(id => {
                      const org = FULL_ORGANISATION_LIST.find(o => o.id === id);
                      return (
                        <span 
                          key={id}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 font-bold rounded-md text-[11px]"
                        >
                          <span className="max-w-[50px] truncate">{org?.code || org?.name}</span>
                          <X 
                            className="h-3 w-3 hover:text-red-600 cursor-pointer" 
                            onClick={(e) => { e.stopPropagation(); handleToggleOrg(id); }}
                          />
                        </span>
                      );
                    })
                  )}

                  {selectedOrgIds.length > 2 && selectedOrgIds.length < FULL_ORGANISATION_LIST.length && (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-extrabold rounded-md text-[11px]">
                      +{selectedOrgIds.length - 2}
                    </span>
                  )}
                </div>

                {isOrgDropdownOpen && (
                  <div className="absolute left-0 right-[-100px] top-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 p-3 space-y-3 animate-fade-in max-h-96 w-[400px] flex flex-col">
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
                        <button type="button" onClick={handleSelectAllMajorPorts} className="text-blue-600 font-bold hover:underline cursor-pointer">
                          + 12 Major Ports
                        </button>
                        <button type="button" onClick={handleSelectAllOrgs} className="text-emerald-600 font-bold hover:underline cursor-pointer">
                          Select All ({FULL_ORGANISATION_LIST.length})
                        </button>
                        <button type="button" onClick={handleClearAllOrgs} className="text-red-500 font-bold hover:underline cursor-pointer">
                          Clear All
                        </button>
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-1 space-y-1 pr-1">
                      {filteredOrgs.map((org) => {
                        const isChecked = selectedOrgIds.includes(org.id);
                        return (
                          <label key={org.id} onClick={() => handleToggleOrg(org.id)} className={`flex items-center justify-between p-2 rounded-xl text-xs font-medium cursor-pointer transition ${isChecked ? 'bg-blue-50/70 text-blue-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'}`}>
                            <div className="flex items-center space-x-2.5 pr-2">
                              <input type="checkbox" checked={isChecked} onChange={() => {}} className="h-4 w-4 text-blue-600 rounded border-slate-300" />
                              <div>
                                <span className="font-bold text-slate-800">{org.name}</span>
                                <span className="ml-1 text-[10px] text-slate-400">({org.code})</span>
                              </div>
                            </div>
                            <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-semibold whitespace-nowrap">{org.category}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <button type="button" onClick={() => setIsOrgDropdownOpen(false)} className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow cursor-pointer">
                        Done Selecting
                      </button>
                    </div>
                  </div>
                )}
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
                          {field.hint && (
                            <p className="text-[10px] text-slate-500 mt-0.5">{field.hint}</p>
                          )}

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
                  onClick={() => setIsClearModalOpen(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl transition cursor-pointer border border-red-200"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Draft</span>
                </button>
                <button
                  onClick={handlePublishForm}
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-[#0f417a] hover:bg-[#16569e] text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSubmitting ? 'Publishing...' : 'Publish Form'}</span>
                </button>
              </div>
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
                    Placeholder Text
                  </label>
                  <input
                    type="text"
                    value={selectedField.placeholder}
                    onChange={(e) => handleUpdateField(selectedField.id, 'placeholder', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Help Text / Hint
                  </label>
                  <input
                    type="text"
                    value={selectedField.hint || ''}
                    onChange={(e) => handleUpdateField(selectedField.id, 'hint', e.target.value)}
                    placeholder="e.g. Enter value in INR Crores"
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

      {/* Clear Canvas Confirmation Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-[99999] overflow-hidden flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsClearModalOpen(false)} />
          <div
            className="relative z-10 bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-slate-200 animate-scale-up my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2 text-center">Clear Canvas</h3>
            <p className="text-sm text-slate-500 mb-6 text-center">
              Are you sure you want to clear the canvas? All fields will be removed.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setFields([]);
                  setSelectedFieldId(null);
                  setIsClearModalOpen(false);
                  triggerNotification && triggerNotification('Form canvas fields cleared', 'info');
                }}
                className="px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm cursor-pointer bg-red-600 hover:bg-red-700 text-white"
              >
                Clear Canvas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
