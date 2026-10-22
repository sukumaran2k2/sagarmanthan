import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { getCurrentUserId,getSessionOrganisationId } from '../../../utils/authSession.js';
import {
  createTrainingData,
  updateTrainingData,
  getHRStaffTransactData,
  getTrainingTitleData,
  getTrainingTypeData,
  getHRTrainingDataByID,
  getDropDownData
} from '../api.js';

let organisationID = getSessionOrganisationId();

export default function TrainingDataForm({ triggerNotification }) {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.editData;

  const trainingId =
  editData?.["Training ID"] ??
  editData?.TRAINING_ID ??
  editData?.trainingId ??
  null;

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

const isInhouse = formData.trainingSource === 'Inhouse';
const isWithinCounryt = formData.trainingSource === 'Outside Agency (within country)';
const isInternational = formData.trainingSource === 'International';

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
    fetchTrainingTitles(value);
  }
};

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
            console.error(
                'Error fetching countries:',
                error.response?.data || error.message
            );
            setCountries([]);
        } finally {
            setLoadingCountries(false);
        }
    };

    fetchCountries();
}, []);

useEffect(() => {
  const loadTrainingForEdit = async () => {
    if (!trainingId) return;

    try {
      const response = await getHRTrainingDataByID(trainingId);

      const training = response.data?.training;
      const participantRows = response.data?.participants ?? [];

      if (!training) {
        console.error("Training record not found");
        return;
      }

      const typeId = training.TRAINING_TYPE_ID ?? "";
      const titleId = training.TRAINING_TITLE_ID ?? "";

      setFormData((prev) => ({
        ...prev,
        trainingType: String(typeId),
        trainingTitle: String(titleId),
        otherTypeName: training.other_type ?? "",
        otherTitleName: training.other_title ?? "",
        fromDate: training.from_date ? String(training.from_date).slice(0, 10) : "",
        toDate: training.to_date ? String(training.to_date).slice(0, 10) : "",
        trainingSource: training.training_source ?? "",
        outsideAgencyName: training.outside_agency_name ?? "",
        country: training.country_id != null ? String(training.country_id) : "",
        location: training.location ?? "",
        expenditure: training.expenditure ?? "",

      }));

      if (typeId !== "") {
        await fetchTrainingTitles(String(typeId));
      }

      setParticipants(
        participantRows.map((p, index) => ({
          id: p.emp_transaction_id ?? p.emp_master_id ?? index + 1,
          staffId: String(p.emp_reference_id ?? ""),
          name: p.emp_name ?? "",
          designation: p.emp_post_name ?? "",
          department: p.emp_department_name ?? "",
          emp_master_id: p.emp_master_id ?? null,
          employee_id: p.employee_id ?? "",
          emp_reference_id: p.emp_reference_id ?? "",
          emp_transaction_id: p.emp_transaction_id ?? null
        }))
      );
    } catch (error) {
      console.error("Failed to load training for edit:", error);
    }
  };

  loadTrainingForEdit();
}, [trainingId]);

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
const fetchTrainingTitles = async (trainingType) => {
  const organisationID = getSessionOrganisationId();

  if (!trainingType || !organisationID) {
    setTrainingTitles([]);
    return;
  }

  try {
    setLoadingTitles(true);

    const response = await getTrainingTitleData(
      organisationID,
      trainingType
    );

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
    console.error( 'Training Title API failed:', error.response?.data || error.message );
    setTrainingTitles([]);
  } finally {
    setLoadingTitles(false);
  }
};

const fetchStaff = async (organisationID) => {
  try {
    setLoadingStaff(true);

    const response = await getHRStaffTransactData(
      organisationID,
      0
    );

    const staffData = Array.isArray(response?.data)
      ? response.data
      : [];

    setStaffList(staffData);

  } catch (error) {
    console.error("Error fetching staff:", error);
    setStaffList([]);
  } finally {
    setLoadingStaff(false);
  }
};

  useEffect(() => {
    const organisationID = getSessionOrganisationId();

    if (!organisationID) {
        return;
    }

    fetchStaff(organisationID);
}, []);

const handleStaffChange = (rowId, staffReferenceId) => {
  const selectedStaff = staffList.find(
    staff =>
      String(
        staff.emp_reference_id ??
        staff.EMP_REFERENCE_ID ??
        ""
      ) === String(staffReferenceId)
  );

  if (!selectedStaff) {
    console.warn("Staff not found:", staffReferenceId);
    return;
  }

  setParticipants(prev =>
    prev.map(participant =>
      participant.id === rowId
        ? {
            ...participant,
            staffId: String(
              selectedStaff.emp_reference_id ??
              selectedStaff.EMP_REFERENCE_ID ??
              ""
            ),
            name:
              selectedStaff.emp_name ??
              selectedStaff.EMP_NAME ??
              selectedStaff["Employ name"] ??
              "",
            designation:
              selectedStaff.emp_post_name ??
              selectedStaff.EMP_POST_NAME ??
              selectedStaff.Designation ??
              "",
            department:
              selectedStaff.emp_department_name ??
              selectedStaff.EMP_DEPARTMENT_NAME ??
              selectedStaff["Department name"] ??
              "",
            emp_master_id:
              selectedStaff.emp_master_id ??
              selectedStaff.EMP_MASTER_ID ??
              null,
            employee_id:
              selectedStaff.employee_id ??
              selectedStaff.EMPLOYEE_ID ??
              "",
            emp_reference_id:
              selectedStaff.emp_reference_id ??
              selectedStaff.EMP_REFERENCE_ID ??
              "",
            emp_transaction_id:
              selectedStaff.emp_transaction_id ??
              selectedStaff.EMP_TRANSACTION_ID ??
              null
          }
        : participant
    )
  );
};

const handleAddParticipant = () => {
    setParticipants(prev => [
        ...prev,
        {
            id: Date.now(),
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
    setParticipants(prev =>
        prev.filter(participant => participant.id !== id)
    );
};

  const addParticipant = () => {
    const newId = participants.length > 0 ? Math.max(...participants.map(p => p.id)) + 1 : 1;
    setParticipants(prev => [...prev, { id: newId, staffId: '', name: '', designation: '', department: '' }]);
  };


const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const organisationID = getSessionOrganisationId();
    const userID = getCurrentUserId();

    if (
      formData.fromDate &&
      formData.toDate &&
      formData.toDate < formData.fromDate
    ) {
      alert("To Date cannot be earlier than From Date.");
      return;
    }

    const participantData = participants
      .filter((participant) => participant.staffId)
      .map((participant) => ({
        emp_master_id: participant.emp_master_id,
        employee_id: participant.employee_id || null,
        emp_reference_id: participant.emp_reference_id || null,
        name: participant.name || "",
        designation: participant.designation || "",
        department: participant.department || "",
        emp_transaction_id: participant.emp_transaction_id || null
      }));

    if (participantData.length === 0) {
      alert("Please add at least one participant.");
      return;
    }

    const invalidParticipant = participantData.some(
      (participant) =>
        !participant.emp_master_id ||
        !participant.name
    );

    if (invalidParticipant) {
      alert("All participant fields must be filled.");
      return;
    }

    const empMasterIds = participantData.map(
      (participant) => String(participant.emp_master_id)
    );

    if (new Set(empMasterIds).size !== empMasterIds.length) {
      alert("Same participant cannot be added more than once.");
      return;
    }

    const payload = {
      trainingTitle: Number(formData.trainingTitle) || 0,
      otherTitleName: formData.otherTitleName || null,
      trainingType: Number(formData.trainingType) || 0,
      otherTypeName: formData.otherTypeName || null,
      fromDate: formData.fromDate || null,
      toDate: formData.toDate || null,
      trainingSource: formData.trainingSource || null,
      outsideAgencyName: formData.outsideAgencyName || null,
      country: formData.country || null,
      location: formData.location || null,
      expenditure: Number(formData.expenditure) || 0,
      organisationID: Number(organisationID),
      userID: Number(userID),
      numberOfParticipant: participantData.length,
      participantData
    };

    let response;

    if (trainingId) {
      response = await updateTrainingData(
        trainingId,
        payload
      );

      alert(
        response?.data?.message ||
        "Training updated successfully."
      );
    } else {
      response = await createTrainingData(payload);

      alert(
        response?.data?.message ||
        "Training added successfully."
      );
    }

    navigate("/hr/hr-management/training-details");

  } catch (error) {
    console.error("Error saving training data:", error);

    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      (trainingId
        ? "Failed to update training."
        : "Failed to add training.");

    alert(message);
  }
};

  return (
    <div className="animate-fade-in text-slate-800 dark:text-slate-100">
      <h2 className="text-xl font-bold mb-6 pb-2 border-b border-slate-200 dark:border-slate-800">
        {trainingId ? 'Update Training Data' : 'Add Training Data'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Top Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
              Training Type<span className="text-red-500 ml-0.5">*</span>
            </label>
            <select 
              name="trainingType"
              value={formData.trainingType}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
             <option value="">-- Select Training Type --</option>

            {trainingTypes.map(type => (
              <option
                key={type.TRAINING_TYPE_ID}
                value={type.TRAINING_TYPE_ID}
              >
                {type.TRAINING_TYPE_NAME}
              </option>
            ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
              Training Title<span className="text-red-500 ml-0.5">*</span>
            </label>
            <select
              name="trainingTitle"
              value={formData.trainingTitle}
              onChange={handleChange}
              required
              disabled={!formData.trainingType || loadingTitles}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">
                {loadingTitles ? 'Loading titles...' : '-- Select Training Title --'}
              </option>

              {trainingTitles.map(title => (
                <option
                  key={title.TRAINING_TITLE_ID}
                  value={title.TRAINING_TITLE_ID}
                >
                  {title.TITLE}
                </option>
              ))}

              <option value="0">Others</option>
            </select>
          </div>

          {/* Empty div for layout if needed, or Training Source */}
          <div className="md:col-start-1 lg:col-start-3">
            <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
              Training Source<span className="text-red-500 ml-0.5">*</span>
            </label>
            <select 
              name="trainingSource"
              value={formData.trainingSource}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">--Select Training Source--</option>
              <option value="Inhouse">Inhouse</option>
              <option value="Outside Agency (within country)">Outside Agency (within country)</option>
              <option value="International">International</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
              From Date<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input 
              type="date"
              name="fromDate"
              value={formData.fromDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
              To Date<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input 
              type="date"
              name="toDate"
              value={formData.toDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Outside Agency Name: Domestic training only */}
        {isWithinCounryt && (

          <div>
            <label className="block text-xs font-bold mb-1.5">
              Name of Agency <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="outsideAgencyName"
              value={formData.outsideAgencyName}
              onChange={handleChange}
              required
              placeholder="Enter outside agency name"
              className="w-full px-3 py-2 text-sm border rounded"
            />
          </div>
        )}

        {/* Country: Domestic and International */}
        {(isWithinCounryt || isInternational) && (

          <div>
            <label className="block text-xs font-bold mb-1.5">
              Country <span className="text-red-500">*</span>
            </label>
            <select
              name="country"
              value={formData.country || ''}
              onChange={handleChange}
              disabled={loadingCountries}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded disabled:bg-gray-100"
              >

              <option value="">
                  {loadingCountries ? 'Loading countries...' : 'Select Country'}
              </option>

              {countries
                .filter((country) =>
                    isWithinCounryt
                        ? String(country.id) === '80'
                        : true
                )
                .map((country) => (
                    <option
                        key={country.id}
                        value={String(country.id)}
                    >
                        {country.country}
                    </option>
                ))}
        </select>

          </div>
        )}

      {/* Location: Domestic and International */}
      {(isWithinCounryt || isInternational) && (

        <div>
          <label className="block text-xs font-bold mb-1.5">
            Location <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
            placeholder="Enter location"
            className="w-full px-3 py-2 text-sm border rounded"
          />
        </div>
      )}

      {/* Expenditure: All training sources */}

      <div>
        <label className="block text-xs font-bold mb-1.5">
          Expenditure (In Lakh) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          name="expenditure"
          value={formData.expenditure}
          onChange={handleChange}
          required
          placeholder="Enter expenditure amount"
          className="w-full px-3 py-2 text-sm border rounded"
        />
      </div>
        </div>

        {/* Participant Details Section */}
        <div className="mt-4">

    <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-lg">
            Participant Details
        </h3>

        <button
            type="button"
            onClick={handleAddParticipant}
            className="px-4 py-2 bg-blue-600 text-white rounded"
        >
            + Add Participant
        </button>
    </div>

    <div className="overflow-x-auto">

        <table className="w-full border-collapse border">

            <thead>
                <tr className="bg-gray-100">

                    <th className="border px-3 py-2">
                        S.No
                    </th>

                    <th className="border px-3 py-2">
                        Staff ID
                    </th>

                    <th className="border px-3 py-2">
                        Name
                    </th>

                    <th className="border px-3 py-2">
                        Designation
                    </th>

                    <th className="border px-3 py-2">
                        Department
                    </th>

                    <th className="border px-3 py-2">
                        Action
                    </th>

                </tr>
            </thead>

            <tbody>

                {participants.map((participant, index) => (

                    <tr key={participant.id}>

                        <td className="border px-3 py-2 text-center">
                            {index + 1}
                        </td>

                        <td className="border px-3 py-2">

                            <select
                                value={participant.staffId}
                                onChange={(e) =>
                                    handleStaffChange(
                                        participant.id,
                                        e.target.value
                                    )
                                }
                                className="w-full border rounded px-2 py-2"
                            >

                                <option value="">
                                    {loadingStaff
                                        ? "Loading Staff..."
                                        : "Select Staff ID"}
                                </option>

                                {staffList.map(staff => (

                                    <option
                                        key={`${staff.emp_master_id}-${staff.emp_transaction_id}`}
                                        value={staff.emp_reference_id}
                                    >
                                        {staff.emp_reference_id} - {staff.emp_name}
                                    </option>

                                ))}

                            </select>

                        </td>

                        <td className="border px-3 py-2">

                            <input
                                type="text"
                                value={participant.name}
                                readOnly
                                className="w-full border rounded px-2 py-2 bg-gray-100"
                            />

                        </td>

                        <td className="border px-3 py-2">

                            <input
                                type="text"
                                value={participant.designation}
                                readOnly
                                className="w-full border rounded px-2 py-2 bg-gray-100"
                            />

                        </td>

                        <td className="border px-3 py-2">

                            <input
                                type="text"
                                value={participant.department}
                                readOnly
                                className="w-full border rounded px-2 py-2 bg-gray-100"
                            />

                        </td>

                        <td className="border px-3 py-2 text-center">

                            {participants.length > 1 && (

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleRemoveParticipant(
                                            participant.id
                                        )
                                    }
                                    className="px-3 py-1 bg-red-500 text-white rounded"
                                >
                                    Remove
                                </button>

                            )}

                        </td>

                    </tr>

                ))}

            </tbody>

        </table>

    </div>

</div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-6">
          <button 
            type="submit"
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded shadow transition cursor-pointer"
          >
            {trainingId ? 'Update' : 'Submit'}
          </button>
          <button 
            type="button"
            onClick={() => navigate('/hr/hr-management/training-details')}
            className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded shadow transition cursor-pointer"
          >
            Exit
          </button>
        </div>

      </form>
    </div>
  );
}
