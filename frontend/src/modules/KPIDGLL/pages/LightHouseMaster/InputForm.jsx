import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { createLightHouseMaster, updateLightHouseMaster } from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';

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
      triggerNotification ? triggerNotification('Please fill in all required fields highlighted in red.', 'error') : alert('Please fill in all required fields highlighted in red.');
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
        triggerNotification && triggerNotification('Light House Master entry updated successfully', 'success');
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
        triggerNotification && triggerNotification('Light House Master entry created successfully', 'success');
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving Light House Master entry:', err);
      triggerNotification ? triggerNotification('Failed to save entry.', 'error') : alert('Failed to save entry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] px-6 py-4.5 flex items-center justify-between text-white border-b border-[#0a2d55]/20">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider">
            {isEdit ? 'Update Light House Master Entry' : 'Add Light House Master Entry'}
          </h3>
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">DGLL - Light House Master</p>
        </div>
        {isEdit && onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center space-x-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl transition cursor-pointer"
          >
            <X className="h-4 w-4" />
            <span>Close</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">ALOL Number <span className="text-red-500">*</span></label>
            <input
              type="text" value={alol} onChange={(e) => setAlol(e.target.value)}
              onBlur={() => handleBlur('alol')}
              placeholder="e.g. 1234" required
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border ${isFieldInvalid('alol', alol) ? 'border-red-500 focus:border-red-500' : 'border-slate-250 dark:border-slate-700 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-950 font-semibold text-slate-800 dark:text-slate-100`}
            />
            {isFieldInvalid('alol', alol) && (
              <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Light House Name <span className="text-red-500">*</span></label>
            <input
              type="text" value={lightHouseName} onChange={(e) => setLightHouseName(e.target.value)}
              onBlur={() => handleBlur('lightHouseName')}
              placeholder="Enter light house name" required
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border ${isFieldInvalid('lightHouseName', lightHouseName) ? 'border-red-500 focus:border-red-500' : 'border-slate-250 dark:border-slate-700 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-950 font-semibold text-slate-800 dark:text-slate-100`}
            />
            {isFieldInvalid('lightHouseName', lightHouseName) && (
              <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Status <span className="text-red-500">*</span></label>
            <select
              value={status} onChange={(e) => setStatus(e.target.value)} required
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-950 focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Date of Commissioning <span className="text-red-500">*</span></label>
            <input
              type="date" value={dateOfCommissioning} max={today}
              onChange={(e) => setDateOfCommissioning(e.target.value)}
              onBlur={() => handleBlur('dateOfCommissioning')} required
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border ${isFieldInvalid('dateOfCommissioning', dateOfCommissioning) ? 'border-red-500 focus:border-red-500' : 'border-slate-250 dark:border-slate-700 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-950 font-semibold text-slate-700 dark:text-slate-200 dark:[color-scheme:dark]`}
            />
            {isFieldInvalid('dateOfCommissioning', dateOfCommissioning) && (
              <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">State <span className="text-red-500">*</span></label>
            <select
              value={stateId}
              onChange={(e) => { setStateId(e.target.value); setDistrictId(''); }}
              onBlur={() => handleBlur('stateId')}
              required
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border ${isFieldInvalid('stateId', stateId) ? 'border-red-500 focus:border-red-500' : 'border-slate-250 dark:border-slate-700 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-950 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer`}
            >
              <option value="">--Select State--</option>
              {states.map((s) => <option key={s.state_id} value={s.state_id}>{s.state_name}</option>)}
            </select>
            {isFieldInvalid('stateId', stateId) && (
              <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">District <span className="text-red-500">*</span></label>
            <select
              value={districtId} onChange={(e) => setDistrictId(e.target.value)}
              onBlur={() => handleBlur('districtId')} required disabled={!stateId}
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border ${isFieldInvalid('districtId', districtId) ? 'border-red-500 focus:border-red-500' : 'border-slate-250 dark:border-slate-700 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-950 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-50`}
            >
              <option value="">--Select District--</option>
              {scopedDistricts.map((d) => <option key={d.district_id} value={d.district_id}>{d.district_name}</option>)}
            </select>
            {isFieldInvalid('districtId', districtId) && (
              <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Latitude</label>
            <input
              type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)}
              placeholder="e.g. 13.0827"
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-950 focus:border-[#0f417a] font-semibold text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Longitude</label>
            <input
              type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)}
              placeholder="e.g. 80.2707"
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-950 focus:border-[#0f417a] font-semibold text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-200 dark:border-slate-700">
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
      </form>
    </div>
  );
}
