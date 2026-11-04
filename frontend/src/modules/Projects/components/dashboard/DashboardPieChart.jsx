import { useEffect, useLayoutEffect, useRef } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5percent from '@amcharts/amcharts5/percent';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import { newChartRoot, chartColors } from '../../../../utils/amCharts';

// Donut chart of the Projects dashboard (the earlier portal's delay status pie).
// data: [{ name, value, color }] (memoised by the caller); onSelect(dataContext) opens
// the projects of a slice. Each slice is labelled with its name and count.
// tooltipLines: [{ label, field }] - extra details shown on hover; each field holds
// ready-formatted text (memoised by the caller).
export default function DashboardPieChart({ data, tooltipLines, onSelect, onRootReady, dark }) {
  const divRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useLayoutEffect(() => {
    if (!divRef.current || !data?.length) return undefined;
    const c = chartColors();
    const root = newChartRoot(divRef.current);
    onRootReady?.(root);
    root.setThemes([am5themes_Animated.new(root)]);
    const chart = root.container.children.push(am5percent.PieChart.new(root, { innerRadius: am5.percent(55), radius: am5.percent(80) }));
    const series = chart.series.push(am5percent.PieSeries.new(root, {
      valueField: 'value', categoryField: 'name', fillField: 'fill', alignLabels: true,
    }));
    series.slices.template.setAll({
      stroke: am5.color(c.totalBullet), strokeWidth: 2, cursorOverStyle: onSelect ? 'pointer' : undefined,
      tooltipText: ['[bold]{category}[/]: {value} ({valuePercentTotal.formatNumber("#.0")}%)',
        ...(tooltipLines || []).map((l) => `${l.label}: [bold]{${l.field}}[/]`)].join('\n'),
    });
    series.slices.template.events.on('click', (ev) => onSelectRef.current?.(ev.target.dataItem?.dataContext));
    series.labels.template.setAll({ text: '{category}: {value}', fontSize: 11, fontWeight: '600', fill: am5.color(c.text) });
    series.ticks.template.setAll({ stroke: am5.color(c.grid) });
    series.data.setAll(data.map((d) => ({ ...d, fill: am5.color(d.color) })));
    series.appear(600, 100);
    return () => { root.dispose(); onRootReady?.(null); };
    // onRootReady / onSelect are read once per build; data and theme rebuild the chart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, dark, tooltipLines]);

  return <div ref={divRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
}
