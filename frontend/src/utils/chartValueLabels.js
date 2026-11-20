import * as am5 from '@amcharts/amcharts5';

// Keeps the value labels of an amCharts5 XY chart from overlapping one another.
//
// Charts that label both a column series and a line series (often on two value axes) put
// numbers on top of each other wherever the line passes the top of a bar. Each time the chart
// settles (after loading, animating, resizing or toggling a series in the legend), this places
// the labels one by one, in series order, and gives each the first of a few spots, all next to
// what it labels, that does not cover a label already placed, a line point, a line, or the
// plot edge:
//   - a column's number: where its series puts it, else just inside the top of the bar, else
//     just above the bar;
//   - a line's number: just above its point, else just below it, else where its series puts it.
// If every spot is crossed by a line, the number takes the first spot clear of other numbers,
// and line numbers get a faint background so a line running behind one doesn't cut through it.
// Only if no spot is clear of other numbers does a number move further up or down.
//
// Usage, after the series and their bullets are created:
//   keepValueLabelsApart(root, chart);

const GAP = 3; // px between a number and its point / bar edge / another number

const overlaps = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
const atTop = (b, top) => ({ left: b.left, right: b.right, top, bottom: top + (b.bottom - b.top) });
const grown = (b, by) => ({ left: b.left - by, right: b.right + by, top: b.top - by, bottom: b.bottom + by });
const isLabel = (sprite) => sprite?.className === 'Label';
const centre = (b) => ({ x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 });

// Whether the segment p-q passes through the box (Liang-Barsky clipping)
function crosses(p, q, box) {
  let t0 = 0;
  let t1 = 1;
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const edges = [[-dx, p.x - box.left], [dx, box.right - p.x], [-dy, p.y - box.top], [dy, box.bottom - p.y]];
  for (const [a, b] of edges) {
    if (a === 0) { if (b < 0) return false; continue; }
    const t = b / a;
    if (a < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}

// A label's box without its padding (the theme pads labels, which would keep numbers far apart),
// unless it has a background, whose padding shows.
// Padding is in the label's own frame, so a label turned on its side swaps the two directions.
function textBounds(label) {
  const b = label.globalBounds();
  if (label.get('background')) return b; // a badge: its padding is part of what shows
  const pad = (k) => label.get(k, 0) || 0;
  const sideways = Math.abs(Math.round(label.get('rotation', 0))) % 180 === 90;
  const [x0, x1, y0, y1] = sideways
    ? [pad('paddingTop'), pad('paddingBottom'), pad('paddingLeft'), pad('paddingRight')]
    : [pad('paddingLeft'), pad('paddingRight'), pad('paddingTop'), pad('paddingBottom')];
  const box = { left: b.left + x0, right: b.right - x1, top: b.top + y0, bottom: b.bottom - y1 };
  return box.right > box.left && box.bottom > box.top ? box : b;
}

export function keepValueLabelsApart(root, chart) {
  const baseDy = new WeakMap(); // each label's own dy, as its series set it
  let timer;

  const run = () => {
    if (root.isDisposed()) return;
    const plot = chart.plotContainer.globalBounds();
    const placed = []; // boxes labels must keep off: line points, then each label as it is placed
    const segments = []; // the lines, point to point
    const labels = [];

    chart.series.each((series) => {
      if (series.isHidden()) return;
      const isColumn = series.className === 'ColumnSeries';
      let previous = null;
      series.dataItems.forEach((dataItem) => {
        const sprites = (dataItem.bullets || []).map((b) => b.get('sprite')).filter((s) => s && !s.isHidden() && s.getPrivate('visible') !== false);
        const marker = sprites.find((s) => !isLabel(s));
        const markerBox = marker?.globalBounds();
        const hasMarker = markerBox && markerBox.right > markerBox.left;
        if (hasMarker) {
          placed.push(markerBox);
          if (!isColumn) {
            const point = centre(markerBox);
            if (previous) segments.push([previous, point]);
            previous = point;
          }
        }
        const column = isColumn ? dataItem.get('graphics') : null;
        const bar = column && !column.isHidden() ? column.globalBounds() : null;
        sprites.filter(isLabel).forEach((sprite) => {
          const b = textBounds(sprite);
          if (!(b.right > b.left) || !(b.bottom > b.top)) return;
          if (!baseDy.has(sprite)) {
            baseDy.set(sprite, sprite.get('dy', 0));
            // a line's number: a faint background, so a line behind it doesn't cut through the digits
            // (tight around the digits, so it hides only the bit of line right behind them)
            if (!isColumn && !sprite.get('background')) {
              sprite.setAll({ paddingTop: 0, paddingBottom: 0, paddingLeft: 2, paddingRight: 2 });
              sprite.set('background', am5.RoundedRectangle.new(root, { fill: root.interfaceColors.get('background'), fillOpacity: 0.8, cornerRadiusTL: 2, cornerRadiusTR: 2, cornerRadiusBL: 2, cornerRadiusBR: 2 }));
            }
          }
          const base = baseDy.get(sprite);
          const own = b.top + (base - sprite.get('dy', 0)); // the label's top at its own dy
          const h = b.bottom - b.top;
          const spots = [];
          if (!isColumn && hasMarker) spots.push(markerBox.top - GAP - h, markerBox.bottom + GAP); // above / below the point
          spots.push(own);
          if (bar && bar.bottom - bar.top > h + 2 * GAP) spots.push(bar.top + GAP); // inside the top of the bar
          if (bar) spots.push(bar.top - GAP - h); // above the bar
          labels.push({ sprite, base, box: b, own, h, spots });
        });
      });
    });

    labels.forEach(({ sprite, base, box, own, h, spots }) => {
      const clear = (top, ofLines) => {
        const c = atTop(box, top);
        if (c.top < plot.top || c.bottom > plot.bottom) return false;
        const g = grown(c, GAP / 2);
        if (placed.some((p) => overlaps(g, p))) return false;
        return !ofLines || !segments.some(([p, q]) => crosses(p, q, g));
      };
      let top = spots.find((t) => clear(t, true)) ?? spots.find((t) => clear(t, false));
      // further from it, one line at a time
      for (let n = 1; n <= 6 && top === undefined; n++) top = [own - n * (h + GAP), own + n * (h + GAP)].find((t) => clear(t, false));
      if (top === undefined) top = own;
      const dy = Math.round(base + (top - own));
      if (sprite.get('dy', 0) !== dy) sprite.set('dy', dy);
      placed.push(atTop(box, top));
    });
  };

  // Run once the chart has stopped drawing (animations, resizes, legend toggles)
  root.events.on('frameended', () => {
    clearTimeout(timer);
    timer = setTimeout(run, 120);
  });
}
