import { useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------
   Home — storytelling motion graphic, locked to one screen.
   Scene 1 : compact hero banner
   Scene 2 : three chapters that take the middle of the screen
   Scene 3 : the ocean — rolling waves + sailing ship pinned to the
             bottom of the window
   The stage measures the space left under the header/tabs and above
   the footer, so nothing ever needs to be scrolled.
   Motion is transform/opacity only and is disabled under
   "prefers-reduced-motion".
------------------------------------------------------------------- */

const TITLE_WORDS = ['Welcome', 'to', 'Sagarmanthan', '3.0'];

const CHAPTERS = [
  {
    no: '01',
    label: 'The Platform',
    body: 'Sagarmanthan is the unified digital platform of the Ministry of Ports, Shipping and Waterways, bringing together projects, finance, governance, human resources and performance monitoring of the maritime sector into a single, reliable workspace.',
  },
  {
    no: '02',
    label: 'What is new in 3.0',
    body: 'Version 3.0 is a ground-up revamp built around your feedback — a cleaner interface, faster navigation across modules, consistent data entry workflows and sharper dashboards, so that information from ports, waterways, shipping organisations and attached offices reaches decision-makers accurately and on time.',
  },
  {
    no: '03',
    label: 'Getting started',
    body: 'Use the navigation menu to open the module you need. Your access is governed by the role assigned to you, and only the modules permitted for you will be visible.',
  },
];

const BEAT = 5000; // ms each chapter stays highlighted

function ShipSilhouette() {
  return (
    <svg viewBox="0 0 320 110" className="sm3-ship" aria-hidden="true">
      <g fill="currentColor">
        {/* hull */}
        <path d="M18 78 h268 l-26 24 H40 Z" opacity="0.95" />
        {/* deck */}
        <rect x="34" y="70" width="238" height="9" rx="2" opacity="0.8" />
        {/* container stacks */}
        <rect x="52" y="52" width="34" height="18" rx="1.5" opacity="0.62" />
        <rect x="92" y="44" width="34" height="26" rx="1.5" opacity="0.7" />
        <rect x="132" y="50" width="34" height="20" rx="1.5" opacity="0.58" />
        <rect x="172" y="42" width="34" height="28" rx="1.5" opacity="0.68" />
        {/* bridge + funnel */}
        <rect x="226" y="40" width="40" height="30" rx="2" opacity="0.9" />
        <rect x="236" y="26" width="20" height="16" rx="2" opacity="0.85" />
        <rect x="258" y="18" width="10" height="24" rx="2" opacity="0.8" />
        {/* mast + beacon */}
        <rect x="243" y="6" width="3" height="22" opacity="0.7" />
        <circle cx="244.5" cy="5" r="3" opacity="0.9" className="sm3-beacon" />
      </g>
    </svg>
  );
}

function WaveBand({ className, opacity, duration, fill }) {
  const path =
    'M0,64 C120,96 240,96 360,70 C480,44 600,44 720,64 C840,84 960,84 1080,64 C1200,44 1320,44 1440,64 L1440,120 L0,120 Z';
  return (
    <div className={`sm3-wave ${className}`} style={{ opacity, animationDuration: duration }}>
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
        <path fill={fill} d={path} />
      </svg>
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
        <path fill={fill} d={path} />
      </svg>
    </div>
  );
}

export default function LandingView() {
  const rootRef = useRef(null);
  const heroRef = useRef(null);
  const [active, setActive] = useState(0);

  /* Fit the stage to whatever height is left on screen */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    let busy = false;
    const fit = () => {
      if (busy) return;
      busy = true;
      // distance from the top of the document, i.e. the offset at scroll 0
      const top = el.getBoundingClientRect().top + window.scrollY;
      const footer = document.querySelector('footer');
      const footerH = footer ? footer.offsetHeight : 0;
      // the <main> shell adds its own bottom padding below this stage
      const main = el.closest('main');
      const mainPadB = main ? parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0;
      // the stage runs down into the <main> bottom padding, so its last row —
      // the ocean — ends exactly where the footer begins
      const available = window.innerHeight - top - footerH;
      el.style.setProperty('--sm3-h', `${Math.max(360, Math.round(available))}px`);
      el.style.marginBottom = `-${Math.round(mainPadB)}px`;

      // measure the page gutter; the banner and the ocean pull themselves out
      // by exactly this much on each side, so they reach the screen edges while
      // the text columns keep the shell's normal width
      const left = el.getBoundingClientRect().left;
      el.style.setProperty('--sm3-gutter', `${Math.round(left)}px`);

      // close any residual gap (or overlap) between the water and the footer,
      // whatever the shell's own spacing turns out to be
      if (footer) {
        for (let i = 0; i < 3; i += 1) {
          const delta = footer.getBoundingClientRect().top - el.getBoundingClientRect().bottom;
          if (Math.abs(delta) <= 1) break;
          const h = parseFloat(getComputedStyle(el).height) || 0;
          el.style.setProperty('--sm3-h', `${Math.max(320, Math.round(h + delta))}px`);
        }
      }
      requestAnimationFrame(() => {
        busy = false;
      });
    };

    fit();
    const raf = requestAnimationFrame(fit);
    const t = setTimeout(fit, 350); // after fonts / layout settle
    window.addEventListener('resize', fit);

    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(fit);
      ro.observe(document.body);
    }
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      window.removeEventListener('resize', fit);
      if (ro) ro.disconnect();
    };
  }, []);

  /* Wash the whole page in a white → wave-blue gradient while Home is open */
  useEffect(() => {
    const el = rootRef.current;
    const shell = el && el.closest('main') ? el.closest('main').parentElement : null;
    if (!shell) return;
    const isDark = document.documentElement.classList.contains('dark');
    const prev = shell.style.backgroundImage;
    shell.style.backgroundImage = isDark
      ? 'linear-gradient(to bottom, #0b0f19 0%, #0b1220 42%, #0d1b2e 72%, #102a43 100%)'
      : 'linear-gradient(to bottom, #ffffff 0%, #f6fbff 34%, #eaf6fd 62%, #d8eefb 84%, #c6e5f8 100%)';
    return () => {
      shell.style.backgroundImage = prev;
    };
  }, []);

  /* Walk the highlight across the chapters, on a loop */
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setActive((i) => (i + 1) % CHAPTERS.length), BEAT);
    return () => clearInterval(id);
  }, []);

  /* Gentle pointer parallax inside the hero */
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const onMove = (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        hero.style.setProperty('--px', x.toFixed(3));
        hero.style.setProperty('--py', y.toFixed(3));
      });
    };
    const onLeave = () => {
      hero.style.setProperty('--px', '0');
      hero.style.setProperty('--py', '0');
    };
    hero.addEventListener('mousemove', onMove);
    hero.addEventListener('mouseleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      hero.removeEventListener('mousemove', onMove);
      hero.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <div ref={rootRef} className="sm3-stage">
      <style>{`
        .sm3-stage {
          --px:0; --py:0; --sm3-h:70vh;
          --sm3-oh: clamp(104px, 18vh, 185px);
          --sm3-gutter: 0px;
          height: var(--sm3-h);
          display:flex; flex-direction:column;
        }
        /* edge-to-edge rows: pull out by exactly one gutter on each side */
        .sm3-bleed {
          margin-left: calc(var(--sm3-gutter) * -1);
          margin-right: calc(var(--sm3-gutter) * -1);
          width:auto;
        }

        /* ───────── keyframes ───────── */
        @keyframes sm3-kb     { from{transform:scale(1)} to{transform:scale(1.04)} }
        @keyframes sm3-mask   { from{transform:translateY(112%) rotate(3deg)} to{transform:translateY(0) rotate(0)} }
        @keyframes sm3-rise   { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sm3-fade   { from{opacity:0} to{opacity:1} }
        @keyframes sm3-roll   { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes sm3-sail   { from{transform:translateX(-32vw)} to{transform:translateX(32vw)} }
        @keyframes sm3-bob    { 0%,100%{transform:translateY(0) rotate(-.7deg)} 50%{transform:translateY(-7px) rotate(.7deg)} }
        @keyframes sm3-sheen  { 0%{transform:translateX(-140%) skewX(-18deg)} 55%,100%{transform:translateX(300%) skewX(-18deg)} }
        @keyframes sm3-beacon { 0%,100%{opacity:.2} 50%{opacity:1} }
        @keyframes sm3-drift  { 0%{transform:translate(0,0)} 50%{transform:translate(10px,-14px)} 100%{transform:translate(0,0)} }
        @keyframes sm3-grow   { to{width:min(260px,52%)} }
        @keyframes sm3-ping   { 0%{box-shadow:0 0 0 0 rgba(34,211,238,.5)} 70%{box-shadow:0 0 0 11px rgba(34,211,238,0)} 100%{box-shadow:0 0 0 0 rgba(34,211,238,0)} }
        @keyframes sm3-sweep  { from{transform:scaleX(0)} to{transform:scaleX(1)} }

        /* ───────── scene 1 : compact hero ───────── */
        .sm3-hero {
          position:relative; overflow:hidden;
          /* may give height back to the text when the window is short */
          flex:0 1 clamp(210px, 36vh, 380px); min-height:150px;
          /* base behind the fitted photo */
          background:linear-gradient(120deg,#0b2447 0%,#123a6b 52%,#0d2c54 100%);
        }
        /* photo spans the full banner width, cropped top/bottom around its
           centre so the ship stays in the middle of the frame */
        .sm3-hero-img {
          position:absolute; inset:0; width:100%; height:100%;
          object-fit:cover; object-position:50% 50%;
          transform-origin:50% 50%;
          opacity:1;
          animation: sm3-kb 26s ease-out infinite alternate both;
          will-change: transform;
        }
        /* just enough scrim in the bottom-left corner to keep the copy legible —
           the rest of the photo stays clear */
        .sm3-hero-tint {
          position:absolute; inset:0;
          background:
            linear-gradient(to top, rgba(2,6,23,.68) 0%, rgba(2,6,23,.26) 26%, rgba(2,6,23,0) 52%),
            linear-gradient(to right, rgba(2,6,23,.42) 0%, rgba(2,6,23,0) 48%);
        }
        .sm3-sheen {
          position:absolute; top:0; bottom:0; left:0; width:34%;
          background:linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent);
          animation: sm3-sheen 8s ease-in-out 1.6s infinite;
          pointer-events:none;
        }
        .sm3-vignette {
          position:absolute; inset:0; pointer-events:none;
          box-shadow: inset 0 0 60px 6px rgba(2,6,23,.16);
        }
        .sm3-glint {
          position:absolute; width:4px; height:4px; border-radius:50%;
          background:rgba(165,233,255,.7); filter:blur(.5px); z-index:2;
          animation: sm3-drift 11s ease-in-out infinite, sm3-fade 1.4s ease both;
        }
        .sm3-hero-pad {
          padding: clamp(16px,2.6vh,34px) calc(var(--sm3-gutter, 20px) + 4px);
        }
        .sm3-hero-copy {
          position:relative; z-index:3;
          text-shadow: 0 2px 14px rgba(2,6,23,.55);
          transform: translate3d(calc(var(--px) * -14px), calc(var(--py) * -8px), 0);
          transition: transform .5s cubic-bezier(.22,1,.36,1);
        }
        .sm3-eyebrow { animation: sm3-rise .8s .15s cubic-bezier(.22,1,.36,1) both; }
        .sm3-word { display:inline-block; overflow:hidden; vertical-align:bottom; padding:0 .06em; margin-right:.2em; }
        .sm3-word > span {
          display:inline-block;
          animation: sm3-mask .95s cubic-bezier(.22,1,.36,1) both;
          animation-delay: var(--d, 0ms);
        }
        .sm3-rule {
          height:3px; width:0; border-radius:99px; margin-top:clamp(6px,1vh,12px);
          background:linear-gradient(90deg,#22d3ee,#60a5fa 55%,transparent);
          animation: sm3-grow 1.1s 1s cubic-bezier(.22,1,.36,1) forwards;
        }
        .sm3-dot { animation: sm3-ping 2.6s ease-out infinite; }

        /* ───────── scene 2 : chapters ───────── */
        .sm3-chapters {
          flex:1 1 auto; min-height:0;
          position:relative; z-index:1;
          /* let the text sit slightly over the rising water */
          margin-bottom: calc(var(--sm3-oh) * -0.18);
          display:grid; grid-template-columns:repeat(3,minmax(0,1fr));
          gap:clamp(14px,2vw,34px);
          align-content:center;
          /* already inside the shell's gutters — just air under the banner */
          padding:clamp(18px,3.6vh,46px) 0 clamp(10px,1.8vh,22px);
          /* never clip a paragraph: if a short window leaves too little room,
             this block scrolls on its own rather than hiding its last lines */
          overflow-y:auto; overscroll-behavior:contain;
        }
        .sm3-ch {
          position:relative; min-width:0; padding-left:clamp(12px,1.2vw,18px);
          animation: sm3-rise .9s cubic-bezier(.22,1,.36,1) both;
          animation-delay: var(--d, 0ms);
          transition: opacity .6s ease;
        }
        .sm3-ch::before {
          content:''; position:absolute; left:0; top:2px; bottom:2px; width:2px; border-radius:99px;
          background:#e2e8f0;
        }
        .sm3-ch::after {
          content:''; position:absolute; left:0; top:2px; bottom:2px; width:2px; border-radius:99px;
          background:linear-gradient(#2563eb,#22d3ee);
          transform:scaleY(0); transform-origin:top;
          transition: transform .7s cubic-bezier(.22,1,.36,1);
        }
        .sm3-ch.is-on::after { transform:scaleY(1); }
        .sm3-ch:not(.is-on) { opacity:.62; }
        .sm3-no {
          font-variant-numeric: tabular-nums;
          background:linear-gradient(135deg,#0f417a,#2563eb 55%,#22d3ee);
          -webkit-background-clip:text; background-clip:text;
          -webkit-text-fill-color:transparent; color:transparent;
        }
        .sm3-body {
          font-size:clamp(11px,1vw,14.5px); line-height:1.6;
          overflow-wrap:anywhere; word-break:break-word; hyphens:auto;
        }
        .sm3-beat { height:2px; border-radius:99px; background:#e2e8f0; overflow:hidden; }
        .sm3-beat > i { display:block; height:100%; background:linear-gradient(90deg,#2563eb,#22d3ee); transform-origin:left; transform:scaleX(0); }
        .sm3-ch.is-on .sm3-beat > i { animation: sm3-sweep ${BEAT}ms linear forwards; }

        /* ───────── scene 3 : the ocean, pinned to the bottom ───────── */
        /* in the flow, as the stage's last row — it ends flush on the footer
           and scrolls with the page instead of being pinned to the viewport */
        .sm3-ocean {
          position:relative; z-index:0; flex:0 0 var(--sm3-oh);
          margin-top:auto;
          background:transparent; overflow:hidden; pointer-events:none;
          /* top of the water dissolves into the page, so the swell drifts up
             behind the three points instead of starting on a hard line */
          -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,.45) 34%, rgba(0,0,0,.85) 62%, #000 82%);
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,.45) 34%, rgba(0,0,0,.85) 62%, #000 82%);
          animation: sm3-fade 1.1s 1.5s ease both;
        }
        /* solid waterline so the crest meets the footer with no light seam */
        .sm3-sea-floor {
          position:absolute; left:0; right:0; bottom:0;
          height:clamp(10px,1.8vh,20px); background:#0a2540; z-index:3;
        }
        .sm3-wave { position:absolute; left:0; bottom:0; width:200%; display:flex; animation: sm3-roll linear infinite; will-change:transform; }
        .sm3-wave svg { width:50%; height:var(--wh,70px); display:block; }
        .sm3-wave-mid   { --wh:clamp(48px,8.5vh,88px); }
        .sm3-wave-back  { --wh:clamp(38px,6.5vh,70px); }
        /* the front crest is the footer navy, so the water runs straight into
           the footer at the very bottom of the screen */
        .sm3-wave-front { --wh:clamp(26px,4.6vh,52px); }
        .sm3-ship-wrap {
          position:absolute; bottom:clamp(26px,4.6vh,52px); left:0; right:0;
          display:flex; justify-content:center; pointer-events:none; z-index:2;
          animation: sm3-sail 30s ease-in-out infinite alternate;
        }
        .sm3-ship-inner { animation: sm3-bob 6s ease-in-out infinite; }
        .sm3-ship { width:clamp(110px,15vw,210px); height:auto; color:#0f417a; opacity:.52; display:block; }
        .sm3-beacon { animation: sm3-beacon 2.4s ease-in-out infinite; }

        /* short screens: tighten everything */
        @media (max-height: 720px) {
          .sm3-sheen { display:none; }
          .sm3-hero { flex-basis: clamp(170px, 30vh, 250px); }
        }

        /* narrow screens: stack the chapters, keep the ocean at the bottom */
        @media (max-width: 860px) {
          .sm3-chapters { grid-template-columns:1fr; gap:10px; overflow-y:auto; align-content:start; }
          .sm3-stage { --sm3-oh: clamp(70px, 12vh, 110px); }
        }

        /* ───────── reduced motion ───────── */
        @media (prefers-reduced-motion: reduce) {
          .sm3-stage *, .sm3-stage *::before, .sm3-stage *::after {
            animation: none !important;
            transition: none !important;
          }
          .sm3-word > span { transform:none !important; }
          .sm3-rule { width:min(260px,52%) !important; }
          .sm3-ch { opacity:1 !important; }
          .sm3-ch::after { transform:scaleY(1) !important; }
          .sm3-hero-img { transform:none !important; }
        }
      `}</style>

      {/* ═════════ SCENE 1 — Opening banner ═════════ */}
      <section ref={heroRef} className="sm3-hero sm3-bleed border-b border-slate-200/60 shadow-xl shadow-slate-900/20">
        <img src="/cargo-ship.jpg" alt="" aria-hidden="true" className="sm3-hero-img" />
        <div className="sm3-hero-tint" />
        <div className="sm3-sheen" />

        <span className="sm3-glint" style={{ top: '24%', left: '18%', animationDelay: '0s, .6s' }} />
        <span className="sm3-glint" style={{ top: '38%', left: '72%', animationDelay: '-3s, 1s' }} />
        <span className="sm3-glint" style={{ top: '16%', left: '55%', animationDelay: '-6s, 1.4s' }} />

        <div className="sm3-vignette" />

        <div className="sm3-hero-pad absolute inset-0 z-10 flex flex-col items-start justify-end">
          <div className="sm3-hero-copy">
            <p className="sm3-eyebrow flex items-center gap-2.5 text-[9px] md:text-[11px] font-mono font-bold uppercase tracking-[0.22em] text-cyan-300">
              <span className="sm3-dot inline-block h-1.5 w-1.5 rounded-full bg-cyan-300" />
              Ministry of Ports, Shipping and Waterways
            </p>

            <h1 className="mt-2 font-display font-black tracking-tight text-white text-[clamp(26px,4.2vw,52px)] leading-[1.08]">
              {TITLE_WORDS.map((w, i) => (
                <span key={w} className="sm3-word">
                  <span style={{ '--d': `${400 + i * 110}ms` }}>{w}</span>
                </span>
              ))}
            </h1>

            <div className="sm3-rule" />
          </div>
        </div>
      </section>

      {/* ═════════ SCENE 2 — Chapters ═════════ */}
      <div className="sm3-chapters">
        {CHAPTERS.map((c, i) => (
          <section
            key={c.no}
            className={`sm3-ch ${active === i ? 'is-on' : ''}`}
            style={{ '--d': `${1150 + i * 180}ms` }}
          >
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 min-w-0">
              <span className="sm3-no font-display text-lg md:text-2xl font-black leading-none">{c.no}</span>
              <span className="min-w-0 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                {c.label}
              </span>
            </div>

            <p className="sm3-body mt-2 text-slate-600">{c.body}</p>

            <div className="sm3-beat mt-3">
              <i key={`${c.no}-${active === i}`} />
            </div>
          </section>
        ))}
      </div>

      {/* ═════════ SCENE 3 — Ocean, sitting on the footer ═════════ */}
      <div className="sm3-ocean sm3-bleed" aria-hidden="true">
        <div className="sm3-ship-wrap">
          <div className="sm3-ship-inner">
            <ShipSilhouette />
          </div>
        </div>

        <WaveBand className="sm3-wave-mid" opacity={0.22} duration="30s" fill="#0ea5e9" />
        <WaveBand className="sm3-wave-back" opacity={0.45} duration="24s" fill="#15507f" />
        <WaveBand className="sm3-wave-front" opacity={1} duration="15s" fill="#0a2540" />
        <div className="sm3-sea-floor" />
      </div>
    </div>
  );
}
