import React, { useState, useEffect, useRef } from 'react';
import ShipSVG from './ShipSVG';

const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2 + 0.8,
  duration: Math.random() * 8 + 6,
  delay: Math.random() * 6,
}));

const CHECK_ITEMS = [
  'Your existing data in the migrated modules remains unchanged.',
  'Active and relevant modules have been migrated to Version 3.0.',
  'Modules involving redundant or duplicate data entry have been streamlined and removed.',
  'Your existing login credentials remain valid.',
];

/* ── palette tokens ── */
const C = {
  bg0:    '#f0e4d0',   // deepest bg
  bg1:    '#f5ece0',   // main bg
  bg2:    '#f9f2e8',   // slightly lighter
  cream:  '#080400',   // primary text — near black warm
  cream2: '#1c0e04',   // secondary text — very dark brown
  muted:  '#3a2010',   // muted text
  gold:   '#4a2000',   // accent — deep burnt amber
  gold2:  '#3a1800',   // darker accent
  goldDim:'rgba(90,50,0,0.12)',
  line:   'rgba(90,50,0,0.15)',
  lineB:  'rgba(30,15,0,0.12)',
};

export default function Welcome({ onContinue }) {
  const [phase, setPhase]           = useState('enter');
  const [itemsVisible, setItems]    = useState([]);
  const timers = useRef([]);

  useEffect(() => {
    CHECK_ITEMS.forEach((_, i) => {
      const t = setTimeout(() => setItems(p => [...p, i]), 1100 + i * 210);
      timers.current.push(t);
    });
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const go = () => { setPhase('exit'); setTimeout(onContinue, 680); };

  return (
    <>
      <style>{`
        /* ── keyframes ── */
        @keyframes wm-enter { from{opacity:0} to{opacity:1} }
        @keyframes wm-exit  { from{opacity:1} to{opacity:0} }

        @keyframes wm-down {
          from{opacity:0;transform:translateY(-20px)}
          to  {opacity:1;transform:translateY(0)}
        }
        @keyframes wm-up {
          from{opacity:0;transform:translateY(22px)}
          to  {opacity:1;transform:translateY(0)}
        }
        @keyframes wm-slide {
          from{opacity:0;transform:translateX(-14px)}
          to  {opacity:1;transform:translateX(0)}
        }
        @keyframes wm-pop {
          0%  {transform:scale(0.4);opacity:0}
          70% {transform:scale(1.18)}
          100%{transform:scale(1);opacity:1}
        }
        @keyframes wm-float {
          0%,100%{transform:translateY(0) scale(1);opacity:.18}
          50%    {transform:translateY(-18px) scale(1.1);opacity:.4}
        }
        @keyframes wm-orb {
          0%,100%{transform:translate(0,0);opacity:.08}
          40%    {transform:translate(18px,-22px);opacity:.18}
          70%    {transform:translate(-12px,14px);opacity:.12}
        }
        @keyframes wm-shimmer-gold {
          0%  {background-position:-350% center}
          100%{background-position:350% center}
        }
        @keyframes wm-shimmer-btn {
          0%  {background-position:-200% center}
          100%{background-position:200% center}
        }
        @keyframes wm-pulse-dot {
          0%,100%{box-shadow:0 0 0 0 rgba(200,146,74,.8)}
          60%    {box-shadow:0 0 0 7px rgba(200,146,74,0)}
        }
        @keyframes wm-wave-a {
          0%  {transform:translateX(0)}
          100%{transform:translateX(-50%)}
        }
        @keyframes wm-wave-b {
          0%  {transform:translateX(0)}
          100%{transform:translateX(-50%)}
        }
        @keyframes wm-noise {
          0%  {transform:translate(0,0)}
          20% {transform:translate(-2px,2px)}
          40% {transform:translate(2px,-1px)}
          60% {transform:translate(-1px,2px)}
          80% {transform:translate(1px,-2px)}
          100%{transform:translate(0,0)}
        }

        /* ── page states ── */
        .wm-pg          { animation: wm-enter .75s cubic-bezier(.22,1,.36,1) both }
        .wm-pg.wm-exit  { animation: wm-exit  .6s ease both }

        /* ── section anims ── */
        .wm-hdr  { animation: wm-down .8s .1s  cubic-bezier(.22,1,.36,1) both }
        .wm-hero { animation: wm-up   .9s .3s  cubic-bezier(.22,1,.36,1) both }
        .wm-desc { animation: wm-up   .8s .55s cubic-bezier(.22,1,.36,1) both }
        .wm-know { animation: wm-up   .8s .75s cubic-bezier(.22,1,.36,1) both }
        .wm-note { animation: wm-up   .8s .95s cubic-bezier(.22,1,.36,1) both }
        .wm-cta  { animation: wm-up   .8s 1.1s cubic-bezier(.22,1,.36,1) both }

        /* ── row / icon anims ── */
        .wm-chk-row { animation: wm-slide .5s cubic-bezier(.22,1,.36,1) both }
        .wm-chk-ico { animation: wm-pop   .4s cubic-bezier(.22,1,.36,1) both }

        /* ── wave tracks ── */
        .wm-wa { animation: wm-wave-a 18s linear infinite }
        .wm-wb { animation: wm-wave-b 28s linear infinite reverse }

        /* ── gold shimmer headline ── */
        .wm-gold-txt {
          background: linear-gradient(110deg,
            #c87820 0%,
            #e8a030 50%,
            #b86010 100%);
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
          background-clip:text;
        }

        /* ── button ── */
        .wm-btn {
          transition: transform .22s cubic-bezier(.22,1,.36,1), box-shadow .22s ease;
          box-shadow: 0 6px 28px rgba(200,146,74,.25), 0 2px 8px rgba(0,0,0,.5);
        }
        .wm-btn:hover {
          transform: translateY(-3px) scale(1.025);
          box-shadow: 0 14px 40px rgba(200,146,74,.38), 0 4px 16px rgba(0,0,0,.5);
        }
        .wm-btn:active { transform:translateY(0) scale(.985) }

        /* ── dot pulse ── */
        .wm-dot { animation: wm-pulse-dot 2s cubic-bezier(.4,0,.6,1) infinite }
        @keyframes wm-pulse-dot {
          0%,100%{box-shadow:0 0 0 0 rgba(90,40,0,.7)}
          60%    {box-shadow:0 0 0 7px rgba(90,40,0,0)}
        }

        /* ── film-grain noise overlay ── */
        .wm-noise::after {
          content:'';
          position:absolute;inset:0;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
          opacity:.028;
          pointer-events:none;
          mix-blend-mode:overlay;
          animation: wm-noise 0.15s steps(1) infinite;
        }
      `}</style>

      {/* ══════════════ ROOT ══════════════ */}
      <div
        className={`wm-pg wm-noise${phase==='exit' ? ' wm-exit' : ''}`}
        style={{
          position:'fixed', inset:0, zIndex:9999,
          background:`radial-gradient(ellipse 80% 70% at 20% 10%, #fdf8f0 0%, ${C.bg1} 45%, ${C.bg0} 100%)`,
          display:'flex', flexDirection:'column',
          overflow:'hidden',
        }}
      >

        {/* ── ambient gold orbs ── */}
        <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden'}}>
          {[
            {t:'-12%', l:'-8%', w:'55vw', c:'rgba(200,146,74,0.06)', d:'20s', dl:'0s'},
            {t:'50%',  r:'-5%', w:'45vw', c:'rgba(160,110,50,0.05)', d:'26s', dl:'-10s'},
            {t:'25%',  l:'52%', w:'32vw', c:'rgba(220,180,90,0.04)', d:'22s', dl:'-6s'},
          ].map((o,i) => (
            <div key={i} style={{
              position:'absolute', top:o.t, left:o.l, right:o.r,
              width:o.w, height:o.w, maxWidth:700, maxHeight:700,
              borderRadius:'50%',
              background:`radial-gradient(circle,${o.c} 0%,transparent 70%)`,
              animation:`wm-orb ${o.d} ease-in-out ${o.dl} infinite`,
            }}/>
          ))}
        </div>

        {/* ── floating dust particles ── */}
        <div style={{position:'absolute',inset:0,pointerEvents:'none'}}>
          {PARTICLES.map(p => (
            <div key={p.id} style={{
              position:'absolute', left:`${p.x}%`, top:`${p.y}%`,
              width:p.size, height:p.size, borderRadius:'50%',
              background: p.id%2===0
                ? `rgba(200,146,74,${0.3 + Math.random()*0.3})`
                : `rgba(240,220,190,${0.15 + Math.random()*0.2})`,
              animation:`wm-float ${p.duration}s ease-in-out ${p.delay}s infinite`,
            }}/>
          ))}
        </div>

        {/* ── subtle vignette ── */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none',
          background:'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)',
        }}/>

        {/* ── bottom wave ── */}
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:120,pointerEvents:'none',overflow:'hidden'}}>
          <div className="wm-wa" style={{position:'absolute',bottom:0,width:'200%',height:'100%'}}>
            {[0,1].map(k=>(
              <svg key={k} viewBox="0 0 1440 120" preserveAspectRatio="none"
                style={{width:'50%',height:'100%',display:'inline-block'}}>
                <path d="M0,60 C280,110 560,10 840,60 C1080,100 1280,25 1440,60 L1440,120 L0,120 Z"
                  fill="rgba(160,100,30,0.06)"/>
              </svg>
            ))}
          </div>
          <div className="wm-wb" style={{position:'absolute',bottom:0,width:'200%',height:'65%'}}>
            {[0,1].map(k=>(
              <svg key={k} viewBox="0 0 1440 80" preserveAspectRatio="none"
                style={{width:'50%',height:'100%',display:'inline-block'}}>
                <path d="M0,40 C360,75 720,5 1080,40 C1260,58 1380,22 1440,40 L1440,80 L0,80 Z"
                  fill="rgba(200,146,74,0.04)"/>
              </svg>
            ))}
          </div>
        </div>

        {/* ── interactive ship ── */}
        <div style={{
          position:'absolute', right:'2vw', top:'50%', transform:'translateY(-48%)',
          zIndex:2, width:'clamp(340px,42vw,620px)',
        }}>
          <ShipSVG />
        </div>

        {/* ── fine horizontal rule texture ── */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none',
          backgroundImage:`repeating-linear-gradient(0deg, rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 1px, transparent 1px, transparent 72px)`,
        }}/>

        {/* ══════════════ LAYOUT ══════════════ */}
        <div style={{
          position:'relative', zIndex:10,
          flex:1, display:'flex', flexDirection:'column',
          padding:'0 7vw',
          overflow:'hidden',
        }}>

          {/* ▌ HEADER */}
          <div className="wm-hdr" style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            paddingTop:26, paddingBottom:22,
            borderBottom:`1px solid ${C.lineB}`,
            flexShrink:0,
          }}>
            {/* emblem + ministry */}
            <div style={{display:'flex', alignItems:'center', gap:14}}>
              <img src="/emblem.svg" alt="Emblem of India"
                style={{height:44, objectFit:'contain', filter:'brightness(0) sepia(1) saturate(0.8) brightness(0.4)', flexShrink:0}}/>
              <div style={{borderLeft:`1px solid ${C.lineB}`, paddingLeft:16}}>
                <p style={{margin:0, fontSize:9.5, letterSpacing:'0.14em', color:C.muted, fontWeight:700, textTransform:'uppercase'}}>
                  Government of India
                </p>
                <p style={{margin:'3px 0 0', fontSize:14.5, fontWeight:700, color:C.cream, letterSpacing:'0.005em'}}>
                  Ministry of Ports, Shipping and Waterways
                </p>
              </div>

              {/* divider */}
              <div style={{width:1, height:40, background:C.lineB, marginLeft:8}}/>

              {/* NTCPWC logo */}
              <div style={{flexShrink:0, overflow:'hidden', width:64, height:64}}>
                <img src="/ntcpwc-logo.png" alt="NTCPWC"
                  style={{height:64, width:'auto', maxWidth:'none', display:'block'}}/>
              </div>
            </div>

            {/* live pill */}
            <div style={{
              display:'inline-flex', alignItems:'center', gap:8,
              borderRadius:50, padding:'6px 16px',
              background:'rgba(30,15,5,0.07)',
              border:'1px solid rgba(30,15,5,0.15)',
            }}>
              <span className="wm-dot" style={{
                width:7, height:7, borderRadius:'50%',
                background:'#2d8a4e', display:'inline-block', flexShrink:0,
              }}/>
              <span style={{fontSize:10.5, fontWeight:600, color:C.cream2, letterSpacing:'0.1em', textTransform:'uppercase'}}>
                Now Live — Version 3.0
              </span>
            </div>
          </div>

          {/* ▌ HERO */}
          <div className="wm-hero" style={{
            paddingTop:38, paddingBottom:26,
            borderBottom:`1px solid ${C.lineB}`,
            flexShrink:0,
          }}>
            {/* eyebrow */}
            <p style={{
              margin:'0 0 14px',
              fontSize:11, fontWeight:600, letterSpacing:'0.18em',
              textTransform:'uppercase', color:C.muted,
            }}>
              Integrated Governance Platform
            </p>

            {/* headline — mix regular + gold shimmer */}
            <h1 style={{
              margin:'0 0 12px',
              fontWeight:800,
              fontSize:'clamp(34px, 4.8vw, 60px)',
              color:C.cream,
              letterSpacing:'-0.025em',
              lineHeight:1.15,
              display:'flex', flexWrap:'wrap', alignItems:'center', gap:0,
            }}>
              <span style={{marginRight:'0.3em'}}>Welcome to</span>
              <img src="/sagarmanthan_logo.png" alt="Sagarmanthan"
                style={{height:'clamp(28px,3.2vw,42px)', width:'auto', objectFit:'contain', verticalAlign:'middle', flexShrink:0}}/>
              <em className="wm-gold-txt" style={{fontStyle:'italic', fontWeight:900, paddingRight:'0.15em'}}>
                Sagarmanthan 3.0
              </em>
            </h1>

            <p style={{
              margin:0,
              fontSize:'clamp(14px,1.4vw,17px)',
              color:C.cream2,
              fontWeight:400,
              lineHeight:1.6,
              maxWidth:'55ch',
            }}>
              A better, simpler experience — built with your feedback.
            </p>
          </div>

          {/* ▌ MAIN BODY — two columns, both bottom-aligned */}
          <div style={{
            flex:1, display:'flex', flexDirection:'row',
            alignItems:'stretch',
            gap:'6vw',
            paddingTop:24, paddingBottom:0,
            minHeight:0,
          }}>

            {/* ── LEFT COLUMN ── */}
            <div style={{flex:1, display:'flex', flexDirection:'column', justifyContent:'flex-start', gap:24, minWidth:0}}>

              {/* description */}
              <p className="wm-desc" style={{
                margin:0,
                fontSize:'clamp(13px,1.15vw,15px)',
                color:C.cream2,
                lineHeight:1.8,
              }}>
                Sagarmanthan has been upgraded to{' '}
                <span style={{color:C.gold2, fontWeight:600}}>Version 3.0</span>{' '}
                with a refreshed interface, improved navigation and a more streamlined user experience.
              </p>

              {/* what you need to know */}
              <div className="wm-know">
                <div style={{display:'flex', alignItems:'center', gap:18, marginBottom:18}}>
                  <div style={{height:'1px', width:32, background:C.gold, opacity:0.5}}/>
                  <span style={{fontSize:10.5, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.14em', whiteSpace:'nowrap'}}>
                    What you need to know
                  </span>
                  <div style={{height:'1px', flex:1, background:`linear-gradient(90deg,rgba(200,146,74,0.2),transparent)`}}/>
                </div>

                <div style={{display:'flex', flexDirection:'column', gap:13}}>
                  {CHECK_ITEMS.map((item, i) => (
                    <div
                      key={i}
                      className={itemsVisible.includes(i) ? 'wm-chk-row' : ''}
                      style={{display:'flex', alignItems:'flex-start', gap:12, opacity: itemsVisible.includes(i) ? 1 : 0}}
                    >
                      <div
                        className={itemsVisible.includes(i) ? 'wm-chk-ico' : ''}
                        style={{
                          flexShrink:0, width:22, height:22, borderRadius:'50%',
                          border:'1.5px solid #16a34a',
                          background:'rgba(22,163,74,0.1)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          marginTop:3,
                        }}
                      >
                        <svg width="10" height="9" viewBox="0 0 12 10" fill="none">
                          <path d="M1 5L4.5 8.5L11 1.5" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <p style={{margin:0, fontSize:'clamp(12px,1.05vw,14px)', color:C.cream2, lineHeight:1.65}}>
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* feedback note */}
              <div className="wm-note" style={{borderLeft:`2px solid rgba(90,40,0,0.3)`, paddingLeft:20, marginTop:'auto'}}>
                <p style={{
                  margin:0,
                  fontSize:'clamp(12px,1.05vw,13.5px)',
                  color:C.muted,
                  fontStyle:'italic',
                  lineHeight:1.8,
                }}>
                  We sincerely thank you for your valuable feedback and suggestions, which have helped shape
                  the improvements in Sagarmanthan 3.0. We welcome your continued feedback as you explore the upgraded portal.
                </p>
              </div>

            </div>{/* /left col */}

            {/* ── RIGHT COLUMN ── tagline + CTA */}
            <div className="wm-cta" style={{flexShrink:0, display:'flex', flexDirection:'column', justifyContent:'flex-end', gap:22, alignItems:'flex-end'}}>

              {/* tagline */}
              <div style={{display:'flex', alignItems:'center', gap:0}}>
                {['Same Data.','Active Modules.','Better Experience.'].map((t,i)=>(
                  <React.Fragment key={i}>
                    <span style={{
                      fontSize:'clamp(12px,1.1vw,14.5px)',
                      fontWeight:700,
                      color:C.cream2,
                      letterSpacing:'0.04em',
                      paddingRight: i<2 ? 14 : 0,
                    }}>{t}</span>
                    {i<2 && <span style={{fontSize:12, color:C.muted, paddingRight:14, fontWeight:300}}>·</span>}
                  </React.Fragment>
                ))}
              </div>

              {/* button — BakerStreet style: light fill dark text */}
              <button
                onClick={go}
                className="wm-btn"
                style={{
                  display:'inline-flex', alignItems:'center', gap:11,
                  background:'#2d1800',
                  color:'#f5e8d0',
                  border:'none',
                  borderRadius:50,
                  padding:'clamp(11px,1.1vw,15px) clamp(22px,2.2vw,36px)',
                  fontSize:'clamp(13px,1.1vw,15px)',
                  fontWeight:800,
                  cursor:'pointer',
                  letterSpacing:'0.01em',
                  position:'relative', overflow:'hidden',
                }}
              >
                {/* shimmer sweep */}
                <span style={{
                  position:'absolute', inset:0, borderRadius:'inherit',
                  background:'linear-gradient(105deg,transparent 38%,rgba(255,255,255,0.45) 50%,transparent 62%)',
                  backgroundSize:'220% 100%',
                  animation:'wm-shimmer-btn 2.8s linear infinite',
                }}/>
                <span style={{position:'relative'}}>Continue to Sagarmanthan 3.0</span>
                <svg style={{position:'relative',flexShrink:0}} width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12H19M13 6L19 12L13 18" stroke="#f5e8d0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>{/* /right col */}

          </div>{/* /body */}

          {/* ▌ FOOTER */}
          <div style={{
            paddingTop:12, paddingBottom:14,
            borderTop:`1px solid ${C.lineB}`,
            flexShrink:0,
          }}>
            <p style={{margin:0, fontSize:10, color:C.muted, letterSpacing:'0.08em', textTransform:'uppercase'}}>
              Sagarmanthan &nbsp;·&nbsp; Integrated Governance Platform &nbsp;·&nbsp; Secure Portal
            </p>
          </div>

        </div>{/* /layout */}
      </div>
    </>
  );
}
