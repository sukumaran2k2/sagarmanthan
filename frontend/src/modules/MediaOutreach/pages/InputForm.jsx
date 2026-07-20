import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Save, X } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

const FINANCIAL_YEARS = (() => {
  const years = [];
  for (let y = 2020; y <= 2028; y++) years.push(`${y}-${y + 1}`);
  return years;
})();

const SOCIAL_CHANNELS = [
  { key: 'twitter', label: 'Twitter / X' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'linkedIn', label: 'LinkedIn' },
  { key: 'youTube', label: 'YouTube' },
];

const STEPS = [
  { id: 0, key: 'broadcast', label: 'Broadcast TV Media' },
  { id: 1, key: 'print_media', label: 'Print Media' },
  { id: 2, key: 'online', label: 'Online' },
  { id: 3, key: 'social_media', label: 'Social Media' },
];

export default function InputForm({ onBack, onSuccess, triggerNotification, editData, activeMediaType, organisations, getOrgName }) {
  const isEdit = !!editData;

  // Common fields
  const [financialYear, setFinancialYear] = useState('');
  const [month, setMonth] = useState('');

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

  // Pre-fill edit data
  useEffect(() => {
    if (editData) {
      setFinancialYear(editData.financial_year || '');
      setMonth(editData.month || '');
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
    }
  }, [editData]);

  const handleSocialChange = (channel, metric, value) => {
    setSocialData(prev => ({
      ...prev,
      [channel]: { ...prev[channel], [metric]: value }
    }));
  };

  const handleSubmit = async () => {
    if (!financialYear || !month) {
      if (triggerNotification) triggerNotification('Please select Financial Year and Month.');
      return;
    }

    setSubmitting(true);

    // Get user info from token
    let userId = 1;
    let organisationId = 1;
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.userId;
        organisationId = payload.organisationId;
      }
    } catch (e) { console.error(e); }

    if (isEdit) {
      // Determine which media type we're editing based on activeMediaType
      const mediaOutreachId = editData.media_outreach_id;
      let updatePayload = { type: '', userID: userId, mediaOutreachIdOrg: mediaOutreachId };

      if (activeMediaType === 'broadcast') {
        updatePayload.type = 'broadcast';
        updatePayload.updateBroadcastNational = Number(broadcastNational) || 0;
        updatePayload.updateBroadcastRegional = Number(broadcastRegional) || 0;
        updatePayload.updateBroadcastOverall = broadcastOverall;
      } else if (activeMediaType === 'print_media') {
        updatePayload.type = 'print';
        updatePayload.updateprintMediaNational = Number(printNational) || 0;
        updatePayload.updateprintMediaRegional = Number(printRegional) || 0;
        updatePayload.updateprintMediaOverall = printOverall;
      } else if (activeMediaType === 'online') {
        updatePayload.type = 'online';
        updatePayload.updateEnglishdata = Number(onlineEnglish) || 0;
        updatePayload.updateVernacular = Number(onlineVernacular) || 0;
        updatePayload.updateonlineOverall = onlineOverall;
      } else if (activeMediaType === 'social_media') {
        updatePayload.type = 'social';
        updatePayload.updateTwitterPosts = Number(socialData.twitter.posts) || 0;
        updatePayload.updateTwitterImpression = Number(socialData.twitter.impression) || 0;
        updatePayload.updateTwitterEngagement = Number(socialData.twitter.engagement) || 0;
        updatePayload.updateInstagramPosts = Number(socialData.instagram.posts) || 0;
        updatePayload.updateInstagramImpression = Number(socialData.instagram.impression) || 0;
        updatePayload.updateInstagramEngagement = Number(socialData.instagram.engagement) || 0;
        updatePayload.updateFacebookPosts = Number(socialData.facebook.posts) || 0;
        updatePayload.updateFacebookImpression = Number(socialData.facebook.impression) || 0;
        updatePayload.updateFacebookEngagement = Number(socialData.facebook.engagement) || 0;
        updatePayload.updateLinkedInPosts = Number(socialData.linkedIn.posts) || 0;
        updatePayload.updateLinkedInImpression = Number(socialData.linkedIn.impression) || 0;
        updatePayload.updateLinkedInEngagement = Number(socialData.linkedIn.engagement) || 0;
        updatePayload.updateyoutubePosts = Number(socialData.youTube.posts) || 0;
        updatePayload.updateyoutubeImpression = Number(socialData.youTube.impression) || 0;
        updatePayload.updateyoutubeEngagement = Number(socialData.youTube.engagement) || 0;
      }

      try {
        await axios.put(`${API}/media-outreach-data-edit`, updatePayload);
        onSuccess();
      } catch (err) {
        console.error(err);
        if (triggerNotification) triggerNotification('Error updating record. Please try again.');
      } finally {
        setSubmitting(false);
      }
    } else {
      // Create new record
      const payload = {
        financialYear,
        month,
        organisation: organisationId,
        BroadcastChecked: 1,
        BroadcastNational: Number(broadcastNational) || 0,
        BroadcastRegional: Number(broadcastRegional) || 0,
        BroadcastOverall: broadcastOverall,
        PrintMediaChecked: 1,
        PrintMediaNational: Number(printNational) || 0,
        PrintMediaRegional: Number(printRegional) || 0,
        PrintMediaOverall: printOverall,
        OnlineChecked: 1,
        OnlineEnglish: Number(onlineEnglish) || 0,
        OnlineVernacular: Number(onlineVernacular) || 0,
        OnlineOverall: onlineOverall,
        SocialMediaChecked: 1,
        TwitterPosts: Number(socialData.twitter.posts) || 0,
        TwitterImpression: Number(socialData.twitter.impression) || 0,
        TwitterEngagement: Number(socialData.twitter.engagement) || 0,
        InstagramPosts: Number(socialData.instagram.posts) || 0,
        InstagramImpression: Number(socialData.instagram.impression) || 0,
        InstagramEngagement: Number(socialData.instagram.engagement) || 0,
        FacebookPosts: Number(socialData.facebook.posts) || 0,
        FacebookImpression: Number(socialData.facebook.impression) || 0,
        FacebookEngagement: Number(socialData.facebook.engagement) || 0,
        LinkedInPosts: Number(socialData.linkedIn.posts) || 0,
        LinkedInImpression: Number(socialData.linkedIn.impression) || 0,
        LinkedInEngagement: Number(socialData.linkedIn.engagement) || 0,
        youTubePosts: Number(socialData.youTube.posts) || 0,
        youTubeImpression: Number(socialData.youTube.impression) || 0,
        youTubeEngagement: Number(socialData.youTube.engagement) || 0,
      };

      try {
        const res = await axios.post(`${API}/create-social-media`, payload);
        if (res.status === 302 || res.status === 200) {
          if (triggerNotification) triggerNotification('Record already exists for this Financial Year, Month & Organisation.');
        } else {
          onSuccess();
        }
      } catch (err) {
        if (err.response?.status === 302) {
          if (triggerNotification) triggerNotification('Record already exists for this Financial Year, Month & Organisation.');
        } else {
          console.error(err);
          if (triggerNotification) triggerNotification('Error saving record. Please try again.');
        }
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Input field component
  const Field = ({ label, value, onChange, disabled = false, placeholder = '' }) => (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}`}
      />
    </div>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
      {/* Header */}
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
        {/* Financial Year & Month selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Financial Year*</label>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              disabled={isEdit}
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 cursor-pointer ${isEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <option value="">--Select Financial Year--</option>
              {FINANCIAL_YEARS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Month*</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              disabled={isEdit}
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white font-semibold text-slate-700 cursor-pointer ${isEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <option value="">--Select Month--</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {isEdit && (
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Organisation</label>
              <input
                type="text"
                value={getOrgName(editData.organisation_id)}
                disabled
                className="w-full text-xs px-3.5 py-2.5 bg-slate-100 border border-slate-250 rounded-xl font-semibold text-slate-500 cursor-not-allowed"
              />
            </div>
          )}
        </div>

        {!isEdit && (
          <p className="text-[11px] font-bold text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
            Note: Financial Year and Month apply to all media types below. Fill in all tabs before submitting.
          </p>
        )}

        {/* Step Navigation */}
        {!isEdit && (
          <div className="flex items-center border-b border-slate-200 overflow-x-auto">
            {STEPS.map((step) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={`relative px-5 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all cursor-pointer
                  ${currentStep === step.id
                    ? 'text-[#0f417a]'
                    : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                {step.label}
                {currentStep === step.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#0f417a] rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Step Content */}
        {(isEdit ? activeMediaType === 'broadcast' : currentStep === 0) && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2">
              Broadcast / TV Media
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <Field label="National" value={broadcastNational} onChange={setBroadcastNational} placeholder="No. of National coverage" />
              <Field label="Regional" value={broadcastRegional} onChange={setBroadcastRegional} placeholder="No. of Regional coverage" />
              <Field label="Overall (Auto)" value={broadcastOverall} onChange={() => {}} disabled />
            </div>
          </div>
        )}

        {(isEdit ? activeMediaType === 'print_media' : currentStep === 1) && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2">
              Print Media
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <Field label="National" value={printNational} onChange={setPrintNational} placeholder="No. of National coverage" />
              <Field label="Regional" value={printRegional} onChange={setPrintRegional} placeholder="No. of Regional coverage" />
              <Field label="Overall (Auto)" value={printOverall} onChange={() => {}} disabled />
            </div>
          </div>
        )}

        {(isEdit ? activeMediaType === 'online' : currentStep === 2) && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2">
              Online Media
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <Field label="English" value={onlineEnglish} onChange={setOnlineEnglish} placeholder="No. of English articles" />
              <Field label="Vernacular" value={onlineVernacular} onChange={setOnlineVernacular} placeholder="No. of Vernacular articles" />
              <Field label="Overall (Auto)" value={onlineOverall} onChange={() => {}} disabled />
            </div>
          </div>
        )}

        {(isEdit ? activeMediaType === 'social_media' : currentStep === 3) && (
          <div className="space-y-5 animate-fade-in">
            <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2">
              Social Media Channels
            </h4>
            {/* Social Media Table */}
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
                        <input
                          type="number"
                          value={socialData[ch.key].posts}
                          onChange={(e) => handleSocialChange(ch.key, 'posts', e.target.value)}
                          className="w-full text-xs text-center px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={socialData[ch.key].impression}
                          onChange={(e) => handleSocialChange(ch.key, 'impression', e.target.value)}
                          className="w-full text-xs text-center px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={socialData[ch.key].engagement}
                          onChange={(e) => handleSocialChange(ch.key, 'engagement', e.target.value)}
                          className="w-full text-xs text-center px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700"
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

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-5 border-t border-slate-100">
          <div className="flex items-center gap-3">
            {!isEdit && currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep(s => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-250 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
            )}
            {!isEdit && currentStep < 3 && (
              <button
                type="button"
                onClick={() => setCurrentStep(s => s + 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
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
              className="px-4.5 py-2.5 border border-slate-250 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
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
