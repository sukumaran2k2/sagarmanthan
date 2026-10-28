import { useLayoutEffect, useRef, useState } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5percent from '@amcharts/amcharts5/percent';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import ChartExportMenu from '../../../components/ChartExportMenu';

/**
 * Donut chart (amCharts 5) for the HR dashboard.
 * data: [{ category, value, ...extra fields the tooltip may use }]; colors: one per slice (cycled).
 * tooltipText: amCharts text template, e.g. "{category}: {value} (Male: {male})".
 */
export default function DonutChart({ data = [], colors = [], tooltipText, fileName = 'hr_chart', height = 260 }) {
  const divRef = useRef(null);
  const [root, setRoot] = useState(null);
  const total = data.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  useLayoutEffect(() => {
    if (!divRef.current || total === 0) return undefined;
    const chartRoot = am5.Root.new(divRef.current);
    chartRoot.setThemes([am5themes_Animated.new(chartRoot)]);
    chartRoot._logo?.dispose();

    const chart = chartRoot.container.children.push(
      am5percent.PieChart.new(chartRoot, { innerRadius: am5.percent(55), layout: chartRoot.verticalLayout })
    );
    const series = chart.series.push(
      am5percent.PieSeries.new(chartRoot, { valueField: 'value', categoryField: 'category', alignLabels: false })
    );
    series.labels.template.set('forceHidden', true);
    series.ticks.template.set('forceHidden', true);
    series.slices.template.setAll({ stroke: am5.color(0xffffff), strokeWidth: 2, tooltipText: tooltipText || '{category}: {value}' });
    if (colors.length) series.get('colors').set('colors', colors.map((c) => am5.color(c)));
    series.data.setAll(data.filter((d) => Number(d.value) > 0));

    const legend = chart.children.push(am5.Legend.new(chartRoot, { centerX: am5.percent(50), x: am5.percent(50), marginTop: 8 }));
    legend.labels.template.setAll({ fontSize: 11, fill: am5.color(0x475569) });
    legend.valueLabels.template.setAll({ fontSize: 11, fontWeight: '700', fill: am5.color(0x0f172a) });
    legend.markers.template.setAll({ width: 10, height: 10 });
    legend.data.setAll(series.dataItems);

    series.appear(800, 100);
    setRoot(chartRoot);
    return () => {
      setRoot(null);
      chartRoot.dispose();
    };
  }, [data, colors, tooltipText, total]);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-xs text-slate-400" style={{ height }}>
        No data available
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute top-0 right-0 z-10">
        <ChartExportMenu chartRoot={root} fileName={fileName} variant="plain" />
      </div>
      <div ref={divRef} style={{ width: '100%', height }} />
    </div>
  );
}
