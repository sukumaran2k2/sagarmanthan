import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion, AnimatePresence, useInView,
  useMotionValue, useSpring, useTransform, animate,
} from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Briefcase, Users, Scale, CalendarClock, BarChart2,
  Anchor, AlertCircle, CheckCircle2, Clock, ArrowRight,
  ChevronRight, ChevronLeft, TrendingUp, Ship, Gavel,
  Sparkles, Activity, FileSpreadsheet, Download, RefreshCw,
  Search, Filter, ExternalLink, Building2, Layers, CheckCircle,
  Building, ShieldCheck, ArrowUpRight, FileCheck, AlertTriangle, Bot
} from 'lucide-react';
import { SagarBotLogo } from '../../components/SagarBot';
import DynamicVisualizer from '../../components/SagarBot/DynamicVisualizer';
import { API_BASE } from '../../api';

/* ─── DATA & CONSTANTS ───────────────────────────────────── */
const CAROUSEL_SLIDES = [
  {
    id: 0,
    tag: 'Port Operations & Telemetry',
    title: 'Welcome, Sunil Paliwal',
    body: 'Administrative command & data-entry status for Chennai Port Authority (ChPA). 12 of 15 exclusive modules updated for September 2026 session.',
    stat: { num: 12, label: 'Modules Updated' },
    badge: '80% Compliance Rate',
    badgeColor: 'bg-emerald-400/30 text-emerald-100 border border-emerald-300/40',
    icon: Ship,
    image: '/carousel/slide3.jpg',
    overlay: 'linear-gradient(90deg, rgba(8,26,51,0.90) 0%, rgba(8,26,51,0.62) 50%, rgba(8,26,51,0.25) 85%, rgba(8,26,51,0.12) 100%)',
    accentColor: 'text-cyan-300',
    iconBg: 'bg-cyan-900/40'
  },
  {
    id: 1,
    tag: 'Capital Expenditure · FY 2026-27',
    title: 'Capex Works — Week 3 Logged',
    body: 'Week 3 September Capex entry submitted. ₹420 Cr capital outlay deployed across mechanized container terminals & deep-draft channel dredging.',
    stat: { num: 420, label: '₹ Cr Utilised' },
    badge: 'Week 3 Verified',
    badgeColor: 'bg-blue-400/30 text-blue-100 border border-blue-300/40',
    icon: TrendingUp,
    image: '/carousel/slide1.jpg',
    overlay: 'linear-gradient(90deg, rgba(8,30,55,0.90) 0%, rgba(8,30,55,0.62) 50%, rgba(8,30,55,0.25) 85%, rgba(8,30,55,0.12) 100%)',
    accentColor: 'text-blue-300',
    iconBg: 'bg-blue-900/40'
  },
  {
    id: 2,
    tag: 'GEM Procurement Compliance',
    title: 'Goods & Services Up-To-Date',
    body: 'GEM Goods (Aug 2026) and Services (Aug 2026) completed. Action required: Works procurement monthly statement pending submission.',
    stat: { num: 76, label: '% GEM Compliance' },
    badge: 'Action on Works',
    badgeColor: 'bg-amber-400/30 text-amber-100 border border-amber-300/40',
    icon: Briefcase,
    image: '/carousel/slide2.jpg',
    overlay: 'linear-gradient(90deg, rgba(20,12,4,0.90) 0%, rgba(20,12,4,0.62) 50%, rgba(20,12,4,0.25) 85%, rgba(20,12,4,0.12) 100%)',
    accentColor: 'text-amber-300',
    iconBg: 'bg-amber-900/40'
  },
  {
    id: 3,
    tag: 'Port Legal Directorate',
    title: '14 Court Cases Under Review',
    body: 'Legal cell status updated as on 24-09-2026. 3 high-priority maritime arbitrations disposed this month with zero compliance pendency.',
    stat: { num: 14, label: 'Pending Cases' },
    badge: 'Updated Today',
    badgeColor: 'bg-emerald-400/30 text-emerald-100 border border-emerald-300/40',
    icon: Gavel,
    image: '/carousel/slide4.jpg',
    overlay: 'linear-gradient(90deg, rgba(12,24,38,0.90) 0%, rgba(12,24,38,0.62) 50%, rgba(12,24,38,0.25) 85%, rgba(12,24,38,0.12) 100%)',
    accentColor: 'text-emerald-300',
    iconBg: 'bg-emerald-900/40'
  },
  {
    id: 4,
    tag: 'MIV 2030 Interventions',
    title: '28 Active Port Initiatives',
    body: 'Strategic roadmap projects for green port logistics, shore-to-ship power, and smart gate automation tracked in synchrony with Ministry telemetry.',
    stat: { num: 28, label: 'Active Projects' },
    badge: 'MIV 2030 Active',
    badgeColor: 'bg-teal-400/30 text-teal-100 border border-teal-300/40',
    icon: Anchor,
    image: '/carousel/slide5.jpg',
    overlay: 'linear-gradient(90deg, rgba(4,22,12,0.90) 0%, rgba(4,22,12,0.62) 50%, rgba(4,22,12,0.25) 85%, rgba(4,22,12,0.12) 100%)',
    accentColor: 'text-teal-300',
    iconBg: 'bg-teal-900/40'
  },
];

const ORG_STAT_CARDS = [
  { label: 'Exclusive Modules', num: 15, suffix: '', sub: 'ChPA tracked modules', icon: Layers, color: 'navy' },
  { label: 'Modules Updated', num: 12, suffix: '', sub: '80% current compliance', icon: CheckCircle2, color: 'green' },
  { label: 'Pending Upload', num: 3, suffix: '', sub: 'Action required by ChPA', icon: AlertTriangle, color: 'red' },
  { label: 'Active Port Projects', num: 28, suffix: '', sub: '₹4,210 Cr sanction', icon: Briefcase, color: 'blue' },
  { label: 'Capex Utilisation', num: 85, suffix: '%', sub: 'Target on track', icon: TrendingUp, color: 'teal' },
  { label: 'Court Cases Active', num: 14, suffix: '', sub: 'Updated 24-09-2026', icon: Scale, color: 'amber' },
];

const STAT_THEMES = {
  navy:  { bar:'linear-gradient(90deg,#0B2542,#1478A0)', num:'#0B2542', icon:'#0B2542', iconBg:'#EDF4FA' },
  green: { bar:'linear-gradient(90deg,#0F6E56,#22C55E)', num:'#0F6E56', icon:'#0F6E56', iconBg:'#E6F5EF' },
  red:   { bar:'linear-gradient(90deg,#C0392B,#EF4444)', num:'#C0392B', icon:'#C0392B', iconBg:'#FDF0EE' },
  blue:  { bar:'linear-gradient(90deg,#1D4ED8,#3B82F6)', num:'#1D4ED8', icon:'#1D4ED8', iconBg:'#EFF6FF' },
  teal:  { bar:'linear-gradient(90deg,#0E96A6,#06B6D4)', num:'#0E96A6', icon:'#0E96A6', iconBg:'#E0F7FA' },
  amber: { bar:'linear-gradient(90deg,#B8860B,#F59E0B)', num:'#B8860B', icon:'#B8860B', iconBg:'#FEF9E7' },
};

/* The exact 15 rows from the user's screenshot */
const EXCLUSIVE_MODULES_DATA = [
  {
    sno: 1,
    name: 'Projects',
    route: '/projects/project/project-list',
    inputRoute: '/projects/project/input-form',
    lastUpdated: '16-09-2026',
    status: 'updated',
    category: 'Engineering & Infra'
  },
  {
    sno: 2,
    name: 'CSR Projects',
    route: '/projects/csr-projects/dashboard',
    inputRoute: '/projects/csr-projects/input-form',
    lastUpdated: '01-09-2026',
    status: 'updated',
    category: 'Corporate Social Resp.'
  },
  {
    sno: 3,
    name: 'Capex',
    route: '/finance/capex/dashboard',
    inputRoute: '/finance/capex/input-form',
    lastUpdated: 'Week 3 - September 2026',
    status: 'updated',
    category: 'Finance & Accounts'
  },
  {
    sno: 4,
    name: 'KPI',
    route: '/kpi/major-ports/major-ports-dashboard',
    inputRoute: '/kpi/major-ports/major-ports-input-form',
    lastUpdated: 'September-2026',
    status: 'updated',
    category: 'Operations & Berthing'
  },
  {
    sno: 5,
    name: 'HR Management',
    route: '/hr/hr-management/hr-dashboard',
    inputRoute: '/hr/hr-management/employee-database',
    lastUpdated: 'September-2026',
    status: 'updated',
    category: 'Personnel & HR'
  },
  {
    sno: 6,
    isGroup: true,
    groupName: 'GEM Procurement',
    items: [
      {
        subId: 'goods',
        name: 'GEM Procurement - Goods',
        route: '/governance/gem-procurements',
        inputRoute: '/governance/gem-procurements',
        lastUpdated: 'August-2026',
        status: 'updated'
      },
      {
        subId: 'service',
        name: 'GEM Procurement - Service',
        route: '/governance/gem-procurements',
        inputRoute: '/governance/gem-procurements',
        lastUpdated: 'August-2026',
        status: 'updated'
      },
      {
        subId: 'work',
        name: 'GEM Procurement - Work',
        route: '/governance/gem-procurements',
        inputRoute: '/governance/gem-procurements',
        lastUpdated: '-',
        status: 'pending'
      }
    ]
  },
  {
    sno: 7,
    name: 'Court Cases',
    route: '/legal/courtcases',
    inputRoute: '/legal/courtcases',
    lastUpdated: '24-09-2026',
    status: 'updated',
    category: 'Legal Directorate'
  },
  {
    sno: 8,
    name: 'MIV 2030',
    route: '/strategies/miv-2030/dashboard',
    inputRoute: '/strategies/miv-2030/dashboard',
    lastUpdated: '25-08-2026',
    status: 'updated',
    category: 'Strategic Initiatives'
  },
  {
    sno: 9,
    name: 'AKV 2047',
    route: '/strategies',
    inputRoute: '/strategies',
    lastUpdated: 'No data uploaded',
    status: 'pending',
    category: 'Strategic Initiatives'
  },
  {
    sno: 10,
    name: 'OVOD',
    route: '/strategies/drishti-portal/dashboard',
    inputRoute: '/strategies/drishti-portal/dashboard',
    lastUpdated: '31-08-2026',
    status: 'updated',
    category: 'One Vision One Document'
  },
  {
    sno: 11,
    name: 'GMIS IMW',
    route: '/strategies/gmis-mou/dashboard',
    inputRoute: '/strategies/gmis-mou/dashboard',
    lastUpdated: '20-08-2026',
    status: 'updated',
    category: 'MoU & Investments'
  },
  {
    sno: 12,
    name: 'Media Outreach',
    route: '/governance/media-outreach/events',
    inputRoute: '/governance/media-outreach/events',
    lastUpdated: '31-08-2026',
    status: 'updated',
    category: 'Public Relations'
  },
  {
    sno: 13,
    name: 'Knowledge Repository',
    route: '/contact',
    inputRoute: '/contact',
    lastUpdated: 'No data uploaded',
    status: 'pending',
    category: 'Knowledge Base'
  },
  {
    sno: 14,
    name: 'Foreign Visit',
    route: '/governance/cabinet-notes/cabinet-notes-summary',
    inputRoute: '/governance/cabinet-notes/cabinet-notes-summary',
    lastUpdated: '04-09-2026',
    status: 'updated',
    category: 'Administration'
  },
  {
    sno: 15,
    name: 'Cruise Shipping',
    route: '/kpi/major-ports/major-ports-reports',
    inputRoute: '/kpi/major-ports/major-ports-input-form',
    lastUpdated: '31-08-2026',
    status: 'updated',
    category: 'Tourism & Passenger'
  }
];

const MAJOR_PORTS_LIST = [
  { code: 'ChPA', name: 'Chennai Port Authority' },
  { code: 'DPA',  name: 'Deendayal Port Authority' },
  { code: 'JNPA', name: 'Jawaharlal Nehru Port Authority' },
  { code: 'CoPA', name: 'Cochin Port Authority' },
  { code: 'MbPA', name: 'Mumbai Port Authority' },
  { code: 'SMPA', name: 'Syama Prasad Mookerjee Port' },
  { code: 'PPA',  name: 'Paradip Port Authority' },
  { code: 'VOC',  name: 'V.O. Chidambaranar Port Authority' },
  { code: 'VPA',  name: 'Visakhapatnam Port Authority' },
];

/* ─── ANIMATION HELPERS ──────────────────────────────────── */
const SPRING = { type: 'spring', stiffness: 260, damping: 20 };
const stagger = { visible: { transition: { staggerChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };
const scaleIn = { hidden: { opacity: 0, scale: 0.94 }, visible: { opacity: 1, scale: 1 } };

function AnimatedNumber({ target, suffix = '', duration = 1.4 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const ctrl = animate(0, target, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setVal(Math.round(latest)),
    });
    return ctrl.stop;
  }, [inView, target, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
}

function AnimatedTitle({ text }) {
  const words = text.split(' ');
  return (
    <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight flex flex-wrap gap-x-3">
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, delay: 0.18 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block"
        >
          {w}
        </motion.span>
      ))}
    </h1>
  );
}

function TiltCard({ children, className = '', onClick }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rx = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), { stiffness: 300, damping: 25 });
  const ry = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), { stiffness: 300, damping: 25 });
  const handleMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleLeave = () => { x.set(0); y.set(0); };
  return (
    <motion.div
      ref={ref}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      whileHover={{ y: -4, boxShadow: '0 20px 40px -10px rgba(11,37,66,0.14)' }}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

function ParticleCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = (canvas.width = canvas.offsetWidth);
    let h = (canvas.height = canvas.offsetHeight);
    let id;
    const pts = Array.from({ length: 48 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 2 + 1,
    }));
    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < 100) {
            ctx.strokeStyle = 'rgba(14,150,166,' + (0.18 * (1 - dist / 100)) + ')';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }
      pts.forEach((p) => {
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      });
      id = requestAnimationFrame(draw);
    }
    draw();
    const handleResize = () => {
      if (!canvas) return;
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', handleResize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10 w-full h-full" />;
}

function FloatingOrb({ size = 180, color = 'rgba(14,150,166,0.15)', top, left, delay = 0 }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none filter blur-2xl"
      style={{ width: size, height: size, background: color, top, left }}
      animate={{ y: [0, -20, 0], scale: [1, 1.1, 1], opacity: [0.6, 0.9, 0.6] }}
      transition={{ duration: 6 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

function WaveDivider() {
  return (
    <div className="w-full overflow-hidden leading-none -mt-1 pointer-events-none select-none z-20 relative">
      <svg viewBox="0 0 1440 40" fill="none" className="w-full h-8 sm:h-10 text-slate-50 preserve-3d" preserveAspectRatio="none">
        <path d="M0,20 C320,38 480,4 800,22 C1120,40 1300,8 1440,20 L1440,40 L0,40 Z" fill="currentColor" />
      </svg>
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────── */
export default function OrgDashboard() {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [animDir, setAnimDir] = useState('right');
  const [selectedPort, setSelectedPort] = useState('ChPA');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toastMsg, setToastMsg] = useState(null);
  const [inlineQuery, setInlineQuery] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [botLoading, setBotLoading] = useState(false);
  const chatMessagesBoxRef = useRef(null);
  const chatInputRef = useRef(null);
  const chatMode = chatMessages.length > 0;

  const sendMessage = useCallback(async (text) => {
    const q = text.trim();
    if (!q || botLoading) return;
    const msgId = Date.now();
    setChatMessages(prev => [...prev, { role: 'user', text: q, id: msgId }]);
    setBotLoading(true);
    setInlineQuery('');
    try {
      const res = await fetch(`${API_BASE}/api/copilot/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          portName: selectedPort,
          viewType: 'org',
          conversationHistory: chatMessages.slice(-6)
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setChatMessages(prev => [...prev, {
          role: 'bot',
          text: '',
          structuredData: json.data,
          id: msgId + 1
        }]);
      } else {
        throw new Error('Invalid response');
      }
    } catch {
      setChatMessages(prev => [...prev, {
        role: 'bot',
        text: 'Sorry, I could not process your request. Please try again.',
        id: msgId + 1
      }]);
    } finally {
      setBotLoading(false);
    }
  }, [botLoading, chatMessages, selectedPort]);

  const handleAskBot = (prompt) => sendMessage(prompt);

  const handleInlineSubmit = (e) => {
    e.preventDefault();
    if (inlineQuery.trim()) sendMessage(inlineQuery);
  };

  const handleQuickChip = (prompt) => sendMessage(prompt);

  // Scroll only the internal chat box container without scrolling the browser page
  useEffect(() => {
    if (chatMessagesBoxRef.current) {
      chatMessagesBoxRef.current.scrollTo({
        top: chatMessagesBoxRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatMessages, botLoading]);

  const TOTAL = CAROUSEL_SLIDES.length;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => goTo((slide + 1) % TOTAL, 'right'), 5000);
    return () => clearTimeout(id);
  }, [paused, slide]);

  function goTo(next, dir = 'right') {
    setAnimDir(dir);
    setSlide(next);
  }

  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const h = now.getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const current = CAROUSEL_SLIDES[slide];
  const SlideIcon = current.icon;

  const slideVariants = {
    enter: (dir) => ({ opacity: 0, x: dir === 'right' ? 60 : -60, filter: 'blur(4px)' }),
    center: { opacity: 1, x: 0, filter: 'blur(0px)' },
    exit: (dir) => ({ opacity: 0, x: dir === 'right' ? -40 : 40, filter: 'blur(4px)' }),
  };

  /* Filter table rows */
  const filteredModules = useMemo(() => {
    return EXCLUSIVE_MODULES_DATA.filter((row) => {
      if (row.isGroup) {
        const matchesSearch = row.groupName.toLowerCase().includes(searchFilter.toLowerCase()) ||
          row.items.some(sub => sub.name.toLowerCase().includes(searchFilter.toLowerCase()));
        if (!matchesSearch) return false;
        if (statusFilter === 'all') return true;
        if (statusFilter === 'updated') return row.items.some(sub => sub.status === 'updated');
        if (statusFilter === 'pending') return row.items.some(sub => sub.status === 'pending');
        return true;
      }
      const matchesSearch = row.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (row.category && row.category.toLowerCase().includes(searchFilter.toLowerCase()));
      if (!matchesSearch) return false;
      if (statusFilter === 'all') return true;
      if (statusFilter === 'updated') return row.status === 'updated';
      if (statusFilter === 'pending') return row.status === 'pending';
      return true;
    });
  }, [searchFilter, statusFilter]);

  const handleExportDataEntryReport = () => {
    const header = ['S.No', 'Module Name', 'Category', 'Last Updated Date', 'Status'];
    const rows = [];
    EXCLUSIVE_MODULES_DATA.forEach(row => {
      if (row.isGroup) {
        row.items.forEach((item, idx) => {
          rows.push([
            idx === 0 ? row.sno : '',
            item.name,
            'Procurement',
            item.lastUpdated,
            item.status.toUpperCase()
          ]);
        });
      } else {
        rows.push([
          row.sno,
          row.name,
          row.category || '',
          row.lastUpdated,
          row.status.toUpperCase()
        ]);
      }
    });

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [header.join(','), ...rows.map(e => e.map(x => '"' + x + '"').join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'ChPA_Data_Entry_Report_' + dateStr.replace(/\s+/g, '_') + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToastMsg('Data Entry Report exported successfully!');
    setTimeout(() => setToastMsg(null), 3500);
  };

  const donutData = [
    { name: 'Updated on Schedule', value: 12, color: '#10B981' },
    { name: 'Pending Upload', value: 3, color: '#F43F5E' },
  ];

  const barData = [
    { name: 'Projects', days: 8 },
    { name: 'CSR', days: 23 },
    { name: 'Capex', days: 5 },
    { name: 'KPI', days: 14 },
    { name: 'HR', days: 14 },
    { name: 'GEM', days: 24 },
    { name: 'Legal', days: 1 },
    { name: 'MIV', days: 30 },
  ];

  return (
    <div className="pb-16 relative overflow-x-hidden w-full bg-slate-50 min-h-screen">

      {/* TOP VIEW SWITCHER & ORG CONTEXT BAR */}
      <div className="bg-[#0B2542] text-white border-b border-cyan-800/40 px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-[1680px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 bg-cyan-500/20 text-cyan-300 text-[11px] font-bold px-3 py-1 rounded-full border border-cyan-400/30">
              <Building2 className="h-3.5 w-3.5" />
              ORGANISATION VIEW
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-medium">Selected Organisation:</span>
              <select
                value={selectedPort}
                onChange={(e) => setSelectedPort(e.target.value)}
                className="bg-navy-deep/80 text-white text-xs font-bold px-3 py-1 rounded-lg border border-cyan-700/60 focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer"
              >
                {MAJOR_PORTS_LIST.map((port) => (
                  <option key={port.code} value={port.code} className="bg-slate-900 text-white">
                    {port.name} ({port.code})
                  </option>
                ))}
              </select>
            </div>
            <span className="hidden lg:inline text-xs text-slate-400 font-mono">· ChPA Node Active</span>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher Pills */}
            <div className="flex items-center bg-navy-deep/90 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => navigate('/portal-dashboard')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                title="Switch to Ministry Comprehensive View"
              >
                <Building className="h-3.5 w-3.5 text-slate-400" />
                Ministry View
              </button>
              <button
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-cyan-600 text-white shadow-sm transition-all cursor-default"
              >
                <Ship className="h-3.5 w-3.5 text-white" />
                Organisation View
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-cyan-300/80 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Live Telemetry
            </div>

            {/* Ask SagarBot AI Launcher */}
            <button
              onClick={() => handleAskBot(`Give me an administrative summary of ${selectedPort} data entry status, compliance percentage, and pending module actions.`)}
              className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white rounded-lg text-xs font-bold shadow-md shadow-cyan-900/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Open SagarBot Port AI Assistant"
            >
              <Bot className="h-3.5 w-3.5 text-cyan-100" />
              <span>Ask SagarBot AI</span>
              <Sparkles className="h-3 w-3 text-yellow-300 animate-pulse" />
            </button>
          </div>
        </div>
      </div>

      {/* HERO CAROUSEL - Full Width Edge to Edge */}
      <div
        className="w-full relative overflow-hidden text-white select-none shadow-md"
        style={{ height: 420 }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {CAROUSEL_SLIDES.map((s, i) => (
          <motion.div
            key={s.id}
            className="absolute inset-0 w-full h-full overflow-hidden"
            initial={false}
            animate={{ opacity: i === slide ? 1 : 0 }}
            transition={{ opacity: { duration: 0.8, ease: 'easeInOut' } }}
            style={{ zIndex: 0, pointerEvents: i === slide ? 'auto' : 'none' }}
          >
            <motion.img
              src={s.image}
              alt={s.title}
              className="absolute inset-0 w-full h-full object-cover object-center"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              animate={{ scale: i === slide ? 1.06 : 1.0 }}
              transition={{ scale: { duration: 7, ease: 'easeOut' } }}
            />
            <div className="absolute inset-0 z-10" style={{ background: s.overlay }} />
          </motion.div>
        ))}

        <ParticleCanvas />
        <FloatingOrb size={220} color="rgba(14,150,166,0.22)" top="10%" left="68%" delay={0} />
        <FloatingOrb size={150} color="rgba(255,255,255,0.08)" top="55%" left="82%" delay={3} />

        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-30">
          {!paused && (
            <motion.div
              key={slide + '-bar'}
              className="h-full bg-cyan-400"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 5, ease: 'linear' }}
            />
          )}
        </div>

        {/* Slide Content */}
        <div className="relative z-20 h-full flex items-center px-6 sm:px-12 lg:px-20 max-w-[1680px] mx-auto">
          <AnimatePresence mode="wait" custom={animDir}>
            <motion.div
              key={slide}
              custom={animDir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="w-full flex flex-col sm:flex-row items-center justify-between gap-8"
            >
              <div className="flex-1 min-w-0">
                <motion.div
                  className="flex items-center gap-3 mb-4"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <motion.span
                    className={'flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em] ' + current.accentColor}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Sparkles className="h-3 w-3" /> {current.tag}
                  </motion.span>
                  <motion.span
                    className={'text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full ' + current.badgeColor}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 14 }}
                  >
                    {current.badge}
                  </motion.span>
                </motion.div>

                <AnimatedTitle key={slide + '-title'} text={current.title} />

                <motion.p
                  className="text-sm sm:text-base text-white/75 max-w-xl leading-relaxed mt-3 drop-shadow"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45, duration: 0.5 }}
                >
                  {current.body}
                </motion.p>

                <motion.div
                  className="mt-5 flex items-center gap-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <span className="text-xs text-cyan-200/60 font-mono">{dateStr}</span>
                  <span className="text-white/25">·</span>
                  <span className="text-xs text-white/60">{greeting}, Chennai Port Authority</span>
                </motion.div>
              </div>

              {/* Right Hero Metric Badge */}
              <motion.div
                className="flex-shrink-0 flex flex-col items-center gap-3 p-6 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-xl"
                style={{ background: 'rgba(255,255,255,0.09)' }}
                initial={{ opacity: 0, scale: 0.85, x: 30 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 100, damping: 16 }}
              >
                <motion.div
                  className={'p-3 rounded-xl backdrop-blur-sm ' + current.iconBg}
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <SlideIcon className="h-6 w-6 text-white" />
                </motion.div>
                <div className="text-center">
                  <div className="font-display text-3xl font-extrabold leading-none">
                    <AnimatedNumber key={slide + '-num'} target={current.stat.num} duration={1.2} />
                  </div>
                  <div className="text-[10.5px] text-white/60 font-bold uppercase tracking-wider mt-1">
                    {current.stat.label}
                  </div>
                </div>
                <motion.div
                  className="w-2 h-2 rounded-full bg-cyan-400"
                  animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <div className="text-[10px] text-white/40 font-mono">
                  {String(slide + 1).padStart(2, '0')} / {String(TOTAL).padStart(2, '0')}
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel Prev / Next Controls */}
        {[{ Icon: ChevronLeft, fn: () => goTo((slide - 1 + TOTAL) % TOTAL, 'left'), pos: 'left-4' },
          { Icon: ChevronRight, fn: () => goTo((slide + 1) % TOTAL, 'right'), pos: 'right-4' }].map(({ Icon, fn, pos }) => (
          <motion.button
            key={pos}
            onClick={fn}
            className={'absolute ' + pos + ' top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full flex items-center justify-center border border-white/20 cursor-pointer'}
            style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)' }}
            whileHover={{ scale: 1.15, background: 'rgba(255,255,255,0.25)' }}
            whileTap={{ scale: 0.92 }}
          >
            <Icon className="h-5 w-5 text-white" />
          </motion.button>
        ))}

        {/* Dots */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
          {CAROUSEL_SLIDES.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => goTo(i, i > slide ? 'right' : 'left')}
              className="cursor-pointer rounded-full"
              animate={{
                width: i === slide ? 24 : 8,
                height: 8,
                backgroundColor: i === slide ? 'rgba(34,211,238,1)' : 'rgba(255,255,255,0.35)',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            />
          ))}
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 h-16 z-20 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom,transparent,rgba(248,250,252,0.55))' }}
        />
      </div>

      <WaveDivider />

      {/* DASHBOARD BODY CONTAINER */}
      <div className="px-4 sm:px-6 lg:px-8 max-w-[1680px] mx-auto space-y-8 mt-2">

        {/* TOAST NOTIFICATION */}
        <AnimatePresence>
          {toastMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 right-8 z-50 bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 font-bold text-xs"
            >
              <CheckCircle className="h-4 w-4" />
              {toastMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* SECTION I: EXECUTIVE STAT CARDS */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {ORG_STAT_CARDS.map((c, i) => {
            const t = STAT_THEMES[c.color] || STAT_THEMES.navy;
            return (
              <motion.div key={c.label} variants={fadeUp} transition={{ ...SPRING, delay: i * 0.04 }}>
                <TiltCard className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3 cursor-default overflow-hidden relative shadow-sm">
                  <motion.div
                    className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                    style={{ background: t.bar }}
                    initial={{ scaleX: 0, originX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  />
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{c.label}</p>
                      <p className="text-3xl font-extrabold" style={{ color: t.num }}>
                        <AnimatedNumber target={c.num} suffix={c.suffix} />
                      </p>
                    </div>
                    <motion.div
                      className="p-2.5 rounded-xl"
                      style={{ background: t.iconBg }}
                      whileHover={{ rotate: [0, -12, 12, 0], transition: { duration: 0.5 } }}
                    >
                      <c.icon className="h-5 w-5" style={{ color: t.icon }} />
                    </motion.div>
                  </div>
                  <p className="text-[11.5px] text-slate-400 font-medium">{c.sub}</p>
                </TiltCard>
              </motion.div>
            );
          })}
        </motion.div>

        {/* SAGARBOT + TABLE SIDE BY SIDE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* LEFT — Organisation Exclusive Modules Table */}
          <div className="lg:col-span-7">

        {/* SECTION II: THE ORGANISATION EXCLUSIVE MODULES TABLE */}
        <motion.div
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {/* Header Bar matching screenshot styling */}
          <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-slate-50 via-white to-slate-50">
            {/* Left Pill Badge */}
            <div className="flex items-center gap-3">
              <span className="bg-[#1E40AF] text-white font-black text-xs sm:text-sm px-4 py-2 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                ORGANISATION EXCLUSIVE MODULES
              </span>
            </div>

            {/* Center Date indicator */}
            <div className="text-rose-600 font-bold text-sm tracking-wide flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-rose-500 animate-pulse" />
              <span>(AS ON {dateStr.toUpperCase()})</span>
            </div>

            {/* Right Export and AI Action Buttons */}
            <div className="flex items-center gap-2.5">
              <motion.button
                onClick={() => handleAskBot("Provide a detailed analysis of Chennai Port Authority (ChPA) exclusive modules compliance, identifying the 3 pending modules and guidelines to resolve them.")}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                title="Ask SagarBot AI about these modules"
              >
                <Bot className="h-4 w-4" />
                <span>Ask AI about Modules</span>
              </motion.button>

              <motion.button
                onClick={handleExportDataEntryReport}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="bg-[#15803D] hover:bg-[#166534] text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Data Entry Report
              </motion.button>
            </div>
          </div>

          {/* Table Search & Filter Toolbar */}
          <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <div className="relative w-full">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search exclusive module..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Filter Status:</span>
              <button
                onClick={() => setStatusFilter('all')}
                className={'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ' +
                  (statusFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100')}
              >
                All (15)
              </button>
              <button
                onClick={() => setStatusFilter('updated')}
                className={'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ' +
                  (statusFilter === 'updated'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50')}
              >
                Updated (12)
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ' +
                  (statusFilter === 'pending'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50')}
              >
                Action Required (3)
              </button>
            </div>
          </div>

          {/* The Data Entry Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0B2542] text-white text-xs font-extrabold uppercase tracking-wider">
                  <th className="py-3 px-4 w-16 text-center border-r border-blue-900/60">S.No</th>
                  <th className="py-3 px-6 border-r border-blue-900/60">Module Name</th>
                  <th className="py-3 px-6 text-center border-r border-blue-900/60">Last Updated Date</th>
                  <th className="py-3 px-4 text-center w-28">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredModules.map((row) => {
                  /* Multi-row for GEM Procurement (S.No 6) */
                  if (row.isGroup) {
                    return row.items.map((item, idx) => (
                      <tr
                        key={item.subId}
                        className="hover:bg-slate-50/80 transition-colors duration-150"
                      >
                        {idx === 0 && (
                          <td
                            rowSpan={row.items.length}
                            className="py-3 px-4 text-center font-bold text-slate-700 border-r border-slate-200 bg-white"
                          >
                            {row.sno}
                          </td>
                        )}
                        <td className="py-3 px-6 font-semibold text-slate-800 border-r border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-800 font-medium">{item.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono uppercase bg-slate-100 px-2 py-0.5 rounded">
                              {item.subId}
                            </span>
                          </div>
                        </td>
                        <td
                          className={'py-3 px-6 text-center font-bold border-r border-slate-200 transition-colors ' +
                            (item.status === 'updated'
                              ? 'bg-[#A3D9A5] text-[#14532D]'
                              : 'bg-[#FECDD3] text-[#9F1239]')}
                        >
                          {item.lastUpdated}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => navigate(item.route)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            Open <ArrowUpRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ));
                  }

                  const isUpdated = row.status === 'updated';
                  return (
                    <tr
                      key={row.sno}
                      className="hover:bg-slate-50/80 transition-colors duration-150"
                    >
                      <td className="py-3 px-4 text-center font-bold text-slate-700 border-r border-slate-200">
                        {row.sno}
                      </td>
                      <td className="py-3 px-6 font-semibold text-slate-800 border-r border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="hover:text-blue-700 cursor-pointer" onClick={() => navigate(row.route)}>
                            {row.name}
                          </span>
                          {row.category && (
                            <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                              {row.category}
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className={'py-3 px-6 text-center font-bold border-r border-slate-200 transition-colors ' +
                          (isUpdated
                            ? 'bg-[#A3D9A5] text-[#14532D]'
                            : 'bg-[#FECDD3] text-[#9F1239]')}
                      >
                        {row.lastUpdated}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => navigate(row.route)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          Open <ArrowUpRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer Summary */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#A3D9A5] border border-emerald-600"></span>
                <span><strong>12</strong> Updated on Schedule</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#FECDD3] border border-rose-600"></span>
                <span><strong>3</strong> Pending / Action Required</span>
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Port Data Telemetry Frequency: Monthly & Weekly Sync
            </div>
          </div>
        </motion.div>
        </div>{/* END LEFT COLUMN (TABLE) */}

        {/* RIGHT — SagarBot Chatbot Panel */}
        <div className="lg:col-span-5 lg:sticky lg:top-4 flex flex-col">
          <motion.div
            layout
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-2xl shadow-xl flex flex-col w-full min-h-[760px]"
            style={{
              border: '1px solid rgba(147,197,253,0.5)',
              background: 'linear-gradient(135deg,#081a33,#0B2542,#1478A0)'
            }}
          >
            {/* Ambient Background Glowing Orbs */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-56 h-56 rounded-full bg-cyan-400/15 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-8 w-44 h-44 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

            <div className="flex flex-col flex-1 h-[760px] max-h-[760px] text-white z-10 overflow-hidden">
              {/* Chat header in Blue UI (Fixed at top) */}
              <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-white/15 bg-white/5 backdrop-blur-md rounded-t-2xl">
                <div className="flex items-center gap-2.5">
                  <div className="relative p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner">
                    <SagarBotLogo className="w-4 h-4 text-cyan-300" glowing={true} />
                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white leading-none">SagarBot AI Copilot</p>
                    <p className="text-[10px] text-cyan-300 font-semibold mt-0.5">● Live · {selectedPort} Intelligence</p>
                  </div>
                </div>
                {chatMessages.length > 0 && (
                  <button
                    onClick={() => setChatMessages([])}
                    className="text-[10.5px] font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg px-2.5 py-1 transition-all cursor-pointer"
                  >
                    Clear Chat
                  </button>
                )}
              </div>

              {/* Messages area in Blue UI (Scrolls independently) */}
              <div ref={chatMessagesBoxRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 min-h-0">
                {/* Initial Welcome Bot Message */}
                <div className="flex items-start gap-2.5 justify-start">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white/15 border border-white/20 flex items-center justify-center shadow-inner mt-0.5">
                    <SagarBotLogo className="w-3.5 h-3.5 text-cyan-300" />
                  </div>
                  <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-xs leading-relaxed shadow-md bg-white/15 backdrop-blur-md border border-white/20 text-slate-100">
                    <p className="font-semibold text-cyan-300 mb-1">👋 Welcome to SagarBot AI Copilot</p>
                    <p className="text-slate-200/90 text-[11.5px] leading-relaxed">
                      I am your intelligent assistant for {selectedPort}. You can ask me about port compliance, 15 exclusive modules, Capex utilization, GEM Works submissions, legal proceedings, or CSR projects.
                    </p>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {chatMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                      className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'bot' && (
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white/15 border border-white/20 flex items-center justify-center shadow-inner self-start mt-0.5">
                          <SagarBotLogo className="w-3.5 h-3.5 text-cyan-300" />
                        </div>
                      )}
                      <div className={`${msg.role === 'user' ? 'max-w-[85%]' : 'max-w-[90%] w-full'} px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-md ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-semibold rounded-br-sm shadow-cyan-500/20'
                          : 'bg-white/15 backdrop-blur-md border border-white/20 text-slate-100 rounded-bl-sm'
                      }`}>
                        {msg.structuredData ? (
                          <DynamicVisualizer
                            data={msg.structuredData}
                            onFollowUp={(q) => sendMessage(q)}
                          />
                        ) : (
                          msg.text
                        )}
                      </div>
                      {msg.role === 'user' && (
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white/20 border border-white/25 flex items-center justify-center text-white text-[9.5px] font-bold shadow-inner">
                          You
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {botLoading && (
                    <motion.div key="typing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-end gap-2.5 justify-start">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white/15 border border-white/20 flex items-center justify-center shadow-inner">
                        <SagarBotLogo className="w-3.5 h-3.5 text-cyan-300" />
                      </div>
                      <div className="bg-white/15 backdrop-blur-md border border-white/20 px-3.5 py-2.5 rounded-2xl rounded-bl-sm shadow-md flex items-center gap-1.5">
                        {[0, 1, 2].map(i => (
                          <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-300 block"
                            animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Chat input in Blue UI (Fixed at bottom) */}
              <div className="flex-shrink-0 px-5 py-4 border-t border-white/15 bg-white/5 backdrop-blur-md rounded-b-2xl">
                <form onSubmit={handleInlineSubmit} className="flex items-center gap-2">
                  <input
                    ref={chatInputRef}
                    type="text"
                    value={inlineQuery}
                    onChange={(e) => setInlineQuery(e.target.value)}
                    placeholder={`Ask SagarBot about ${selectedPort}...`}
                    className="flex-1 text-xs text-white placeholder-slate-400 bg-white/15 backdrop-blur-md border border-white/25 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-300/60 transition shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={botLoading}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <span>Ask</span>
                    <Sparkles className="w-3.5 h-3.5 text-slate-900" />
                  </button>
                </form>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {[
                    { label: '🚢 Port Compliance', prompt: 'Provide a detailed compliance report on which of the 15 exclusive modules are updated and which 3 are pending for Chennai Port.' },
                    { label: '🛒 GEM Works', prompt: 'What is the status of GEM Works data upload for August/September 2026?' },
                    { label: '💰 Capex Status', prompt: 'Summarize the Capex utilisation rate and target variance for Chennai Port Authority.' },
                    { label: '⚖️ Court Cases', prompt: 'What is the current status of the active court cases and arbitrations for Chennai Port Authority?' },
                    { label: '📊 MIV 2030', prompt: 'Give me an analysis of Maritime India Vision 2030 interventions and targets achieved for Chennai Port.' },
                    { label: '📋 CSR Projects', prompt: 'What is the latest progress and fund allocation on ChPA CSR projects?' }
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickChip(chip.prompt)}
                      className="text-[10px] font-medium text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg px-2.5 py-1 whitespace-nowrap transition-all cursor-pointer hover:border-cyan-300/40"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        </div>{/* END SAGARBOT + TABLE 2-COL GRID */}

        {/* SECTION III: COMPLIANCE ANALYTICS & QUICK ACTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Donut Chart: Submission Status */}
          <motion.div
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-blue-950 text-sm">ChPA Submission Compliance</h3>
                <p className="text-xs text-slate-400 mt-0.5">Exclusive modules reporting ratio</p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                80% On Track
              </span>
            </div>

            <div className="h-52 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={'cell-' + index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center pointer-events-none">
                <span className="font-display text-2xl font-extrabold text-blue-950">12/15</span>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Updated</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-around text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-600 font-medium">Updated: <strong>12</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span className="text-slate-600 font-medium">Pending: <strong>3</strong></span>
              </div>
            </div>
          </motion.div>

          {/* Bar Chart: Days Since Last Update */}
          <motion.div
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-blue-950 text-sm">Submission Freshness</h3>
                <p className="text-xs text-slate-400 mt-0.5">Days since last telemetry packet logged</p>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                Fresh Data
              </span>
            </div>

            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                  <Tooltip />
                  <Bar dataKey="days" fill="#0E96A6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 text-center">
              Target freshness threshold: &lt; 30 days for major modules
            </div>
          </motion.div>

          {/* Quick Input Actions */}
          <motion.div
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div>
              <h3 className="font-bold text-blue-950 text-sm">Quick Data Entry Actions</h3>
              <p className="text-xs text-slate-400 mt-0.5">Jump directly to ChPA data submission forms</p>

              <div className="grid grid-cols-2 gap-2.5 mt-4">
                {[
                  { label: 'Projects Input', route: '/projects/project/input-form', icon: Briefcase, color: 'text-blue-600 bg-blue-50' },
                  { label: 'Capex Input', route: '/finance/capex/input-form', icon: TrendingUp, color: 'text-teal-600 bg-teal-50' },
                  { label: 'GEM Procurements', route: '/governance/gem-procurements', icon: Layers, color: 'text-amber-600 bg-amber-50' },
                  { label: 'Major Ports KPI', route: '/kpi/major-ports/major-ports-input-form', icon: Ship, color: 'text-cyan-600 bg-cyan-50' },
                  { label: 'Court Cases Entry', route: '/legal/courtcases', icon: Scale, color: 'text-rose-600 bg-rose-50' },
                  { label: 'HR Management', route: '/hr/hr-management/hr-dashboard', icon: Users, color: 'text-emerald-600 bg-emerald-50' },
                ].map((act, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(act.route)}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-150 hover:border-slate-300 hover:bg-slate-50 transition-all text-left cursor-pointer group"
                  >
                    <div className={'p-1.5 rounded-lg ' + act.color}>
                      <act.icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 group-hover:text-blue-700 transition-colors truncate">
                      {act.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 p-3 rounded-xl bg-amber-50 border border-amber-200/60 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-amber-900">Pending Actions for ChPA</p>
                <p className="text-[10px] text-amber-700 leading-relaxed mt-0.5">
                  GEM Procurement Work statement, AKV 2047, and Knowledge Repository require immediate submission.
                </p>
              </div>
            </div>
          </motion.div>
        </div>{/* END SECTION III GRID */}

      </div>
    </div>
  );
}
