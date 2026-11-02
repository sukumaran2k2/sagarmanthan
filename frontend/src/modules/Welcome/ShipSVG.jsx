import React, { useState } from 'react';

const LABELS = {
  hull:       { title: 'Main Hull',           desc: 'High-tensile steel hull structure' },
  bridge:     { title: 'Navigation Bridge',   desc: 'Command & navigation centre' },
  containers: { title: 'Cargo Hold',          desc: 'Multi-tier container stacks' },
  funnel:     { title: 'Exhaust Funnel',       desc: 'Engine room exhaust & stack' },
  crane:      { title: 'Ship Crane',           desc: 'Deck cargo handling crane' },
  mast:       { title: 'Radar Mast',           desc: 'Navigation & communication systems' },
  anchor:     { title: 'Anchor & Chain',       desc: 'Mooring & anchoring equipment' },
};

export default function ShipSVG() {
  const [hovered, setHovered] = useState(null);

  const hi  = (key) => () => setHovered(key);
  const bye = ()     => setHovered(null);

  const glow = hovered
    ? { filter: 'drop-shadow(0 0 8px rgba(120,60,0,0.5))' }
    : {};

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <style>{`
        @keyframes ship-bob {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          25%     { transform: translateY(-5px) rotate(0.15deg); }
          75%     { transform: translateY(3px) rotate(-0.1deg); }
        }
        @keyframes wave-roll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes wave-roll2 {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes smoke1 {
          0%   { transform: translate(0,0) scale(1);   opacity:0.55; }
          100% { transform: translate(-8px,-40px) scale(2.2); opacity:0; }
        }
        @keyframes smoke2 {
          0%   { transform: translate(0,0) scale(1);   opacity:0.4; }
          100% { transform: translate(4px,-52px) scale(2.8); opacity:0; }
        }
        @keyframes smoke3 {
          0%   { transform: translate(0,0) scale(1);   opacity:0.3; }
          100% { transform: translate(-3px,-62px) scale(3.2); opacity:0; }
        }
        @keyframes radar-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes flag-wave {
          0%,100% { d: path("M0,0 Q8,-2 16,-1 Q24,0 32,-2 L32,8 Q24,10 16,8 Q8,7 0,8 Z"); }
          50%     { d: path("M0,0 Q8,2 16,0 Q24,-2 32,1 L32,8 Q24,6 16,8 Q8,10 0,8 Z"); }
        }
        @keyframes light-blink {
          0%,45%,55%,100% { opacity:1; }
          50%              { opacity:0.2; }
        }
        @keyframes wake-spread {
          0%   { transform: scaleX(0); opacity:0.5; }
          100% { transform: scaleX(1); opacity:0; }
        }
        .ship-body { animation: ship-bob 5s ease-in-out infinite; transform-origin: center 75%; }
        .smoke-p1  { animation: smoke1 2.8s ease-out infinite; }
        .smoke-p2  { animation: smoke2 3.4s ease-out 0.6s infinite; }
        .smoke-p3  { animation: smoke3 4.0s ease-out 1.2s infinite; }
        .radar-arm { animation: radar-spin 3s linear infinite; transform-origin: 50% 100%; }
        .nav-light { animation: light-blink 2s step-start infinite; }
        .nav-light2{ animation: light-blink 2s step-start 1s infinite; }
        .wave-a    { animation: wave-roll  8s linear infinite; }
        .wave-b    { animation: wave-roll2 12s linear infinite; }

        .ship-part { cursor: pointer; transition: filter 0.2s ease; }
        .ship-part:hover { filter: brightness(1.25) drop-shadow(0 0 6px rgba(200,120,40,0.6)); }

        .tooltip-box {
          position: absolute;
          background: rgba(20,10,0,0.88);
          border: 1px solid rgba(200,130,60,0.4);
          border-radius: 8px;
          padding: 8px 14px;
          pointer-events: none;
          white-space: nowrap;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          animation: wm-up 0.2s ease both;
          z-index: 20;
        }
        @keyframes wm-up {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>

      {/* ── tooltip ── */}
      {hovered && LABELS[hovered] && (
        <div className="tooltip-box" style={{ top: -52, left: '50%', transform: 'translateX(-50%)' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#e8c88a' }}>
            {LABELS[hovered].title}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#a08060' }}>
            {LABELS[hovered].desc}
          </p>
        </div>
      )}

      <svg
        viewBox="0 0 700 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
      >
        <defs>
          {/* hull gradient */}
          <linearGradient id="hullGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#6b3c18"/>
            <stop offset="40%"  stopColor="#4a2408"/>
            <stop offset="100%" stopColor="#1e0c00"/>
          </linearGradient>
          {/* waterline band */}
          <linearGradient id="wlGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#e83020"/>
            <stop offset="100%" stopColor="#a01808"/>
          </linearGradient>
          {/* superstructure */}
          <linearGradient id="superGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#9a6040"/>
            <stop offset="100%" stopColor="#6b3c20"/>
          </linearGradient>
          {/* container gradients — vivid shipping colors */}
          <linearGradient id="cRed"  x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8341a"/><stop offset="100%" stopColor="#a01e08"/>
          </linearGradient>
          <linearGradient id="cBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a6abf"/><stop offset="100%" stopColor="#0d3d78"/>
          </linearGradient>
          <linearGradient id="cTan"  x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8a020"/><stop offset="100%" stopColor="#a86c0a"/>
          </linearGradient>
          <linearGradient id="cGray" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7a8a96"/><stop offset="100%" stopColor="#4a5a64"/>
          </linearGradient>
          <linearGradient id="cGrn"  x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1ea84a"/><stop offset="100%" stopColor="#0e6a2c"/>
          </linearGradient>
          <linearGradient id="cOrange" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f06820"/><stop offset="100%" stopColor="#b04010"/>
          </linearGradient>
          <linearGradient id="cPurple" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3abf"/><stop offset="100%" stopColor="#4a1880"/>
          </linearGradient>
          <linearGradient id="cYellow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8d020"/><stop offset="100%" stopColor="#a89010"/>
          </linearGradient>
          {/* water gradient */}
          <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#b89060" stopOpacity="0.35"/>
            <stop offset="100%" stopColor="#8a6030" stopOpacity="0.1"/>
          </linearGradient>
          {/* shadow filter */}
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#1e0800" floodOpacity="0.35"/>
          </filter>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* ════════ WATER / SEA ════════ */}
        <g>
          {/* sea base */}
          <rect x="0" y="285" width="700" height="95" fill="url(#seaGrad)" rx="0"/>

          {/* wave track A */}
          <g className="wave-a" style={{ position: 'absolute' }}>
            <svg x="0" y="282" width="1400" height="30" viewBox="0 0 1400 30">
              <path d="M0,15 C60,5 120,25 180,15 C240,5 300,25 360,15 C420,5 480,25 540,15 C600,5 660,25 720,15 C780,5 840,25 900,15 C960,5 1020,25 1080,15 C1140,5 1200,25 1260,15 C1320,5 1380,25 1400,15"
                stroke="#8a6030" strokeWidth="2" strokeOpacity="0.3" fill="none"/>
            </svg>
          </g>
          {/* wave track B */}
          <g className="wave-b">
            <svg x="0" y="295" width="1400" height="30" viewBox="0 0 1400 30">
              <path d="M0,12 C80,4 160,20 240,12 C320,4 400,20 480,12 C560,4 640,20 720,12 C800,4 880,20 960,12 C1040,4 1120,20 1200,12 C1280,4 1360,20 1400,12"
                stroke="#8a6030" strokeWidth="1.5" strokeOpacity="0.2" fill="none"/>
            </svg>
          </g>

          {/* ship wake lines */}
          <path d="M640 300 Q670 296 700 300" stroke="#c0a070" strokeWidth="1.5" strokeOpacity="0.3" fill="none"/>
          <path d="M620 308 Q660 302 700 308" stroke="#c0a070" strokeWidth="1" strokeOpacity="0.2" fill="none"/>
        </g>

        {/* ════════ SHIP BODY (animated bob) ════════ */}
        <g className="ship-body" filter="url(#shadow)">

          {/* ── HULL ── */}
          <g className="ship-part" onMouseEnter={hi('hull')} onMouseLeave={bye}>
            {/* main hull shape */}
            <path
              d="M58 248 L620 248 L648 265 L645 278 Q640 290 620 295 L80 295 Q60 290 52 278 L48 265 Z"
              fill="url(#hullGrad)"
            />
            {/* waterline stripe */}
            <path
              d="M56 248 L622 248 L648 264 L46 264 Z"
              fill="url(#wlGrad)" opacity="0.9"
            />
            {/* hull highlight */}
            <path
              d="M80 248 L580 248 L600 256 L70 256 Z"
              fill="rgba(255,200,120,0.08)"
            />
            {/* hull rivets/seam lines */}
            <path d="M60 270 L638 270" stroke="rgba(0,0,0,0.2)" strokeWidth="1" strokeDasharray="8 12"/>
            <path d="M62 280 L635 280" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" strokeDasharray="6 14"/>
            {/* bow bulb */}
            <ellipse cx="643" cy="278" rx="14" ry="9" fill="#2a1000"/>
            <ellipse cx="641" cy="276" rx="6" ry="4" fill="rgba(255,180,80,0.15)"/>
            {/* stern curve */}
            <path d="M80 295 Q62 295 52 285 L50 278 Q52 290 80 295 Z" fill="#1a0a00"/>
          </g>

          {/* ── MAIN DECK ── */}
          <rect x="58" y="238" width="564" height="11" rx="2" fill="#5a3418"/>
          <rect x="58" y="238" width="564" height="4"  rx="1" fill="rgba(255,200,100,0.15)"/>
          {/* deck railing */}
          {Array.from({length:28},(_,i)=>(
            <rect key={i} x={65+i*19} y="232" width="2" height="7" rx="1" fill="#7a4820" opacity="0.7"/>
          ))}
          <line x1="63" y1="233" x2="614" y2="233" stroke="#8a5428" strokeWidth="1.5" opacity="0.6"/>

          {/* ── CONTAINERS ── */}
          <g className="ship-part" onMouseEnter={hi('containers')} onMouseLeave={bye}>
            {/* Row 3 (top) */}
            {[
              {x:70,  w:50, fill:'url(#cOrange)'},
              {x:126, w:50, fill:'url(#cBlue)'  },
              {x:182, w:50, fill:'url(#cYellow)'},
              {x:238, w:50, fill:'url(#cRed)'   },
              {x:294, w:50, fill:'url(#cGrn)'   },
              {x:350, w:50, fill:'url(#cPurple)'},
              {x:406, w:50, fill:'url(#cTan)'   },
            ].map((c,i)=>(
              <g key={i}>
                <rect x={c.x} y="176" width={c.w} height="34" rx="1.5" fill={c.fill}/>
                {/* top face highlight */}
                <rect x={c.x} y="176" width={c.w} height="5" rx="1" fill="rgba(255,230,150,0.18)"/>
                {/* side seam */}
                <line x1={c.x+c.w/2} y1="176" x2={c.x+c.w/2} y2="210" stroke="rgba(0,0,0,0.2)" strokeWidth="1"/>
                {/* corner details */}
                <rect x={c.x}      y="176" width="3" height="34" rx="1" fill="rgba(255,200,100,0.12)"/>
                <rect x={c.x+c.w-3} y="176" width="3" height="34" rx="1" fill="rgba(0,0,0,0.15)"/>
              </g>
            ))}
            {/* Row 2 */}
            {[
              {x:70,  w:50, fill:'url(#cBlue)'  },
              {x:126, w:50, fill:'url(#cRed)'   },
              {x:182, w:50, fill:'url(#cGrn)'   },
              {x:238, w:50, fill:'url(#cOrange)'},
              {x:294, w:50, fill:'url(#cPurple)'},
              {x:350, w:50, fill:'url(#cYellow)'},
              {x:406, w:50, fill:'url(#cBlue)'  },
              {x:462, w:50, fill:'url(#cRed)'   },
            ].map((c,i)=>(
              <g key={i}>
                <rect x={c.x} y="210" width={c.w} height="34" rx="1.5" fill={c.fill}/>
                <rect x={c.x} y="210" width={c.w} height="5" rx="1" fill="rgba(255,230,150,0.15)"/>
                <line x1={c.x+c.w/2} y1="210" x2={c.x+c.w/2} y2="244" stroke="rgba(0,0,0,0.2)" strokeWidth="1"/>
                <rect x={c.x}       y="210" width="3" height="34" rx="1" fill="rgba(255,200,100,0.1)"/>
                <rect x={c.x+c.w-3} y="210" width="3" height="34" rx="1" fill="rgba(0,0,0,0.12)"/>
              </g>
            ))}
            {/* Row 1 (bottom) */}
            {[
              {x:70,  w:50, fill:'url(#cBlue)'},
              {x:126, w:50, fill:'url(#cTan)' },
              {x:182, w:50, fill:'url(#cRed)' },
              {x:238, w:50, fill:'url(#cGrn)' },
              {x:294, w:50, fill:'url(#cGray)'},
              {x:350, w:50, fill:'url(#cBlue)'},
              {x:406, w:50, fill:'url(#cRed)' },
              {x:462, w:50, fill:'url(#cTan)' },
              {x:518, w:44, fill:'url(#cGrn)' },
            ].map((c,i)=>(
              <g key={i}>
                <rect x={c.x} y="238" width={c.w} height="0" rx="1.5" fill={c.fill} opacity="0"/>
                <rect x={c.x} y="220" width={c.w} height="18" rx="1" fill={c.fill} opacity="0.4"/>
              </g>
            ))}
          </g>

          {/* ── SUPERSTRUCTURE ── */}
          <g className="ship-part" onMouseEnter={hi('bridge')} onMouseLeave={bye}>
            {/* main accommodation block */}
            <rect x="488" y="148" width="124" height="92" rx="4" fill="url(#superGrad)"/>
            <rect x="492" y="152" width="116" height="84" rx="3" fill="#7a4c28"/>

            {/* deck levels - lines */}
            <line x1="488" y1="177" x2="612" y2="177" stroke="rgba(0,0,0,0.2)" strokeWidth="1"/>
            <line x1="488" y1="202" x2="612" y2="202" stroke="rgba(0,0,0,0.2)" strokeWidth="1"/>
            <line x1="488" y1="227" x2="612" y2="227" stroke="rgba(0,0,0,0.2)" strokeWidth="1"/>

            {/* windows - deck A — bright warm glow */}
            {[500,520,540,560,580].map((x,i)=>(
              <rect key={i} x={x} y="156" width="14" height="10" rx="2"
                fill="#ffe066" opacity="0.95"
                style={{filter:'drop-shadow(0 0 5px rgba(255,220,60,0.9))'}}/>
            ))}
            {/* windows - deck B */}
            {[500,520,540,560,580,598].map((x,i)=>(
              <rect key={i} x={x} y="181" width="14" height="10" rx="2"
                fill="#ffd040" opacity="0.85"
                style={{filter:'drop-shadow(0 0 4px rgba(255,200,40,0.7))'}}/>
            ))}
            {/* windows - deck C */}
            {[500,520,540,560,580,598].map((x,i)=>(
              <rect key={i} x={x} y="206" width="14" height="10" rx="2"
                fill="#ffba30" opacity="0.75"
                style={{filter:'drop-shadow(0 0 3px rgba(255,180,30,0.6))'}}/>
            ))}
            {/* door */}
            <rect x="540" y="222" width="20" height="18" rx="2" fill="#3a1c08"/>
            <rect x="542" y="224" width="16" height="14" rx="1" fill="#2a1000"/>

            {/* ── BRIDGE DECK ── */}
            <rect x="484" y="118" width="132" height="34" rx="4" fill="#8a5430"/>
            <rect x="488" y="122" width="124" height="26" rx="3" fill="#9a6038"/>
            {/* bridge wings */}
            <rect x="474" y="126" width="14" height="18" rx="2" fill="#7a4828"/>
            <rect x="612" y="126" width="14" height="18" rx="2" fill="#7a4828"/>
            {/* bridge windows — panoramic bright cyan-white */}
            {[492,510,530,550,570,590,606].map((x,i)=>(
              <rect key={i} x={x} y="124" width="14" height="20" rx="2"
                fill="#c8f0ff" opacity="0.9"
                style={{filter:'drop-shadow(0 0 6px rgba(100,220,255,0.7))'}}/>
            ))}

            {/* ── FUNNEL ── */}
            <g className="ship-part" onMouseEnter={hi('funnel')} onMouseLeave={bye}>
              <rect x="535" y="68" width="50" height="56" rx="4" fill="#6a3818"/>
              <rect x="539" y="72" width="42" height="48" rx="3" fill="#7a4420"/>
              {/* funnel top rim */}
              <rect x="533" y="62" width="54" height="10" rx="3" fill="#3a1a08"/>
              {/* funnel stripe — vivid saffron */}
              <rect x="535" y="90" width="50" height="10" fill="#ff8c00" opacity="1"/>
              {/* ministry mark on funnel */}
              <ellipse cx="560" cy="80" rx="12" ry="10" fill="rgba(200,130,40,0.2)" stroke="rgba(200,130,40,0.3)" strokeWidth="1"/>
              {/* smoke particles */}
              <g style={{transformOrigin:'560px 62px'}}>
                <ellipse className="smoke-p1" cx="558" cy="52" rx="9" ry="7" fill="#b8a898" opacity="0.55"/>
                <ellipse className="smoke-p2" cx="564" cy="40" rx="11" ry="8" fill="#c0b0a0" opacity="0.4"/>
                <ellipse className="smoke-p3" cx="556" cy="30" rx="13" ry="9" fill="#c8b8a8" opacity="0.3"/>
              </g>
            </g>
          </g>

          {/* ── MAST ── */}
          <g className="ship-part" onMouseEnter={hi('mast')} onMouseLeave={bye}>
            {/* main mast pole */}
            <rect x="558" y="18" width="4" height="102" rx="1" fill="#5a3010"/>
            {/* cross yard */}
            <rect x="524" y="42" width="72" height="3" rx="1" fill="#5a3010"/>
            {/* yard braces */}
            <line x1="560" y1="42" x2="524" y2="52" stroke="#4a2808" strokeWidth="1.5" opacity="0.6"/>
            <line x1="560" y1="42" x2="596" y2="52" stroke="#4a2808" strokeWidth="1.5" opacity="0.6"/>

            {/* radar dish */}
            <g className="radar-arm" style={{transformOrigin:'560px 28px'}}>
              <rect x="555" y="20" width="24" height="3" rx="1" fill="#7a4820"/>
              <ellipse cx="578" cy="21" rx="5" ry="3" fill="#8a5428" stroke="#6a3a18" strokeWidth="1"/>
            </g>

            {/* navigation light top */}
            <circle cx="560" cy="18" r="4" fill="#e8d080" className="nav-light"
              style={{filter:'drop-shadow(0 0 5px rgba(240,200,60,0.9))'}}/>

            {/* Indian tricolor flag */}
            <rect x="560" y="18" width="2" height="18" fill="#5a3010"/>
            <rect x="562" y="18" width="28" height="7"  fill="#ff9933"/>
            <rect x="562" y="25" width="28" height="7"  fill="#ffffff"/>
            <rect x="562" y="32" width="28" height="6"  fill="#138808"/>
            {/* Ashoka chakra (simplified) */}
            <circle cx="576" cy="28" r="3" fill="none" stroke="#000088" strokeWidth="1"/>
          </g>

          {/* ── CRANE ── */}
          <g className="ship-part" onMouseEnter={hi('crane')} onMouseLeave={bye}>
            <rect x="458" y="148" width="5" height="92" rx="1" fill="#6a3c18"/>
            {/* boom arm */}
            <line x1="460" y1="148" x2="420" y2="170" stroke="#6a3c18" strokeWidth="4" strokeLinecap="round"/>
            <line x1="460" y1="148" x2="500" y2="162" stroke="#5a3010" strokeWidth="3" strokeLinecap="round"/>
            {/* hoist wire */}
            <line x1="432" y1="170" x2="432" y2="220" stroke="#4a2808" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7"/>
            {/* hook */}
            <path d="M428,218 Q432,226 436,218" stroke="#4a2808" strokeWidth="2" fill="none" strokeLinecap="round"/>
            {/* counterweight */}
            <rect x="492" y="156" width="16" height="12" rx="2" fill="#4a2808"/>
          </g>

          {/* ── ANCHOR / BOW ── */}
          <g className="ship-part" onMouseEnter={hi('anchor')} onMouseLeave={bye}>
            {/* anchor hawse */}
            <ellipse cx="600" cy="252" rx="8" ry="6" fill="#2a1000" stroke="#4a2808" strokeWidth="1"/>
            {/* anchor chain */}
            <path d="M600,258 Q604,268 608,278 Q612,285 616,290"
              stroke="#3a1800" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 3" opacity="0.7"/>
            {/* bow cleats */}
            <rect x="570" y="244" width="14" height="4" rx="2" fill="#5a2c0c"/>
            <rect x="570" y="250" width="14" height="4" rx="2" fill="#5a2c0c"/>
          </g>

          {/* ── NAV LIGHTS ── */}
          {/* port green */}
          <circle cx="476" cy="130" r="5" fill="#00ff60" className="nav-light"
            style={{filter:'drop-shadow(0 0 10px rgba(0,255,80,1))'}}/>
          {/* starboard red */}
          <circle cx="625" cy="130" r="5" fill="#ff2020" className="nav-light2"
            style={{filter:'drop-shadow(0 0 10px rgba(255,20,20,1))'}}/>

          {/* ── REFLECTION ── */}
          <g opacity="0.12" transform="translate(0,295) scale(1,-0.18)" style={{transformOrigin:'350px 295px'}}>
            <rect x="48" y="0" width="606" height="260" fill="url(#hullGrad)"/>
          </g>

        </g>{/* /ship body */}

        {/* ── WAKE FOAM ── */}
        <ellipse cx="380" cy="296" rx="320" ry="8" fill="rgba(200,160,80,0.1)"/>
        <path d="M60,300 Q380,288 648,300" stroke="rgba(200,160,80,0.2)" strokeWidth="2" fill="none"/>

      </svg>
    </div>
  );
}
