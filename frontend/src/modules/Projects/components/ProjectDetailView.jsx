import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit, Calendar, DollarSign, Building2, Briefcase, FileText,
  CheckCircle2, AlertTriangle, Layers, Users, TrendingUp, Download, Eye,
  MapPin, Landmark, Coins, ShieldCheck, Clock, ArrowRight, ExternalLink,
  Anchor, ChevronDown, ChevronUp, ChevronLeft, Image, File, Check, X, Camera, RefreshCw,
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
import ProjectLocationMap from './ProjectLocationMap';

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

function formatCostWithUnit(val) {
  if (val === undefined || val === null || val === '' || val === '-' || isNaN(Number(val)) || Number(val) === 0) {
    return '(in Cr)';
  }
  return `${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (in Cr)`;
}

function formatDateYMD(dateStr) {
  if (!dateStr || dateStr === 'N/A' || dateStr === '-' || dateStr === 'null' || dateStr === 'undefined') return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return String(dateStr).slice(0, 10);
  }
}

function formatDate(dateStr) {
  if (!dateStr || dateStr === 'N/A' || dateStr === '-' || dateStr === 'null' || dateStr === 'undefined') return '-';
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
  const { id: paramId, projectId: paramProjectId, subProjectId: paramSubProjectId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryPid = searchParams.get('projectId') || searchParams.get('id');
  const querySubId = searchParams.get('subProjectId') || searchParams.get('subId');

  const pid = project?.projectId || project?.project_id || project?.raw?.project_id || propProjectId || paramProjectId || paramId || queryPid;
  const rawSubId = project?.subProjectId || project?.sub_project_id || project?.raw?.sub_project_id || propSubProjectId || paramSubProjectId || querySubId;
  const subId = rawSubId && rawSubId !== '-' && rawSubId !== 'null' ? String(rawSubId) : '-1';

  const handleBack = () => {
    if (typeof onBack === 'function') {
      onBack();
    } else {
      navigate('/projects/project/project-list');
    }
  };

  const handleEdit = (proj) => {
    if (typeof onEdit === 'function') {
      onEdit(proj);
    } else {
      navigate('/projects/project/input-form', { state: { editData: proj } });
    }
  };

  const [loading, setLoading] = useState(true);
  const [projectData, setProjectData] = useState(null);
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

  const p = { ...(project?.raw || {}), ...(project || {}), ...(projectData || {}) };

  const projectName = p.project_name || p.projectName || p.sub_project_name || p.subProjectName || project?.name || 'Project Details';
  const stageName = p.stage_name || p.stage || p.project_stage || p.projectStageName || 'Project Initiated';
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
  const projectType = p.project_type || p.projectType || p.project_type_name || 'Port Level Approval';
  const implementationType = p.implememtation_type || p.implementationType || p.implementation_type || 'Single Funded';
  const projectCategory = p.project_category_names || p.project_category || p.category || p.projectCategory || '-';
  const schemeName = p.scheme_name || p.scheme || 'Other Scheme';
  const initiativeName = p.initiative_names || p.initiative || 'others';
  const modeOfImplementation = p.mode_of_implememtation || p.modeOfImplementation || p.implementationMode || 'EPC';
  const implementingAgency = p.primary_ia_name || p.primaryImplementingAgency || p.ia_name || p.organisation_name || p.organisationName || p.agency || '-';
  const initiatedDate = p.project_intiated_date || p.projectInitiatedDate || p.project_initiated_date || '-';
  const targetCompletionDate = p.target_completion_date || p.targetCompletionDate || '-';
  const lastUpdated = p.last_updated || p.lastUpdated || initiatedDate || '-';
  const projectBrief = p.project_brief || p.projectBrief || p.remarks || p.drop_remarks || '';

  const physicalProgress = Number(p.physical_progress ?? p.physicalProgress ?? 0);
  const financialProgress = Number(p.financial_progress ?? p.financialProgress ?? 0);

  const estimatedCost = p.estimated_cost ?? p.estimatedCost ?? p.project_cost ?? p.cost;
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

  const sourceOfFundingName = p.source_of_funding_names || p.sourceOfFunding || 'IEBR (Own Fund)';

  // Funding Breakdown
  const gbs = p.gbs_components ?? p.gbsComponents;
  const multilateral = p.multilateral_components ?? p.multilateralComponents ?? p.multiFundComponents;
  const sagarmalaComp = p.sagarmala_components ?? p.sagarmalaComponents;
  const iwtf = p.loans_components ?? p.loansComponents;
  const pmgsy = p.pmmsy_components ?? p.pmmsyComponents;
  const stateFund = p.state_gov_fund_components ?? p.stateGovFundComponents;
  const cess = p.other_source_funding_comp ?? p.otherSourceFundingComp;
  const pppComp = p.ppp_components ?? p.pppComponents;
  const iebr = p.iebr_components ?? p.iebrComponents;
  const totalExp = p.total_expenditure ?? p.expenditure_till_date ?? p.expenditureTillDate;

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

  const projectDocsOnly = useMemo(() => {
    return (documents || []).filter((doc) => {
      const type = String(doc.document_type || doc.folder_name || '').toLowerCase();
      const name = String(doc.document_name || doc.name || doc.file_name || '').toLowerCase();
      const isImage =
        type === 'project_images' ||
        type === 'images' ||
        type === 'photo' ||
        /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(name);
      return !isImage;
    });
  }, [documents]);

  const projectPhotosOnly = useMemo(() => {
    const list = Array.isArray(imagesData?.images) ? [...imagesData.images] : [];
    (documents || []).forEach((doc) => {
      const type = String(doc.document_type || doc.folder_name || '').toLowerCase();
      const docName = doc.document_name || doc.name || doc.file_name;
      const isImage =
        type === 'project_images' ||
        type === 'images' ||
        type === 'photo' ||
        /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(String(docName || '').toLowerCase());
      if (isImage && docName) {
        const alreadyExists = list.some((item) => (item.name || item.document_name) === docName);
        if (!alreadyExists) {
          list.push({
            name: docName,
            document_name: docName,
            createdDate: doc.created_date,
            url: `${API_BASE}/download-project-document/${pid}/${subId}/${encodeURIComponent(docName)}`,
            data: doc.data || null,
          });
        }
      }
    });
    return list;
  }, [imagesData, documents, pid, subId]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in text-slate-800 dark:text-slate-100 mb-12">
      
      {/* Module Header UI with Dark Blue Gradient Background & White Text */}
      <div className="relative flex flex-wrap items-center justify-between gap-4 px-[26px] py-5 border-b border-[#0a2d55]/40 bg-gradient-to-r from-[#0f417a] via-[#154b87] to-[#1c5999] text-white shadow-xs select-none">
        <div className="flex items-center gap-3.5 flex-1 min-w-[300px]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-blue-200" strokeWidth={2.5} />
              <span className="text-[10.5px] uppercase tracking-[0.12em] font-extrabold text-blue-200">
                Projects Module • View Project Details
              </span>
            </div>
            <h3 className="m-0 text-xl font-black tracking-wide text-white uppercase leading-tight">
              {projectName}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs font-medium text-blue-100/90">
              <span>Ministry of Ports, Shipping and Waterways</span>
              <span className="text-blue-200/60">•</span>
              <span>Project ID: <strong className="text-white font-mono font-bold">{pid}</strong></span>
              {subId !== '-1' && subId !== '' && (
                <>
                  <span className="text-blue-200/60">•</span>
                  <span>Sub Project ID: <strong className="text-white font-mono font-bold">{subId}</strong></span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-2 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-blue-100" />
            <span>Back to List</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={() => handleEdit(p)}
              className="px-4 py-2 bg-white hover:bg-blue-50 text-[#0f417a] text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Edit className="h-3.5 w-3.5 text-[#0f417a]" />
              <span>Edit Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Body: Contains All Sections */}
      <div className="p-6 space-y-6">

        {/* Row 1: Project Details (Left 8 Cols) & Project Location (Right 4 Cols) - Exact matching height */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* Left 8 Cols: Card 1: Project Details (Spacious layout with increased height) */}
          <div className="lg:col-span-8 flex flex-col">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden h-full flex flex-col justify-between">
              
              {/* Blue Header UI matching YP Input Form */}
              <div className="bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] px-6 py-3.5 flex items-center justify-between text-white border-b border-[#0a2d55]/20 shrink-0">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-white" />
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Project Details
                  </h3>
                </div>
              </div>

              <div className="p-6 sm:p-7 space-y-5 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Line 1: Project Title on Left, Top Row IDs & Stage Badge on Right */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight uppercase">
                      {projectName}
                    </h2>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs shrink-0">
                      <div>
                        <span className="text-slate-600 dark:text-slate-400 font-medium mr-1.5">Project ID:</span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer">{pid}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 dark:text-slate-400 font-medium mr-1.5">Sub Project ID:</span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium">{subId !== '-1' && subId !== '' ? subId : ''}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 dark:text-slate-400 font-medium mr-1.5">Sagarmala Project ID:</span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium">{sagarmalaId !== '-' ? sagarmalaId : ''}</span>
                      </div>
                      {isSagarmala && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-50 text-[#0f417a] border border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800">
                          <Anchor className="h-3 w-3 text-[#0f417a] dark:text-sky-300 shrink-0" />
                          <span>Sagarmala</span>
                        </span>
                      )}
                      <span className="px-3.5 py-1 rounded-full text-xs font-bold text-white bg-[#6f42c1] shadow-2xs">
                        {stageName}
                      </span>
                    </div>
                  </div>

                  {/* Line 2: Scope/Brief on Left, Physical & Financial Progress on Right */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-1 pb-1">
                    <p className="font-bold text-slate-800 dark:text-slate-200 leading-normal uppercase">
                      {projectBrief || projectName}
                    </p>

                    <div className="flex items-center gap-x-6 gap-y-1 font-bold text-blue-600 dark:text-blue-400 shrink-0">
                      <div>
                        Physical Progress: <span className="font-bold ml-1">{physicalProgress > 0 ? `${physicalProgress} %` : '0 %'}</span>
                      </div>
                      <div>
                        Financial Progress: <span className="font-bold ml-1">{financialProgress > 0 ? `${Number(financialProgress).toFixed(2)} %` : '0 %'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Line 3: Last updated date */}
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-normal pb-1">
                    Last Updated on: <span className="text-slate-600 dark:text-slate-300 font-medium">{formatDateYMD(lastUpdated)}</span>
                  </div>

                  {/* Metadata Grid (Structured cards with comfortable height) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs p-4 bg-slate-50/80 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between min-h-[58px]">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold uppercase tracking-wider leading-tight">Project Type</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 mt-1 block text-xs break-words leading-tight">{projectType}</span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between min-h-[58px]">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold uppercase tracking-wider leading-tight">Implementation Type</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 mt-1 block text-xs break-words leading-tight">{implementationType}</span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between min-h-[58px]">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold uppercase tracking-wider leading-tight">Project Category</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 mt-1 block text-xs break-words leading-tight">{projectCategory}</span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between min-h-[58px]">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold uppercase tracking-wider leading-tight">Scheme</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 mt-1 block text-xs break-words leading-tight">{schemeName}</span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between min-h-[58px]">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold uppercase tracking-wider leading-tight">Initiative</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 mt-1 block text-xs break-words leading-tight">{initiativeName}</span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between min-h-[58px]">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold uppercase tracking-wider leading-tight">Mode of Implementation</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 mt-1 block text-xs break-words leading-tight">{modeOfImplementation}</span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between min-h-[58px]">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold uppercase tracking-wider leading-tight">Implementing Agency</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 mt-1 block text-xs break-words leading-tight">{implementingAgency}</span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between min-h-[58px]">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold uppercase tracking-wider leading-tight">Project Initiated Date</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 mt-1 block text-xs break-words leading-tight">{formatDateYMD(initiatedDate)}</span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between min-h-[58px]">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold uppercase tracking-wider leading-tight">Targeted Completion Date</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 mt-1 block text-xs break-words leading-tight">{formatDateYMD(targetCompletionDate)}</span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between min-h-[58px]">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold uppercase tracking-wider leading-tight">Land Requirement</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 mt-1 block text-xs break-words leading-tight">
                        {p.land_area_req ? `${p.land_area_req} Ha` : 'Not Required'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Costs Strip (Light cyan/aqua box matching screenshot exactly) */}
                <div className="bg-gradient-to-r from-[#e0f7fa]/80 to-[#b2ebf2]/40 dark:bg-cyan-950/20 border border-[#b2ebf2] dark:border-cyan-900/50 rounded-xl p-4.5 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-y-3.5 gap-x-6 text-xs shadow-2xs mt-2">
                  <div className="space-y-2">
                    <div className="text-slate-700 dark:text-slate-300">
                      <span className="font-normal text-slate-600 dark:text-slate-400">Estimated Cost : </span>
                      <strong className="text-slate-800 dark:text-slate-200 font-bold font-mono">
                        {formatCostWithUnit(estimatedCost)}
                      </strong>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300">
                      <span className="font-normal text-slate-600 dark:text-slate-400">Awarded Cost : </span>
                      <strong className="text-slate-800 dark:text-slate-200 font-bold font-mono">
                        {formatCostWithUnit(awardedCost)}
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-slate-700 dark:text-slate-300">
                      <span className="font-normal text-slate-600 dark:text-slate-400">Sanctioned Cost : </span>
                      <strong className="text-slate-800 dark:text-slate-200 font-bold font-mono">
                        {formatCostWithUnit(sanctionedCost)}
                      </strong>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300">
                      <span className="font-normal text-slate-600 dark:text-slate-400">Closure Cost : </span>
                      <strong className="text-slate-800 dark:text-slate-200 font-bold font-mono">
                        {formatCostWithUnit(closureCost)}
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-slate-700 dark:text-slate-300">
                      <span className="font-normal text-slate-600 dark:text-slate-400">Technical Sanctioned Cost : </span>
                      <strong className="text-slate-800 dark:text-slate-200 font-bold font-mono">
                        {formatCostWithUnit(techSanctionCost)}
                      </strong>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Right 4 Cols: Card 1: Project Location - Matches exact height of Project Details */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden h-full flex flex-col justify-between">
              <div className="px-5 py-3.5 bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] text-white flex items-center justify-between border-b border-[#0a2d55]/20 shrink-0">
                <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-white" />
                  <span>Project Location</span>
                </span>
              </div>

              <div className="p-4 sm:p-5 flex-1 flex flex-col space-y-3.5 justify-between">
                {/* Location Details Box */}
                <div className="p-3 bg-slate-50/80 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0">
                  <div className="flex flex-col pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">State(s)</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5" title={stateName}>{stateName}</span>
                  </div>
                  <div className="flex flex-col pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">District(s)</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5" title={districtName}>{districtName}</span>
                  </div>
                  <div className="flex flex-col pt-0.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Taluka(s)</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5" title={talukName}>{talukName}</span>
                  </div>
                  <div className="flex flex-col pt-0.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Village(s)</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5" title={villageName}>{villageName}</span>
                  </div>
                </div>

                {/* Interactive Leaflet Map: Stretches to fill remaining card height */}
                <div className="flex-1 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 min-h-[260px]">
                  <ProjectLocationMap
                    project={p}
                    stateName={stateName}
                    districtName={districtName}
                    talukName={talukName}
                    villageName={villageName}
                    projectName={projectName}
                    stageName={stageName}
                    cost={estimatedCost || sanctionedCost || awardedCost}
                    height="100%"
                    className="h-full w-full"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Row 2: Funding Details (Left 8 Cols) & Photos / Documents (Right 4 Cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* Left 8 Cols: Card 2: Funding Details (Natural compact height) */}
          <div className="lg:col-span-8">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => setFundingOpen(!fundingOpen)}
                className="w-full px-5 py-3 bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] text-white flex items-center justify-between text-left cursor-pointer transition select-none border-b border-[#0a2d55]/20"
              >
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-white" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    Funding Details
                  </span>
                </div>
                <div className="text-white">
                  {fundingOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>

              {fundingOpen && (
                <div className="p-6 space-y-5 animate-fade-in text-xs">
                  {/* Top Source of Funding Line */}
                  <div className="text-xs">
                    <span className="font-bold text-[#d9534f] dark:text-orange-400">Source of funding: </span>
                    <strong className="font-bold text-[#d9534f] dark:text-orange-400">{sourceOfFundingName || 'IEBR (Own Fund)'}</strong>
                  </div>

                  {/* 3 Columns Grid with Dotted Dividers */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-8 pt-1">
                    
                    {/* Column 1 */}
                    <div className="space-y-4 pr-4">
                      <div>
                        <div className="text-slate-700 dark:text-slate-300 font-semibold text-xs">Central Grant GIA</div>
                        <div className="text-slate-500 dark:text-slate-400 font-medium text-xs mt-0.5 font-mono">
                          {formatCostWithUnit(gbs)}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-700 dark:text-slate-300 font-semibold text-xs">Multilateral Funding</div>
                        <div className="text-slate-500 dark:text-slate-400 font-medium text-xs mt-0.5 font-mono">
                          {formatCostWithUnit(multilateral)}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-700 dark:text-slate-300 font-semibold text-xs">Sagarmala</div>
                        <div className="text-slate-500 dark:text-slate-400 font-medium text-xs mt-0.5 font-mono">
                          {formatCostWithUnit(sagarmalaComp)}
                        </div>
                      </div>
                    </div>

                    {/* Column 2 (Divided by vertical dotted line) */}
                    <div className="space-y-4 md:border-l md:border-dotted md:border-slate-300 dark:md:border-slate-700 md:pl-6">
                      <div>
                        <div className="text-slate-700 dark:text-slate-300 font-semibold text-xs">IEBR (Own Fund)</div>
                        <div className="text-slate-800 dark:text-slate-200 font-bold text-xs mt-0.5 font-mono">
                          {formatCostWithUnit(iebr || (String(sourceOfFundingName || '').includes('IEBR') ? (estimatedCost || sanctionedCost || awardedCost) : null))}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-700 dark:text-slate-300 font-semibold text-xs">PMMSY</div>
                        <div className="text-slate-500 dark:text-slate-400 font-medium text-xs mt-0.5 font-mono">
                          {formatCostWithUnit(pmgsy)}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-700 dark:text-slate-300 font-semibold text-xs">State Govt Fund</div>
                        <div className="text-slate-500 dark:text-slate-400 font-medium text-xs mt-0.5 font-mono">
                          {formatCostWithUnit(stateFund)}
                        </div>
                      </div>
                    </div>

                    {/* Column 3 (Divided by vertical dotted line) */}
                    <div className="space-y-4 md:border-l md:border-dotted md:border-slate-300 dark:md:border-slate-700 md:pl-6">
                      <div>
                        <div className="text-slate-700 dark:text-slate-300 font-semibold text-xs">Loans</div>
                        <div className="text-slate-500 dark:text-slate-400 font-medium text-xs mt-0.5 font-mono">
                          {formatCostWithUnit(iwtf)}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-700 dark:text-slate-300 font-semibold text-xs">PPP Private Component</div>
                        <div className="text-slate-500 dark:text-slate-400 font-medium text-xs mt-0.5 font-mono">
                          {formatCostWithUnit(pppComp)}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-700 dark:text-slate-300 font-semibold text-xs">Others</div>
                        <div className="text-slate-500 dark:text-slate-400 font-medium text-xs mt-0.5 font-mono">
                          {formatCostWithUnit(cess)}
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Bottom Row: Expenditure done till date */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="font-bold text-[#d9534f] dark:text-orange-400">Expenditure done till date: </span>
                    <strong className="font-bold text-[#d9534f] dark:text-orange-400 font-mono">
                      {formatCostWithUnit(totalExp)}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right 4 Cols: Side-by-side Grid: Project Photos & Project Documents - Matching height */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 h-full items-stretch flex-1">
              {/* Card 2: Project Photos */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col h-full justify-between">
                <div className="px-4 py-2.5 bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] text-white flex items-center justify-between border-b border-[#0a2d55]/20 shrink-0">
                  <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-white" />
                    <span>Project Photos</span>
                  </span>
                  {projectPhotosOnly?.length > 0 && (
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                      {projectPhotosOnly.length} {projectPhotosOnly.length === 1 ? 'Photo' : 'Photos'}
                    </span>
                  )}
                </div>

                <div className="p-3 flex-1 flex flex-col w-full h-full min-h-0 justify-center">
                  {projectPhotosOnly && projectPhotosOnly.length > 0 ? (
                    projectPhotosOnly.length === 1 ? (
                      <div
                        onClick={() => setPhotoModalImg(projectPhotosOnly[0])}
                        className="relative w-full h-full flex-1 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer group bg-slate-100 dark:bg-slate-800 min-h-[150px]"
                      >
                        <img
                          src={projectPhotosOnly[0].data ? `data:image/jpeg;base64,${projectPhotosOnly[0].data}` : projectPhotosOnly[0].url}
                          alt={projectPhotosOnly[0].name || 'Project Photo'}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                          <Eye className="h-4 w-4" />
                          <span>View Full Photo</span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 h-full flex-1 w-full min-h-0 overflow-y-auto">
                        {projectPhotosOnly.map((img, idx) => (
                          <div
                            key={idx}
                            onClick={() => setPhotoModalImg(img)}
                            className="relative w-full h-full min-h-[100px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer group bg-slate-100 dark:bg-slate-800"
                          >
                            <img
                              src={img.data ? `data:image/jpeg;base64,${img.data}` : img.url}
                              alt={img.name || `Photo ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
                              <Eye className="h-4 w-4" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-3 px-3 bg-[#d9534f] text-white rounded-xl text-xs font-medium text-center shadow-xs my-auto">
                      <Camera className="h-3.5 w-3.5 shrink-0" />
                      <span>No project photos available.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 3: Project Documents */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col h-full justify-between">
                <div className="px-4 py-2.5 bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] text-white flex items-center justify-between border-b border-[#0a2d55]/20 shrink-0">
                  <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-white" />
                    <span>Project Documents</span>
                  </span>
                </div>

                <div className="p-3.5 flex-1 flex flex-col justify-center">
                  {projectDocsOnly.length > 0 ? (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 flex-1">
                      {projectDocsOnly.map((doc, idx) => {
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
                    <div className="flex items-center justify-center gap-2 py-2 px-3 bg-[#d9534f] text-white rounded-lg text-xs font-medium text-center shadow-xs my-auto">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span>No project documents available.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Section: Timeline (Collapsible) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setTimelineOpen(!timelineOpen)}
            className="w-full px-6 py-3.5 bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] text-white flex items-center justify-between text-left cursor-pointer transition select-none border-b border-[#0a2d55]/20"
          >
            <span className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-white" />
              <span>Timeline</span>
            </span>
            <div className="text-white">
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
                src={photoModalImg.data ? `data:image/jpeg;base64,${photoModalImg.data}` : photoModalImg.url}
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
