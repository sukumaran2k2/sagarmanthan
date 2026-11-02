import { useEffect, useLayoutEffect, useRef } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import { newChartRoot, chartColors } from '../../../../utils/amCharts';

// Bar / line chart of the Projects dashboard (amCharts 5, shared dashboard theme).
//   series: [{ field, name, color, colorField?, type: 'column' | 'line' }]
//   horizontal: categories down the left, largest first; otherwise categories along the bottom.
//   stacked: columns stacked per category.
//   onSelect(dataContext, field): clicking a column (or a line point) opens its projects.
//   tooltipLines: [{ label, field }] - details shown on hover below the hovered series'
//   value; each field holds ready-formatted text. tooltipTitleField names the hover title (default:
//   the category).
// data, series and tooltipLines must be memoised by the caller: a new array rebuilds the chart.
export default function DashboardChart({
  data,
  categoryField = 'name',
  series,
  horizontal = false,
  stacked = false,
  valueFormat = '#,###.##',
  valueSuffix = '',
  showValues = true,
  tooltipLines,
  tooltipTitleField,
  onSelect,
  onRootReady,
  dark,
}) {
  const divRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useLayoutEffect(() => {
    if (!divRef.current || !data?.length) return undefined;
    const c = chartColors();
    const root = newChartRoot(divRef.current);
    onRootReady?.(root);
    root.setThemes([am5themes_Animated.new(root)]);
    const chart = root.container.children.push(am5xy.XYChart.new(root, {
      panX: false, panY: false, wheelX: 'none', wheelY: 'none', layout: root.verticalLayout,
      paddingTop: 16, paddingLeft: 8, paddingRight: horizontal ? 30 : 12, paddingBottom: 8,
    }));

    const categoryRenderer = horizontal
      ? am5xy.AxisRendererY.new(root, { minGridDistance: 8, inversed: true, cellStartLocation: 0.12, cellEndLocation: 0.88 })
      : am5xy.AxisRendererX.new(root, { minGridDistance: 12, cellStartLocation: 0.15, cellEndLocation: 0.85 });
    categoryRenderer.labels.template.setAll(horizontal
      ? { fontSize: 10, fill: am5.color(c.text), fontWeight: '600', maxWidth: 170, oversizedBehavior: 'truncate', textAlign: 'end' }
      // Long category names are slanted once there are more than a few bars, so they do not overlap.
      : { fontSize: 10, fill: am5.color(c.text), fontWeight: '600', maxWidth: 130, oversizedBehavior: 'truncate', rotation: data.length > 5 ? -35 : 0, centerY: am5.p50, centerX: data.length > 5 ? am5.p100 : am5.p50 });
    categoryRenderer.grid.template.set('visible', false);
    const valueRenderer = horizontal
      ? am5xy.AxisRendererX.new(root, { minGridDistance: 60 })
      : am5xy.AxisRendererY.new(root, {});
    valueRenderer.labels.template.setAll({ fontSize: 9, fill: am5.color(c.muted), fontWeight: '600' });
    valueRenderer.grid.template.setAll({ stroke: am5.color(c.grid), strokeDasharray: [3, 3] });

    const categoryAxis = am5xy.CategoryAxis.new(root, { categoryField, renderer: categoryRenderer });
    // Headroom past the longest bar for the value labels.
    const valueAxis = am5xy.ValueAxis.new(root, { renderer: valueRenderer, min: 0, extraMax: showValues ? 0.14 : 0.04, numberFormat: '#,###.##' });
    const xAxis = chart.xAxes.push(horizontal ? valueAxis : categoryAxis);
    const yAxis = chart.yAxes.push(horizontal ? categoryAxis : valueAxis);
    const valueKey = horizontal ? 'valueX' : 'valueY';
    const categoryKey = horizontal ? 'categoryY' : 'categoryX';
    const labelSingle = showValues && (series.length === 1 || !stacked);
    const tooltipTitle = `[bold]{${tooltipTitleField || categoryKey}}[/]`;
    const detailText = tooltipLines?.map((l) => `${l.label}: [bold]{${l.field}}[/]`).join('\n');

    series.forEach((s) => {
      const color = am5.color(s.color);
      const fields = horizontal
        ? { valueXField: s.field, categoryYField: categoryField }
        : { valueYField: s.field, categoryXField: categoryField };
      const seriesText = `${s.name}: [bold]{${valueKey}.formatNumber("${valueFormat}")}${valueSuffix}[/]`;
      const body = detailText ? `${seriesText}\n${detailText}` : seriesText;
      // The chart has no cursor, so each column / point carries its own hover text.
      const tooltipText = `${tooltipTitle}\n${body}`;
      const tooltip = am5.Tooltip.new(root, {});

      if (s.type === 'line') {
        const line = chart.series.push(am5xy.LineSeries.new(root, { name: s.name, xAxis, yAxis, ...fields, stroke: color, tooltip }));
        line.strokes.template.setAll({ strokeWidth: 2 });
        line.bullets.push(() => {
          const circle = am5.Circle.new(root, {
            radius: 4, fill: color, stroke: am5.color(c.totalBullet), strokeWidth: 2, tooltip, tooltipText, cursorOverStyle: onSelect ? 'pointer' : undefined,
          });
          circle.events.on('click', (ev) => onSelectRef.current?.(ev.target.dataItem?.dataContext, s.field));
          return am5.Bullet.new(root, { sprite: circle });
        });
        line.data.setAll(data);
        return;
      }

      const column = chart.series.push(am5xy.ColumnSeries.new(root, { name: s.name, xAxis, yAxis, ...fields, stacked, tooltip }));
      column.columns.template.setAll({
        fill: color,
        stroke: am5.color(c.totalBullet),
        strokeWidth: stacked ? 1 : 0,
        tooltipText,
        ...(horizontal
          ? { height: am5.percent(80), cornerRadiusTR: 4, cornerRadiusBR: 4 }
          : { width: am5.percent(80), cornerRadiusTL: 4, cornerRadiusTR: 4 }),
        cursorOverStyle: onSelect ? 'pointer' : undefined,
      });
      // colorField: each column takes its colour from its data (e.g. its stage).
      if (s.colorField) {
        column.columns.template.adapters.add('fill', (fill, target) => {
          const hex = target.dataItem?.dataContext?.[s.colorField];
          return hex ? am5.color(hex) : fill;
        });
      }
      column.columns.template.events.on('click', (ev) => onSelectRef.current?.(ev.target.dataItem?.dataContext, s.field));
      if (labelSingle) {
        column.bullets.push(() => am5.Bullet.new(root, {
          ...(horizontal ? { locationX: 1 } : { locationY: 1 }),
          sprite: am5.Label.new(root, {
            text: `{${valueKey}.formatNumber("${valueFormat}")}`,
            populateText: true, fontSize: 9, fontWeight: '700', fill: am5.color(c.value),
            ...(horizontal ? { centerX: am5.p0, centerY: am5.p50, dx: 4 } : { centerX: am5.p50, centerY: am5.p100, dy: -2 }),
          }),
        }));
      }
      column.data.setAll(data);
    });

    categoryAxis.data.setAll(data);
    chart.appear(600, 100);
    return () => { root.dispose(); onRootReady?.(null); };
    // onRootReady / onSelect are read once per build; data and theme rebuild the chart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, dark, series, horizontal, stacked, tooltipLines, tooltipTitleField]);

  return <div ref={divRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
}
