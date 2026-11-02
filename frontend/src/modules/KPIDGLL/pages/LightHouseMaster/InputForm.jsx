import { useState } from 'react';
import { Save } from 'lucide-react';
import { createLightHouseMaster, updateLightHouseMaster } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { DGLL_TOASTS } from '../../toastMessages';

// NOTE: exact status options unverified against live data -- confirm with team.
const STATUS_OPTIONS = [{ label: 'Active', value: '1' }, { label: 'Inactive', value: '0' }];

export default function LightHouseMasterInputForm({
  editData = null,
  states = [],
  districts = [],
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const notify = useNotifier(triggerNotification);
  const isEdit = !!editData;
  const [submitting, setSubmitting] = useState(false);

  const [alol, setAlol] = useState(editData?.alol || '');
  const [lightHouseName, setLightHouseName] = useState(editData?.light_house_name || '');
  const [status, setStatus] = useState(editData?.light_status !== undefined ? String(editData.light_status) : '1');
  const [dateOfCommissioning, setDateOfCommissioning] = useState(
    editData?.commisioned_date ? editData.commisioned_date.split('T')[0] : ''
  );
  const [stateId, setStateId] = useState(editData?.state_id ? String(editData.state_id) : '');
  const [districtId, setDistrictId] = useState(editData?.district_id ? String(editData.district_id) : '');
  const [latitude, setLatitude] = useState(editData?.latitude ?? '');
  const [longitude, setLongitude] = useState(editData?.longitude ?? '');

  const scopedDistricts = districts.filter((d) => String(d.state_id) === String(stateId));
  const today = new Date().toISOString().split('T')[0];

  const [touched, setTouched] = useState({});
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isFieldInvalid = (field, val) => touched[field] && (!val || !String(val).trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ alol: true, lightHouseName: true, dateOfCommissioning: true, stateId: true, districtId: true });
    if (!alol.trim() || !lightHouseName.trim() || !dateOfCommissioning || !stateId || !districtId) {
      notify(COMMON_TOASTS.mandatoryFieldsMissing());
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateLightHouseMaster({
          alolName: alol,
          lightHouseName,
          status,
          updateDateOfCommissioning: dateOfCommissioning,
          updateState: stateId,
          updateDistrict: districtId,
          updateLatitude: latitude,
          updateLongitude: longitude,
          lightHouseIdIdOrg: editData.lights_house_id,
          userID: getCurrentUserId(),
        });
        notify(DGLL_TOASTS.updated('Light House Master'));
      } else {
        await createLightHouseMaster({
          alol,
          lightsName: lightHouseName,
          status,
          dateOfCommissioning,
          state: stateId,
          district: districtId,
          latitude,
          longitude,
          userID: getCurrentUserId(),
        });
        notify(DGLL_TOASTS.added('Light House Master'));
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving Light House Master entry:', err);
      notify(DGLL_TOASTS.saveFailed(isEdit, getErrorMessage(err)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="module-form-card overflow-hidden animate-fade-in">
      <div className="module-form-banner">
        <div>
          <h3 className="module-form-banner-title">
            {isEdit ? 'Update Light House Master Entry' : 'Add Light House Master Entry'}
          </h3>
          <p className="module-form-banner-subtext">DGLL - Light House Master</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="module-form-label">ALOL Number <span className="text-red-500">*</span></label>
            <input
              type="text" value={alol} onChange={(e) => setAlol(e.target.value)}
              onBlur={() => handleBlur('alol')}
              placeholder="e.g. 1234"
              className={`module-form-input${isFieldInvalid('alol', alol) ? ' !border-red-500' : ''}`}
            />
            {isFieldInvalid('alol', alol) && (
              <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="module-form-label">Light House Name <span className="text-red-500">*</span></label>
            <input
              type="text" value={lightHouseName} onChange={(e) => setLightHouseName(e.target.value)}
              onBlur={() => handleBlur('lightHouseName')}
              placeholder="Enter light house name"
              className={`module-form-input${isFieldInvalid('lightHouseName', lightHouseName) ? ' !border-red-500' : ''}`}
            />
            {isFieldInvalid('lightHouseName', lightHouseName) && (
              <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="module-form-label">Status <span className="text-red-500">*</span></label>
            <select
              value={status} onChange={(e) => setStatus(e.target.value)}
              className="module-form-input cursor-pointer"
            >
              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="module-form-label">Date of Commissioning <span className="text-red-500">*</span></label>
            <input
              type="date" value={dateOfCommissioning} max={today}
              onChange={(e) => setDateOfCommissioning(e.target.value)}
              onBlur={() => handleBlur('dateOfCommissioning')}
              className={`module-form-input${isFieldInvalid('dateOfCommissioning', dateOfCommissioning) ? ' !border-red-500' : ''} dark:[color-scheme:dark]`}
            />
            {isFieldInvalid('dateOfCommissioning', dateOfCommissioning) && (
              <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="module-form-label">State <span className="text-red-500">*</span></label>
            <select
              value={stateId}
              onChange={(e) => { setStateId(e.target.value); setDistrictId(''); }}
              onBlur={() => handleBlur('stateId')}
             
              className={`module-form-input${isFieldInvalid('stateId', stateId) ? ' !border-red-500' : ''} cursor-pointer`}
            >
              <option value="">--Select State--</option>
              {states.map((s) => <option key={s.state_id} value={s.state_id}>{s.state_name}</option>)}
            </select>
            {isFieldInvalid('stateId', stateId) && (
              <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="module-form-label">District <span className="text-red-500">*</span></label>
            <select
              value={districtId} onChange={(e) => setDistrictId(e.target.value)}
              onBlur={() => handleBlur('districtId')} disabled={!stateId}
              className={`module-form-input${isFieldInvalid('districtId', districtId) ? ' !border-red-500' : ''} cursor-pointer disabled:opacity-50`}
            >
              <option value="">--Select District--</option>
              {scopedDistricts.map((d) => <option key={d.district_id} value={d.district_id}>{d.district_name}</option>)}
            </select>
            {isFieldInvalid('districtId', districtId) && (
              <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="module-form-label">Latitude</label>
            <input
              type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)}
              placeholder="e.g. 13.0827"
              className="module-form-input"
            />
          </div>

          <div className="space-y-1.5">
            <label className="module-form-label">Longitude</label>
            <input
              type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)}
              placeholder="e.g. 80.2707"
              className="module-form-input"
            />
          </div>
        </div>

        <div className="flex items-center justify-between space-x-3 pt-5 border-t border-slate-200 dark:border-slate-700">
          <span className="text-xs text-rose-500 font-bold italic">
            * Asterisks marked with red are mandatory fields
          </span>
          <div className="flex items-center space-x-3">
          {onBack && (
            <button
              type="button" onClick={onBack}
              className="px-4.5 py-2.5 border border-slate-250 dark:border-slate-700 text-slate-655 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Discard
            </button>
          )}
          <button
            type="submit" disabled={submitting}
            className="flex items-center space-x-2 px-5.5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            <span>{submitting ? 'Saving...' : 'Save Entry'}</span>
          </button>
          </div>
        </div>
      </form>
    </div>
  );
}
