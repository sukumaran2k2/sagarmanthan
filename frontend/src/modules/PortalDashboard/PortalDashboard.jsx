import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion, AnimatePresence, useInView,
  useMotionValue, useSpring, useTransform, animate,
} from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Briefcase, Users, Scale, CalendarClock, BarChart2,
  Anchor, AlertCircle, CheckCircle2, Clock, ArrowRight,
  ChevronRight, ChevronLeft, TrendingUp, Ship, Gavel,
  Sparkles, Activity, Building, Building2, Bot,
} from 'lucide-react';
import { useAICopilot } from '../../context/AICopilotContext';
import { SagarBotLogo } from '../../components/SagarBot';
import DynamicVisualizer from '../../components/SagarBot/DynamicVisualizer';
import { API_BASE } from '../../api';

/* ─── DATA ──────────────────────────────────────────────── */
const CAROUSEL_SLIDES = [
  { id:0, tag:'Portal Overview', title:'Welcome back, Rajesh',
    body:'A single view across projects, HR, governance, legal matters, KPIs and data-entry compliance — everything the ministry tracks, in one place.',
    stat:{num:48,label:'Active Projects'}, badge:'24 on track',
    badgeColor:'bg-emerald-400/30 text-emerald-100 border border-emerald-300/40',
    icon:Briefcase, image:'/carousel/slide1.jpg',
    overlay:'linear-gradient(90deg, rgba(8,26,51,0.88) 0%, rgba(8,26,51,0.60) 50%, rgba(8,26,51,0.25) 85%, rgba(8,26,51,0.12) 100%)',
    accentColor:'text-yellow-400', iconBg:'bg-white/10' },
  { id:1, tag:'Maritime Vision 2030', title:'MIV 2030 — On Schedule',
    body:'All 14 themes of Maritime India Vision 2030 tracked in real-time. 387 interventions active, 52 milestones cleared this quarter.',
    stat:{num:387,label:'Interventions'}, badge:'On schedule',
    badgeColor:'bg-teal-400/30 text-teal-100 border border-teal-300/40',
    icon:TrendingUp, image:'/carousel/slide2.jpg',
    overlay:'linear-gradient(90deg, rgba(8,30,55,0.88) 0%, rgba(8,30,55,0.60) 50%, rgba(8,30,55,0.25) 85%, rgba(8,30,55,0.12) 100%)',
    accentColor:'text-teal-300', iconBg:'bg-teal-900/40' },
  { id:2, tag:'Port Authorities', title:'9 Major Ports Onboarded',
    body:'All 9 major port authorities contributing data across 12 exclusive modules. GEM Procurement compliance reached 76% this month.',
    stat:{num:9,label:'Ports Active'}, badge:'76% compliant',
    badgeColor:'bg-blue-400/30 text-blue-100 border border-blue-300/40',
    icon:Ship, image:'/carousel/slide3.jpg',
    overlay:'linear-gradient(90deg, rgba(5,20,45,0.90) 0%, rgba(5,20,45,0.60) 50%, rgba(5,20,45,0.25) 85%, rgba(5,20,45,0.12) 100%)',
    accentColor:'text-blue-300', iconBg:'bg-blue-900/40' },
  { id:3, tag:'Legal & Governance', title:'Court Cases Under Review',
    body:'Legal cell tracking 63 open court cases across port authorities. 6 cases disposed in Sep 2026 — highest monthly clearance this year.',
    stat:{num:63,label:'Open Cases'}, badge:'6 disposed',
    badgeColor:'bg-amber-400/30 text-amber-100 border border-amber-300/40',
    icon:Gavel, image:'/carousel/slide4.jpg',
    overlay:'linear-gradient(90deg, rgba(20,12,4,0.88) 0%, rgba(20,12,4,0.60) 50%, rgba(20,12,4,0.25) 85%, rgba(20,12,4,0.12) 100%)',
    accentColor:'text-amber-300', iconBg:'bg-amber-900/40' },
  { id:4, tag:'HR & Institutional', title:'18 Young Professionals Active',
    body:'18 Young Professionals posted across ministry wings. September batch KPI submissions complete. Next review: 6 October 2026.',
    stat:{num:18,label:'YPs in Post'}, badge:'All KPIs submitted',
    badgeColor:'bg-emerald-400/30 text-emerald-100 border border-emerald-300/40',
    icon:Users, image:'/carousel/slide5.jpg',
    overlay:'linear-gradient(90deg, rgba(4,22,12,0.88) 0%, rgba(4,22,12,0.60) 50%, rgba(4,22,12,0.25) 85%, rgba(4,22,12,0.12) 100%)',
    accentColor:'text-emerald-300', iconBg:'bg-emerald-900/40' },
];

const STAT_CARDS = [
  {label:'Active Projects',num:48,suffix:'',sub:'across all wings',icon:Briefcase,color:'navy'},
  {label:'Young Professionals',num:18,suffix:'',sub:'currently in post',icon:Users,color:'green'},
  {label:'Open Court Cases',num:63,suffix:'',sub:'pending disposal',icon:Scale,color:'red'},
  {label:'Upcoming Meetings',num:5,suffix:'',sub:'in next 14 days',icon:CalendarClock,color:'amber'},
  {label:'Data Compliance',num:71,suffix:'%',sub:'modules up to date',icon:BarChart2,color:'teal'},
  {label:'Port Authorities',num:9,suffix:'',sub:'9/9 major ports onboarded',icon:Anchor,color:'gold'},
];

const MODULES = [
  {name:'Projects',desc:'Track milestones, budgets & status across wings.',badge:'48 active',badgeCls:'ok',route:'/projects/project/project-list'},
  {name:'KPI',desc:'Key performance indicators reported monthly.',badge:'Updated Sep-2026',badgeCls:'ok',route:'/kpi/major-ports/major-ports-dashboard'},
  {name:'HR & Institutional',desc:'Young Professionals, consultants, postings.',badge:'18 in post',badgeCls:'ok',route:'/hr/young-professionals/list-view'},
  {name:'Governance',desc:'Cabinet notes, VIP references, audit paras.',badge:'3 pending',badgeCls:'warn',route:'/governance/cabinet-notes/dashboard'},
  {name:'Legal',desc:'Court cases & legal advisories.',badge:'63 open',badgeCls:'alert',route:'/legal/courtcases'},
  {name:'Strategies',desc:'MIV 2030, AKV 2047 strategic planners.',badge:'On schedule',badgeCls:'ok',route:'/strategies/miv-2030/data-list'},
  {name:'Knowledge Repo',desc:'Shared docs, guidelines & reference material.',badge:'5 pending',badgeCls:'warn',route:'/'},
  {name:'Form Builder',desc:'Create & manage custom data collection forms.',badge:'Last: Nov-2025',badgeCls:'neutral',route:'/'},
  {name:'MoPSW Tracker',desc:'File pendency, receipts & disposal tracking.',badge:'TBD',badgeCls:'warn',route:'/'},
  {name:'Senior Meetings',desc:'Agendas, minutes & action items from leadership.',badge:'5 upcoming',badgeCls:'ok',route:'/'},
  {name:'Data Entry Dash',desc:'Module-level compliance heatmap.',badge:'71% compliant',badgeCls:'ok',route:'/'},
  {name:'Contact Us',desc:'Directory of wing contacts & support channels.',badge:'Directory',badgeCls:'neutral',route:'/contact'},
];

const PROJECT_STATUS_DATA = [
  {name:'On Track',value:24,color:'#0F6E56'},{name:'At Risk',value:9,color:'#B8860B'},
  {name:'Delayed',value:6,color:'#C0392B'},{name:'Completed',value:9,color:'#1478A0'},
];
const LEGAL_DATA = [
  {month:'Apr',open:58,disposed:4},{month:'May',open:60,disposed:3},
  {month:'Jun',open:61,disposed:6},{month:'Jul',open:64,disposed:5},
  {month:'Aug',open:63,disposed:7},{month:'Sep',open:63,disposed:6},
];
const ACTIVITY_FEED = [
  {color:'#0F6E56',text:'Court Cases updated for Cochin Port Authority',module:'Court Cases',time:'2h ago'},
  {color:'#0E96A6',text:'KPI data submitted for September 2026 by all wings',module:'KPI',time:'Yesterday'},
  {color:'#B8860B',text:'Audit Para flagged for DGLL, Parliament & TRW',module:'Audit Para',time:'2 days ago'},
  {color:'#0F6E56',text:'Foreign Visit record added for Shipping wing',module:'Governance',time:'3 days ago'},
  {color:'#C0392B',text:'GEM Procurement overdue for 6 port authorities',module:'GEM',time:'4 days ago'},
  {color:'#1478A0',text:'MOM of PSW Meetings uploaded for Coord-I',module:'Meetings',time:'5 days ago'},
];
const MEETINGS = [
  {d:'26',m:'Sep',title:'Senior Officers Meeting',sub:'10:30 AM · Conference Hall, MoPSW HQ'},
  {d:'29',m:'Sep',title:'PSW Review — Coord-I & Coord-II',sub:'3:00 PM · Virtual'},
  {d:'02',m:'Oct',title:'MIV 2030 Progress Review',sub:'11:00 AM · Conference Hall'},
  {d:'06',m:'Oct',title:'Cabinet Notes Coordination',sub:'2:30 PM · Virtual'},
  {d:'08',m:'Oct',title:'Port Authorities Quarterly Sync',sub:'10:00 AM · Conference Hall'},
];
const COMPLIANCE = [
  {label:'Ministry Exclusive Modules',pct:68,color:'#0F6E56',icon:CheckCircle2},
  {label:'Port Authority Modules',pct:76,color:'#0E96A6',icon:CheckCircle2},
  {label:'File Pendency & Receipts',pct:82,color:'#B8860B',icon:AlertCircle},
];

/* ─── THEME MAPS ─────────────────────────────────────────── */
const BADGE_STYLES = {
  ok:'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warn:'bg-amber-50 text-amber-700 border border-amber-200',
  alert:'bg-red-50 text-red-700 border border-red-200',
  neutral:'bg-slate-100 text-slate-600 border border-slate-200',
};
const STAT_THEMES = {
  navy:{bar:'#0B2542',num:'#0B2542',iconBg:'#EFF4FF',icon:'#0B2542'},
  green:{bar:'#0F6E56',num:'#065F46',iconBg:'#ECFDF5',icon:'#0F6E56'},
  red:{bar:'#C0392B',num:'#991B1B',iconBg:'#FEF2F2',icon:'#C0392B'},
  amber:{bar:'#B8860B',num:'#92400E',iconBg:'#FFFBEB',icon:'#B8860B'},
  teal:{bar:'#0E96A6',num:'#0E7490',iconBg:'#ECFEFF',icon:'#0E96A6'},
  gold:{bar:'#C9A227',num:'#854D0E',iconBg:'#FEF9C3',icon:'#C9A227'},
};

/* ─── MOTION VARIANTS ────────────────────────────────────── */
const fadeUp    = { hidden:{opacity:0,y:32},     visible:{opacity:1,y:0} };
const fadeLeft  = { hidden:{opacity:0,x:-32},    visible:{opacity:1,x:0} };
const fadeRight = { hidden:{opacity:0,x:32},     visible:{opacity:1,x:0} };
const scaleIn   = { hidden:{opacity:0,scale:0.88}, visible:{opacity:1,scale:1} };
const stagger   = { visible:{transition:{staggerChildren:0.08}} };
const staggerFast = { visible:{transition:{staggerChildren:0.05}} };
const SPRING      = { type:'spring', stiffness:120, damping:18 };
const SPRING_SLOW = { type:'spring', stiffness:60,  damping:15 };

/* ─── PARTICLE CANVAS ────────────────────────────────────── */
function ParticleCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    const N = 55;
    const pts = Array.from({length:N}, () => ({
      x:Math.random()*canvas.width, y:Math.random()*canvas.height,
      r:Math.random()*1.6+0.4, vx:(Math.random()-0.5)*0.35, vy:(Math.random()-0.5)*0.35,
      a:Math.random()*0.5+0.15,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;  if (p.x > canvas.width)  p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle = `rgba(255,255,255,${p.a})`; ctx.fill();
      });
      for (let i = 0; i < N; i++) for (let j = i+1; j < N; j++) {
        const dx = pts[i].x-pts[j].x, dy = pts[i].y-pts[j].y;
        const d = Math.sqrt(dx*dx+dy*dy);
        if (d < 90) {
          ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
          ctx.strokeStyle = `rgba(255,255,255,${0.06*(1-d/90)})`; ctx.lineWidth=0.6; ctx.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />;
}

/* ─── ANIMATED NUMBER ────────────────────────────────────── */
function AnimatedNumber({ target, suffix='', duration=1.4 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:'-40px' });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness:50, damping:12 });
  const display = useTransform(spring, v => Math.round(v) + suffix);
  useEffect(() => { if (inView) animate(mv, target, { duration, ease:[0.22,1,0.36,1] }); }, [inView, target]);
  return <motion.span ref={ref}>{display}</motion.span>;
}

/* ─── 3D TILT CARD ───────────────────────────────────────── */
function TiltCard({ children, className='', onClick }) {
  const ref = useRef(null);
  const rotateX = useSpring(useMotionValue(0), { stiffness:200, damping:20 });
  const rotateY = useSpring(useMotionValue(0), { stiffness:200, damping:20 });
  const onMove = useCallback((e) => {
    const rect = ref.current?.getBoundingClientRect(); if (!rect) return;
    const cx = rect.left+rect.width/2, cy = rect.top+rect.height/2;
    rotateY.set((e.clientX-cx)/(rect.width/2)*10);
    rotateX.set(-(e.clientY-cy)/(rect.height/2)*8);
  }, [rotateX, rotateY]);
  const onLeave = useCallback(() => { rotateX.set(0); rotateY.set(0); }, [rotateX, rotateY]);
  return (
    <motion.div ref={ref}
      style={{ rotateX, rotateY, transformStyle:'preserve-3d', transformPerspective:900 }}
      onMouseMove={onMove} onMouseLeave={onLeave} onClick={onClick}
      className={className} whileHover={{scale:1.025}} whileTap={{scale:0.98}} transition={SPRING}>
      {children}
    </motion.div>
  );
}

/* ─── ANIMATED PROGRESS BAR ──────────────────────────────── */
function AnimatedBar({ pct, color }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:'-30px' });
  return (
    <div ref={ref} className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
      <motion.div className="h-full rounded-full" style={{background:color}}
        initial={{width:0}} animate={inView ? {width:`${pct}%`} : {}}
        transition={{duration:1.2, ease:[0.22,1,0.36,1], delay:0.2}} />
    </div>
  );
}

/* ─── WORD-BY-WORD TITLE REVEAL ──────────────────────────── */
function AnimatedTitle({ text }) {
  return (
    <h1 className="font-display text-2xl sm:text-3xl lg:text-[2.6rem] font-extrabold leading-tight drop-shadow-xl">
      {text.split(' ').map((w,i) => (
        <motion.span key={w+i} className="inline-block mr-[0.25em]"
          initial={{opacity:0, y:30, filter:'blur(6px)'}}
          animate={{opacity:1, y:0, filter:'blur(0px)'}}
          transition={{duration:0.55, ease:[0.22,1,0.36,1], delay:0.15+i*0.08}}>
          {w}
        </motion.span>
      ))}
    </h1>
  );
}

/* ─── SVG WAVE DIVIDER ───────────────────────────────────── */
function WaveDivider() {
  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-6 overflow-hidden leading-none pointer-events-none" style={{height:60}}>
      <svg viewBox="0 0 1440 60" className="w-full h-full" preserveAspectRatio="none">
        <motion.path d="M0,30 C360,60 720,0 1080,30 C1260,45 1380,15 1440,30 L1440,60 L0,60 Z"
          fill="#f8fafc"
          initial={{pathLength:0, opacity:0}} animate={{pathLength:1, opacity:1}}
          transition={{duration:1.4, ease:'easeOut', delay:0.2}} />
      </svg>
    </div>
  );
}

/* ─── FLOATING ORB ───────────────────────────────────────── */
function FloatingOrb({ size, color, top, left, delay=0 }) {
  return (
    <motion.div className="absolute rounded-full pointer-events-none blur-3xl"
      style={{width:size, height:size, background:color, top, left, zIndex:0}}
      animate={{y:[0,-18,0], x:[0,10,0], scale:[1,1.05,1]}}
      transition={{duration:8+delay, repeat:Infinity, ease:'easeInOut', delay}} />
  );
}

/* ─── MAIN EXPORT ────────────────────────────────────────── */
export default function PortalDashboard() {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [animDir, setAnimDir] = useState('right');
  const [inlineQuery, setInlineQuery] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [botLoading, setBotLoading] = useState(false);
  const chatMessagesBoxRef = useRef(null);
  const chatInputRef = useRef(null);
  const TOTAL = CAROUSEL_SLIDES.length;
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
          viewType: 'ministry',
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
  }, [botLoading, chatMessages]);

  const handleInlineSubmit = (e) => {
    e.preventDefault();
    if (inlineQuery.trim()) sendMessage(inlineQuery);
  };

  const handleQuickChip = (prompt) => sendMessage(prompt);
  const handleAskBot = (prompt) => sendMessage(prompt);

  // Scroll only the internal chat box container without scrolling the browser page
  useEffect(() => {
    if (chatMessagesBoxRef.current) {
      chatMessagesBoxRef.current.scrollTo({
        top: chatMessagesBoxRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatMessages, botLoading]);

  useEffect(() => { const id=setInterval(()=>setNow(new Date()),60000); return()=>clearInterval(id); },[]);
  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => goTo((slide+1)%TOTAL,'right'), 5000);
    return () => clearTimeout(id);
  }, [paused, slide]);

  function goTo(next, dir='right') { setAnimDir(dir); setSlide(next); }

  const dateStr = now.toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
  const h = now.getHours();
  const greeting = h<12?'Good morning':h<17?'Good afternoon':'Good evening';
  const current = CAROUSEL_SLIDES[slide];
  const SlideIcon = current.icon;

  const slideVariants = {
    enter: (dir) => ({opacity:0, x:dir==='right'?60:-60, filter:'blur(4px)'}),
    center: {opacity:1, x:0, filter:'blur(0px)'},
    exit:  (dir) => ({opacity:0, x:dir==='right'?-40:40,  filter:'blur(4px)'}),
  };

  return (
    <div className="pb-16 relative overflow-x-hidden w-full">

      {/* TOP VIEW SWITCHER & CONTEXT BAR */}
      <div className="bg-[#0B2542] text-white border-b border-blue-900/60 px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-[1680px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-300 text-[11px] font-bold px-3 py-1 rounded-full border border-blue-400/30">
              <Building className="h-3.5 w-3.5" />
              MINISTRY APEX VIEW
            </span>
            <span className="text-xs text-slate-300 font-medium">Ministry of Ports, Shipping and Waterways</span>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher Pills */}
            <div className="flex items-center bg-navy-deep/90 p-1 rounded-xl border border-slate-700">
              <button
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-sm transition-all cursor-default"
              >
                <Building className="h-3.5 w-3.5 text-white" />
                Ministry View
              </button>
              <button
                onClick={() => navigate('/org-dashboard')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                title="Switch to Organisation View (ChPA / Port Authority)"
              >
                <Ship className="h-3.5 w-3.5 text-slate-400" />
                Organisation View (ChPA)
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Live Telemetry
            </div>

            {/* Ask SagarBot AI Launcher */}
            <button
              onClick={() => handleAskBot("Give me an executive summary of Ministry metrics, active projects, court cases, and pending items.")}
              className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg text-xs font-bold shadow-md shadow-cyan-900/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Open SagarBot Maritime AI Assistant"
            >
              <Bot className="h-3.5 w-3.5 text-cyan-100" />
              <span>Ask SagarBot AI</span>
              <Sparkles className="h-3 w-3 text-yellow-300 animate-pulse" />
            </button>
          </div>
        </div>
      </div>

      {/* CAROUSEL - Full Width Edge to Edge */}
      <div className="w-full relative overflow-hidden text-white select-none shadow-md"
        style={{height: 420}}
        onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)}>

        {CAROUSEL_SLIDES.map((s,i) => (
          <motion.div
            key={s.id}
            className="absolute inset-0 w-full h-full overflow-hidden"
            initial={false}
            animate={{opacity: i === slide ? 1 : 0}}
            transition={{opacity: {duration: 0.8, ease: 'easeInOut'}}}
            style={{zIndex: 0, pointerEvents: i === slide ? 'auto' : 'none'}}
          >
            <motion.img
              src={s.image}
              alt={s.title}
              className="absolute inset-0 w-full h-full object-cover object-center"
              style={{width: '100%', height: '100%', objectFit: 'cover'}}
              animate={{scale: i === slide ? 1.06 : 1.0}}
              transition={{scale: {duration: 7, ease: 'easeOut'}}}
            />
            {/* Elegant glassmorphism gradient overlay for high contrast text readability while keeping full-width photo crisp */}
            <div
              className="absolute inset-0 z-10"
              style={{background: s.overlay}}
            />
          </motion.div>
        ))}

        <ParticleCanvas />
        <FloatingOrb size={200} color="rgba(14,150,166,0.18)" top="10%" left="70%" delay={0} />
        <FloatingOrb size={140} color="rgba(255,255,255,0.06)" top="55%" left="85%" delay={3} />

        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-30">
          {!paused && (
            <motion.div key={slide+'-bar'} className="h-full bg-white/60"
              initial={{width:'0%'}} animate={{width:'100%'}}
              transition={{duration:5, ease:'linear'}} />
          )}
        </div>

        <div className="relative z-20 h-full flex items-center px-8 sm:px-14 lg:px-24">
          <AnimatePresence mode="wait" custom={animDir}>
            <motion.div key={slide} custom={animDir} variants={slideVariants}
              initial="enter" animate="center" exit="exit"
              transition={{duration:0.5, ease:[0.22,1,0.36,1]}}
              className="w-full flex flex-col sm:flex-row items-center justify-between gap-8">

              <div className="flex-1 min-w-0">
                <motion.div className="flex items-center gap-3 mb-4"
                  initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.15}}>
                  <motion.span className={`flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em] ${current.accentColor}`}
                    initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.1}}>
                    <Sparkles className="h-3 w-3" /> {current.tag}
                  </motion.span>
                  <motion.span className={`text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full ${current.badgeColor}`}
                    initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}}
                    transition={{delay:0.2, type:'spring', stiffness:200, damping:14}}>
                    {current.badge}
                  </motion.span>
                </motion.div>

                <AnimatedTitle key={slide+'-title'} text={current.title} />

                <motion.p className="text-sm sm:text-base text-white/70 max-w-xl leading-relaxed mt-3 drop-shadow"
                  initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.45,duration:0.5}}>
                  {current.body}
                </motion.p>

                <motion.div className="mt-5 flex items-center gap-3"
                  initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.6}}>
                  <span className="text-xs text-white/45 font-mono">{dateStr}</span>
                  <span className="text-white/25">·</span>
                  <span className="text-xs text-white/45">{greeting}, MoPSW</span>
                </motion.div>
              </div>

              <motion.div
                className="flex-shrink-0 flex flex-col items-center gap-3 p-6 rounded-2xl border border-white/20 shadow-2xl"
                style={{background:'rgba(255,255,255,0.09)', backdropFilter:'blur(18px)'}}
                initial={{opacity:0,scale:0.85,x:30}} animate={{opacity:1,scale:1,x:0}}
                transition={{delay:0.3,type:'spring',stiffness:100,damping:16}}>
                <motion.div className={`p-3 rounded-xl ${current.iconBg} backdrop-blur-sm`}
                  animate={{rotate:[0,5,-5,0]}} transition={{duration:4,repeat:Infinity,ease:'easeInOut'}}>
                  <SlideIcon className="h-6 w-6 text-white" />
                </motion.div>
                <div className="text-center">
                  <div className="font-display text-3xl font-extrabold leading-none">
                    <AnimatedNumber key={slide+'-num'} target={current.stat.num} duration={1.2} />
                  </div>
                  <div className="text-[10.5px] text-white/55 font-bold uppercase tracking-wider mt-1">
                    {current.stat.label}
                  </div>
                </div>
                <motion.div className="w-2 h-2 rounded-full bg-white/60"
                  animate={{scale:[1,1.8,1],opacity:[0.6,0,0.6]}} transition={{duration:2,repeat:Infinity}} />
                <div className="text-[10px] text-white/35 font-mono">
                  {String(slide+1).padStart(2,'0')} / {String(TOTAL).padStart(2,'0')}
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {[{Icon:ChevronLeft,fn:()=>goTo((slide-1+TOTAL)%TOTAL,'left'),pos:'left-4'},
          {Icon:ChevronRight,fn:()=>goTo((slide+1)%TOTAL,'right'),pos:'right-4'}].map(({Icon,fn,pos})=>(
          <motion.button key={pos} onClick={fn}
            className={`absolute ${pos} top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full flex items-center justify-center border border-white/20 cursor-pointer`}
            style={{background:'rgba(255,255,255,0.10)',backdropFilter:'blur(10px)'}}
            whileHover={{scale:1.15,background:'rgba(255,255,255,0.22)'}} whileTap={{scale:0.92}}>
            <Icon className="h-5 w-5 text-white" />
          </motion.button>
        ))}

        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
          {CAROUSEL_SLIDES.map((_,i) => (
            <motion.button key={i} onClick={()=>goTo(i,i>slide?'right':'left')}
              className="cursor-pointer rounded-full"
              animate={{width:i===slide?24:8, height:8, backgroundColor:i===slide?'rgba(255,255,255,1)':'rgba(255,255,255,0.35)'}}
              transition={{type:'spring',stiffness:300,damping:20}} />
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-16 z-20 pointer-events-none"
          style={{background:'linear-gradient(to bottom,transparent,rgba(248,250,252,0.55))'}} />
      </div>

      <WaveDivider />

      {/* DASHBOARD CONTENT CONTAINER */}
      <div className="px-4 sm:px-6 lg:px-8 max-w-[1680px] mx-auto space-y-8 mt-2">

      {/* STAT CARDS */}
      <motion.div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mt-2"
        variants={stagger} initial="hidden" whileInView="visible" viewport={{once:true,margin:'-50px'}}>
        {STAT_CARDS.map((c,i) => {
          const t = STAT_THEMES[c.color]||STAT_THEMES.navy;
          return (
            <motion.div key={c.label} variants={fadeUp} transition={{...SPRING,delay:i*0.04}}>
              <TiltCard className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3 cursor-default overflow-hidden relative">
                <motion.div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{background:t.bar}}
                  initial={{scaleX:0,originX:0}} whileInView={{scaleX:1}} viewport={{once:true}}
                  transition={{duration:0.6,delay:i*0.08,ease:[0.22,1,0.36,1]}} />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{c.label}</p>
                    <p className="text-3xl font-extrabold" style={{color:t.num}}>
                      <AnimatedNumber target={c.num} suffix={c.suffix} />
                    </p>
                  </div>
                  <motion.div className="p-2.5 rounded-xl" style={{background:t.iconBg}}
                    whileHover={{rotate:[0,-12,12,0],transition:{duration:0.5}}}>
                    <c.icon className="h-5 w-5" style={{color:t.icon}} />
                  </motion.div>
                </div>
                <p className="text-[11.5px] text-slate-400 font-medium">{c.sub}</p>
              </TiltCard>
            </motion.div>
          );
        })}
      </motion.div>




      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-6 items-stretch">

        {/* LEFT — Quick Access Module Cards */}
        <motion.div className="lg:col-span-7" initial="hidden" whileInView="visible" viewport={{once:true,margin:'-60px'}} variants={stagger}>
          <motion.div className="flex items-center justify-between mb-4" variants={fadeUp} transition={SPRING}>
            <div className="flex items-center gap-2">
              <motion.div className="w-1 h-6 rounded-full bg-teal-500"
                initial={{scaleY:0}} whileInView={{scaleY:1}} viewport={{once:true}} transition={{duration:0.4}} />
              <h2 className="font-display text-xl font-bold text-blue-950">Quick Access</h2>
            </div>
            <motion.button className="text-xs text-teal-600 font-bold hover:underline flex items-center gap-1"
              whileHover={{x:4}} transition={{type:'spring',stiffness:300}}>
              View all <ArrowRight className="h-3 w-3" />
            </motion.button>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {MODULES.map((m,i) => (
              <motion.div key={m.name} variants={scaleIn} transition={{...SPRING,delay:i*0.04}}>
                <TiltCard className="bg-white border border-slate-200 rounded-2xl p-5 cursor-pointer flex flex-col gap-3 group overflow-hidden relative h-full"
                  onClick={()=>navigate(m.route)}>
                  <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${BADGE_STYLES[m.badgeCls]}`}>{m.badge}</span>
                  <div>
                    <h3 className="font-bold text-blue-950 text-sm mb-1">{m.name}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{m.desc}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3 mt-auto">
                    <span>Open module</span>
                    <motion.div whileHover={{x:4}} transition={{type:'spring',stiffness:400}}>
                      <ChevronRight className="h-3.5 w-3.5 group-hover:text-teal-500 transition-colors" />
                    </motion.div>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* RIGHT — SagarBot Chatbot Panel */}
        <div className="lg:col-span-5 lg:sticky lg:top-4 flex flex-col pt-0 lg:pt-11">
          <motion.div
            layout
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-2xl shadow-xl flex flex-col w-full min-h-[710px]"
            style={{
              border: '1px solid rgba(147,197,253,0.5)',
              background: 'linear-gradient(135deg,#081a33,#0B2542,#1478A0)'
            }}
          >
            {/* Ambient Background Glowing Orbs */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-56 h-56 rounded-full bg-cyan-400/15 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-8 w-44 h-44 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

            <div className="flex flex-col flex-1 h-[710px] max-h-[710px] text-white z-10 overflow-hidden">
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
                    <p className="text-[10px] text-cyan-300 font-semibold mt-0.5">● Live · Ministry Intelligence</p>
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
                      I am your real-time Ministry Intelligence assistant. You can ask me about Maritime India Vision 2030 milestones, port compliance submissions, GEM procurement progress, active court cases, or project health.
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
                    placeholder="Ask SagarBot anything..."
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
                    { label: '📊 MIV 2030', prompt: 'Give me an analysis of Maritime India Vision 2030 interventions, targets achieved, and key lagging indicators.' },
                    { label: '⚖️ Court Cases', prompt: 'What is the current status of the 63 open court cases across port authorities and what was cleared this month?' },
                    { label: '🚢 Port Compliance', prompt: 'Which port authorities have submitted their exclusive data modules for September 2026, and which are pending?' },
                    { label: '🛒 GEM Summary', prompt: 'Summarize GEM procurement performance across major ports and compliance against the 76% threshold.' },
                    { label: '👥 YP Review', prompt: 'Give me the status report of the 18 Young Professionals posted in ministry wings and their upcoming reviews.' }
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

      </div>

      {/* CHARTS ROW 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-8">
        <motion.div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden"
          variants={fadeLeft} initial="hidden" whileInView="visible" viewport={{once:true,margin:'-60px'}} transition={SPRING_SLOW}>
          <FloatingOrb size={160} color="rgba(14,150,166,0.05)" top="-20%" left="70%" />
          <h3 className="font-display font-bold text-blue-950 text-base mb-0.5">Projects by Status</h3>
          <p className="text-xs text-slate-400 mb-5">Across all wings, current quarter</p>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={PROJECT_STATUS_DATA} cx="50%" cy="50%" innerRadius={70} outerRadius={98}
                paddingAngle={3} dataKey="value" labelLine={false}
                isAnimationActive animationDuration={1200} animationEasing="ease-out">
                {PROJECT_STATUS_DATA.map((e,i)=><Cell key={i} fill={e.color} stroke="none"/>)}
              </Pie>
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
                <tspan x="50%" dy="-0.45em" fontSize={26} fontWeight={800} fill="#0B2542">48</tspan>
                <tspan x="50%" dy="1.5em" fontSize={11} fill="#657386">Projects</tspan>
              </text>
              <Legend iconType="circle" iconSize={9} wrapperStyle={{fontSize:'11px',paddingTop:'16px'}}/>
              <Tooltip formatter={(v,n)=>[v+' projects',n]} contentStyle={{fontSize:'12px',borderRadius:'10px',border:'1px solid #e2e8f0'}}/>
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
          variants={fadeRight} initial="hidden" whileInView="visible" viewport={{once:true,margin:'-60px'}} transition={SPRING_SLOW}>
          <div className="flex items-center gap-2 mb-0.5">
            <motion.div animate={{scale:[1,1.4,1],opacity:[1,0.4,1]}} transition={{duration:2,repeat:Infinity}}>
              <Activity className="h-4 w-4 text-teal-500" />
            </motion.div>
            <h3 className="font-display font-bold text-blue-950 text-base">Recent Activity</h3>
          </div>
          <p className="text-xs text-slate-400 mb-5">Latest updates across the portal</p>
          <motion.div className="divide-y divide-slate-100" variants={staggerFast} initial="hidden" whileInView="visible" viewport={{once:true}}>
            {ACTIVITY_FEED.map((a,i) => (
              <motion.div key={i} variants={fadeLeft} transition={{...SPRING,delay:i*0.06}} className="flex gap-3 py-3 first:pt-0">
                <motion.span className="mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0" style={{background:a.color}}
                  animate={{scale:[1,1.3,1]}} transition={{duration:3,repeat:Infinity,delay:i*0.5}} />
                <div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    <span className="font-bold text-blue-950">{a.module}</span> — {a.text}
                  </p>
                  <p className="text-[10.5px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {a.time}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* CHARTS ROW 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-4">
        <motion.div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
          variants={fadeLeft} initial="hidden" whileInView="visible" viewport={{once:true,margin:'-60px'}} transition={SPRING_SLOW}>
          <h3 className="font-display font-bold text-blue-950 text-base mb-0.5">Court Cases & Legal Matters</h3>
          <p className="text-xs text-slate-400 mb-5">Open vs. disposed — last 6 months</p>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={LEGAL_DATA} barCategoryGap="30%" barGap={3}>
              <XAxis dataKey="month" tick={{fontSize:11,fill:'#657386'}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:'#657386'}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{fontSize:'12px',borderRadius:'10px',border:'1px solid #e2e8f0'}}/>
              <Legend iconType="square" iconSize={9} wrapperStyle={{fontSize:'11px',paddingTop:'12px'}}/>
              <Bar dataKey="open" name="Open" fill="#C0392B" radius={[4,4,0,0]} isAnimationActive animationDuration={1400} animationEasing="ease-out"/>
              <Bar dataKey="disposed" name="Disposed" fill="#0F6E56" radius={[4,4,0,0]} isAnimationActive animationDuration={1400} animationEasing="ease-out"/>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
          variants={fadeRight} initial="hidden" whileInView="visible" viewport={{once:true,margin:'-60px'}} transition={SPRING_SLOW}>
          <h3 className="font-display font-bold text-blue-950 text-base mb-0.5">Upcoming Meetings</h3>
          <p className="text-xs text-slate-400 mb-5">Senior officers & PSW meetings</p>
          <motion.div className="divide-y divide-slate-100" variants={staggerFast} initial="hidden" whileInView="visible" viewport={{once:true}}>
            {MEETINGS.map((m,i) => (
              <motion.div key={i} variants={fadeRight} transition={{...SPRING,delay:i*0.07}}
                className="flex gap-3 py-3 first:pt-0 items-start" whileHover={{x:4}}>
                <motion.div className="flex-shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center min-w-[52px]"
                  whileHover={{scale:1.08,borderColor:'#0E96A6'}} transition={SPRING}>
                  <div className="font-display font-bold text-base text-blue-950 leading-none">{m.d}</div>
                  <div className="text-[9.5px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">{m.m}</div>
                </motion.div>
                <div>
                  <p className="text-xs font-bold text-blue-950">{m.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{m.sub}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* COMPLIANCE */}
      <motion.div className="mt-8" initial="hidden" whileInView="visible" viewport={{once:true,margin:'-60px'}} variants={fadeUp} transition={SPRING_SLOW}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <motion.div className="w-1 h-6 rounded-full bg-amber-500"
              initial={{scaleY:0}} whileInView={{scaleY:1}} viewport={{once:true}} transition={{duration:0.4}} />
            <h2 className="font-display text-xl font-bold text-blue-950">Data Entry Compliance</h2>
          </div>
          <motion.button className="text-xs text-teal-600 font-bold hover:underline flex items-center gap-1"
            whileHover={{x:4}} transition={{type:'spring',stiffness:300}}>
            Full Dashboard <ArrowRight className="h-3 w-3" />
          </motion.button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {COMPLIANCE.map((c,i) => (
            <motion.div key={c.label} variants={scaleIn} transition={{...SPRING,delay:i*0.1}}>
              <TiltCard className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 cursor-default overflow-hidden relative">
                <FloatingOrb size={120} color={c.color+'18'} top="-30%" left="60%" />
                <div className="flex items-center gap-2">
                  <motion.div animate={{rotate:[0,360]}} transition={{duration:8,repeat:Infinity,ease:'linear'}}>
                    <c.icon className="h-4 w-4" style={{color:c.color}} />
                  </motion.div>
                  <span className="text-sm font-bold text-slate-700">{c.label}</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-xs text-slate-500 font-medium">Overall compliance</span>
                  <span className="text-lg font-extrabold" style={{color:c.color}}>
                    <AnimatedNumber target={c.pct} suffix="%" duration={1.6} />
                  </span>
                </div>
                <AnimatedBar pct={c.pct} color={c.color} />
                <div className="flex justify-center">
                  <svg width="64" height="64" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="#f1f5f9" strokeWidth="6" />
                    <motion.circle cx="32" cy="32" r="26" fill="none" stroke={c.color} strokeWidth="6"
                      strokeLinecap="round" strokeDasharray={`${2*Math.PI*26}`}
                      initial={{strokeDashoffset:2*Math.PI*26}}
                      whileInView={{strokeDashoffset:2*Math.PI*26*(1-c.pct/100)}}
                      viewport={{once:true}}
                      transition={{duration:1.6,ease:[0.22,1,0.36,1],delay:i*0.15}}
                      style={{transformOrigin:'center',transform:'rotate(-90deg)'}} />
                    <text x="32" y="36" textAnchor="middle" fontSize="12" fontWeight="800" fill={c.color}>{c.pct}%</text>
                  </svg>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </motion.div>

      </div>{/* End DASHBOARD CONTENT CONTAINER */}

    </div>
  );
}
