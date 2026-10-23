import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  Calendar,
  Users,
  Plus,
  Trash2,
  Building2,
  MapPin,
  Globe,
  IndianRupee,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { getCurrentUserId, getSessionOrganisationId } from '../../../utils/authSession.js';
import {
  createTrainingData,
  updateTrainingData,
  getHRStaffTransactData,
  getTrainingTitleData,
  getTrainingTypeData,
  getHRTrainingDataByID,
  getDropDownData
} from '../api.js';

export default function TrainingDataForm({ triggerNotification, onCancel }) {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.editData;

  const trainingId =
    editData?.["Training ID"] ??
    editData?.TRAINING_ID ??
    editData?.trainingId ??
    editData?.training_id ??
    editData?.id ??
    null;

  const isEdit = Boolean(trainingId);

  const [formData, setFormData] = useState({
    trainingType: '',
    trainingTitle: '',
    otherTitleName: '',
    otherTypeName: '',
    fromDate: '',
    toDate: '',
    trainingSource: '',
    outsideAgencyName: '',
    country: '',
    location: '',
    expenditure: ''
  });

  const [participants, setParticipants] = useState([
    {
      id: 1,
      staffId: '',
      name: '',
      designation: '',
      department: '',
      emp_master_id: null,
      employee_id: '',
      emp_reference_id: '',
      emp_transaction_id: null
    }
  ]);

  const [trainingTypes, setTrainingTypes] = useState([]);
  const [trainingTitles, setTrainingTitles] = useState([]);
  const [loadingTitles, setLoadingTitles] = useState(false);

  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isInhouse = formData.trainingSource === 'Inhouse';
  const isWithinCountry = formData.trainingSource === 'Outside Agency (within country)';
  const isInternational = formData.trainingSource === 'International';

  const notify = (msg, type = 'info') => {
    if (typeof triggerNotification === 'function') {
      triggerNotification(msg, type);
    } else {
      alert(msg);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: value
      };

      if (name === 'trainingType') {
        updated.trainingTitle = '';
        updated.otherTitleName = '';
        updated.otherTypeName = '';
      }

      if (name === 'trainingTitle') {
        updated.otherTitleName = '';
      }

      if (name === 'trainingSource') {
        updated.outsideAgencyName = '';
        updated.location = '';

        if (value === 'Inhouse') {
          updated.country = '';
        } else if (value === 'Outside Agency (within country)') {
          updated.country = '80';
        } else if (value === 'International') {
          updated.country = '';
        }
      }

      return updated;
    });

    if (name === 'trainingType') {
      setTrainingTitles([]);
      if (value) {
        fetchTrainingTitles(value);
      }
    }
  };

  // Fetch Country options
  useEffect(() => {
    const fetchCountries = async () => {
      setLoadingCountries(true);
      try {
        const response = await getDropDownData('mmt_country');
        const data = response?.data;
        const rows = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.recordset)
          ? data.recordset
          : [];
        setCountries(rows);
      } catch (error) {
        console.error('Error fetching countries:', error.response?.data || error.message);
        setCountries([]);
      } finally {
        setLoadingCountries(false);
      }
    };

    fetchCountries();
  }, []);

  // Fetch Training Types
  useEffect(() => {
    const fetchTrainingTypes = async () => {
      try {
        const response = await getTrainingTypeData();
        const data = response?.data;
        const rows = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.recordset)
          ? data.recordset
          : Array.isArray(data?.recordsets?.[0])
          ? data.recordsets[0]
          : [];
        setTrainingTypes(rows);
      } catch (error) {
        console.error('Error fetching training types:', error.response?.data || error.message);
        setTrainingTypes([]);
      }
    };

    fetchTrainingTypes();
  }, []);

  // Fetch Staff List
  const fetchStaff = async (orgId) => {
    if (!orgId) return;
    try {
      setLoadingStaff(true);
      const response = await getHRStaffTransactData(orgId, 0);
      const staffData = Array.isArray(response?.data) ? response.data : [];
      setStaffList(staffData);
    } catch (error) {
      console.error('Error fetching staff:', error);
      setStaffList([]);
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    const orgId = getSessionOrganisationId();
    if (orgId) {
      fetchStaff(orgId);
    }
  }, []);

  const fetchTrainingTitles = async (trainingType) => {
    const orgId = getSessionOrganisationId();
    if (!trainingType || !orgId) {
      setTrainingTitles([]);
      return;
    }

    try {
      setLoadingTitles(true);
      const response = await getTrainingTitleData(orgId, trainingType);
      const data = response?.data;
      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.recordset)
        ? data.recordset
        : Array.isArray(data?.recordsets?.[0])
        ? data.recordsets[0]
        : [];
      setTrainingTitles(rows);
    } catch (error) {
      console.error('Training Title API failed:', error.response?.data || error.message);
      setTrainingTitles([]);
    } finally {
      setLoadingTitles(false);
    }
  };

  // Load existing training record if in Edit mode
  useEffect(() => {
    const loadTrainingForEdit = async () => {
      if (!trainingId) return;

      try {
        const response = await getHRTrainingDataByID(trainingId);
        const training = response.data?.training;
        const participantRows = response.data?.participants ?? [];

        if (!training) {
          console.error('Training record not found');
          return;
        }

        const typeId = training.TRAINING_TYPE_ID ?? '';
        const titleId = training.TRAINING_TITLE_ID ?? '';

        setFormData((prev) => ({
          ...prev,
          trainingType: String(typeId),
          trainingTitle: String(titleId),
          otherTypeName: training.other_type ?? '',
          otherTitleName: training.other_title ?? '',
          fromDate: training.from_date ? String(training.from_date).slice(0, 10) : '',
          toDate: training.to_date ? String(training.to_date).slice(0, 10) : '',
          trainingSource: training.training_source ?? '',
          outsideAgencyName: training.outside_agency_name ?? '',
          country: training.country_id != null ? String(training.country_id) : '',
          location: training.location ?? '',
          expenditure: training.expenditure ?? ''
        }));

        if (typeId !== '') {
          await fetchTrainingTitles(String(typeId));
        }

        if (participantRows.length > 0) {
          setParticipants(
            participantRows.map((p, index) => ({
              id: p.emp_transaction_id ?? p.emp_master_id ?? index + 1,
              staffId: String(p.emp_reference_id ?? ''),
              name: p.emp_name ?? '',
              designation: p.emp_post_name ?? '',
              department: p.emp_department_name ?? '',
              emp_master_id: p.emp_master_id ?? null,
              employee_id: p.employee_id ?? '',
              emp_reference_id: p.emp_reference_id ?? '',
              emp_transaction_id: p.emp_transaction_id ?? null
            }))
          );
        }
      } catch (error) {
        console.error('Failed to load training for edit:', error);
      }
    };

    loadTrainingForEdit();
  }, [trainingId]);

  const handleStaffChange = (rowId, staffReferenceId) => {
    const selectedStaff = staffList.find(
      (staff) =>
        String(staff.emp_reference_id ?? staff.EMP_REFERENCE_ID ?? '') === String(staffReferenceId)
    );

    if (!selectedStaff) {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === rowId
            ? {
                ...p,
                staffId: '',
                name: '',
                designation: '',
                department: '',
                emp_master_id: null,
                employee_id: '',
                emp_reference_id: '',
                emp_transaction_id: null
              }
            : p
        )
      );
      return;
    }

    setParticipants((prev) =>
      prev.map((participant) =>
        participant.id === rowId
          ? {
              ...participant,
              staffId: String(selectedStaff.emp_reference_id ?? selectedStaff.EMP_REFERENCE_ID ?? ''),
              name: selectedStaff.emp_name ?? selectedStaff.EMP_NAME ?? selectedStaff['Employ name'] ?? '',
              designation:
                selectedStaff.emp_post_name ??
                selectedStaff.EMP_POST_NAME ??
                selectedStaff.Designation ??
                '',
              department:
                selectedStaff.emp_department_name ??
                selectedStaff.EMP_DEPARTMENT_NAME ??
                selectedStaff['Department name'] ??
                '',
              emp_master_id: selectedStaff.emp_master_id ?? selectedStaff.EMP_MASTER_ID ?? null,
              employee_id: selectedStaff.employee_id ?? selectedStaff.EMPLOYEE_ID ?? '',
              emp_reference_id: selectedStaff.emp_reference_id ?? selectedStaff.EMP_REFERENCE_ID ?? '',
              emp_transaction_id: selectedStaff.emp_transaction_id ?? selectedStaff.EMP_TRANSACTION_ID ?? null
            }
          : participant
      )
    );
  };

  const handleAddParticipant = () => {
    setParticipants((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        staffId: '',
        name: '',
        designation: '',
        department: '',
        emp_master_id: null,
        employee_id: '',
        emp_reference_id: '',
        emp_transaction_id: null
      }
    ]);
  };

  const handleRemoveParticipant = (id) => {
    if (participants.length <= 1) {
      notify('At least one participant row is required.', 'warning');
      return;
    }
    setParticipants((prev) => prev.filter((participant) => participant.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.fromDate && formData.toDate && formData.toDate < formData.fromDate) {
      notify('To Date cannot be earlier than From Date.', 'warning');
      return;
    }

    const participantData = participants
      .filter((participant) => participant.staffId)
      .map((participant) => ({
        emp_master_id: participant.emp_master_id,
        employee_id: participant.employee_id || null,
        emp_reference_id: participant.emp_reference_id || null,
        name: participant.name || '',
        designation: participant.designation || '',
        department: participant.department || '',
        emp_transaction_id: participant.emp_transaction_id || null
      }));

    if (participantData.length === 0) {
      notify('Please select a Staff ID for at least one participant.', 'warning');
      return;
    }

    const invalidParticipant = participantData.some(
      (participant) => !participant.emp_master_id || !participant.name
    );

    if (invalidParticipant) {
      notify('All selected participants must have complete staff profile records.', 'warning');
      return;
    }

    const empMasterIds = participantData.map((participant) => String(participant.emp_master_id));
    if (new Set(empMasterIds).size !== empMasterIds.length) {
      notify('The same participant cannot be added more than once.', 'warning');
      return;
    }

    const orgId = getSessionOrganisationId();
    const userId = getCurrentUserId();

    const payload = {
      trainingTitle: Number(formData.trainingTitle) || 0,
      otherTitleName: formData.otherTitleName || null,
      trainingType: Number(formData.trainingType) || 0,
      otherTypeName: formData.otherTypeName || null,
      fromDate: formData.fromDate || null,
      toDate: formData.toDate || null,
      trainingSource: formData.trainingSource || null,
      outsideAgencyName: formData.outsideAgencyName || null,
      country: formData.country ? Number(formData.country) : null,
      location: formData.location || null,
      expenditure: formData.expenditure ? Number(formData.expenditure) : 0,
      organisationID: orgId,
      userID: userId,
      participants: participantData
    };

    try {
      setIsSubmitting(true);
      let response;

      if (trainingId) {
        response = await updateTrainingData(trainingId, payload);
        notify(response?.data?.message || 'Training updated successfully.', 'success');
      } else {
        response = await createTrainingData(payload);
        notify(response?.data?.message || 'Training added successfully.', 'success');
      }

      navigate('/hr/hr-management/training-details');
    } catch (error) {
      console.error('Error saving training data:', error);
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        (trainingId ? 'Failed to update training.' : 'Failed to add training.');
      notify(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (typeof onCancel === 'function') {
      onCancel();
    } else {
      navigate('/hr/hr-management/training-details');
    }
  };

  return (
    <div className="animate-fade-in text-slate-800 dark:text-slate-100">
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* SECTION 1: Training Classification & Overview */}
        <div>
          <div className="flex items-center gap-2 pb-2.5 mb-4 border-b border-slate-200 dark:border-slate-800">
            <GraduationCap className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
            <h4 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400">
              Training Program Information
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Training Type */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Training Type <span className="text-red-500">*</span>
              </label>
              <select
                name="trainingType"
                value={formData.trainingType}
                onChange={handleChange}
                required
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#0f417a] dark:focus:border-blue-500 font-semibold text-slate-800 dark:text-slate-100 transition-all cursor-pointer shadow-xs"
              >
                <option value="">-- Select Training Type --</option>
                {trainingTypes.map((type) => (
                  <option key={type.TRAINING_TYPE_ID} value={type.TRAINING_TYPE_ID}>
                    {type.TRAINING_TYPE_NAME}
                  </option>
                ))}
                <option value="0">Others</option>
              </select>
            </div>

            {/* Other Training Type (Conditional) */}
            {String(formData.trainingType) === '0' && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Specify Other Type <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="otherTypeName"
                  value={formData.otherTypeName}
                  onChange={handleChange}
                  required
                  placeholder="Enter other training type"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#0f417a] dark:focus:border-blue-500 font-semibold text-slate-800 dark:text-slate-100 transition-all shadow-xs"
                />
              </div>
            )}

            {/* Training Title */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Training Title <span className="text-red-500">*</span>
              </label>
              <select
                name="trainingTitle"
                value={formData.trainingTitle}
                onChange={handleChange}
                required
                disabled={!formData.trainingType || loadingTitles}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#0f417a] dark:focus:border-blue-500 font-semibold text-slate-800 dark:text-slate-100 transition-all cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">
                  {loadingTitles
                    ? 'Loading titles...'
                    : !formData.trainingType
                    ? '-- Select Training Type First --'
                    : '-- Select Training Title --'}
                </option>
                {trainingTitles.map((title) => (
                  <option key={title.TRAINING_TITLE_ID} value={title.TRAINING_TITLE_ID}>
                    {title.TITLE}
                  </option>
                ))}
                <option value="0">Others</option>
              </select>
            </div>

            {/* Other Training Title (Conditional) */}
            {String(formData.trainingTitle) === '0' && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Specify Other Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="otherTitleName"
                  value={formData.otherTitleName}
                  onChange={handleChange}
                  required
                  placeholder="Enter other training title"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#0f417a] dark:focus:border-blue-500 font-semibold text-slate-800 dark:text-slate-100 transition-all shadow-xs"
                />
              </div>
            )}

            {/* Training Source */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Training Source <span className="text-red-500">*</span>
              </label>
              <select
                name="trainingSource"
                value={formData.trainingSource}
                onChange={handleChange}
                required
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#0f417a] dark:focus:border-blue-500 font-semibold text-slate-800 dark:text-slate-100 transition-all cursor-pointer shadow-xs"
              >
                <option value="">-- Select Training Source --</option>
                <option value="Inhouse">Inhouse</option>
                <option value="Outside Agency (within country)">Outside Agency (within country)</option>
                <option value="International">International</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: Schedule & Logistics */}
        <div>
          <div className="flex items-center gap-2 pb-2.5 mb-4 border-b border-slate-200 dark:border-slate-800">
            <Clock className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
            <h4 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400">
              Schedule & Location Logistics
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* From Date */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                From Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="fromDate"
                value={formData.fromDate}
                onChange={handleChange}
                required
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#0f417a] dark:focus:border-blue-500 font-semibold text-slate-800 dark:text-slate-100 transition-all shadow-xs"
              />
            </div>

            {/* To Date */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                To Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="toDate"
                value={formData.toDate}
                onChange={handleChange}
                required
                min={formData.fromDate || undefined}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#0f417a] dark:focus:border-blue-500 font-semibold text-slate-800 dark:text-slate-100 transition-all shadow-xs"
              />
            </div>

            {/* Name of Agency (Domestic Outside Agency only) */}
            {isWithinCountry && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Name of Outside Agency <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    name="outsideAgencyName"
                    value={formData.outsideAgencyName}
                    onChange={handleChange}
                    required
                    placeholder="Enter outside agency name"
                    className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#0f417a] dark:focus:border-blue-500 font-semibold text-slate-800 dark:text-slate-100 transition-all shadow-xs"
                  />
                </div>
              </div>
            )}

            {/* Country (Domestic & International) */}
            {(isWithinCountry || isInternational) && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Country <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    name="country"
                    value={formData.country || ''}
                    onChange={handleChange}
                    disabled={loadingCountries || isWithinCountry}
                    required
                    className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#0f417a] dark:focus:border-blue-500 font-semibold text-slate-800 dark:text-slate-100 transition-all cursor-pointer shadow-xs disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {loadingCountries ? 'Loading countries...' : '-- Select Country --'}
                    </option>
                    {countries
                      .filter((country) => (isWithinCountry ? String(country.id) === '80' : true))
                      .map((country) => (
                        <option key={country.id} value={String(country.id)}>
                          {country.country}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {/* Location (Domestic & International) */}
            {(isWithinCountry || isInternational) && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Location / City <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    required
                    placeholder="Enter city or center location"
                    className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#0f417a] dark:focus:border-blue-500 font-semibold text-slate-800 dark:text-slate-100 transition-all shadow-xs"
                  />
                </div>
              </div>
            )}

            {/* Expenditure */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Expenditure (₹ in Lakh) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="expenditure"
                  value={formData.expenditure}
                  onChange={handleChange}
                  required
                  placeholder="0.00"
                  className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#0f417a] dark:focus:border-blue-500 font-semibold text-slate-800 dark:text-slate-100 transition-all shadow-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Participant Nominations */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Users className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
              <h4 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400">
                Participant Nominations
              </h4>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-[#0f417a] dark:bg-blue-900/40 dark:text-blue-300">
                {participants.filter((p) => p.staffId).length} / {participants.length} Nominated
              </span>
            </div>

            <button
              type="button"
              onClick={handleAddParticipant}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Participant</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs bg-white dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-3.5 w-12 text-center">#</th>
                    <th className="py-3 px-3.5 min-w-[220px]">Staff ID / Personnel No. <span className="text-red-500">*</span></th>
                    <th className="py-3 px-3.5 min-w-[180px]">Employee Name</th>
                    <th className="py-3 px-3.5 min-w-[160px]">Designation</th>
                    <th className="py-3 px-3.5 min-w-[160px]">Department</th>
                    <th className="py-3 px-3.5 w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {participants.map((participant, index) => (
                    <tr
                      key={participant.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3.5 text-center font-bold text-slate-500 text-xs">
                        {index + 1}
                      </td>

                      <td className="py-2.5 px-3.5">
                        <select
                          value={participant.staffId}
                          onChange={(e) => handleStaffChange(participant.id, e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#0f417a] transition-all cursor-pointer shadow-xs"
                        >
                          <option value="">
                            {loadingStaff ? 'Loading staff records...' : '-- Select Staff ID --'}
                          </option>
                          {staffList.map((staff) => (
                            <option
                              key={`${staff.emp_master_id}-${staff.emp_transaction_id ?? staff.emp_reference_id}`}
                              value={staff.emp_reference_id}
                            >
                              {staff.emp_reference_id} - {staff.emp_name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-2.5 px-3.5">
                        <div className="w-full px-3 py-2 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 font-semibold text-xs truncate">
                          {participant.name || <span className="text-slate-400 font-normal italic">Auto-filled</span>}
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5">
                        <div className="w-full px-3 py-2 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 font-semibold text-xs truncate">
                          {participant.designation || <span className="text-slate-400 font-normal italic">Auto-filled</span>}
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5">
                        <div className="w-full px-3 py-2 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 font-semibold text-xs truncate">
                          {participant.department || <span className="text-slate-400 font-normal italic">Auto-filled</span>}
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5 text-center">
                        {participants.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveParticipant(participant.id)}
                            title="Remove participant"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-xs font-bold select-none">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SECTION 4: Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <span className="text-xs text-rose-500 font-bold italic">
            * Asterisks marked with red are mandatory fields
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4.5 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Discard / Exit</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md cursor-pointer ${
                isSubmitting
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-[#0f417a] hover:bg-[#1a5ba3] shadow-blue-900/10 hover:shadow-lg'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{isEdit ? 'Update Training' : 'Submit Training'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
