import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Edit, Calendar, DollarSign, Building2, Briefcase, FileText,
  CheckCircle2, AlertTriangle, Layers, Users, TrendingUp, Download, Eye,
  MapPin, Landmark, Coins, ShieldCheck, Clock, ArrowRight, ExternalLink,
  Anchor, ChevronDown, ChevronUp, Image, File, Check, X, Camera, RefreshCw,
  Maximize2, ZoomIn, ZoomOut
} from 'lucide-react';
import {
  API_BASE,
  fetchViewProjectData,
  fetchViewProjectMilestones,
  fetchViewProjectTenderData,
  fetchViewProjectImages,
  fetchProjectDocuments,
  downloadProjectDocumentFile
} from '../api';

// Map coordinates lookup for Indian maritime states / major districts
const STATE_COORDINATES = {
  'Tamil Nadu': [13.0827, 80.2707],
  'Maharashtra': [18.9220, 72.8347],
  'Gujarat': [22.2587, 71.1924],
  'Andhra Pradesh': [17.6868, 83.2185],
  'Kerala': [9.9312, 76.2673],
  'Karnataka': [12.9141, 74.8560],
  'Odisha': [20.2961, 85.8245],
  'West Bengal': [22.5726, 88.3639],
  'Goa': [15.2993, 74.1240],
  'Puducherry': [11.9416, 79.8083],
  'Andaman and Nicobar Islands': [11.6234, 92.7265],
  'Lakshadweep': [10.5667, 72.6417],
  'Delhi': [28.6139, 77.2090],
  'Uttar Pradesh': [26.8467, 80.9462],
  'Bihar': [25.5941, 85.1376],
  'Assam': [26.1445, 91.7362],
};

const UNDER_TENDERING_MILESTONES = [
  { id: 1, name: 'Tech. Sanction obtained' },
  { id: 2, name: 'Tender Document approved' },
  { id: 3, name: 'Tender Notice issued' },
  { id: 4, name: 'Technical Evaluation completed' },
  { id: 5, name: 'Financial Evaluation completed' },
  { id: 6, name: 'Sanction of Competent Authority' },
  { id: 7, name: 'Work Awarded / LOA issued' },
  { id: 8, name: 'Contract Agreement Signed' },
];

function formatVal(val, fallback = '-') {
  if (val === undefined || val === null || val === '' || val === 'null' || val === 'undefined') return fallback;
  return String(val);
}

function formatCost(val) {
  if (val === undefined || val === null || val === '' || isNaN(Number(val))) return '-';
  const n = Number(val);
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr || dateStr === 'N/A' || dateStr === '-') return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(dateStr);
  }
}

export default function ProjectDetailView({
  project,
  projectId: propProjectId,
  subProjectId: propSubProjectId = '-1',
  onBack,
  onEdit,
  canEdit = false,
}) {
  const pid = project?.projectId || project?.project_id || propProjectId;
  const rawSubId = project?.subProjectId || project?.sub_project_id || propSubProjectId;
  const subId = rawSubId && rawSubId !== '-' ? rawSubId : '-1';

  const [loading, setLoading] = useState(true);
  const [projectData, setProjectData] = useState(project?.raw || project || null);
  const [tenderDates, setTenderDates] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [imagesData, setImagesData] = useState({ images: [], ppt: [], pert: [] });
  const [documents, setDocuments] = useState([]);
  const [activeTimelineStage, setActiveTimelineStage] = useState('under_tendering');
  
  // Section collapses
  const [fundingOpen, setFundingOpen] = useState(true);
  const [timelineOpen, setTimelineOpen] = useState(true);
  const [photoModalImg, setPhotoModalImg] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (!pid) return;

    setLoading(true);
    Promise.allSettled([
      fetchViewProjectData(pid, subId),
      fetchViewProjectTenderData(pid, subId),
      fetchViewProjectMilestones(pid, subId),
      fetchViewProjectImages(pid, subId),
      fetchProjectDocuments(pid, subId),
    ]).then(([projRes, tenderRes, milestoneRes, imgRes, docRes]) => {
      if (!isMounted) return;

      if (projRes.status === 'fulfilled' && projRes.value?.data) {
        const item = Array.isArray(projRes.value.data) ? projRes.value.data[0] : projRes.value.data;
        if (item) setProjectData((prev) => ({ ...(prev || {}), ...item }));
      }

      if (tenderRes.status === 'fulfilled' && Array.isArray(tenderRes.value?.data)) {
        setTenderDates(tenderRes.value.data);
      }

      if (milestoneRes.status === 'fulfilled' && Array.isArray(milestoneRes.value?.data)) {
        setMilestones(milestoneRes.value.data);
      }

      if (imgRes.status === 'fulfilled' && imgRes.value?.data) {
        setImagesData(imgRes.value.data);
      }

      if (docRes.status === 'fulfilled' && docRes.value?.data) {
        const docs = docRes.value.data.recordset || docRes.value.data || [];
        if (Array.isArray(docs)) setDocuments(docs);
      }

      setLoading(false);
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [pid, subId]);

  const p = projectData || project || {};

  const projectName = p.project_name || p.projectName || p.sub_project_name || p.subProjectName || 'Project Details';
  const stageName = p.stage_name || p.stage || p.project_stage || 'Project Initiated';
  const stageLower = String(stageName).toLowerCase();
  
  const isSagarmala = Boolean(
    p.is_sagarmala_funded === 1 ||
    p.is_sagarmala_funded === '1' ||
    p.is_sagarmala_funded === true ||
    p.sub_is_sagarmala_funded === 1 ||
    p.sagarmalaFunding === '1' ||
    p.sagarmalaFunding === 1 ||
    p.isSagarmalaFunded ||
    (p.sagarmala_project_id && String(p.sagarmala_project_id).trim() !== '' && String(p.sagarmala_project_id).trim() !== '-') ||
    Number(p.sagarmala_components || p.sagarmalaComponents) > 0
  );

  const sagarmalaId = p.sagarmala_project_id || p.sagarmalaProjectId || '-';
  const projectType = p.project_type || p.projectType || 'EPC';
  const implementationType = p.implememtation_type || p.implementationType || 'Single Funded';
  const projectCategory = p.project_category_names || p.project_category || p.category || '-';
  const schemeName = p.scheme_name || p.scheme || 'No Scheme';
  const initiativeName = p.initiative_names || p.initiative || 'others';
  const modeOfImplementation = p.mode_of_implememtation || p.modeOfImplementation || p.implementationMode || 'PPP';
  const implementingAgency = p.primary_ia_name || p.primaryImplementingAgency || p.ia_name || p.organisation_name || p.organisationName || '-';
  const initiatedDate = p.project_intiated_date || p.projectInitiatedDate || '-';
  const targetCompletionDate = p.target_completion_date || p.targetCompletionDate || '-';
  const lastUpdated = p.last_updated || p.lastUpdated || '-';
  const projectBrief = p.project_brief || p.projectBrief || p.remarks || p.drop_remarks || '';

  const physicalProgress = Number(p.physical_progress ?? p.physicalProgress ?? 0);
  const financialProgress = Number(p.financial_progress ?? p.financialProgress ?? 0);

  const estimatedCost = p.estimated_cost ?? p.estimatedCost;
  const sanctionedCost = p.sanctioned_cost ?? p.sanctionedCost;
  const awardedCost = p.award_project_cost ?? p.awarded_cost ?? p.awardedCost;
  const closureCost = p.closure_cost ?? p.closureCost;
  const techSanctionCost = p.technical_sanction_cost ?? p.technicalSanctionCost;

  // Location details
  const stateName = p.state_names || p.state_name || p.state || 'Tamil Nadu';
  const districtName = p.district_names || p.district_name || p.district || 'Chennai';
  const talukName = p.taluka_names || p.taluk || p.taluka_id || 'Purasawalkam';
  const villageName = p.village_names || p.village || p.village_id || 'VOC Nagar';

  // State Map Center
  const mapCenter = STATE_COORDINATES[stateName] || [13.0827, 80.2707];

  const sourceOfFundingName = p.source_of_funding_names || p.sourceOfFunding || 'PPP-Private Component';

  // Funding Breakdown
  const gbs = p.gbs_components;
  const multilateral = p.multilateral_components;
  const sagarmalaComp = p.sagarmala_components;
  const iwtf = p.loans_components;
  const pmgsy = p.pmmsy_components;
  const stateFund = p.state_gov_fund_components;
  const cess = p.other_source_funding_comp;
  const pppComp = p.ppp_components;
  const iebr = p.iebr_components;
  const totalExp = p.total_expenditure ?? p.expenditure_till_date;

  const getStageBadgeStyle = (s) => {
    const norm = String(s || '').toLowerCase();
    if (norm.includes('completed')) return 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
    if (norm.includes('implementation')) return 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
    if (norm.includes('tendering')) return 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
    if (norm.includes('dropped')) return 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
    return 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
  };

  const handleDownloadDoc = async (docName) => {
    try {
      const res = await downloadProjectDocumentFile(pid, subId, docName);
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', docName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100 pb-12">
      
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs select-none">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0f417a] dark:text-blue-400 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 shadow-2xs"
            title="Back to Projects List"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-black text-[#0f417a] dark:text-blue-400 uppercase tracking-wide flex items-center gap-2">
              <span>View Project Details</span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Comprehensive overview of milestones, funding breakdown, physical progress, and telemetry.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={onBack}
            className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer flex items-center space-x-1.5 shadow-2xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to List</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={() => onEdit?.(p)}
              className="px-4 py-2 bg-[#0f417a] hover:bg-[#1a5596] text-white text-xs font-bold rounded-xl shadow transition cursor-pointer flex items-center space-x-1.5"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Edit Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Top Grid (Left: Overview, Right: Sidebar with Map, Photos, Docs) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 8 Cols: Project Main Details Container */}
        <div className="lg:col-span-8 space-y-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          
          {/* Top Row IDs and Stage Badge */}
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 font-semibold mr-1.5">Project ID:</span>
                <strong className="text-[#0f417a] dark:text-blue-400 font-black font-mono tracking-wide">{pid}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 font-semibold mr-1.5">Sub Project ID:</span>
                <strong className="text-slate-800 dark:text-slate-200 font-mono">{subId !== '-1' ? subId : '-'}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 font-semibold mr-1.5">Sagarmala Project ID:</span>
                <strong className="text-slate-800 dark:text-slate-200 font-mono">{sagarmalaId}</strong>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {isSagarmala && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-50 text-[#0f417a] border border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800 shadow-xs">
                  <Anchor className="h-3 w-3 text-[#0f417a] dark:text-sky-300 shrink-0" />
                  <span>Sagarmala</span>
                </span>
              )}
              <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-2xs ${getStageBadgeStyle(stageName)}`}>
                {stageName}
              </span>
            </div>
          </div>

          {/* Project Title & Scope/Remarks */}
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
              {projectName}
            </h2>
            {projectBrief && (
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                {projectBrief}
              </p>
            )}
            <div className="mt-1.5 text-[11px] text-slate-400 font-medium">
              Last Updated on: <span className="font-semibold text-slate-600 dark:text-slate-300">{formatDate(lastUpdated)}</span>
            </div>
          </div>

          {/* Progress Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 border-y border-slate-100 dark:border-slate-800">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-[#0f417a] dark:text-blue-400 uppercase text-[11px] tracking-wide">
                  Physical Progress: <span className="text-slate-900 dark:text-white font-mono">{physicalProgress > 0 ? `${physicalProgress}%` : '-%'}</span>
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, physicalProgress))}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-[#0f417a] dark:text-blue-400 uppercase text-[11px] tracking-wide">
                  Financial Progress: <span className="text-slate-900 dark:text-white font-mono">{financialProgress > 0 ? `${financialProgress}%` : '-%'}</span>
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, financialProgress))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Metadata Grid (Matching legacy view format) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs pt-1">
            <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Project Type</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate" title={projectType}>{projectType}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Implementation Type</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate" title={implementationType}>{implementationType}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Project Category</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate" title={projectCategory}>{projectCategory}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Scheme</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate" title={schemeName}>{schemeName}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Initiative</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate" title={initiativeName}>{initiativeName}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Mode of Implementation</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate" title={modeOfImplementation}>{modeOfImplementation}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 col-span-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Implementing Agency</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate" title={implementingAgency}>{implementingAgency}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Project Initiated Date</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">{formatDate(initiatedDate)}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Targeted Completion Date</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">{formatDate(targetCompletionDate)}</span>
            </div>
          </div>

          {/* Costs Strip (Light cyan/slate box matching screenshot) */}
          <div className="bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200/80 dark:border-cyan-900/50 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs shadow-2xs">
            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Estimated Cost:</span>
              <strong className="text-emerald-700 dark:text-emerald-400 font-black font-mono text-sm mt-0.5 block">
                {estimatedCost ? `${formatCost(estimatedCost)} (in Cr)` : '- (in Cr)'}
              </strong>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Sanctioned Cost:</span>
              <strong className="text-slate-800 dark:text-slate-200 font-black font-mono text-sm mt-0.5 block">
                {sanctionedCost ? `${formatCost(sanctionedCost)} (in Cr)` : '- (in Cr)'}
              </strong>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Awarded Cost:</span>
              <strong className="text-slate-800 dark:text-slate-200 font-black font-mono text-sm mt-0.5 block">
                {awardedCost ? `${formatCost(awardedCost)} (in Cr)` : '- (in Cr)'}
              </strong>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Closure Cost:</span>
              <strong className="text-slate-800 dark:text-slate-200 font-black font-mono text-sm mt-0.5 block">
                {closureCost ? `${formatCost(closureCost)} (in Cr)` : '- (in Cr)'}
              </strong>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Technical Sanctioned Cost:</span>
              <strong className="text-slate-800 dark:text-slate-200 font-black font-mono text-sm mt-0.5 block">
                {techSanctionCost ? `${formatCost(techSanctionCost)} (in Cr)` : '- (in Cr)'}
              </strong>
            </div>
          </div>

        </div>

        {/* Right 4 Cols: Project Location Map, Photos, Documents */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Card 1: Project Location */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400" />
                <span>Project Location</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full font-mono">
                {stateName}
              </span>
            </div>

            {/* Map Preview View */}
            <div className="relative w-full h-44 bg-slate-100 dark:bg-slate-800 overflow-hidden group">
              <iframe
                title="Project Location Map"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCenter[1] - 0.25}%2C${mapCenter[0] - 0.25}%2C${mapCenter[1] + 0.25}%2C${mapCenter[0] + 0.25}&layer=mapnik&marker=${mapCenter[0]}%2C${mapCenter[1]}`}
                className="w-full h-full border-0 pointer-events-auto"
                loading="lazy"
              />
              <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
                <a
                  href={`https://www.openstreetmap.org/?mlat=${mapCenter[0]}&mlon=${mapCenter[1]}#map=12/${mapCenter[0]}/${mapCenter[1]}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 rounded-lg shadow hover:bg-white text-xs"
                  title="Open in OpenStreetMap"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Location tags footer */}
            <div className="p-3 bg-slate-50/60 dark:bg-slate-950/40 text-[11px] font-semibold space-y-1 text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">State(s)</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{stateName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">District(s)</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{districtName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Taluk(s)</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{talukName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Village(s)</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{villageName}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Project Photos */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400" />
                <span>Project Photos</span>
              </span>
              {imagesData.images.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full font-mono">
                  {imagesData.images.length} Photos
                </span>
              )}
            </div>

            <div className="p-3">
              {imagesData.images && imagesData.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {imagesData.images.map((img, idx) => (
                    <div
                      key={idx}
                      onClick={() => setPhotoModalImg(img)}
                      className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer group aspect-video bg-slate-100 dark:bg-slate-800"
                    >
                      <img
                        src={`data:image/jpeg;base64,${img.data}`}
                        alt={img.name || `Photo ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
                        <Eye className="h-4 w-4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 py-3 px-4 bg-rose-500/90 text-white rounded-xl text-xs font-bold text-center shadow-xs">
                  <Camera className="h-4 w-4 shrink-0" />
                  <span>No project photos available.</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Project Documents */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400" />
                <span>Project Documents</span>
              </span>
              {documents.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full font-mono">
                  {documents.length} Files
                </span>
              )}
            </div>

            <div className="p-3">
              {documents.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {documents.map((doc, idx) => {
                    const docName = doc.document_name || doc.name || `Document ${idx + 1}`;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 text-xs hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center space-x-2 min-w-0 pr-2">
                          <File className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span className="font-semibold text-slate-700 dark:text-slate-200 truncate text-[11px]" title={docName}>
                            {docName}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownloadDoc(docName)}
                          className="p-1 hover:bg-white dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 rounded-md transition cursor-pointer"
                          title="Download document"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 py-3 px-4 bg-rose-500/90 text-white rounded-xl text-xs font-bold text-center shadow-xs">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span>No project view documents available.</span>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Section: Funding Details (Collapsible) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setFundingOpen(!fundingOpen)}
          className="w-full px-6 py-3.5 bg-gradient-to-r from-slate-50 via-cyan-50/40 to-slate-50 dark:from-slate-800/80 dark:via-cyan-950/20 dark:to-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-left cursor-pointer transition select-none"
        >
          <span className="text-sm font-black uppercase tracking-wide text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
            <Coins className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
            <span>Funding Details</span>
          </span>
          <div className="p-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500">
            {fundingOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {fundingOpen && (
          <div className="p-6 space-y-4 animate-fade-in text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-500 dark:text-slate-400">Source of Funding:</span>
              <strong className="text-amber-700 dark:text-amber-400 font-extrabold text-sm">{sourceOfFundingName}</strong>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-3.5 gap-x-8 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Central Grant GIA:</span>
                <span className="font-black text-slate-800 dark:text-slate-100 font-mono">{gbs ? `${formatCost(gbs)} (in Cr)` : '- (in Cr)'}</span>
              </div>

              <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">IWTF (Bond Fund):</span>
                <span className="font-black text-slate-800 dark:text-slate-100 font-mono">{iwtf ? `${formatCost(iwtf)} (in Cr)` : '- (in Cr)'}</span>
              </div>

              <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">CESS:</span>
                <span className="font-black text-slate-800 dark:text-slate-100 font-mono">{cess ? `${formatCost(cess)} (in Cr)` : '- (in Cr)'}</span>
              </div>

              <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Multilateral Funding:</span>
                <span className="font-black text-slate-800 dark:text-slate-100 font-mono">{multilateral ? `${formatCost(multilateral)} (in Cr)` : '- (in Cr)'}</span>
              </div>

              <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">PMGSY / PMMSY:</span>
                <span className="font-black text-slate-800 dark:text-slate-100 font-mono">{pmgsy ? `${formatCost(pmgsy)} (in Cr)` : '- (in Cr)'}</span>
              </div>

              <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-1.5 bg-amber-50/50 dark:bg-amber-950/20 px-2 rounded-lg">
                <span className="text-amber-800 dark:text-amber-300 font-bold">PPP Private Component:</span>
                <span className="font-black text-amber-700 dark:text-amber-400 font-mono">{pppComp ? `${formatCost(pppComp)} (in Cr)` : (estimatedCost ? `${formatCost(estimatedCost)} (in Cr)` : '- (in Cr)')}</span>
              </div>

              <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Sagarmala:</span>
                <span className="font-black text-slate-800 dark:text-slate-100 font-mono">{sagarmalaComp ? `${formatCost(sagarmalaComp)} (in Cr)` : '- (in Cr)'}</span>
              </div>

              <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">State Devt. Fund:</span>
                <span className="font-black text-slate-800 dark:text-slate-100 font-mono">{stateFund ? `${formatCost(stateFund)} (in Cr)` : '- (in Cr)'}</span>
              </div>

              <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Others:</span>
                <span className="font-black text-slate-800 dark:text-slate-100 font-mono">{cess ? `${formatCost(cess)} (in Cr)` : '- (in Cr)'}</span>
              </div>
            </div>

            <div className="pt-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              Expenditure done till date: <span className="font-black text-emerald-700 dark:text-emerald-400 font-mono text-sm ml-1">{totalExp ? `₹ ${formatCost(totalExp)} (in Cr)` : '- (in Cr)'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Section: Timeline (Collapsible) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setTimelineOpen(!timelineOpen)}
          className="w-full px-6 py-3.5 bg-gradient-to-r from-slate-50 via-cyan-50/40 to-slate-50 dark:from-slate-800/80 dark:via-cyan-950/20 dark:to-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-left cursor-pointer transition select-none"
        >
          <span className="text-sm font-black uppercase tracking-wide text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
            <span>Timeline</span>
          </span>
          <div className="p-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500">
            {timelineOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {timelineOpen && (
          <div className="p-6 space-y-6 animate-fade-in">
            
            {/* Timeline Stage Tabs & Legend */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTimelineStage('planning_sanctioning')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition cursor-pointer ${
                    activeTimelineStage === 'planning_sanctioning'
                      ? 'bg-[#0f417a] text-white shadow'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  PLANNING & SANCTIONING
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTimelineStage('under_tendering')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition cursor-pointer ${
                    activeTimelineStage === 'under_tendering'
                      ? 'bg-[#0f417a] text-white shadow'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  UNDER TENDERING
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTimelineStage('under_implementation')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition cursor-pointer ${
                    activeTimelineStage === 'under_implementation'
                      ? 'bg-[#0f417a] text-white shadow'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  UNDER IMPLEMENTATION
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTimelineStage('completed')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition cursor-pointer ${
                    activeTimelineStage === 'completed'
                      ? 'bg-[#0f417a] text-white shadow'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  COMPLETED
                </button>
              </div>

              {/* Status Legend */}
              <div className="flex items-center space-x-4 text-[11px] font-bold text-slate-600 dark:text-slate-400 select-none">
                <div className="flex items-center space-x-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>On Time</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span>Delayed</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span>Not Applicable</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                  <span>N/A</span>
                </div>
              </div>
            </div>

            {/* Horizontal Timeline Milestone Stepper (Matching screenshot) */}
            <div className="overflow-x-auto py-6">
              <div className="min-w-[840px] relative">
                
                {/* Connecting horizontal line */}
                <div className="absolute top-3 left-6 right-6 h-1 bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500 rounded-full z-0" />

                {/* Milestone Nodes */}
                <div className="relative z-10 grid grid-cols-8 gap-2">
                  {UNDER_TENDERING_MILESTONES.map((m, idx) => {
                    const tenderRow = tenderDates.find(
                      (d) => Number(d.sub_stage_id) === m.id
                    );
                    const planned = tenderRow?.planned_date;
                    const actual = tenderRow?.actual_date;
                    const isNa = tenderRow?.not_applicable_date;

                    return (
                      <div key={m.id} className="flex flex-col items-center text-center">
                        {/* Circle node on the line */}
                        <div className="h-6 w-6 rounded-full bg-white dark:bg-slate-900 border-4 border-[#0f417a] dark:border-blue-400 shadow flex items-center justify-center mb-3">
                          <span className="text-[9px] font-bold text-[#0f417a] dark:text-blue-400">{idx + 1}</span>
                        </div>

                        {/* Milestone card underneath */}
                        <div className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center shadow-2xs space-y-1">
                          <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight min-h-[28px] flex items-center justify-center">
                            {m.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-200 dark:border-slate-700">
                            Target Date
                            <span className="block font-bold text-slate-700 dark:text-slate-300 font-mono">
                              {planned ? formatDate(planned) : 'N/A'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold">
                            Actual Date
                            <span className="block font-bold text-slate-700 dark:text-slate-300 font-mono">
                              {actual ? formatDate(actual) : (isNa ? 'Not Applicable' : 'N/A')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>

            {/* Stage Navigation Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const stages = ['planning_sanctioning', 'under_tendering', 'under_implementation', 'completed'];
                  const curIdx = stages.indexOf(activeTimelineStage);
                  if (curIdx < stages.length - 1) setActiveTimelineStage(stages[curIdx + 1]);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
              >
                Next Stage &rarr;
              </button>
            </div>

          </div>
        )}
      </div>

      {/* Photo Zoom Modal */}
      {photoModalImg && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPhotoModalImg(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold truncate">{photoModalImg.name || 'Project Photo'}</span>
              <button
                type="button"
                onClick={() => setPhotoModalImg(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center max-h-[75vh] overflow-hidden bg-slate-950">
              <img
                src={`data:image/jpeg;base64,${photoModalImg.data}`}
                alt={photoModalImg.name}
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
