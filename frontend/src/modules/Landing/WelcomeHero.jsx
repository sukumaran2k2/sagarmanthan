import { useEffect, useRef } from 'react';

/* ------------------------------------------------------------------
   "Welcome to Sagarmanthan 3.0" banner: cargo-ship photo, word-by-word
   title reveal and a gentle pointer parallax. Shared by the Landing
   stage and the home dashboard. The parent sizes it (height / flex)
   through className or style.
   Motion is transform/opacity only and is disabled under
   "prefers-reduced-motion".
------------------------------------------------------------------- */

const TITLE_WORDS = ['Welcome', 'to', 'Sagarmanthan', '3.0'];

export default function WelcomeHero({ className = '', style, children }) {
  const heroRef = useRef(null);

  /* Gentle pointer parallax inside the hero */
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return undefined;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
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
    <section ref={heroRef} className={`sm3-hero ${className}`} style={style}>
      <style>{`
        @keyframes sm3-kb     { from{transform:scale(1)} to{transform:scale(1.04)} }
        @keyframes sm3-mask   { from{transform:translateY(112%) rotate(3deg)} to{transform:translateY(0) rotate(0)} }
        @keyframes sm3-rise   { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sm3-fade   { from{opacity:0} to{opacity:1} }
        @keyframes sm3-sheen  { 0%{transform:translateX(-140%) skewX(-18deg)} 55%,100%{transform:translateX(300%) skewX(-18deg)} }
        @keyframes sm3-drift  { 0%{transform:translate(0,0)} 50%{transform:translate(10px,-14px)} 100%{transform:translate(0,0)} }
        @keyframes sm3-grow   { to{width:min(260px,52%)} }
        @keyframes sm3-ping   { 0%{box-shadow:0 0 0 0 rgba(34,211,238,.5)} 70%{box-shadow:0 0 0 11px rgba(34,211,238,0)} 100%{box-shadow:0 0 0 0 rgba(34,211,238,0)} }

        .sm3-hero {
          --px:0; --py:0;
          position:relative; overflow:hidden;
          /* base behind the fitted photo */
          background:linear-gradient(120deg,#0b2447 0%,#123a6b 52%,#0d2c54 100%);
        }
        /* photo spans the full banner width, cropped top/bottom around its
           centre so the ship stays in the middle of the frame */
        .sm3-hero-img {
          position:absolute; inset:0; width:100%; height:100%;
          object-fit:cover; object-position:50% 50%;
          transform-origin:50% 50%;
          animation: sm3-kb 26s ease-out infinite alternate both;
          will-change: transform;
        }
        /* just enough scrim in the bottom-left corner to keep the copy legible */
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
        .sm3-hero-extra { animation: sm3-rise .8s 1.1s cubic-bezier(.22,1,.36,1) both; }

        @media (max-height: 720px) {
          .sm3-sheen { display:none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sm3-hero *, .sm3-hero *::before, .sm3-hero *::after {
            animation: none !important;
            transition: none !important;
          }
          .sm3-word > span { transform:none !important; }
          .sm3-rule { width:min(260px,52%) !important; }
          .sm3-hero-img { transform:none !important; }
        }
      `}</style>

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
          {children && <div className="sm3-hero-extra mt-3">{children}</div>}
        </div>
      </div>
    </section>
  );
}
