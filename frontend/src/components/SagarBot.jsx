import  { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
 MessageSquare, X, Minus, Maximize2, Minimize2, Send, 
  RotateCcw, Sparkles, 
  Search,  ThumbsUp, ThumbsDown, ArrowRight,
  BarChart3, FileSpreadsheet, CheckCircle2, Download, Copy
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useAICopilot } from '../context/AICopilotContext';
import { AI_MODULE_QUERY_ENDPOINT } from '../config/api';
import { MOCK_AI_RESPONSES } from '../config/mockAiResponses';

// Comprehensive Sagarmanthan Knowledge Base
const KNOWLEDGE_BASE = [
  {
    id: 'csr-overview',
    category: 'CSR Projects',
    keywords: ['csr', 'corporate social responsibility', 'csr project', 'csr fund', 'csr module'],
    question: 'What is the CSR Projects Module and how does it work?',
    answer: `The **CSR Projects Module** tracks Corporate Social Responsibility initiatives and statutory fund allocations across Major Ports and Maritime Organisations under the Ministry of Ports, Shipping and Waterways (MoPSW).

**Key Capabilities:**
* **CSR Fund Details**: Track annual Net Profits, 2% CSR Allotted Fund, Opening Balances, and Available Balance.
* **CSR Project List**: Monitor individual project deliverables, Physical % and Financial % progress, target beneficiaries, and outcome impact.
* **Multi-Year Expenditure**: Record and break down expenditures year-by-year against sanctioned project values.
* **Reports**: View **C.S.R 1.0 A (Overview of CSR Projects)** and **C.S.R 1.1 (Overview of CSR Fund)** with interactive drilldowns.`,
    link: '/projects/csr-projects/dashboard',
    linkLabel: 'Go to CSR Dashboard'
  },
  {
    id: 'csr-expenditure',
    category: 'CSR Projects',
    keywords: ['csr expenditure', 'yearly expenditure', 'log expenditure', 'fund cost', 'add expenditure'],
    question: 'How do I record yearly CSR project expenditures?',
    answer: `To log or update yearly expenditures for a CSR project:

1. Navigate to **CSR Projects > Input Form** (or click **Edit** on any project in the Project List).
2. Scroll to the **Yearly Expenditure Details** section.
3. Select the **Financial Year** and enter the **Expenditure Cost (in ₹ Cr)**.
4. Click **+ Add Year** to append multi-year entries.
5. The system automatically recalculates the cumulative expenditure and updates the organisation's available CSR fund balance!`,
    link: '/projects/csr-projects/input-form',
    linkLabel: 'Open CSR Input Form'
  },
  {
    id: 'csr-status-stages',
    category: 'CSR Projects',
    keywords: ['csr stage', 'csr status', 'project status', 'stages of csr', 'approved by board'],
    question: 'What are the implementation stages of CSR Projects?',
    answer: `CSR Projects progress through 4 key milestones:

1. 🟡 **Approved by Board**: Project proposal sanctioned and authorized by the port/organisation board.
2. 🟠 **Project yet to Start**: Pre-implementation stage where tenders, procurement, or site clearances are being finalized.
3. 🟣 **Project Under implementation**: Active physical execution and milestone delivery on site.
4. 🟢 **Completed**: Final physical outcome accomplished, completion certificate uploaded, and accounts finalized.`,
    link: '/projects/csr-projects/project-list',
    linkLabel: 'View Project List'
  },
  {
    id: 'miv-overview',
    category: 'Maritime Vision 2030',
    keywords: ['miv', 'miv 2030', 'maritime india vision', 'vision 2030', 'theme', 'initiatives'],
    question: 'What is Maritime India Vision 2030 (MIV 2030)?',
    answer: `**Maritime India Vision 2030 (MIV 2030)** is the flagship 10-year strategic blueprint formulated by MoPSW to propel India's maritime sector to global standards.

**Structure:**
* **10 Strategic Themes** covering Port Modernization, World-Class Infrastructure, Green Ports, Inland Waterways, and Cruise Tourism.
* **150+ Actionable Initiatives** mapped across responsible ports and nodal organisations.
* **Quarterly Deliverables & Milestones** tracked for timely physical and financial completion.`,
    link: '/strategies/miv-2030/dashboard',
    linkLabel: 'Open MIV 2030 Dashboard'
  },
  {
    id: 'gmis-mou',
    category: 'GMIS & MoUs',
    keywords: ['gmis', 'mou', 'global maritime india summit', 'imw', 'navic', 'vibhas', 'partner'],
    question: 'How does the GMIS & IMW MoUs tracking system work?',
    answer: `The **GMIS & IMW MoU Module** monitors all investment commitments, partnerships, and Memoranda of Understanding signed during Global Maritime India Summits (GMIS 2016, 2021, 2023, 2025) and India Maritime Week (IMW).

**Key Tracking Metrics:**
* **MoU Sanction Amount & Revised Amount** (₹ Cr).
* **NAVIC / VIBHAS Project Cells** overseeing operationalization.
* **Nature of Second Party** (National, International, Joint Venture, State Govt, Private).
* **Physical & Financial Execution Stages** with document attachments.`,
    link: '/strategies/gmis-mou/dashboard',
    linkLabel: 'Open GMIS MoU Dashboard'
  },
  {
    id: 'vip-reference-stages',
    category: 'VIP Reference',
    keywords: ['vip', 'vip reference', 'stages', 'vip stage', '6 stages', 'disposed', 'reference received'],
    question: 'What are the 6 stages in the VIP Reference lifecycle?',
    answer: `VIP References (communications from Hon'ble MPs, Ministers, and Dignitaries) follow a strict 6-stage time-bound monitoring process:

1. **Stage 1 - Reference Received**: Date of receipt recorded *(Mandatory)*.
2. **Stage 2 - Sent to Wing / Organisation**: Assigned to nodal division.
3. **Stage 3 - Comments Received**: Technical feedback and factual report received.
4. **Stage 4 - Draft Prepared**: Final reply draft compiled.
5. **Stage 5 - Submitted for Approval**: Submitted to competent authority.
6. **Stage 6 - Disposed**: Final response dispatched and reference marked closed.`,
    link: '/governance/vip-reference/data-list',
    linkLabel: 'View VIP Reference Registry'
  },
  {
    id: 'reports-export',
    category: 'Reports & Export',
    keywords: ['export', 'excel', 'pdf', 'csv', 'print', 'download report', 'export to excel'],
    question: 'How do I filter, search, and export reports to Excel or PDF?',
    answer: `All tabular data and master reports in Sagarmanthan include unified export and grid tools:

* **Export to Excel (CSV)**: Click the **Export** button at the top right of the grid and choose *Export to Excel*.
* **Export / Print PDF**: Select *Export to PDF* to generate a formatted printable document with headers and date stamps.
* **Copy TSV**: Click **Copy** to copy formatted tabular data directly for paste into spreadsheets.
* **Filters & Search**: Use the column headers or top Filter bar to filter by Organisation, Financial Year, or Stage.`,
    link: '/projects/csr-projects/reports',
    linkLabel: 'Explore CSR Reports'
  },
  {
    id: 'general-sagarmanthan',
    category: 'General',
    keywords: ['what is sagarmanthan', 'about sagarmanthan', 'platform', 'ministry', 'portal'],
    question: 'What is Sagarmanthan and what modules are available?',
    answer: `**Sagarmanthan** is the comprehensive digital command and monitoring dashboard for the **Ministry of Ports, Shipping and Waterways (MoPSW), Government of India**.

**Core Pillars:**
* 🚢 **Projects**: Project Monitoring, CSR Projects, Drop Requests.
* 📊 **KPI Tracking**: Major Ports operational performance, Berth productivity.
* 🏛️ **Governance**: VIP References, Cabinet Notes, Parliamentary Issues, GeM Procurement, CPGRAMS, E-Office.
* 🎯 **Strategies**: Maritime India Vision 2030 (MIV), GMIS MoUs, Vision 2047.
* ⚖️ **Legal & Rules**: Court Cases, Acts & Pre-Constitutions Rules.`,
    link: '/',
    linkLabel: 'Go to Home Overview'
  }
];

const QUICK_TOPICS = [
  { label: '🚢 Chennai Port Ongoing Projects', query: 'Show all ongoing projects for Chennai port' },
  { label: '📋 Consultant Appointments Details', query: 'List out all the consultant appointment with their important details' },
  { label: '🚢 CSR Projects & Fund', query: 'What is CSR Projects Module?' },
  { label: '📈 MIV 2030 Vision', query: 'What is Maritime India Vision 2030?' },
  { label: '🏛️ VIP Reference 6 Stages', query: 'What are the 6 stages in VIP Reference?' },
  { label: '🌐 GMIS & IMW MoUs', query: 'How does GMIS MoU tracking work?' },
];

// SagarBot Mascot Emblem SVG Logo Component
export function SagarBotLogo({ className = "w-6 h-6", glowing = true }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${glowing ? 'filter drop-shadow-[0_0_8px_rgba(56,189,248,0.7)]' : ''}`}>
      <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Antenna */}
        <circle cx="24" cy="4" r="2.8" fill="#38bdf8" />
        <circle cx="24" cy="4" r="1.3" fill="#ffffff" />
        <line x1="24" y1="6.8" x2="24" y2="10.5" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" />
        
        {/* Ear bolts */}
        <rect x="5" y="19" width="3.5" height="8" rx="1.5" fill="#0b2545" stroke="#38bdf8" strokeWidth="1" />
        <rect x="39.5" y="19" width="3.5" height="8" rx="1.5" fill="#0b2545" stroke="#38bdf8" strokeWidth="1" />
        
        {/* Main Helmet Frame */}
        <rect x="7" y="10" width="34" height="28" rx="9" fill="url(#sagarLogoHelmetGrad)" stroke="#38bdf8" strokeWidth="2" />
        
        {/* Dark Visor Screen */}
        <rect x="11" y="15" width="26" height="17" rx="6" fill="#060f1e" stroke="#0284c7" strokeWidth="1.2" />
        
        {/* Glowing Cyan Eyes */}
        <circle cx="18" cy="23" r="3.2" fill="#38bdf8" />
        <circle cx="18" cy="22.2" r="1.3" fill="#ffffff" />
        
        <circle cx="30" cy="23" r="3.2" fill="#38bdf8" />
        <circle cx="30" cy="22.2" r="1.3" fill="#ffffff" />
        
        {/* Friendly Smile */}
        <path d="M21 28 Q24 30.5 27 28" stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        
        {/* Neck base */}
        <rect x="20" y="38" width="8" height="4" rx="1" fill="#0284c7" />

        <defs>
          <linearGradient id="sagarLogoHelmetGrad" x1="7" y1="10" x2="41" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" />
            <stop offset="0.4" stopColor="#e0f2fe" />
            <stop offset="1" stopColor="#0284c7" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function SagarBot() {
  const navigate = useNavigate();
  const { 
    isOpen, 
    setIsOpen, 
    isReportMode, 
    activeReport, 
    pendingPrompt, 
    setPendingPrompt 
  } = useAICopilot();

  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'table_preview'
  const [previewReport, setPreviewReport] = useState(null);
  const [tableSearch, setTableSearch] = useState('');
  
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState({});

  // Active display report (either custom dynamic report or module active report)
  const activeDisplayReport = previewReport || activeReport;

  const [messages, setMessages] = useState([
    {
      id: 'welcome-msg',
      sender: 'bot',
      text: `👋 **Hai! I am SagarBot**, your intelligent AI Assistant for **Sagarmanthan**.\n\nI can analyze **Reports**, summarize **Key Metrics**, and answer any questions across all modules.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: QUICK_TOPICS
    }
  ]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Dynamic Report Suggestions
  const reportSuggestions = useMemo(() => {
    if (!isReportMode || !activeReport) return [];
    return [
      { label: '💡 Summarize Key Stats', query: `Summarize key insights and figures for ${activeReport.reportTitle || 'this report'}` },
      { label: '📈 Highest & Lowest Breakdown', query: `Highlight the highest and lowest counts in ${activeReport.reportTitle || 'this report'}` },
      { label: '⚠️ Check Zero or Missing Data', query: `Check for zero entries or anomalies in ${activeReport.reportTitle || 'this report'}` },
      { label: '📋 Explain Column Metrics', query: `Explain the columns and data structure in ${activeReport.reportTitle || 'this report'}` }
    ];
  }, [isReportMode, activeReport]);

  // Handle opening table preview in expanded mode
  const handleOpenTablePreview = useCallback((reportToPreview = null) => {
    if (reportToPreview) {
      setPreviewReport(reportToPreview);
    } else if (activeReport) {
      setPreviewReport(activeReport);
    }
    setIsExpanded(true);
    setIsMinimized(false);
    setActiveTab('table_preview');
  }, [activeReport]);

  // Handle exporting table data as Excel (.xlsx) or CSV (.csv)
  const handleDownloadTableData = useCallback((format = 'xlsx', customReport = null) => {
    const target = customReport || activeDisplayReport;
    if (!target || !Array.isArray(target.data) || target.data.length === 0) {
      alert('No data available to download in this report.');
      return;
    }

    try {
      const title = target.reportTitle || `${target.moduleName || 'Dynamic'}_Report`;
      const cleanTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_');
      const timestamp = new Date().toISOString().slice(0, 10);
      const fileName = `${cleanTitle}_${timestamp}`;

      // Map rows with clean headers if columns are defined
      const exportData = target.data.map(row => {
        if (!target.columns || target.columns.length === 0) return row;
        const cleanRow = {};
        target.columns.forEach(col => {
          const header = col.headerName || col.field;
          const val = row[col.field] !== undefined ? row[col.field] : (row[col.headerName] !== undefined ? row[col.headerName] : '');
          cleanRow[header] = val;
        });
        return cleanRow;
      });

      if (format === 'csv') {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${fileName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sagarmanthan_Data");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      }
    } catch (err) {
      console.error('Failed to export table data:', err);
    }
  }, [activeDisplayReport]);

  // Handle pending external prompts
  useEffect(() => {
    if (pendingPrompt) {
      handleSend(pendingPrompt);
      setPendingPrompt(null);
    }
  }, [pendingPrompt, setPendingPrompt]);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isOpen, isMinimized]);

  // Natural Language Search Matcher
  const findAnswer = (query) => {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return null;

    let bestMatch = null;
    let highestScore = 0;

    KNOWLEDGE_BASE.forEach(item => {
      let score = 0;
      if (item.question.toLowerCase().includes(cleanQuery)) {
        score += 10;
      }
      
      item.keywords.forEach(kw => {
        if (cleanQuery.includes(kw)) score += 5;
        const words = kw.split(' ');
        words.forEach(w => {
          if (w.length > 2 && cleanQuery.includes(w)) score += 2;
        });
      });

      if (score > highestScore) {
        highestScore = score;
        bestMatch = item;
      }
    });

    if (highestScore >= 3 && bestMatch) {
      return {
        text: bestMatch.answer,
        link: bestMatch.link,
        linkLabel: bestMatch.linkLabel,
        related: KNOWLEDGE_BASE.filter(k => k.id !== bestMatch.id && k.category === bestMatch.category).map(k => k.question)
      };
    }

    return {
      text: `I couldn't find an exact match for **"${query}"** in the Sagarmanthan manual.\n\nHere are some common topics you might find helpful:`,
      suggestions: QUICK_TOPICS
    };
  };

  // Detect module context dynamically
  const detectModuleName = (queryText = '') => {
    // 1. Explicit keyword override in question if user asks about a different specific module
    const cleanQ = (queryText || '').toLowerCase();
    if (cleanQ.includes('young professional') || cleanQ.includes('yp candidate') || cleanQ.includes('yp report') || cleanQ.includes('yp list')) {
      return 'Young Professionals';
    }
    if (cleanQ.includes('consultant')) return 'Consultant Appointments';
    if (cleanQ.includes('csr') || cleanQ.includes('corporate social')) return 'CSR Projects';
    if (cleanQ.includes('land')) return 'Land Management';
    if (cleanQ.includes('miv') || cleanQ.includes('vision 2030')) return 'Maritime India Vision 2030';
    if (cleanQ.includes('vip')) return 'VIP Reference';
    if (cleanQ.includes('gmis') || cleanQ.includes('mou')) return 'GMIS MoU';

    // 2. Active registered report context (from useAICopilot on report pages)
    if (activeReport?.moduleName) return activeReport.moduleName;
    if (activeReport?.reportTitle) {
      const title = activeReport.reportTitle.toLowerCase();
      if (title.includes('young professional') || title.includes('yp')) return 'Young Professionals';
      if (title.includes('consultant')) return 'Consultant Appointments';
      if (title.includes('csr')) return 'CSR Projects';
      if (title.includes('land')) return 'Land Management';
      if (title.includes('miv')) return 'Maritime India Vision 2030';
      if (title.includes('vip')) return 'VIP Reference';
      if (title.includes('gmis') || title.includes('mou')) return 'GMIS MoU';
      return activeReport.reportTitle;
    }

    // 3. Current URL route path matching
    const fullLoc = (window.location.pathname + ' ' + window.location.hash).toLowerCase();
    if (fullLoc.includes('young-professional') || fullLoc.includes('youngprofessional') || fullLoc.includes('/yp') || fullLoc.includes('young_professionals')) {
      return 'Young Professionals';
    }
    if (fullLoc.includes('consultant')) return 'Consultant Appointments';
    if (fullLoc.includes('csr')) return 'CSR Projects';
    if (fullLoc.includes('land')) return 'Land Management';
    if (fullLoc.includes('miv') || fullLoc.includes('vision')) return 'Maritime India Vision 2030';
    if (fullLoc.includes('vip')) return 'VIP Reference';
    if (fullLoc.includes('gmis') || fullLoc.includes('mou')) return 'GMIS MoU';
    if (fullLoc.includes('attendance')) return 'Attendance';
    if (fullLoc.includes('capex')) return 'Capex';
    if (fullLoc.includes('eoffice')) return 'EOffice';
    if (fullLoc.includes('gem')) return 'GeM Procurement';
    if (fullLoc.includes('project')) return 'Projects';
    return 'Projects';
  };

  const handleSend = async (queryToSend) => {
    const text = (queryToSend || inputQuery).trim();
    if (!text) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    const botMsgId = `bot-${Date.now()}`;
    const targetModule = detectModuleName(text);
    const cleanLowerText = text.toLowerCase().trim();

    // 1. Send LIVE POST Request to AI Module Query API Endpoint
    try {
      console.log(`[SagarBot] Dispatching POST to: ${AI_MODULE_QUERY_ENDPOINT} for module: "${targetModule}"`);
      const response = await fetch(AI_MODULE_QUERY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          user_question: text,
          module_name: targetModule
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result && (result.summary || result.data || result.status === 'success')) {
          const hasData = Array.isArray(result.data) && result.data.length > 0;
          
          let dynamicCols = [];
          if (hasData) {
            dynamicCols = Object.keys(result.data[0]).map(key => ({
              field: key,
              headerName: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
            }));
          }

          const moduleTitle = result.module_name || targetModule;
          const dynamicReportObj = hasData ? {
            reportTitle: `${moduleTitle} Report`,
            moduleName: moduleTitle,
            tableName: result.table_name || 'tbl_chatbot_query',
            sqlQuery: result.sql_query,
            rowCount: result.row_count || result.data.length,
            executionTimeMs: result.execution_time_ms,
            columns: dynamicCols,
            data: result.data
          } : null;

          const botMsg = {
            id: botMsgId,
            sender: 'bot',
            text: result.summary || `Found ${result.row_count || 0} records for your query in **${moduleTitle}**.`,
            dynamicReport: dynamicReportObj,
            suggestions: isReportMode ? reportSuggestions : QUICK_TOPICS,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };

          setMessages(prev => [...prev, botMsg]);
          setIsTyping(false);
          return;
        }
      }
    } catch (apiErr) {
      console.warn('[SagarBot] Live AI API unreachable or error:', apiErr.message);
    }

    // 2. Fallback to Constant Mock Responses if live API is offline
    const matchedFixture = MOCK_AI_RESPONSES.find(item => 
      item.triggers.some(trig => cleanLowerText.includes(trig) || trig.includes(cleanLowerText))
    );

    if (matchedFixture) {
      setTimeout(() => {
        const result = matchedFixture.response;
        const hasData = Array.isArray(result.data) && result.data.length > 0;
        
        let dynamicCols = [];
        if (hasData) {
          dynamicCols = Object.keys(result.data[0]).map(key => ({
            field: key,
            headerName: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
          }));
        }

        const moduleTitle = result.module_name || targetModule;
        const dynamicReportObj = hasData ? {
          reportTitle: `${moduleTitle} Report`,
          moduleName: moduleTitle,
          tableName: result.table_name || 'tbl_chatbot_query',
          sqlQuery: result.sql_query,
          rowCount: result.row_count || result.data.length,
          executionTimeMs: result.execution_time_ms,
          columns: dynamicCols,
          data: result.data
        } : null;

        const botMsg = {
          id: botMsgId,
          sender: 'bot',
          text: result.summary,
          dynamicReport: dynamicReportObj,
          suggestions: isReportMode ? reportSuggestions : QUICK_TOPICS,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, botMsg]);
        setIsTyping(false);
      }, 350);
      return;
    }

    // 3. Local Knowledge Base Fallback
    setTimeout(() => {
      const answerObj = findAnswer(text);
      const botMsg = {
        id: botMsgId,
        sender: 'bot',
        text: answerObj.text,
        link: answerObj.link,
        linkLabel: answerObj.linkLabel,
        suggestions: isReportMode ? reportSuggestions : answerObj.suggestions,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 350);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'bot',
        text: `👋 **Hai! Chat reset.** I am ready to answer your questions on **Sagarmanthan**!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: QUICK_TOPICS
      }
    ]);
  };

  const handleFeedback = (msgId, isHelpful) => {
    setFeedbackGiven(prev => ({ ...prev, [msgId]: isHelpful }));
  };

  const handleLinkClick = (url) => {
    if (!url) return;
    setIsOpen(false);
    navigate(url);
  };

  // Format bold markdown and linebreaks
  const renderFormattedText = (rawText) => {
    if (!rawText) return null;
    const paragraphs = rawText.split('\n\n');

    return paragraphs.map((p, pIdx) => {
      const lines = p.split('\n');
      return (
        <div key={pIdx} className="mb-2 last:mb-0 space-y-1">
          {lines.map((line, lIdx) => {
            const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');
            const cleanLine = isBullet ? line.trim().substring(2) : line;
            const parts = cleanLine.split(/(\*\*.*?\*\*)/g);

            const renderedLine = parts.map((part, partIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={partIdx} className="font-extrabold text-[#0f417a] dark:text-blue-300">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              return part;
            });

            if (isBullet) {
              return (
                <div key={lIdx} className="flex items-start space-x-1.5 pl-2 text-xs">
                  <span className="text-blue-500 font-bold mt-0.5">•</span>
                  <span>{renderedLine}</span>
                </div>
              );
            }

            return <p key={lIdx} className="text-xs leading-relaxed">{renderedLine}</p>;
          })}
        </div>
      );
    });
  };

  return (
    <>
      <style>{`
        /* Arm Waving Animation */
        @keyframes fullArmWave {
          0% { transform: rotate(0deg); }
          15% { transform: rotate(-28deg); }
          30% { transform: rotate(18deg); }
          45% { transform: rotate(-24deg); }
          60% { transform: rotate(14deg); }
          75% { transform: rotate(-18deg); }
          100% { transform: rotate(0deg); }
        }

        /* Continuous Robot Jumping Physics Cycle (6.5s loop: stands, crouches, jumps high off circle, lands back) */
        @keyframes robotJumpPlatformCycle {
          0%, 32% {
            /* Standing gracefully on circle platform */
            transform: translateY(0px) scale(1, 1);
          }
          36% {
            /* Anticipation crouch / wind-up */
            transform: translateY(4px) scale(1.08, 0.9);
          }
          42% {
            /* High upward spring launch out of circle */
            transform: translateY(-46px) scale(0.92, 1.12);
          }
          48% {
            /* Apex of jump hovering above circle */
            transform: translateY(-50px) scale(1, 1);
          }
          54% {
            /* Falling back down towards circle */
            transform: translateY(-20px) scale(0.96, 1.06);
          }
          58% {
            /* Landing impact squish on circle platform */
            transform: translateY(3px) scale(1.1, 0.9);
          }
          63% {
            /* Gentle recovery bounce */
            transform: translateY(-4px) scale(0.98, 1.02);
          }
          68%, 100% {
            /* Settles back standing on circle platform */
            transform: translateY(0px) scale(1, 1);
          }
        }

        /* Platform Ripple Reaction during Jump and Landing */
        @keyframes platformJumpReaction {
          0%, 34% {
            transform: scale(1);
          }
          36% {
            /* Compressed during crouch */
            transform: scale(0.96);
          }
          42% {
            /* Release wave burst */
            transform: scale(1.08);
            filter: drop-shadow(0 0 14px #38bdf8);
          }
          48%, 56% {
            transform: scale(1);
          }
          58% {
            /* Impact compression on landing */
            transform: scale(0.94);
            filter: drop-shadow(0 0 16px #0ea5e9);
          }
          64% {
            transform: scale(1.04);
          }
          68%, 100% {
            transform: scale(1);
          }
        }

        /* Thruster Jet Sparkle under feet during mid-air jump */
        @keyframes jetThrusterGlow {
          0%, 38% {
            opacity: 0;
            transform: scale(0);
          }
          42%, 52% {
            opacity: 1;
            transform: scale(1.2);
          }
          56%, 100% {
            opacity: 0;
            transform: scale(0);
          }
        }

        /* Continuous Mind Thought Cloud Open/Close Cycle (8 seconds loop) */
        @keyframes thoughtMindCycle {
          0% {
            opacity: 0;
            transform: scale(0.2) translate(30px, 30px);
            pointer-events: none;
          }
          6% {
            opacity: 1;
            transform: scale(1.06) translate(0px, -4px);
            pointer-events: auto;
          }
          10% {
            opacity: 1;
            transform: scale(1) translate(0px, 0px);
          }
          35% {
            opacity: 1;
            transform: scale(1.02) translate(0px, -3px);
          }
          58% {
            opacity: 1;
            transform: scale(1) translate(0px, 0px);
          }
          66% {
            opacity: 0;
            transform: scale(0.3) translate(20px, 20px);
            pointer-events: none;
          }
          100% {
            opacity: 0;
            transform: scale(0.2) translate(30px, 30px);
            pointer-events: none;
          }
        }

        /* Ascending Mind Bubble 1 (smallest) */
        @keyframes mindBubble1 {
          0%, 65%, 100% { opacity: 0; transform: scale(0.2); }
          5%, 60% { opacity: 1; transform: scale(1); }
        }

        /* Ascending Mind Bubble 2 (medium) */
        @keyframes mindBubble2 {
          0%, 65%, 100% { opacity: 0; transform: scale(0.2); }
          7%, 62% { opacity: 1; transform: scale(1.1); }
        }

        /* Blinking Hologram Eyes */
        @keyframes eyeGlowBlink {
          0%, 88%, 100% { transform: scaleY(1); opacity: 1; }
          94% { transform: scaleY(0.1); opacity: 0.3; }
        }

        /* Chest Core Pulse */
        @keyframes corePulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.25); opacity: 1; filter: drop-shadow(0 0 8px #38bdf8); }
        }

        /* Marine Sonar Radar Sweep */
        @keyframes sagarRadarSweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Concentric Ocean Wave Ripples */
        @keyframes oceanWavePulse {
          0% {
            transform: scale(0.85);
            opacity: 0.9;
            box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.6), 0 0 0 0 rgba(14, 165, 233, 0.4);
          }
          50% {
            transform: scale(1.02);
            opacity: 1;
            box-shadow: 0 0 0 10px rgba(56, 189, 248, 0.25), 0 0 0 18px rgba(14, 165, 233, 0.1);
          }
          100% {
            transform: scale(0.85);
            opacity: 0.9;
            box-shadow: 0 0 0 0 rgba(56, 189, 248, 0), 0 0 0 0 rgba(14, 165, 233, 0);
          }
        }

        /* Oceanic Gyre Flow */
        @keyframes oceanCurrentFlow {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.04); }
          100% { transform: rotate(360deg) scale(1); }
        }

        /* Nautical Compass Spin */
        @keyframes compassRingSpin {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }

        .animate-arm-wave {
          transform-origin: 18px 45px;
          animation: fullArmWave 2s infinite ease-in-out;
        }
        .animate-robot-jump {
          transform-origin: bottom center;
          animation: robotJumpPlatformCycle 6.5s infinite ease-in-out;
        }
        .animate-platform-jump-reaction {
          animation: platformJumpReaction 6.5s infinite ease-in-out;
        }
        .animate-jet-thruster {
          animation: jetThrusterGlow 6.5s infinite ease-in-out;
        }
        .animate-thought-cloud {
          transform-origin: bottom right;
          animation: thoughtMindCycle 8s infinite ease-in-out;
        }
        .animate-mind-bubble-1 {
          animation: mindBubble1 8s infinite ease-in-out;
        }
        .animate-mind-bubble-2 {
          animation: mindBubble2 8s infinite ease-in-out;
        }
        .animate-eye-glow {
          transform-origin: center;
          animation: eyeGlowBlink 4s infinite;
        }
        .animate-core-pulse {
          transform-origin: center;
          animation: corePulse 2s infinite ease-in-out;
        }
        .animate-sagar-radar {
          transform-origin: center;
          animation: sagarRadarSweep 3.5s linear infinite;
        }
        .animate-ocean-wave {
          animation: oceanWavePulse 2.8s infinite ease-in-out;
        }
        .animate-ocean-current {
          transform-origin: center;
          animation: oceanCurrentFlow 8s linear infinite;
        }
        .animate-compass-spin {
          transform-origin: center;
          animation: compassRingSpin 24s linear infinite;
        }
      `}</style>

      {/* Floating Full Robot Body with Jumping Physics & Mind Thought Cloud Animation */}
      {!isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 flex items-end select-none">
          
          {/* Animated Thought Cloud Coming from Robot's Mind */}
          <div className="absolute -top-16 -left-52 sm:-left-60 z-30 pointer-events-none">
            
            {/* Main Thought Cloud Bubble Container */}
            <div 
              onClick={() => setIsOpen(true)}
              className="animate-thought-cloud relative bg-gradient-to-br from-white via-cyan-50/95 to-blue-50/95 dark:from-slate-900 dark:via-slate-850 dark:to-cyan-950/80 border-2 border-cyan-300/90 dark:border-cyan-500/80 px-4 py-2.5 rounded-[24px] shadow-[0_10px_25px_-3px_rgba(14,165,233,0.35)] backdrop-blur-md cursor-pointer group flex items-center space-x-2.5 min-w-[210px]"
            >
              {/* Cloud Puff Arches */}
              <div className="absolute -top-2 left-6 w-7 h-4 bg-white/95 dark:bg-slate-900 border-t-2 border-l-2 border-cyan-300 dark:border-cyan-500 rounded-t-full -z-10" />
              <div className="absolute -top-3.5 left-14 w-9 h-5 bg-white/95 dark:bg-slate-900 border-t-2 border-cyan-300 dark:border-cyan-500 rounded-t-full -z-10" />
              <div className="absolute -top-2 right-8 w-8 h-4 bg-white/95 dark:bg-slate-900 border-t-2 border-r-2 border-cyan-300 dark:border-cyan-500 rounded-t-full -z-10" />

              {/* Floating Waving Emoji */}
              <span className="text-xl inline-block filter drop-shadow-xs" style={{ animation: 'fullArmWave 1.8s infinite ease-in-out', transformOrigin: '70% 70%' }}>
                👋
              </span>
              
              <div className="flex flex-col text-left">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-black text-[#0f417a] dark:text-cyan-300 group-hover:underline tracking-wide">
                    Hai! I'm SagarBot
                  </span>
                  <span className="text-[9px] bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black px-1.5 py-0.5 rounded-full shadow-xs">
                    AI
                  </span>
                </div>
                <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold">
                  Ask me anything!
                </span>
              </div>
              
              <Sparkles className="h-4 w-4 text-amber-500 animate-pulse ml-0.5" />
            </div>

            {/* Ascending Thought Bubbles linking Cloud to Robot Mind Antenna */}
            <div className="relative w-full h-10 pointer-events-none">
              <div className="animate-mind-bubble-2 absolute right-12 top-0 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-white to-cyan-100 dark:from-slate-900 dark:to-cyan-900 border-2 border-cyan-300 dark:border-cyan-500 shadow-md" />
              <div className="animate-mind-bubble-1 absolute right-6 top-3 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-white to-cyan-100 dark:from-slate-900 dark:to-cyan-900 border-2 border-cyan-300 dark:border-cyan-500 shadow-sm" />
              <div className="animate-mind-bubble-2 absolute right-1 top-6 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#38bdf8]" />
            </div>

          </div>

          {/* Full Robot Body Character Standing on Sagar Ocean Platform with JUMP PHYSICS */}
          <div 
            onClick={() => setIsOpen(true)}
            className="relative flex flex-col items-center cursor-pointer group focus:outline-none transition-transform duration-300"
            title="Click to talk with SagarBot"
          >
            
            {/* 1. Full Robot Body SVG with Jumping Animation (`@keyframes robotJumpPlatformCycle`) */}
            <div className="animate-robot-jump relative z-10 filter drop-shadow-[0_8px_16px_rgba(15,65,122,0.35)]">
              <svg width="96" height="125" viewBox="0 0 96 125" fill="none" xmlns="http://www.w3.org/2000/svg">
                
                {/* --- HEAD ANTENNA --- */}
                <circle cx="48" cy="8" r="4.5" fill="#38bdf8" className="animate-pulse" />
                <circle cx="48" cy="8" r="2.5" fill="#ffffff" />
                <line x1="48" y1="12" x2="48" y2="20" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />
                
                {/* --- HEAD / HELMET --- */}
                <rect x="20" y="27" width="6" height="14" rx="3" fill="#0f417a" stroke="#38bdf8" strokeWidth="1.5" />
                <rect x="70" y="27" width="6" height="14" rx="3" fill="#0f417a" stroke="#38bdf8" strokeWidth="1.5" />
                
                <rect x="24" y="18" width="48" height="34" rx="14" fill="url(#helmetGrad)" stroke="#38bdf8" strokeWidth="2.5" />
                <rect x="29" y="23" width="38" height="22" rx="9" fill="#090d16" stroke="#0284c7" strokeWidth="1.5" />
                
                {/* Glowing Cyan Eyes */}
                <g className="animate-eye-glow">
                  <circle cx="39" cy="33" r="4" fill="#38bdf8" filter="drop-shadow(0 0 4px #38bdf8)" />
                  <circle cx="39" cy="33" r="1.8" fill="#ffffff" />
                  
                  <circle cx="57" cy="33" r="4" fill="#38bdf8" filter="drop-shadow(0 0 4px #38bdf8)" />
                  <circle cx="57" cy="33" r="1.8" fill="#ffffff" />
                </g>

                {/* Friendly Smile */}
                <path d="M43 40 Q48 44 53 40" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" fill="none" />

                {/* --- NECK CONNECTOR --- */}
                <rect x="42" y="52" width="12" height="5" rx="2" fill="#0369a1" />

                {/* --- TORSO / CHEST BODY --- */}
                <rect x="26" y="57" width="44" height="38" rx="10" fill="url(#torsoGrad)" stroke="#38bdf8" strokeWidth="2" />
                <path d="M30 65 L66 65" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="2 2" />
                
                {/* Chest Reactor Core */}
                <g className="animate-core-pulse">
                  <circle cx="48" cy="76" r="7.5" fill="#090d16" stroke="#38bdf8" strokeWidth="1.5" />
                  <circle cx="48" cy="76" r="4.5" fill="#38bdf8" />
                  <path d="M48 72 L48 80 M44 76 L52 76" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                </g>

                {/* --- LEFT ARM --- */}
                <path d="M26 62 Q16 72 22 84" stroke="#0f417a" strokeWidth="5" strokeLinecap="round" fill="none" />
                <circle cx="22" cy="84" r="3.5" fill="#38bdf8" />

                {/* --- RIGHT ARM (RAISED WAVING HAND) --- */}
                <g className="animate-arm-wave">
                  <path d="M70 62 Q86 48 82 32" stroke="#0f417a" strokeWidth="5.5" strokeLinecap="round" fill="none" />
                  <circle cx="82" cy="30" r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                  <path d="M80 25 L80 21 M83 25 L84 20 M86 26 L88 22" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M78 28 L74 27" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="91" cy="22" r="1.5" fill="#f59e0b" className="animate-ping" />
                </g>

                {/* --- LEGS --- */}
                <rect x="34" y="95" width="8" height="17" rx="3" fill="#0f417a" stroke="#0284c7" strokeWidth="1.5" />
                <rect x="30" y="108" width="14" height="6" rx="3" fill="#0369a1" stroke="#38bdf8" strokeWidth="1.5" />

                <rect x="54" y="95" width="8" height="17" rx="3" fill="#0f417a" stroke="#0284c7" strokeWidth="1.5" />
                <rect x="52" y="108" width="14" height="6" rx="3" fill="#0369a1" stroke="#38bdf8" strokeWidth="1.5" />

                {/* --- JET THRUSTER SPARKS (Appears during mid-air jump) --- */}
                <g className="animate-jet-thruster">
                  <path d="M37 115 L35 124 L39 120 Z" fill="#38bdf8" />
                  <path d="M59 115 L57 124 L61 120 Z" fill="#38bdf8" />
                  <circle cx="37" cy="122" r="2" fill="#0ea5e9" />
                  <circle cx="59" cy="122" r="2" fill="#0ea5e9" />
                </g>

                {/* --- GRADIENTS --- */}
                <defs>
                  <linearGradient id="helmetGrad" x1="24" y1="18" x2="72" y2="52" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#ffffff" />
                    <stop offset="0.4" stopColor="#e0f2fe" />
                    <stop offset="1" stopColor="#bae6fd" />
                  </linearGradient>
                  <linearGradient id="torsoGrad" x1="26" y1="57" x2="70" y2="95" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#f8fafc" />
                    <stop offset="0.5" stopColor="#e2e8f0" />
                    <stop offset="1" stopColor="#cbd5e1" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* 2. SAGAR OCEAN RADAR PLATFORM CIRCLE (Reacts when robot jumps & lands) */}
            <div className="animate-platform-jump-reaction relative -mt-4 z-0 flex items-center justify-center">
              
              {/* Concentric Ocean Wave Ripple Ring */}
              <div className="animate-ocean-wave absolute inset-0 rounded-full w-20 h-20 -left-1 -top-1" />

              {/* Main Circular Platform Disc */}
              <div className="relative w-18 h-18 rounded-full bg-gradient-to-tr from-[#0b2545] via-[#0f417a] to-[#0284c7] p-1 shadow-2xl flex items-center justify-center ring-2 ring-cyan-400/50 group-hover:ring-cyan-300 transition-all duration-300">
                
                {/* Nautical Compass & Wave Grid Base */}
                <div className="w-full h-full rounded-full bg-[#030d1a] relative overflow-hidden flex items-center justify-center border border-cyan-400/70">
                  
                  {/* Rotating Nautical Compass Rose Ring */}
                  <div className="animate-compass-spin absolute inset-1 rounded-full border border-dashed border-cyan-400/40 opacity-70 flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-cyan-300 absolute top-0" />
                    <div className="w-1 h-1 rounded-full bg-cyan-300 absolute bottom-0" />
                    <div className="w-1 h-1 rounded-full bg-cyan-300 absolute left-0" />
                    <div className="w-1 h-1 rounded-full bg-cyan-300 absolute right-0" />
                  </div>

                  {/* Marine Radar Sweeping Line */}
                  <div className="animate-sagar-radar absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                    <div 
                      className="w-1/2 h-1/2 absolute top-0 right-0 origin-bottom-left"
                      style={{
                        background: 'conic-gradient(from 0deg at 0% 100%, rgba(56, 189, 248, 0.7) 0deg, rgba(14, 165, 233, 0.3) 45deg, transparent 90deg)'
                      }}
                    />
                    <div className="absolute top-0 right-1/2 w-[1.5px] h-1/2 bg-cyan-300 shadow-[0_0_8px_#38bdf8]" />
                  </div>

                  {/* Ocean Current Gyre Flow */}
                  <div className="animate-ocean-current absolute inset-2 rounded-full border-t border-b border-cyan-300/40 opacity-60" />

                  {/* Central Maritime Sagar Anchor / Energy Beacon */}
                  <div className="relative z-10 w-7 h-7 rounded-full bg-gradient-to-tr from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] flex items-center justify-center text-white shadow-[0_0_14px_#38bdf8]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12h20M2 18h20M2 6h20" className="opacity-40" />
                      <path d="M12 3v14m-5-4l5 5 5-5" strokeWidth="3" />
                    </svg>
                  </div>

                </div>

              </div>

              {/* Online Green Status Beacon on the Platform */}
              <span className="absolute top-1 right-1 flex h-4 w-4 z-20">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm"></span>
              </span>

              {/* Oceanic Glow Shadow Below Circle */}
              <div className="absolute -bottom-2 w-16 h-3 bg-cyan-600/30 dark:bg-cyan-400/25 rounded-full blur-xs" />
            </div>

          </div>

        </div>
      )}

      {/* Main Chatbot Window */}
      {isOpen && (
        <div 
          className={`fixed z-50 transition-all duration-300 shadow-[0_25px_60px_-15px_rgba(11,37,69,0.5)] rounded-[26px] overflow-hidden border border-slate-200 dark:border-cyan-500/20 bg-white dark:bg-[#07172c] text-slate-800 dark:text-slate-100 flex flex-col font-sans backdrop-blur-xl ${
            isMinimized 
              ? 'bottom-6 right-6 w-84 h-15 rounded-2xl shadow-xl' 
              : isExpanded
                ? 'bottom-4 right-4 w-[95vw] sm:w-[880px] lg:w-[1040px] h-[86vh] max-h-[840px]'
                : 'bottom-6 right-6 w-[94vw] sm:w-[440px] h-[600px] max-h-[92vh]'
          }`}
        >
          
          {/* ── NAVY BLUE HEADER BAR ── */}
          <div className="bg-gradient-to-r from-[#0b2545] via-[#0f417a] to-[#0284c7] border-b border-cyan-500/30 px-4 py-3 text-white flex items-center justify-between select-none shrink-0 shadow-md">
            <div className="flex items-center space-x-2.5">
              
              {/* SagarBot Mascot Emblem Avatar */}
              <div className="w-8 h-8 rounded-full bg-[#030d1a] border border-cyan-400/60 flex items-center justify-center relative shadow-sm">
                <SagarBotLogo className="w-5 h-5" glowing={true} />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-slate-950 animate-pulse" />
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xs font-black tracking-wide text-white">
                    SagarBot AI
                  </h3>
                  <span className="inline-flex items-center space-x-1 text-[9.5px] bg-white/15 text-cyan-200 font-bold px-2 py-0.5 rounded-full border border-cyan-300/30">
                    <span>MoPSW Copilot</span>
                  </span>
                </div>
                <p className="text-[10px] text-blue-200 font-medium">Sagarmanthan Intelligence</p>
              </div>
            </div>

            {/* Header Control Buttons */}
            <div className="flex items-center space-x-1.5 text-white/80">
              <button
                type="button"
                onClick={handleResetChat}
                title="Restart Conversation"
                className="p-1.5 hover:bg-white/15 rounded-full transition cursor-pointer text-white/80 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsExpanded(prev => !prev);
                  if (isExpanded) setActiveTab('chat');
                }}
                title={isExpanded ? "Collapse" : "Expand Full View"}
                className="p-1.5 hover:bg-white/15 rounded-full transition cursor-pointer hidden sm:block text-white/80 hover:text-white"
              >
                {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setIsMinimized(prev => !prev)}
                title={isMinimized ? "Restore" : "Minimize"}
                className="p-1.5 hover:bg-white/15 rounded-full transition cursor-pointer text-white/80 hover:text-white"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close"
                className="p-1.5 hover:bg-rose-500/80 rounded-full transition cursor-pointer text-white/80 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── REPORT CONTEXT CAPSULE (NAVY THEME) ── */}
          {isReportMode && activeReport && (
            <div className="mx-3.5 mt-2.5 p-2 px-3.5 rounded-2xl bg-gradient-to-r from-blue-900/40 via-[#0f417a]/30 to-blue-900/40 dark:from-[#0b2545] dark:to-[#091a32] border border-blue-300/40 dark:border-cyan-500/30 flex items-center justify-between text-xs shrink-0 shadow-2xs">
              <div className="flex items-center space-x-2 truncate">
                <BarChart3 className="h-3.5 w-3.5 text-[#0f417a] dark:text-cyan-400 shrink-0" />
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                  {activeReport.reportTitle || 'Active Report'}
                </span>
              </div>
              <span className="text-[10px] bg-blue-100 dark:bg-cyan-950/60 text-[#0f417a] dark:text-cyan-300 font-bold px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-cyan-500/30 shrink-0">
                {activeReport.rowCount || 0} Rows
              </span>
            </div>
          )}

          {/* Chat Content Body vs Table Preview Body (when not minimized) */}
          {!isMinimized && (
            <>
              {activeTab === 'table_preview' && activeDisplayReport ? (
                /* ── FULL INTERACTIVE REPORT TABLE PREVIEW IN EXPANDED CHATBOT (NAVY THEME) ── */
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-[#07172c] p-4 space-y-3">
                  
                  {/* Table Preview Toolbar */}
                  <div className="flex items-center justify-between gap-3 flex-wrap bg-white dark:bg-[#0b2545] p-3 rounded-2xl border border-slate-200 dark:border-cyan-500/20 shadow-xs">
                    <div className="flex items-center space-x-2.5">
                      <button
                        type="button"
                        onClick={() => setActiveTab('chat')}
                        className="px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-cyan-950/80 hover:bg-blue-100 dark:hover:bg-cyan-900/80 text-[#0f417a] dark:text-cyan-300 border border-blue-200 dark:border-cyan-500/30 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                        title="Return to Chat Conversation"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>← Back to Chat</span>
                      </button>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {activeDisplayReport.reportTitle || `${activeDisplayReport.moduleName} Report`}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {activeDisplayReport.tableName ? `Table: ${activeDisplayReport.tableName}` : 'Live dataset synchronized with Sagarmanthan database'}
                        </p>
                      </div>
                    </div>

                    {/* Quick Search, Download & AI Prompt */}
                    <div className="flex items-center space-x-2">
                      <div className="relative w-40 sm:w-56">
                        <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={tableSearch}
                          onChange={(e) => setTableSearch(e.target.value)}
                          placeholder="Search rows..."
                          className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-100 dark:bg-[#07172c] border border-slate-200 dark:border-cyan-500/30 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                        />
                        {tableSearch && (
                          <button
                            type="button"
                            onClick={() => setTableSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {/* Download Buttons */}
                      <button
                        type="button"
                        onClick={() => handleDownloadTableData('xlsx', activeDisplayReport)}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                        title="Download as Excel (.xlsx)"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Excel</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadTableData('csv', activeDisplayReport)}
                        className="flex items-center space-x-1 px-2.5 py-1.5 bg-blue-100 dark:bg-cyan-950/80 hover:bg-blue-200 dark:hover:bg-cyan-900/80 text-[#0f417a] dark:text-cyan-300 border border-blue-200 dark:border-cyan-500/30 text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                        title="Download as CSV"
                      >
                        <span>CSV</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('chat');
                          handleSend(`Provide an executive analysis and key findings from this ${activeDisplayReport.moduleName || 'dataset'} report.`);
                        }}
                        className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-[#0f417a] via-[#0284c7] to-cyan-500 hover:opacity-95 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
                        <span>Analyze Report</span>
                      </button>
                    </div>
                  </div>

                  {/* Table Grid Container */}
                  <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 dark:border-cyan-500/20 bg-white dark:bg-[#0b2545] shadow-sm">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-[#0f417a] text-white sticky top-0 z-10 font-bold uppercase tracking-wider text-[10.5px] border-b border-blue-900/50">
                        <tr>
                          {(activeDisplayReport.columns || []).map((col, cIdx) => (
                            <th 
                              key={cIdx} 
                              className="px-4 py-3 border-r border-blue-800/50 whitespace-nowrap last:border-r-0"
                            >
                              {col.headerName || col.field}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                        {(Array.isArray(activeDisplayReport.data) ? activeDisplayReport.data : [])
                          .filter(row => {
                            if (!tableSearch) return true;
                            return Object.values(row).some(v => 
                              String(v).toLowerCase().includes(tableSearch.toLowerCase())
                            );
                          })
                          .map((row, rIdx) => (
                            <tr 
                              key={rIdx} 
                              className={`transition hover:bg-blue-50/50 dark:hover:bg-cyan-950/30 ${
                                rIdx % 2 === 1 ? 'bg-slate-50/50 dark:bg-[#07172c]/60' : 'bg-white dark:bg-[#0b2545]'
                              }`}
                            >
                              {(activeDisplayReport.columns || []).map((col, cIdx) => {
                                const val = row[col.field] !== undefined ? row[col.field] : (row[col.headerName] !== undefined ? row[col.headerName] : '—');
                                return (
                                  <td 
                                    key={cIdx} 
                                    className="px-4 py-2.5 border-r border-slate-100 dark:border-white/5 whitespace-nowrap text-slate-700 dark:text-slate-300 last:border-r-0"
                                  >
                                    {String(val || '—')}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer status */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
                    <span>Showing {activeDisplayReport.rowCount || (Array.isArray(activeDisplayReport.data) ? activeDisplayReport.data.length : 0)} total records</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('chat')}
                      className="text-[#0f417a] dark:text-cyan-400 font-bold hover:underline cursor-pointer flex items-center space-x-1"
                    >
                      <MessageSquare className="h-3 w-3" />
                      <span>Back to Chat</span>
                    </button>
                  </div>

                </div>
              ) : (
                /* ── NAVY THEMED CHAT STREAM VIEW ── */
                <>
                  {/* Message Stream */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-5 text-slate-800 dark:text-slate-100">
                    {messages.map((msg) => (
                      <div 
                        key={msg.id}
                        className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}
                      >
                        
                        {/* Message Bubble Container */}
                        <div className={`flex items-start space-x-3 ${msg.sender === 'user' ? 'max-w-[85%]' : 'max-w-full w-full'}`}>
                          
                          {/* Bot Avatar: SagarBot Mascot Logo */}
                          {msg.sender === 'bot' && (
                            <div className="w-7 h-7 rounded-full bg-[#0b2545] border border-cyan-400/50 flex-shrink-0 flex items-center justify-center mt-0.5 shadow-2xs">
                              <SagarBotLogo className="w-4.5 h-4.5" glowing={false} />
                            </div>
                          )}

                          <div 
                            className={`flex-1 ${
                              msg.sender === 'user'
                                ? 'bg-gradient-to-r from-[#0f417a] to-[#0284c7] text-white rounded-[22px] px-4 py-2.5 shadow-sm font-medium text-xs leading-relaxed'
                                : 'bg-transparent text-slate-800 dark:text-slate-100 text-xs'
                            }`}
                          >
                            {/* Formatted Text Content */}
                            <div className="leading-relaxed">
                              {renderFormattedText(msg.text)}
                            </div>

                            {/* ── DYNAMIC AI GENERATED REPORT CARD (From Module Query API) ── */}
                            {msg.dynamicReport && (
                              <div className="mt-3.5 p-3.5 bg-slate-50 dark:bg-[#0b2545] rounded-2xl border border-slate-200 dark:border-cyan-500/30 space-y-3 shadow-xs animate-fade-in">
                                
                                {/* Dynamic Header: Module Name + Report */}
                                <div className="flex items-center justify-between gap-2 flex-wrap text-slate-800 dark:text-slate-200 border-b border-slate-200/80 dark:border-cyan-500/20 pb-2.5">
                                  <div className="flex items-center space-x-2">
                                    <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-cyan-950 text-[#0f417a] dark:text-cyan-400">
                                      <FileSpreadsheet className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-black text-slate-900 dark:text-white tracking-wide">
                                        {msg.dynamicReport.moduleName} Report
                                      </h4>
                                      <span className="text-[9.5px] text-cyan-600 dark:text-cyan-300 font-bold flex items-center space-x-1">
                                        <Sparkles className="h-2.5 w-2.5 inline" />
                                        <span>AI Generated Dynamic Report</span>
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-1.5">
                                    <span className="text-[10px] bg-blue-100 dark:bg-cyan-950 text-[#0f417a] dark:text-cyan-300 px-2 py-0.5 rounded-full font-mono font-bold border border-blue-200 dark:border-cyan-500/40">
                                      {msg.dynamicReport.rowCount || 0} Records
                                    </span>
                                  </div>
                                </div>

                                {/* Miniature Data Table Preview with Dynamic Headers */}
                                {Array.isArray(msg.dynamicReport.data) && msg.dynamicReport.data.length > 0 && (
                                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-cyan-500/20 text-[10.5px] bg-white dark:bg-[#07172c]">
                                    <table className="w-full text-left">
                                      <thead className="bg-[#0f417a] text-white font-bold border-b border-blue-900/50">
                                        <tr>
                                          {(msg.dynamicReport.columns || []).slice(0, 4).map((c, cIdx) => (
                                            <th key={cIdx} className="px-3 py-2 whitespace-nowrap">{c.headerName}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {msg.dynamicReport.data.slice(0, 3).map((r, rIdx) => (
                                          <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-cyan-950/40">
                                            {(msg.dynamicReport.columns || []).slice(0, 4).map((c, cIdx) => (
                                              <td key={cIdx} className="px-3 py-2 whitespace-nowrap text-slate-700 dark:text-slate-300">
                                                {String(r[c.field] !== undefined ? r[c.field] : (r[c.headerName] || '—')).substring(0, 24)}
                                              </td>
                                            ))}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {/* Action Buttons: Expand & Download */}
                                <div className="flex items-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenTablePreview(msg.dynamicReport)}
                                    className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 bg-gradient-to-r from-[#0f417a] via-[#0284c7] to-cyan-500 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                                  >
                                    <Maximize2 className="h-3.5 w-3.5 text-cyan-200" />
                                    <span>Expand Table View</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDownloadTableData('xlsx', msg.dynamicReport)}
                                    title="Download Excel Spreadsheet (.xlsx)"
                                    className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-white dark:bg-[#07172c] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/40 font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer"
                                  >
                                    <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>Download Excel</span>
                                  </button>
                                </div>

                              </div>
                            )}

                            {/* Direct Link Action Button if attached */}
                            {msg.link && (
                              <div className="mt-2.5 pt-2">
                                <button
                                  type="button"
                                  onClick={() => handleLinkClick(msg.link)}
                                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#0f417a] dark:text-cyan-300 bg-blue-50 dark:bg-cyan-950/40 hover:bg-blue-100 dark:hover:bg-cyan-900/60 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-cyan-500/30 transition cursor-pointer"
                                >
                                  <span>{msg.linkLabel || 'Navigate to Module'}</span>
                                  <ArrowRight className="h-3 w-3" />
                                </button>
                              </div>
                            )}

                            {/* Action Footer for Bot Responses */}
                            {msg.sender === 'bot' && msg.id !== 'welcome-msg' && (
                              <div className="mt-3 flex items-center justify-between text-[10.5px] text-slate-400 border-t border-slate-100 dark:border-white/5 pt-2">
                                <span className="text-[9.5px] text-slate-400">{msg.timestamp}</span>
                                <div className="flex items-center space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(msg.text);
                                      setFeedbackGiven(prev => ({ ...prev, [`${msg.id}-copied`]: true }));
                                      setTimeout(() => setFeedbackGiven(prev => ({ ...prev, [`${msg.id}-copied`]: false })), 1500);
                                    }}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-md transition text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                    title="Copy response"
                                  >
                                    {feedbackGiven[`${msg.id}-copied`] ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleFeedback(msg.id, true)}
                                    className={`p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 transition ${feedbackGiven[msg.id] === true ? 'text-emerald-500 font-bold' : 'text-slate-500 dark:text-slate-400'}`}
                                    title="Good response"
                                  >
                                    <ThumbsUp className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleFeedback(msg.id, false)}
                                    className={`p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 transition ${feedbackGiven[msg.id] === false ? 'text-rose-500 font-bold' : 'text-slate-500 dark:text-slate-400'}`}
                                    title="Bad response"
                                  >
                                    <ThumbsDown className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}

                          </div>

                        </div>

                        {/* Navy Themed Quick Suggestion Chips */}
                        {msg.suggestions && msg.suggestions.length > 0 && (
                          <div className="mt-2.5 ml-10 flex flex-wrap gap-1.5 max-w-full">
                            {msg.suggestions.map((topic, tIdx) => (
                              <button
                                key={tIdx}
                                type="button"
                                onClick={() => handleSend(topic.query)}
                                className="text-[11px] font-semibold text-[#0f417a] dark:text-cyan-300 bg-blue-50/70 hover:bg-blue-100 dark:bg-[#0b2545] dark:hover:bg-[#0f3563] border border-blue-200 dark:border-cyan-500/30 hover:border-cyan-400 rounded-2xl px-3 py-1.5 transition cursor-pointer shadow-2xs text-left"
                              >
                                {topic.label}
                              </button>
                            ))}
                          </div>
                        )}

                      </div>
                    ))}

                    {/* Oceanic Glowing Typing Animation */}
                    {isTyping && (
                      <div className="flex items-center space-x-3 animate-fade-in ml-1">
                        <div className="w-7 h-7 rounded-full bg-[#0b2545] border border-cyan-400/50 flex items-center justify-center">
                          <SagarBotLogo className="w-4.5 h-4.5 animate-bounce" glowing={true} />
                        </div>
                        <div className="flex items-center space-x-1.5 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          <span className="bg-gradient-to-r from-[#0f417a] via-[#0284c7] to-cyan-500 bg-clip-text text-transparent font-bold">
                            SagarBot is analyzing...
                          </span>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* ── FLOATING NAVY INPUT DOCK ── */}
                  <div className="p-3.5 pt-1 bg-transparent">
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                      }}
                      className="relative rounded-[28px] bg-slate-100 dark:bg-[#0b2545] border border-slate-200 dark:border-cyan-500/30 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/20 transition-all duration-200 shadow-md px-3.5 py-1.5 flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-cyan-500 shrink-0 animate-pulse ml-1" />
                      
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputQuery}
                        onChange={(e) => setInputQuery(e.target.value)}
                        placeholder="Ask SagarBot anything about this report or ministry data..."
                        className="w-full bg-transparent border-none outline-none text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 font-medium"
                      />

                      {inputQuery && (
                        <button
                          type="button"
                          onClick={() => setInputQuery('')}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <button
                        type="submit"
                        disabled={!inputQuery.trim()}
                        className="p-2 bg-gradient-to-tr from-[#0f417a] via-[#0284c7] to-cyan-500 hover:opacity-95 disabled:opacity-30 text-white rounded-full transition cursor-pointer flex-shrink-0 shadow-md active:scale-95"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </form>

                    <div className="mt-1 text-center">
                      <span className="text-[9.5px] text-slate-400 font-medium">
                        ✨ SagarBot AI can make mistakes. Verify important report findings.
                      </span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

        </div>
      )}
    </>
  );
}
