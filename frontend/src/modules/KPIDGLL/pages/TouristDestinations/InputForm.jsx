import { useState } from 'react';
import { Save } from 'lucide-react';
import {
  checkTouristDestinationYear, createTouristDestination, updateTouristDestination,
  checkTargetDetailYear, createTargetDetail, updateTargetDetail,
} from '../../api';
import { getCurrentUserId } from '../../../../utils/authSession';

// Financial year range matches the pattern used elsewhere in KPI DGLL
// (2012-2013 through 2028-2029), generated programmatically.
const FINANCIAL_YEAR_OPTIONS = Array.from({ length: 17 }, (_, i) => {
  const start = 2012 + i;
  return `${start}-${start + 1}`;
});

// Mirrors the legacy site's "Add Lighthouse as Tourist Destinations" screen,
// which presents two entities (the destination record and its yearly target)
// as tabs within one Add flow rather than as two separate pages.
export default function TouristDestinationsInputForm({
  destinationEditData = null,
  targetEditData = null,
  initialTab = 'destination',
  onBack,
  onSuccess,
  triggerNotification,
}) {
  const isDestinationEdit = !!destinationEditData;
  const isTargetEdit = !!targetEditData;
  const isEditingEither = isDestinationEdit || isTargetEdit;

  const [activeTab, setActiveTab] = useState(destinationEditData ? 'destination' : targetEditData ? 'target' : initialTab);
  const [submitting, setSubmitting] = useState(false);

  // --- Destination tab state ---
  const [destFinancialYear, setDestFinancialYear] = useState(destinationEditData?.finacial_year || '');
  const [destLighthouseDeveloped, setDestLighthouseDeveloped] = useState(
    destinationEditData?.no_lighthouses_developed_tourist_destination ?? ''
  );
  const [destAnnualTourist, setDestAnnualTourist] = useState(
    destinationEditData?.annual_tourist_footfall ?? ''
  );

  // --- Target tab state ---
  const [targetYear, setTargetYear] = useState(targetEditData?.year || '');
  const [targetLighthouses, setTargetLighthouses] = useState(
    targetEditData?.collection_of_light_dues ?? ''
  );
  const [targetFootfall, setTargetFootfall] = useState(
    targetEditData?.footfall_in_the_lighthouses ?? ''
  );

  const [touched, setTouched] = useState({});
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isFieldInvalid = (field, val) => touched[field] && (!val || !String(val).trim());

  const handleDestinationSubmit = async (e) => {
    e.preventDefault();
    setTouched((prev) => ({ ...prev, destFinancialYear: true, destLighthouseDeveloped: true, destAnnualTourist: true }));

    if (!destFinancialYear || destLighthouseDeveloped === '' || destAnnualTourist === '') {
      triggerNotification ? triggerNotification('Please fill in all required fields highlighted in red.', 'error') : alert('Please fill in all required fields highlighted in red.');
      return;
    }
    const developed = parseInt(destLighthouseDeveloped, 10);
    const tourists = parseInt(destAnnualTourist, 10);
    if (isNaN(developed) || developed < 0 || isNaN(tourists) || tourists < 0) {
      triggerNotification ? triggerNotification('Please enter valid numbers.', 'error') : alert('Please enter valid numbers.');
      return;
    }

    setSubmitting(true);
    try {
      if (isDestinationEdit) {
        await updateTouristDestination({
          updateFinancialYears: destFinancialYear,
          updateLighthouseDeveloped: developed,
          updateAnnualTourist: tourists,
          TouristDestinationsRowId: destinationEditData.tourist_destination_id,
          userID: getCurrentUserId(),
        });
        triggerNotification && triggerNotification('Tourist Destination entry updated successfully', 'success');
      } else {
        // Legacy behaviour: create does not self-check for duplicate years,
        // so a pre-flight check call is required first.
        const check = await checkTouristDestinationYear(destFinancialYear);
        if (check.status === 205) {
          triggerNotification
            ? triggerNotification('Data already exists for the selected financial year.', 'error')
            : alert('Data already exists for the selected financial year.');
          setSubmitting(false);
          return;
        }
        await createTouristDestination({
          financialYears: destFinancialYear,
          lighthouseDeveloped: developed,
          annualTourist: tourists,
          userID: getCurrentUserId(),
        });
        triggerNotification && triggerNotification('Tourist Destination entry added successfully', 'success');
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving Tourist Destination entry:', err);
      triggerNotification ? triggerNotification('Failed to save entry.', 'error') : alert('Failed to save entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTargetSubmit = async (e) => {
    e.preventDefault();
    setTouched((prev) => ({ ...prev, targetYear: true, targetLighthouses: true, targetFootfall: true }));

    if (!targetYear || targetLighthouses === '' || targetFootfall === '') {
      triggerNotification ? triggerNotification('Please fill in all required fields highlighted in red.', 'error') : alert('Please fill in all required fields highlighted in red.');
      return;
    }
    const lighthouses = parseInt(targetLighthouses, 10);
    const footfall = parseInt(targetFootfall, 10);
    if (isNaN(lighthouses) || lighthouses < 0 || isNaN(footfall) || footfall < 0) {
      triggerNotification ? triggerNotification('Please enter valid numbers.', 'error') : alert('Please enter valid numbers.');
      return;
    }

    setSubmitting(true);
    try {
      if (isTargetEdit) {
        await updateTargetDetail({
          updateYear: targetYear,
          updateCollectionLightDue: lighthouses,
          updateFootFallLighthouse: footfall,
          TouristDestinationsRowId: targetEditData.tourist_destination_target_id,
          userID: getCurrentUserId(),
        });
        triggerNotification && triggerNotification('Target Details entry updated successfully', 'success');
      } else {
        const response = await createTargetDetail({
          year: targetYear,
          collectionLightDue: lighthouses,
          footFallLighthouse: footfall,
          userID: getCurrentUserId(),
        });
        if (response.status === 205) {
          triggerNotification
            ? triggerNotification('Data already exists for the selected year.', 'error')
            : alert('Data already exists for the selected year.');
          setSubmitting(false);
          return;
        }
        triggerNotification && triggerNotification('Target Details entry added successfully', 'success');
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving Target Details entry:', err);
      triggerNotification ? triggerNotification('Failed to save entry.', 'error') : alert('Failed to save entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (invalid) =>
    `w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border ${invalid ? 'border-red-500 focus:border-red-500' : 'border-slate-250 dark:border-slate-700 focus:border-[#0f417a]'} rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-950 font-semibold text-slate-800 dark:text-slate-100`;
  const labelCls = 'block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] px-6 py-4.5 flex items-center justify-between text-white border-b border-[#0a2d55]/20">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider">
            {isDestinationEdit ? 'Update Lighthouse as Tourist Destination' : isTargetEdit ? 'Update KPI Target Details' : 'Add Lighthouse as Tourist Destinations'}
          </h3>
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">DGLL - Lighthouse as Tourist Destinations</p>
        </div>
      </div>

      {/* Tab switcher -- hidden while editing, since edit always targets one specific entity */}
      {!isEditingEither && (
        <div className="flex gap-2 px-6 pt-5">
          <button
            type="button"
            onClick={() => setActiveTab('destination')}
            className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'destination' ? 'bg-[#0f417a] text-white' : 'bg-white dark:bg-slate-900 text-[#0f417a] dark:text-blue-400 border border-[#0f417a]/40 dark:border-blue-500/40'}`}
          >
            Add Lighthouse as Tourist Destination
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('target')}
            className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'target' ? 'bg-[#0f417a] text-white' : 'bg-white dark:bg-slate-900 text-[#0f417a] dark:text-blue-400 border border-[#0f417a]/40 dark:border-blue-500/40'}`}
          >
            Add KPI Target Details
          </button>
        </div>
      )}

      {activeTab === 'destination' ? (
        <form onSubmit={handleDestinationSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className={labelCls}>Financial Year <span className="text-red-500">*</span></label>
              <select
                value={destFinancialYear}
                onChange={(e) => setDestFinancialYear(e.target.value)}
                onBlur={() => handleBlur('destFinancialYear')}
                disabled={isDestinationEdit}
                className={`${inputCls(isFieldInvalid('destFinancialYear', destFinancialYear))} cursor-pointer disabled:opacity-50`}
              >
                <option value="">--Select Financial Year--</option>
                {FINANCIAL_YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              {isFieldInvalid('destFinancialYear', destFinancialYear) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>No. of Lighthouse developed as Tourist Destinations <span className="text-red-500">*</span></label>
              <input
                type="number" min="0" value={destLighthouseDeveloped}
                onChange={(e) => setDestLighthouseDeveloped(e.target.value)}
                onBlur={() => handleBlur('destLighthouseDeveloped')}
                placeholder="e.g. 12"
                className={inputCls(isFieldInvalid('destLighthouseDeveloped', destLighthouseDeveloped))}
              />
              {isFieldInvalid('destLighthouseDeveloped', destLighthouseDeveloped) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className={labelCls}>Annual Tourist Footfall <span className="text-red-500">*</span></label>
              <input
                type="number" min="0" value={destAnnualTourist}
                onChange={(e) => setDestAnnualTourist(e.target.value)}
                onBlur={() => handleBlur('destAnnualTourist')}
                placeholder="e.g. 1800000"
                className={inputCls(isFieldInvalid('destAnnualTourist', destAnnualTourist))}
              />
              {isFieldInvalid('destAnnualTourist', destAnnualTourist) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-200 dark:border-slate-700">
            {onBack && (
              <button type="button" onClick={onBack} className="px-4.5 py-2.5 border border-slate-250 dark:border-slate-700 text-slate-655 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer">
                Discard
              </button>
            )}
            <button type="submit" disabled={submitting} className="flex items-center space-x-2 px-5.5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60">
              <Save className="h-4 w-4" />
              <span>{submitting ? 'Saving...' : 'Save Entry'}</span>
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleTargetSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className={labelCls}>Year <span className="text-red-500">*</span></label>
              <select
                value={targetYear}
                onChange={(e) => setTargetYear(e.target.value)}
                onBlur={() => handleBlur('targetYear')}
                disabled={isTargetEdit}
                className={`${inputCls(isFieldInvalid('targetYear', targetYear))} cursor-pointer disabled:opacity-50`}
              >
                <option value="">--Select Year--</option>
                {FINANCIAL_YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              {isFieldInvalid('targetYear', targetYear) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
            </div>

            {/* NOTE: DB column is collection_of_light_dues, but the legacy site's
                own list view displays this as "No. of Target Lighthouses" -- kept
                consistent with what users already see in production. */}
            <div className="space-y-1.5">
              <label className={labelCls}>No. of Target Lighthouses <span className="text-red-500">*</span></label>
              <input
                type="number" min="0" value={targetLighthouses}
                onChange={(e) => setTargetLighthouses(e.target.value)}
                onBlur={() => handleBlur('targetLighthouses')}
                placeholder="e.g. 15"
                className={inputCls(isFieldInvalid('targetLighthouses', targetLighthouses))}
              />
              {isFieldInvalid('targetLighthouses', targetLighthouses) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className={labelCls}>Expected Footfall <span className="text-red-500">*</span></label>
              <input
                type="number" min="0" value={targetFootfall}
                onChange={(e) => setTargetFootfall(e.target.value)}
                onBlur={() => handleBlur('targetFootfall')}
                placeholder="e.g. 2000000"
                className={inputCls(isFieldInvalid('targetFootfall', targetFootfall))}
              />
              {isFieldInvalid('targetFootfall', targetFootfall) && <p className="text-[10px] font-bold text-red-500 mt-1">This field is mandatory.</p>}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-200 dark:border-slate-700">
            {onBack && (
              <button type="button" onClick={onBack} className="px-4.5 py-2.5 border border-slate-250 dark:border-slate-700 text-slate-655 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer">
                Discard
              </button>
            )}
            <button type="submit" disabled={submitting} className="flex items-center space-x-2 px-5.5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60">
              <Save className="h-4 w-4" />
              <span>{submitting ? 'Saving...' : 'Save Entry'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
