import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Bot, MessageSquare, X, Minus, Maximize2, Minimize2, Send, 
  RotateCcw, Sparkles, ChevronRight, Compass, HelpCircle, 
  Search, ExternalLink, ThumbsUp, ThumbsDown, ArrowRight, CornerDownLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  { label: '🚢 CSR Projects & Fund', query: 'What is CSR Projects Module?' },
  { label: '📈 MIV 2030 Vision', query: 'What is Maritime India Vision 2030?' },
  { label: '🏛️ VIP Reference 6 Stages', query: 'What are the 6 stages in VIP Reference?' },
  { label: '🌐 GMIS & IMW MoUs', query: 'How does GMIS MoU tracking work?' },
  { label: '📊 How to Export Reports', query: 'How do I export reports to Excel or PDF?' },
];

export default function SagarBot() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState({});

  const [messages, setMessages] = useState([
    {
      id: 'welcome-msg',
      sender: 'bot',
      text: `👋 **Hai! I am SagarBot**, your intelligent AI assistant for the **Sagarmanthan** portal.\n\nHow can I help you today? You can ask me anything about **CSR Projects**, **MIV 2030**, **GMIS MoUs**, **VIP References**, or **Exporting Reports**.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: QUICK_TOPICS
    }
  ]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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

  const handleSend = (queryToSend) => {
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

    setTimeout(() => {
      const answerObj = findAnswer(text);
      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: answerObj.text,
        link: answerObj.link,
        linkLabel: answerObj.linkLabel,
        suggestions: answerObj.suggestions,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 450);
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
          className={`fixed z-50 transition-all duration-300 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col ${
            isMinimized 
              ? 'bottom-6 right-6 w-80 h-14' 
              : isExpanded
                ? 'bottom-4 right-4 w-[92vw] sm:w-[600px] h-[85vh] max-h-[780px]'
                : 'bottom-6 right-6 w-[92vw] sm:w-[400px] h-[560px] max-h-[90vh]'
          }`}
        >
          
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-[#0f417a] via-[#1e3a8a] to-[#0284c7] px-4 py-3 text-white flex items-center justify-between select-none shadow-md shrink-0">
            <div className="flex items-center space-x-2.5">
              
              {/* Mini Full Bot Avatar in Header */}
              <div className="w-8 h-8 rounded-full bg-slate-950 border border-cyan-300 p-0.5 flex items-center justify-center relative shadow-sm">
                <Bot className="h-4 w-4 text-cyan-400" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-slate-950" />
              </div>

              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-xs font-black tracking-wider uppercase">SagarBot</h3>
                  <span className="text-[9px] bg-cyan-400/20 text-cyan-200 font-bold px-1.5 py-0.2 rounded border border-cyan-400/30">
                    AI
                  </span>
                </div>
                <p className="text-[10px] text-blue-200 font-medium">Sagarmanthan Assistant</p>
              </div>
            </div>

            {/* Header Control Buttons */}
            <div className="flex items-center space-x-1 text-white/80">
              <button
                type="button"
                onClick={handleResetChat}
                title="Restart Chat"
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(prev => !prev)}
                title={isExpanded ? "Collapse" : "Expand"}
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer hidden sm:block"
              >
                {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setIsMinimized(prev => !prev)}
                title={isMinimized ? "Restore" : "Minimize"}
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close"
                className="p-1.5 hover:text-white hover:bg-rose-500/80 rounded-lg transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Chat Content Body (when not minimized) */}
          {!isMinimized && (
            <>
              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60 dark:bg-slate-900/40 text-slate-800 dark:text-slate-100">
                {messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}
                  >
                    
                    {/* Message Bubble Container */}
                    <div className="flex items-start space-x-2 max-w-[88%]">
                      
                      {msg.sender === 'bot' && (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#0f417a] to-cyan-500 flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold shadow-xs mt-0.5">
                          <Bot className="h-3.5 w-3.5" />
                        </div>
                      )}

                      <div 
                        className={`rounded-2xl p-3 shadow-xs ${
                          msg.sender === 'user'
                            ? 'bg-[#0f417a] text-white rounded-tr-xs'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs'
                        }`}
                      >
                        {/* Formatted Text Content */}
                        {renderFormattedText(msg.text)}

                        {/* Direct Link Action Button if attached */}
                        {msg.link && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => handleLinkClick(msg.link)}
                              className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#0f417a] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 transition cursor-pointer"
                            >
                              <span>{msg.linkLabel || 'Navigate to Module'}</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        )}

                        {/* Helpful Feedback for bot answers */}
                        {msg.sender === 'bot' && msg.id !== 'welcome-msg' && (
                          <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                            <span>Was this helpful?</span>
                            <div className="flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleFeedback(msg.id, true)}
                                className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition ${feedbackGiven[msg.id] === true ? 'text-emerald-600 font-bold' : ''}`}
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleFeedback(msg.id, false)}
                                className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition ${feedbackGiven[msg.id] === false ? 'text-rose-600 font-bold' : ''}`}
                              >
                                <ThumbsDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>

                    <span className="text-[9px] text-slate-400 mt-1 px-1">
                      {msg.timestamp}
                    </span>

                    {/* Quick Suggestion Topic Pills */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 max-w-full">
                        {msg.suggestions.map((topic, tIdx) => (
                          <button
                            key={tIdx}
                            type="button"
                            onClick={() => handleSend(topic.query)}
                            className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 border border-slate-200 dark:border-slate-700 hover:border-blue-300 rounded-xl px-2.5 py-1 transition cursor-pointer shadow-2xs text-left"
                          >
                            {topic.label}
                          </button>
                        ))}
                      </div>
                    )}

                  </div>
                ))}

                {/* Typing Animation Bubble */}
                {isTyping && (
                  <div className="flex items-center space-x-2 animate-fade-in">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#0f417a] to-cyan-500 flex items-center justify-center text-white text-[10px]">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-xs px-3.5 py-2.5 flex items-center space-x-1 shadow-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" />
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Footer Bar */}
              <div className="p-3 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center space-x-2"
                >
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputQuery}
                      onChange={(e) => setInputQuery(e.target.value)}
                      placeholder="Ask SagarBot (e.g. CSR, MIV, VIP, Reports)..."
                      className="w-full pl-3.5 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 font-medium"
                    />
                    {inputQuery && (
                      <button
                        type="button"
                        onClick={() => setInputQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!inputQuery.trim()}
                    className="p-2 bg-[#0f417a] hover:bg-blue-800 disabled:opacity-40 text-white rounded-xl transition cursor-pointer flex-shrink-0 shadow-xs"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>

                <div className="mt-1 text-center">
                  <span className="text-[9px] text-slate-400 font-semibold">
                    Powered by Sagarmanthan Intelligent Knowledge Engine
                  </span>
                </div>
              </div>
            </>
          )}

        </div>
      )}
    </>
  );
}
