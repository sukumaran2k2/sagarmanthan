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

// Value label for one line of a chart with several lines, so labels don't run into each other.
// At each point the label goes above if no other line is within `gap` (in axis units) above it,
// else below if none is within `gap` below; otherwise it is left to the tooltip. Lines with the
// same value show one label, the first line's. Use as series.bullets.push((root, s, item) => ...).
export function lineValueBullet(root, dataItem, { field, fields, color, gap, suffix = '' }) {
  const ctx = dataItem.dataContext;
  const value = Number(ctx[field]);
  const self = fields.indexOf(field);
  let roomAbove = Infinity;
  let roomBelow = Infinity;
  for (let i = 0; i < fields.length; i++) {
    if (i === self) continue;
    const diff = Number(ctx[fields[i]]) - value;
    if (diff === 0 && i < self) return undefined;
    if (diff > 0) roomAbove = Math.min(roomAbove, diff);
    if (diff < 0) roomBelow = Math.min(roomBelow, -diff);
  }
  // A label below a zero point would sit on the axis labels
  const above = roomAbove >= gap;
  if (!above && (roomBelow < gap || value <= 0)) return undefined;
  return am5.Bullet.new(root, {
    sprite: am5.Label.new(root, {
      fill: am5.color(color), centerX: am5.p50, centerY: above ? am5.p100 : am5.p0, dy: above ? -7 : 7,
      paddingTop: 0, paddingBottom: 0, fontSize: 10, fontWeight: '700', populateText: true, text: `{valueY}${suffix}`,
    }),
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
