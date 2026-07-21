import React, { useState, useEffect } from 'react';
import { BG_IMAGES } from '../constants';

export default function BackgroundRotator() {
  const [bgIdx, setBgIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setBgIdx((prev) => (prev + 1) % BG_IMAGES.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {BG_IMAGES.map((img, idx) => (
        <div
          key={idx}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms] ${
            idx === bgIdx
              ? "opacity-100 animate-ken-burns"
              : "opacity-0 scale-100"
          }`}
          style={{ backgroundImage: `url('${img}')` }}
        />
      ))}
      <div className="fixed inset-0 bg-[#3a1c3e]/30 mix-blend-multiply"></div>
      <div className="fixed inset-0 bg-gradient-to-tr from-slate-950/70 via-slate-900/30 to-transparent"></div>
    </>
  );
}
