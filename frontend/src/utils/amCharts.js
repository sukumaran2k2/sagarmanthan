import { useState, useEffect } from 'react';
import * as am5 from '@amcharts/amcharts5';

// The app zooms the whole page (index.css: #root { zoom: 1.06 }). amCharts measures its
// box in zoomed pixels and the browser then zooms the canvas again, so a chart came out
// ~6% bigger than its box and its bottom/right labels were cut off. calculateSize undoes
// that so the canvas fits its box exactly at any page zoom.
function pageZoom() {
  const el = document.getElementById('root');
  return (el && Number(getComputedStyle(el).zoom)) || 1;
}
export function newChartRoot(div) {
  return am5.Root.new(div, {
    calculateSize: (size) => {
      const z = pageZoom();
      return { width: size.width / z, height: size.height / z };
    },
  });
}

// Chart text/line colours for the app's light or dark theme (the `dark` class on <html>).
export function chartColors() {
  const dark = document.documentElement.classList.contains('dark');
  return dark
    ? { text: 0xe2e8f0, muted: 0x94a3b8, grid: 0x334155, value: 0xcbd5e1, total: 0xc7d2fe, totalBullet: 0x0f172a }
    : { text: 0x1e293b, muted: 0x475569, grid: 0xe2e8f0, value: 0x334155, total: 0x1e1b4b, totalBullet: 0xffffff };
}

// Re-renders when the light/dark theme is switched, so the charts can recolour.
export function useIsDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}
