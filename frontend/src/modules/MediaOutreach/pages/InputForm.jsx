import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Save, X } from 'lucide-react';
import { createSocialMedia, updateSocialMedia, friendlyErrorMessage } from '../api';
import { getSessionOrganisationId } from '../../../utils/authSession';
import { MONTHS, FINANCIAL_YEARS, SOCIAL_CHANNELS, STEPS } from '../utils/constants';

// Digits only; sizes above the database limit are caught on save
function NumberInput({ value, onChange, disabled = false, placeholder = '', className }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      maxLength={10}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
    />
  );
}

const FIELD_CLASS = 'w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:focus:bg-slate-950';
const SOCIAL_INPUT_CLASS = 'w-full text-xs text-center px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700';

function FormField({ label, value, onChange, disabled = false, placeholder = '' }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">{label}</label>
      <NumberInput
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`${FIELD_CLASS} ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900/60 dark:text-slate-400' : ''}`}
      />
    </div>
  );
}

const toCount = (value) => Number(value) || 0;

// True when the month has not started yet; MONTHS runs April to March
function isFutureMonth(financialYear, month) {
  const index = MONTHS.indexOf(month);
  const year = Number(financialYear.slice(0, 4)) + (index >= 9 ? 1 : 0);
  return new Date(year, (index + 3) % 12, 1) > new Date();
}

const MAX_COUNT = 2147483647;
const OVERALL_PAIRS = {
  Broadcast: ['broadcast_national', 'broadcast_regional'],
  'Print Media': ['print_media_national', 'print_media_regional'],
  Online: ['online_english', 'online_vernacular'],
};

// Section whose value or Overall total is above the database int limit, else null
function tooLargeSection(payload) {
  for (const [label, [a, b]] of Object.entries(OVERALL_PAIRS)) {
    if ((payload[a] ?? 0) + (payload[b] ?? 0) > MAX_COUNT) return label;
  }
  const socialTooLarge = SOCIAL_CHANNELS.some(({ key }) =>
    ['posts', 'impression', 'engagement'].some(metric => (payload[`${key}_${metric}`] ?? 0) > MAX_COUNT));
  return socialTooLarge ? 'Social Media' : null;
}

// Friendly message for a failed save; server error text is never shown
function saveErrorMessage(err, isEdit) {
  const status = err?.response?.status;
  if (status === 409) return 'A record already exists for this Financial Year, Month and Organisation.';
  if (status === 400) return 'Some values are not valid. Please check and try again.';
  if (status === 404) return 'This record no longer exists. Please refresh the list.';
  return friendlyErrorMessage(err, isEdit ? 'Could not update the record. Please try again.' : 'Could not save the record. Please try again.');
}

export default function InputForm({ onBack, onSuccess, triggerNotification, editData, activeMediaType, organisations, isStandardView = false, permissions }) {
  const isEdit = !!editData;
  // Users limited to their own organisation never pick one; the server uses theirs
  const hideOrgSelect = isStandardView || permissions?.isStandardView || permissions?.isOrgScoped;
  // Keep an older record's year selectable even if it is outside the standard list
  const yearOptions = editData?.financial_year && !FINANCIAL_YEARS.includes(editData.financial_year)
    ? [...FINANCIAL_YEARS, editData.financial_year]
    : FINANCIAL_YEARS;

  // Common fields
  const [financialYear, setFinancialYear] = useState('');
  const [month, setMonth] = useState('');
  // Months that have not started yet are hidden when adding (edit keeps the record's own month)
  const monthOptions = isEdit || !financialYear ? MONTHS : MONTHS.filter(m => !isFutureMonth(financialYear, m));
  const [organisationId, setOrganisationId] = useState('');

  // Step state
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Broadcast
  const [broadcastNational, setBroadcastNational] = useState('');
  const [broadcastRegional, setBroadcastRegional] = useState('');

  // Print Media
  const [printNational, setPrintNational] = useState('');
  const [printRegional, setPrintRegional] = useState('');

  // Online
  const [onlineEnglish, setOnlineEnglish] = useState('');
  const [onlineVernacular, setOnlineVernacular] = useState('');

  // Social Media (per channel: posts, impression, engagement)
  const [socialData, setSocialData] = useState({
    twitter: { posts: '', impression: '', engagement: '' },
    instagram: { posts: '', impression: '', engagement: '' },
    facebook: { posts: '', impression: '', engagement: '' },
    linkedIn: { posts: '', impression: '', engagement: '' },
    youTube: { posts: '', impression: '', engagement: '' },
  });

  // Auto-calculate Overall values
  const broadcastOverall = useMemo(() => {
    const n = Number(broadcastNational) || 0;
    const r = Number(broadcastRegional) || 0;
    return n + r;
  }, [broadcastNational, broadcastRegional]);

  const printOverall = useMemo(() => {
    const n = Number(printNational) || 0;
    const r = Number(printRegional) || 0;
    return n + r;
  }, [printNational, printRegional]);

  const onlineOverall = useMemo(() => {
    const e = Number(onlineEnglish) || 0;
    const v = Number(onlineVernacular) || 0;
    return e + v;
  }, [onlineEnglish, onlineVernacular]);

  // Pre-fill edit data or auto-fill session organisation
  useEffect(() => {
    if (editData) {
      setFinancialYear(editData.financial_year || '');
      setMonth(editData.month || '');
      setOrganisationId(editData.organisation_id ? String(editData.organisation_id) : '');
      setBroadcastNational(editData.broadcast_national ?? '');
      setBroadcastRegional(editData.broadcast_regional ?? '');
      setPrintNational(editData.print_media_national ?? '');
      setPrintRegional(editData.print_media_regional ?? '');
      setOnlineEnglish(editData.online_english ?? '');
      setOnlineVernacular(editData.online_vernacular ?? '');
      setSocialData({
        twitter: { posts: editData.twitter_posts ?? '', impression: editData.twitter_impression ?? '', engagement: editData.twitter_engagement ?? '' },
        instagram: { posts: editData.instagram_posts ?? '', impression: editData.instagram_impression ?? '', engagement: editData.instagram_engagement ?? '' },
        facebook: { posts: editData.facebook_posts ?? '', impression: editData.facebook_impression ?? '', engagement: editData.facebook_engagement ?? '' },
        linkedIn: { posts: editData.linkedIn_posts ?? '', impression: editData.linkedIn_impression ?? '', engagement: editData.linkedIn_engagement ?? '' },
        youTube: { posts: editData.youTube_posts ?? '', impression: editData.youTube_impression ?? '', engagement: editData.youTube_engagement ?? '' },
      });
    } else {
      setOrganisationId('');
    }
  }, [editData]);

  const handleSocialChange = (channel, metric, value) => {
    setSocialData(prev => ({
      ...prev,
      [channel]: { ...prev[channel], [metric]: value }
    }));
  };

  const socialPayload = () => {
    const values = {};
    SOCIAL_CHANNELS.forEach(({ key }) => {
      values[`${key}_posts`] = toCount(socialData[key].posts);
      values[`${key}_impression`] = toCount(socialData[key].impression);
      values[`${key}_engagement`] = toCount(socialData[key].engagement);
    });
    return values;
  };

  // Payload keys are the table column names; the server works out the overall values
  const sectionPayload = {
    broadcast: () => ({ broadcast_national: toCount(broadcastNational), broadcast_regional: toCount(broadcastRegional) }),
    print_media: () => ({ print_media_national: toCount(printNational), print_media_regional: toCount(printRegional) }),
    online: () => ({ online_english: toCount(onlineEnglish), online_vernacular: toCount(onlineVernacular) }),
    social_media: socialPayload,
  };

  const handleSubmit = async () => {
    const finalOrgId = organisationId || (hideOrgSelect ? getSessionOrganisationId() : null) || editData?.organisation_id;

    if (!financialYear || !month || !finalOrgId) {
      triggerNotification?.(hideOrgSelect ? 'Please select Financial Year and Month.' : 'Please select Financial Year, Month and Organisation.', 'warning');
      return;
    }

    if (!isEdit && isFutureMonth(financialYear, month)) {
      triggerNotification?.(`${month} ${financialYear} has not started yet. Figures can be entered only for past or current months.`, 'warning');
      return;
    }

    const payload = isEdit
      ? { media_outreach_id: editData.media_outreach_id, type: activeMediaType, ...sectionPayload[activeMediaType]() }
      : {
          financial_year: financialYear,
          month,
          organisation_id: Number(finalOrgId),
          ...sectionPayload.broadcast(),
          ...sectionPayload.print_media(),
          ...sectionPayload.online(),
          ...sectionPayload.social_media(),
        };

    const tooLarge = tooLargeSection(payload);
    if (tooLarge) {
      triggerNotification?.(`${tooLarge} values are too large. Each value and Overall total can be at most 2,147,483,647.`, 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await (isEdit ? updateSocialMedia(payload) : createSocialMedia(payload));
      onSuccess();
    } catch (err) {
      console.error('Media outreach save failed:', err);
      const status = err?.response?.status;
      triggerNotification?.(saveErrorMessage(err, isEdit), status === 409 ? 'warning' : 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] dark:bg-slate-950 dark:border-slate-800 animate-fade-in">
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] px-6 py-4.5 flex items-center justify-between text-white border-b border-[#0a2d55]/20">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider font-display">
            {isEdit ? 'Update Media Outreach' : 'Add Media Outreach'}
          </h3>
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">Ministry of Ports, Shipping and Waterways</p>
        </div>
        <button onClick={onBack} className="p-2 bg-white/15 hover:bg-white/25 rounded-lg transition cursor-pointer" title="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div className={`grid grid-cols-1 ${hideOrgSelect ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-5`}>
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
              Financial Year<span className="text-red-500 font-bold ml-0.5">*</span>
            </label>
            <select
              value={financialYear}
              onChange={(e) => {
                setFinancialYear(e.target.value);
                if (month && isFutureMonth(e.target.value, month)) setMonth('');
              }}
              disabled={isEdit}
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:focus:bg-slate-950 cursor-pointer ${isEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <option value="">--Select Financial Year--</option>
              {yearOptions.map(fy => <option key={fy} value={fy}>{fy}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
              Month<span className="text-red-500 font-bold ml-0.5">*</span>
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              disabled={isEdit}
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:focus:bg-slate-950 cursor-pointer ${isEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <option value="">--Select Month--</option>
              {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {!hideOrgSelect && (
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                Organisation<span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <select
                value={organisationId}
                onChange={(e) => setOrganisationId(e.target.value)}
                disabled={isEdit}
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:focus:bg-slate-950 cursor-pointer ${isEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <option value="">--Select Organisation--</option>
                {organisations && organisations.map(org => (
                  <option key={org.organisation_id} value={org.organisation_id}>
                    {org.organisation_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {!isEdit && (
          <p className="text-[11px] font-bold text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400">
            Note: Financial Year and Month apply to all media types below. Fill in all tabs before submitting.
          </p>
        )}

        {!isEdit && (
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
            {STEPS.map((step) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={`relative px-5 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all cursor-pointer
                  ${currentStep === step.id
                    ? 'text-[#0f417a] dark:text-blue-400'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
              >
                {step.label}
                {currentStep === step.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#0f417a] dark:bg-blue-500 rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        )}

        {(isEdit ? activeMediaType === 'broadcast' : currentStep === 0) && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2">
              Broadcast / TV Media
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <FormField label="National" value={broadcastNational} onChange={setBroadcastNational} placeholder="No. of National coverage" />
              <FormField label="Regional" value={broadcastRegional} onChange={setBroadcastRegional} placeholder="No. of Regional coverage" />
              <FormField label="Overall (Auto)" value={broadcastOverall} onChange={() => {}} disabled />
            </div>
          </div>
        )}

        {(isEdit ? activeMediaType === 'print_media' : currentStep === 1) && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2">
              Print Media
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <FormField label="National" value={printNational} onChange={setPrintNational} placeholder="No. of National coverage" />
              <FormField label="Regional" value={printRegional} onChange={setPrintRegional} placeholder="No. of Regional coverage" />
              <FormField label="Overall (Auto)" value={printOverall} onChange={() => {}} disabled />
            </div>
          </div>
        )}

        {(isEdit ? activeMediaType === 'online' : currentStep === 2) && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2">
              Online Media
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <FormField label="English" value={onlineEnglish} onChange={setOnlineEnglish} placeholder="No. of English articles" />
              <FormField label="Vernacular" value={onlineVernacular} onChange={setOnlineVernacular} placeholder="No. of Vernacular articles" />
              <FormField label="Overall (Auto)" value={onlineOverall} onChange={() => {}} disabled />
            </div>
          </div>
        )}

        {(isEdit ? activeMediaType === 'social_media' : currentStep === 3) && (
          <div className="space-y-5 animate-fade-in">
            <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2">
              Social Media Channels
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0f417a] text-white">
                    <th className="px-4 py-3 text-left font-bold uppercase tracking-wider rounded-tl-xl">Channel</th>
                    <th className="px-4 py-3 text-center font-bold uppercase tracking-wider">No. of Posts</th>
                    <th className="px-4 py-3 text-center font-bold uppercase tracking-wider">Impression</th>
                    <th className="px-4 py-3 text-center font-bold uppercase tracking-wider rounded-tr-xl">Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {SOCIAL_CHANNELS.map((ch, idx) => (
                    <tr key={ch.key} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}`}>
                      <td className="px-4 py-3 font-bold text-slate-700">{ch.label}</td>
                      <td className="px-2 py-2">
                        <NumberInput
                          value={socialData[ch.key].posts}
                          onChange={(v) => handleSocialChange(ch.key, 'posts', v)}
                          className={SOCIAL_INPUT_CLASS}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <NumberInput
                          value={socialData[ch.key].impression}
                          onChange={(v) => handleSocialChange(ch.key, 'impression', v)}
                          className={SOCIAL_INPUT_CLASS}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <NumberInput
                          value={socialData[ch.key].engagement}
                          onChange={(v) => handleSocialChange(ch.key, 'engagement', v)}
                          className={SOCIAL_INPUT_CLASS}
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-rose-500 font-bold italic">
            * Asterisks marked with red are mandatory fields
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3">
            {!isEdit && currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep(s => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-250 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
            )}
            {!isEdit && currentStep < 3 && (
              <button
                type="button"
                onClick={() => setCurrentStep(s => s + 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition cursor-pointer dark:bg-slate-900 dark:text-slate-350 dark:hover:bg-slate-800"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-4.5 py-2.5 border border-slate-250 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 px-5.5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/10 hover:shadow-lg transition-all cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              {isEdit ? (submitting ? 'Updating...' : 'Update') : (submitting ? 'Saving...' : 'Save All Data')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
