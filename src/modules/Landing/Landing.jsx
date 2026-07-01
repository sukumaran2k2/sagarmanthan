import { useMemo, useState, useEffect } from 'react';
import { FileSpreadsheet, FileText, ChevronDown, ChevronUp, UploadCloud } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import * as am5percent from "@amcharts/amcharts5/percent";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

ModuleRegistry.registerModules([AllCommunityModule]);

function FileUploadKPIs() {
  useEffect(() => {
    let root1 = am5.Root.new("upload-donut-chart");
    root1.setThemes([am5themes_Animated.new(root1)]);
    let chart1 = root1.container.children.push(
      am5percent.PieChart.new(root1, {
        innerRadius: am5.percent(60)
      })
    );
    let series1 = chart1.series.push(
      am5percent.PieSeries.new(root1, {
        valueField: "value",
        categoryField: "category"
      })
    );
    series1.labels.template.set("forceHidden", true);
    series1.ticks.template.set("forceHidden", true);
    series1.data.setAll([
      { category: "Active", value: 5 },
      { category: "Total", value: 5 }
    ]);
    series1.appear(1000, 100);

    let root2 = am5.Root.new("upload-sparkline-chart");
    root2.setThemes([am5themes_Animated.new(root2)]);
    let chart2 = root2.container.children.push(
      am5xy.XYChart.new(root2, {
        panX: false,
        panY: false
      })
    );
    let xAxis = chart2.xAxes.push(
      am5xy.CategoryAxis.new(root2, {
        categoryField: "date",
        renderer: am5xy.AxisRendererX.new(root2, { visible: false })
      })
    );
    xAxis.get("renderer").grid.template.set("forceHidden", true);
    xAxis.get("renderer").labels.template.set("forceHidden", true);
    let yAxis = chart2.yAxes.push(
      am5xy.ValueAxis.new(root2, {
        renderer: am5xy.AxisRendererY.new(root2, { visible: false })
      })
    );
    yAxis.get("renderer").grid.template.set("forceHidden", true);
    yAxis.get("renderer").labels.template.set("forceHidden", true);
    let series2 = chart2.series.push(
      am5xy.LineSeries.new(root2, {
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "value",
        categoryXField: "date",
        stroke: am5.color(0x10b981),
        strokeWidth: 3
      })
    );
    const data = [
      { date: "1", value: 38 },
      { date: "2", value: 30 },
      { date: "3", value: 22 },
      { date: "4", value: 16 },
      { date: "5", value: 11 },
      { date: "6", value: 7 },
      { date: "7", value: 4 }
    ];
    xAxis.data.setAll(data);
    series2.data.setAll(data);

    return () => {
      root1.dispose();
      root2.dispose();
    };
  }, []);

  return (
    <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-3 gap-5 animate-fade-in">
      <div className="flex items-center space-x-5 bg-white border border-blue-100 rounded-2xl px-5 py-4 shadow-md">
        <div id="upload-donut-chart" className="w-16 h-16 relative flex items-center justify-center">
          <span className="absolute text-sm font-black text-[#0f417a]">5</span>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active</p>
          <p className="text-lg font-extrabold text-slate-800 leading-tight">Channels</p>
          <p className="text-[11px] text-slate-400 mt-0.5">All operational</p>
        </div>
      </div>

      <div className="flex flex-col bg-white border border-blue-100 rounded-2xl px-5 py-4 shadow-md justify-between">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Upload Trend</p>
        <div id="upload-sparkline-chart" className="w-full h-10"></div>
        <p className="text-sm font-black text-emerald-600 mt-2">↑ Consistently On Track</p>
      </div>

      <div className="flex items-center space-x-5 bg-white border border-blue-100 rounded-2xl px-5 py-4 shadow-md">
        <div className="relative flex h-8 w-8">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
          <span className="relative inline-flex rounded-full h-8 w-8 bg-emerald-500"></span>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Status</p>
          <p className="text-lg font-extrabold text-emerald-700 leading-tight">Up-to-Date</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Week 3 · June 2026</p>
        </div>
      </div>
    </div>
  );
}

function DataEntryKPIs() {
  useEffect(() => {
    let root1 = am5.Root.new("entry-donut-chart");
    root1.setThemes([am5themes_Animated.new(root1)]);
    let chart1 = root1.container.children.push(
      am5percent.PieChart.new(root1, {
        innerRadius: am5.percent(60)
      })
    );
    let series1 = chart1.series.push(
      am5percent.PieSeries.new(root1, {
        valueField: "value",
        categoryField: "category"
      })
    );
    series1.labels.template.set("forceHidden", true);
    series1.ticks.template.set("forceHidden", true);
    series1.data.setAll([
      { category: "Modules", value: 19 }
    ]);
    series1.appear(1000, 100);

    let root2 = am5.Root.new("entry-bar-chart");
    root2.setThemes([am5themes_Animated.new(root2)]);
    let chart2 = root2.container.children.push(
      am5xy.XYChart.new(root2, {
        panX: false,
        panY: false,
        layout: root2.verticalLayout
      })
    );
    let xAxis = chart2.xAxes.push(
      am5xy.CategoryAxis.new(root2, {
        categoryField: "wing",
        renderer: am5xy.AxisRendererX.new(root2, { visible: false })
      })
    );
    xAxis.get("renderer").grid.template.set("forceHidden", true);
    xAxis.get("renderer").labels.template.set("forceHidden", true);
    let yAxis = chart2.yAxes.push(
      am5xy.ValueAxis.new(root2, {
        renderer: am5xy.AxisRendererY.new(root2, { visible: false })
      })
    );
    yAxis.get("renderer").grid.template.set("forceHidden", true);
    yAxis.get("renderer").labels.template.set("forceHidden", true);
    let series2 = chart2.series.push(
      am5xy.ColumnSeries.new(root2, {
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "value",
        categoryXField: "wing"
      })
    );
    series2.columns.template.setAll({
      width: am5.percent(70),
      strokeOpacity: 0
    });
    series2.columns.template.adapters.add("fill", (fill, target) => {
      return chart2.get("colors").getIndex(series2.columns.indexOf(target));
    });
    const data = [
      { wing: "Shp", value: 20 },
      { wing: "Vig", value: 5 },
      { wing: "Prt", value: 44 },
      { wing: "IWT", value: 20 },
      { wing: "Adm", value: 20 }
    ];
    xAxis.data.setAll(data);
    series2.data.setAll(data);

    return () => {
      root1.dispose();
      root2.dispose();
    };
  }, []);

  return (
    <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-fade-in">
      <div className="flex items-center space-x-5 bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-md">
        <div id="entry-donut-chart" className="w-16 h-16 relative flex items-center justify-center">
          <span className="absolute text-sm font-black text-indigo-600">19</span>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total</p>
          <p className="text-lg font-extrabold text-slate-800 leading-tight">Modules</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Across 5 wings</p>
        </div>
      </div>

      <div className="flex flex-col bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-md justify-between">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Wing Activity</p>
        <div id="entry-bar-chart" className="w-full h-10"></div>
        <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1.5">
          <span>Shp</span><span>Vig</span><span>Prt</span><span>IWT</span><span>Adm</span>
        </div>
      </div>

      <div className="flex flex-col bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-md justify-center">
        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
          <span>2026 Fill Rate</span>
          <span className="text-indigo-600 text-sm font-black">53%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div className="bg-indigo-500 h-3 rounded-full transition-all duration-500" style={{width: '53%'}}></div>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">10 of 19 modules active in 2026</p>
      </div>

      <div className="flex items-center space-x-5 bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-md">
        <div className="p-3 bg-red-50 rounded-xl border border-red-100">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reference Date</p>
          <p className="text-lg font-extrabold text-red-600 leading-tight">01 Jul 2026</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Last data point</p>
        </div>
      </div>
    </div>
  );
}

function OrgKPIs() {
  useEffect(() => {
    let root1 = am5.Root.new("org-donut-chart-1");
    root1.setThemes([am5themes_Animated.new(root1)]);
    let chart1 = root1.container.children.push(
      am5percent.PieChart.new(root1, {
        innerRadius: am5.percent(60)
      })
    );
    let series1 = chart1.series.push(
      am5percent.PieSeries.new(root1, {
        valueField: "value",
        categoryField: "category"
      })
    );
    series1.labels.template.set("forceHidden", true);
    series1.ticks.template.set("forceHidden", true);
    series1.data.setAll([
      { category: "Modules", value: 4 }
    ]);
    series1.appear(1000, 100);

    let root2 = am5.Root.new("org-donut-chart-2");
    root2.setThemes([am5themes_Animated.new(root2)]);
    let chart2 = root2.container.children.push(
      am5percent.PieChart.new(root2, {
        innerRadius: am5.percent(60)
      })
    );
    let series2 = chart2.series.push(
      am5percent.PieSeries.new(root2, {
        valueField: "value",
        categoryField: "category"
      })
    );
    series2.labels.template.set("forceHidden", true);
    series2.ticks.template.set("forceHidden", true);
    series2.data.setAll([
      { category: "Organisations", value: 26 }
    ]);
    series2.appear(1000, 100);

    return () => {
      root1.dispose();
      root2.dispose();
    };
  }, []);

  return (
    <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-3 gap-5 animate-fade-in">
      <div className="flex items-center space-x-5 bg-white border border-amber-100 rounded-2xl px-5 py-4 shadow-md">
        <div id="org-donut-chart-1" className="w-16 h-16 relative flex items-center justify-center">
          <span className="absolute text-sm font-black text-amber-700">4</span>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Modules</p>
          <p className="text-lg font-extrabold text-slate-800 leading-tight">Org-Level</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Projects, CSR, HR, Courts</p>
        </div>
      </div>

      <div className="flex items-center space-x-5 bg-white border border-amber-100 rounded-2xl px-5 py-4 shadow-md">
        <div id="org-donut-chart-2" className="w-16 h-16 relative flex items-center justify-center">
          <span className="absolute text-sm font-black text-amber-700">26</span>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Organisations</p>
          <p className="text-lg font-extrabold text-slate-800 leading-tight">Tracked</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Ports, PSUs & Authorities</p>
        </div>
      </div>

      <div className="flex items-center space-x-5 bg-white border border-amber-100 rounded-2xl px-5 py-4 shadow-md">
        <div className="p-3 bg-red-50 rounded-xl border border-red-100">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reference Date</p>
          <p className="text-lg font-extrabold text-red-600 leading-tight">01 Jul 2026</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Last data point</p>
        </div>
      </div>
    </div>
  );
}

const FILE_UPLOAD_MODULES = [
  { id: 'cpgrams',          title: '1. CPGRAMS',             date: 'As on 1 Jul 2026', status: 'Last file uploaded on', badge: 'May - 2026' },
  { id: 'file-pendency',    title: '2a. File Pendency',      date: 'As on 1 Jul 2026', status: 'Last file uploaded on', badge: 'Week 3 - June 2026' },
  { id: 'receipt-pendency', title: '2b. Receipt Pendency',   date: 'As on 1 Jul 2026', status: 'Last file uploaded on', badge: 'Week 3 - June 2026' },
  { id: 'file-disposal',    title: '2c. File Disposal',      date: 'As on 1 Jul 2026', status: 'Last file uploaded on', badge: 'Week 3 - June 2026' },
  { id: 'attendance',       title: '3. Attendance',          date: 'As on 1 Jul 2026', status: 'Last file uploaded on', badge: 'Week 4 - June 2026' },
];

const ROW_DATA = [
  { sno: 4,  moduleName: 'Young Professional',                   shipping: '17-03-2025',    vigilance: '--',           ports: '17-03-2025',  iwt: '19-01-2024',  admin: '19-01-2024',  coordI: '17-03-2025',   coordII: '19-01-2024',  dgll: '17-03-2025',   dev: '19-01-2024',  finance: '17-03-2025',  sagarmala: '--',       it: '17-03-2025', special: '--' },
  { sno: 5,  moduleName: 'Consultant Appointment',               shipping: '17-03-2025',    vigilance: '--',           ports: '17-03-2025',  iwt: '--',          admin: '17-03-2025',  coordI: '17-03-2025',   coordII: '--',          dgll: '17-03-2025',   dev: '--',          finance: '--',          sagarmala: '--',       it: '--',  special: '--' },
  { sno: 6,  moduleName: 'VIP Reference',                        shipping: '--',            vigilance: '--',           ports: '--',          iwt: '--',          admin: '--',          coordI: '--',           coordII: '--',          dgll: '--',           dev: '--',          finance: '--',          sagarmala: '--',       it: '--',  special: '--' },
  { sno: 7,  moduleName: 'Cabinet Notes-Other Ministry',         shipping: 'Not Applicable',vigilance: 'Not Applicable',ports: 'Not Applicable',iwt: 'Not Applicable',admin: 'Not Applicable',coordI: '--',          coordII: '--',          dgll: 'Not Applicable',dev: 'Not Applicable',finance: 'Not Applicable',sagarmala: 'Not Applicable',it: 'Not Applicable',special: 'Not Applicable' },
  { sno: 8,  moduleName: 'Cabinet Notes-MoPSW',                  shipping: '--',            vigilance: '--',           ports: '16-06-2026',  iwt: '--',          admin: '--',          coordI: '--',           coordII: '--',          dgll: '--',           dev: '--',          finance: '--',          sagarmala: '--',       it: '--',  special: '05-03-2026' },
  { sno: 9,  moduleName: 'Audit Para',                           shipping: '--',            vigilance: '--',           ports: '--',          iwt: '--',          admin: '--',          coordI: '--',           coordII: '--',          dgll: '--',           dev: '--',          finance: '--',          sagarmala: '--',       it: '--',  special: '--' },
  { sno: 10, moduleName: 'Bills/PreConstitutions Act',           shipping: '17-03-2025',    vigilance: '--',           ports: '--',          iwt: '--',          admin: '--',          coordI: '--',           coordII: '--',          dgll: '--',           dev: '--',          finance: '--',          sagarmala: '--',       it: '--',  special: '--' },
  { sno: 11, moduleName: 'MOM OF PSW Meetings',                  shipping: '--',            vigilance: '--',           ports: '24-06-2026',  iwt: '--',          admin: '--',          coordI: '27-05-2026',   coordII: '--',          dgll: '--',           dev: '--',          finance: '--',          sagarmala: '--',       it: '--',  special: '--' },
  { sno: 12, moduleName: 'Promotion of Indian Flagged Ships',    shipping: '--',            vigilance: 'Not Applicable',ports: 'Not Applicable',iwt: 'Not Applicable',admin: 'Not Applicable',coordI: 'Not Applicable',coordII: 'Not Applicable',dgll: 'Not Applicable',dev: 'Not Applicable',finance: 'Not Applicable',sagarmala: 'Not Applicable',it: 'Not Applicable',special: 'Not Applicable' },
  { sno: 13, moduleName: 'Parliamentary Issues',                 shipping: '--',            vigilance: '--',           ports: '--',          iwt: '06-12-2024',  admin: '09-03-2026',  coordI: '--',           coordII: '--',          dgll: '--',           dev: '--',          finance: '--',          sagarmala: '--',       it: '--',  special: '24-03-2026' },
  { sno: 14, moduleName: 'Review Items',                         shipping: '--',            vigilance: '--',           ports: '--',          iwt: '--',          admin: '--',          coordI: '--',           coordII: '--',          dgll: '05-01-2026',   dev: '--',          finance: '--',          sagarmala: '--',       it: '--',  special: '--' },
  { sno: 15, moduleName: 'MoPSW Tracker',                        shipping: '--',            vigilance: '--',           ports: '--',          iwt: '--',          admin: '--',          coordI: '--',           coordII: '--',          dgll: '--',           dev: '--',          finance: '--',          sagarmala: '--',       it: '--',  special: '--' },
  { sno: 16, moduleName: 'Expenditure',                          shipping: '--',            vigilance: '--',           ports: '--',          iwt: '--',          admin: '--',          coordI: '--',           coordII: '--',          dgll: '--',           dev: '--',          finance: '--',          sagarmala: '--',       it: '--',  special: '--' },
  { sno: 17, moduleName: 'Foreign Visit',                        shipping: '26-06-2026',    vigilance: 'Not Applicable',ports: 'Not Applicable',iwt: 'Not Applicable',admin: 'Not Applicable',coordI: 'Not Applicable',coordII: 'Not Applicable',dgll: 'Not Applicable',dev: 'Not Applicable',finance: 'Not Applicable',sagarmala: 'Not Applicable',it: 'Not Applicable',special: 'Not Applicable' },
  { sno: 18, moduleName: 'Inter State and Inter Ministerial Issues', shipping: '--',        vigilance: '--',           ports: '--',          iwt: '--',          admin: '--',          coordI: '--',           coordII: '--',          dgll: '--',           dev: '--',          finance: '--',          sagarmala: '--',       it: '--',  special: '--' },
  { sno: 19, moduleName: 'Acts & Rules',                         shipping: '--',            vigilance: '--',           ports: '--',          iwt: '--',          admin: '--',          coordI: '--',           coordII: '--',          dgll: '--',           dev: '--',          finance: '--',          sagarmala: '--',       it: '--',  special: '--' },
];

export default function LandingView({ onNavigate }) {
  const [isFileUploadExpanded, setIsFileUploadExpanded] = useState(true);
  const [isDataEntryExpanded, setIsDataEntryExpanded] = useState(true);
  const [isOrgExpanded, setIsOrgExpanded] = useState(true);
  const fileUploadModules = FILE_UPLOAD_MODULES;
  const rowData = ROW_DATA;

  const DateCellRenderer = (params) => {
    const val = params.value;
    if (!val || val === '--') {
      return <span className="text-slate-400 font-medium select-none">--</span>;
    }
    if (val === 'Not Applicable') {
      return <span className="text-slate-400 font-medium select-none">Not Applicable</span>;
    }
    if (val.includes('-')) {
      const parts = val.split('-');
      const year = parts[2];
      if (year === '2026') {
        return <span className="text-emerald-600 font-bold">{val}</span>;
      } else {
        return <span className="text-rose-600 font-bold">{val}</span>;
      }
    }
    return <span className="text-slate-700 font-semibold">{val}</span>;
  };

  const colDefs = useMemo(() => [
    { headerName: 'S.No', field: 'sno', width: 65, pinned: 'left', cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center border-r border-slate-200' },
    { headerName: 'Module Name', field: 'moduleName', minWidth: 240, pinned: 'left', cellClass: 'font-semibold text-slate-700 flex items-center pl-4 border-r border-slate-200 cursor-pointer hover:text-blue-700' },
    {
      headerName: 'Departments / Wings',
      marryChildren: true,
      children: [
        { headerName: 'Shipping',                    field: 'shipping',   minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
        { headerName: 'Vigilance',                   field: 'vigilance',  minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
        { headerName: 'Ports',                       field: 'ports',      minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
        { headerName: 'IWT',                         field: 'iwt',        minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
        { headerName: 'Administration',              field: 'admin',      minWidth: 130, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
        { headerName: 'Coord-I',                     field: 'coordI',     minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
        { headerName: 'Coord-II',                    field: 'coordII',    minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
        { headerName: 'DGLL, Parliament & TRW',      field: 'dgll',       minWidth: 170, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
        { headerName: 'Development',                 field: 'dev',        minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
        { headerName: 'Finance',                     field: 'finance',    minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
        { headerName: 'Sagarmala',                   field: 'sagarmala',  minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
        { headerName: 'Information Technology',      field: 'it',         minWidth: 160, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
        { headerName: 'Special Initiatives & Proj',  field: 'special',    minWidth: 170, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
      ]
    }
  ], []);

  const handleCardClick = (id) => {
    if (id === 'cpgrams') {
      onNavigate('CPGRAMS');
    } else if (id === 'file-pendency') {
      onNavigate('E Office', 'file-pendency');
    } else if (id === 'receipt-pendency') {
      onNavigate('E Office', 'receipt-pendency');
    } else if (id === 'file-disposal') {
      onNavigate('E Office', 'file-disposal');
    } else if (id === 'attendance') {
      onNavigate('Attendance');
    }
  };

  const handleRowClicked = (event) => {
    const moduleName = event.data.moduleName;
    const routeMap = {
      'Young Professional': 'YP Reports',
      'Consultant Appointment': 'Consultant Reports',
      'VIP Reference': 'VIP Reference',
      'Cabinet Notes-Other Ministry': 'Cabinet Notes - Other Ministries',
      'Cabinet Notes-MoPSW': 'Cabinet Notes - MoPSW',
      'Audit Para': 'Audit Paras',
      'MOM OF PSW Meetings': 'MOM Of PSW Meetings',
      'Promotion of Indian Flagged Ships': 'Flagged Ships / FOB Basis',
      'Parliamentary Issues': 'Parliamentary Issue',
      'Review Items': 'Review Items',
      'MoPSW Tracker': 'Project Milestones',
      'Foreign Visit': 'Foreign Visit',
      'Inter State and Inter Ministerial Issues': 'Inter State & Inter Ministerial',
      'Acts & Rules': 'Acts & Rules'
    };
    const targetTab = routeMap[moduleName];
    if (targetTab) {
      onNavigate(targetTab);
    }
  };

  const chartData = useMemo(() => {
    const wings = ['shipping', 'vigilance', 'ports', 'iwt', 'admin', 'coordI', 'coordII', 'dgll', 'dev', 'finance', 'sagarmala', 'it', 'special'];
    const wingLabels = {
      shipping: 'Shipping',
      vigilance: 'Vigilance',
      ports: 'Ports',
      iwt: 'IWT',
      admin: 'Admin',
      coordI: 'Coord-I',
      coordII: 'Coord-II',
      dgll: 'DGLL',
      dev: 'Dev',
      finance: 'Finance',
      sagarmala: 'Sagarmala',
      it: 'IT',
      special: 'Special'
    };

    return wings.map(w => {
      const activeCount = rowData.filter(row => {
        const val = row[w];
        return val && val !== '--' && val !== 'Not Applicable';
      }).length;
      return {
        wing: wingLabels[w],
        count: activeCount
      };
    });
  }, [rowData]);

  useEffect(() => {
    // ----------------------------------------
    // Chart 1: Module Distribution Donut
    // ----------------------------------------
    let root1 = am5.Root.new("module-distribution-chart");
    root1.setThemes([am5themes_Animated.new(root1)]);

    let chart1 = root1.container.children.push(
      am5percent.PieChart.new(root1, {
        layout: root1.verticalLayout,
        innerRadius: am5.percent(50)
      })
    );

    let series1 = chart1.series.push(
      am5percent.PieSeries.new(root1, {
        valueField: "count",
        categoryField: "type",
        alignLabels: false
      })
    );

    series1.labels.template.setAll({
      maxWidth: 100,
      wrap: true,
      text: "{category}: {value}",
      fontSize: 10,
      fontWeight: "600",
      fill: am5.color(0x334155)
    });

    series1.slices.template.setAll({
      strokeOpacity: 0,
      cornerRadius: 4
    });

    series1.data.setAll([
      { type: "File Upload", count: 5 },
      { type: "Data Entry", count: 14 },
      { type: "Organisation", count: 4 }
    ]);

    // ----------------------------------------
    // Chart 2: Active Modules by Wing Column Chart
    // ----------------------------------------
    let root2 = am5.Root.new("wing-activity-chart");
    root2.setThemes([am5themes_Animated.new(root2)]);

    let chart2 = root2.container.children.push(
      am5xy.XYChart.new(root2, {
        panX: false,
        panY: false,
        wheelX: "none",
        wheelY: "none",
        layout: root2.verticalLayout
      })
    );

    // Create axes
    let xRenderer = am5xy.AxisRendererX.new(root2, {
      minGridDistance: 20
    });
    xRenderer.labels.template.setAll({
      rotation: -45,
      centerY: am5.p50,
      centerX: am5.p100,
      fontSize: 9,
      fontWeight: "600",
      fill: am5.color(0x334155)
    });

    let xAxis = chart2.xAxes.push(
      am5xy.CategoryAxis.new(root2, {
        categoryField: "wing",
        renderer: xRenderer
      })
    );

    xAxis.data.setAll(chartData);

    let yAxis = chart2.yAxes.push(
      am5xy.ValueAxis.new(root2, {
        renderer: am5xy.AxisRendererY.new(root2, {})
      })
    );

    yAxis.get("renderer").labels.template.setAll({
      fontSize: 10,
      fontWeight: "600",
      fill: am5.color(0x334155)
    });

    // Add series
    let series2 = chart2.series.push(
      am5xy.ColumnSeries.new(root2, {
        name: "Active Modules",
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "count",
        categoryXField: "wing"
      })
    );

    series2.columns.template.setAll({
      tooltipText: "{categoryX}: {valueY} active",
      width: am5.percent(70),
      cornerRadiusTL: 4,
      cornerRadiusTR: 4,
      strokeOpacity: 0
    });

    // Theme / color styling to match dashboard colors
    series2.columns.template.adapters.add("fill", (fill, target) => {
      return chart2.get("colors").getIndex(series2.columns.indexOf(target));
    });

    series2.data.setAll(chartData);

    // Make stuff animate on load
    series1.appear(1000, 100);
    series2.appear(1000, 100);
    chart1.appear(1000, 100);
    chart2.appear(1000, 100);

    return () => {
      root1.dispose();
      root2.dispose();
    };
  }, [chartData]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Centered Banner & Hero Image */}
      <div className="space-y-4 mt-2">
        <div className="relative w-full h-48 md:h-60 rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/30 border border-slate-200">
          <img 
            src="/cargo-ship.jpg" 
            alt="Maritime Port Banner" 
            className="w-full h-full object-cover object-center" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-6 text-left">
            <span className="text-[10px] text-cyan-300 font-mono tracking-widest uppercase font-bold">
              Ministry of Ports, Shipping and Waterways
            </span>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase font-display mt-1">
              Data Entry Dashboard
            </h1>
            <p className="text-xs text-slate-200 mt-1 font-medium max-w-xl leading-relaxed">
              Access and manage National maritime database modules, real-time cargo telemetry, and GIGW compliant file submissions.
            </p>
          </div>
        </div>
      </div>

      {/* Action Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5 items-start md:items-center">
        <div className="flex items-center space-x-2 text-slate-800 py-2">
          {/*<span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>*/}
          <span className="font-bold text-l tracking-wider uppercase text-slate-800 font-display select-none">
            Ministry Exclusive Modules
          </span>
        </div>
        
        <div className="flex items-center space-x-3 self-start md:self-auto">
          <button 
            onClick={() => {}}
            className="inline-flex items-center space-x-2 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Data Entry Report</span>
          </button>
          <button 
            onClick={() => {}}
            className="inline-flex items-center space-x-2 px-4.5 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition cursor-pointer"
          >
            <FileText className="h-4 w-4" />
            <span>Data Entry Report as PDF</span>
          </button>
        </div>
      </div>

      {/* Section: Dashboard Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-fade-in">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Module Type Distribution</h3>
          <div id="module-distribution-chart" className="w-full h-64"></div>
        </div>
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Active Data Entry Modules by Wing</h3>
          <div id="wing-activity-chart" className="w-full h-64"></div>
        </div>
      </div>

      {/* Section I: File Upload Modules — Single collapsible container */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Header row: Title + Chevron on one line */}
        <div
          onClick={() => setIsFileUploadExpanded(!isFileUploadExpanded)}
          className="flex items-center justify-between p-5 cursor-pointer select-none hover:bg-blue-100/40 transition-all duration-200"
        >
          {/* Title + Icon */}
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-[#0f417a]/10 rounded-xl border border-[#0f417a]/10">
              <UploadCloud className="h-6 w-6 text-[#0f417a]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
                <span className="text-[10px] text-cyan-700 font-mono tracking-widest uppercase font-black">Section I</span>
              </div>
              <h2 className="text-base font-black text-slate-800 tracking-tight font-display mt-0.5">
                File Upload Modules
              </h2>
            </div>
          </div>
          {/* Chevron toggle */}
          <button
            className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl shadow-sm transition-all duration-300"
            aria-label="Toggle Section"
          >
            {isFileUploadExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* KPI Visualizations — only visible when COLLAPSED */}
        {!isFileUploadExpanded && <FileUploadKPIs />}

        {/* Cards grid — inside the same container */}
        {isFileUploadExpanded && (
          <div className="border-t border-blue-200 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-in">
            {fileUploadModules.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleCardClick(item.id)}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 cursor-pointer transition-all duration-300 select-none"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[11px] font-extrabold text-[#0f417a] font-display">{item.title}</span>
                  <span className="text-[9px] font-bold text-red-500 whitespace-nowrap bg-red-50 px-1.5 py-0.5 rounded-md">{item.date}</span>
                </div>
                <div className="py-4 text-center space-y-2">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.status}</p>
                  <div className="inline-flex items-center justify-center px-4 py-1.5 bg-[#0f417a] text-white text-[11px] font-black rounded-full shadow-sm">
                    {item.badge}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section II: Data Entry Modules — Collapsible KPI card */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50/30 border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

        {/* Header row: Title + Chevron on one line */}
        <div
          onClick={() => setIsDataEntryExpanded(!isDataEntryExpanded)}
          className="flex items-center justify-between p-5 cursor-pointer select-none hover:bg-slate-100/60 transition-all duration-200"
        >
          {/* Title + Icon */}
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-[#0f417a]/10 rounded-xl border border-[#0f417a]/10">
              <FileSpreadsheet className="h-6 w-6 text-[#0f417a]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                <span className="text-[10px] text-indigo-700 font-mono tracking-widest uppercase font-black">Section II</span>
              </div>
              <h2 className="text-base font-black text-slate-800 tracking-tight font-display mt-0.5">
                Data Entry Modules
              </h2>
            </div>
          </div>
          {/* Chevron toggle */}
          <button
            className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl shadow-sm transition-all duration-300"
            aria-label="Toggle Data Entry Section"
          >
            {isDataEntryExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* KPI Visualizations — only visible when COLLAPSED */}
        {!isDataEntryExpanded && <DataEntryKPIs />}

        {/* AG Grid Table — inside same container */}
        {isDataEntryExpanded && (
          <div className="border-t border-slate-200">
            <div className="ag-theme-quartz rounded-b-2xl overflow-x-auto" onWheel={(e) => {
              const vp = e.currentTarget.querySelector('.ag-body-viewport');
              if (vp && vp.scrollWidth > vp.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                vp.scrollLeft += e.deltaY;
                e.preventDefault();
              }
            }}>
              <AgGridReact
                theme="legacy"
                rowData={rowData}
                columnDefs={colDefs}
                domLayout="autoHeight"
                rowHeight={46}
                headerHeight={44}
                onRowClicked={handleRowClicked}
                suppressColumnVirtualisation={true}
                autoSizeStrategy={{ type: 'fitCellContents' }}
                onFirstDataRendered={(params) => {
                  const allCols = params.api.getAllGridColumns();
                  const totalColWidth = allCols.reduce((sum, col) => sum + col.getActualWidth(), 0);
                  const containerWidth = (params.api.getGridBodyViewportElement?.() || params.api.getGridBodyElement?.())?.clientWidth || 0;
                  if (containerWidth > 0 && totalColWidth < containerWidth) {
                    params.api.sizeColumnsToFit();
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Section III: Organisation Exclusive Modules */}
      <div className="bg-gradient-to-r from-amber-50/60 to-orange-50/30 border border-amber-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Header row */}
        <div
          onClick={() => setIsOrgExpanded(!isOrgExpanded)}
          className="flex items-center justify-between p-5 cursor-pointer select-none hover:bg-amber-100/40 transition-all duration-200"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-amber-600/10 rounded-xl border border-amber-200">
              <FileSpreadsheet className="h-6 w-6 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span className="text-[10px] text-amber-700 font-mono tracking-widest uppercase font-black">Section III</span>
              </div>
              <h2 className="text-base font-black text-slate-800 tracking-tight font-display mt-0.5">
                Organisation Exclusive Modules
              </h2>
            </div>
          </div>
          <button
            className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl shadow-sm transition-all duration-300"
            aria-label="Toggle Organisation Section"
          >
            {isOrgExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* KPI Visualizations — only when COLLAPSED */}
        {!isOrgExpanded && <OrgKPIs />}

        {/* Org AG Grid Table */}
        {isOrgExpanded && (
          <div className="border-t border-amber-200">
            <div className="ag-theme-quartz rounded-b-2xl overflow-x-auto" onWheel={(e) => {
              const vp = e.currentTarget.querySelector('.ag-body-viewport');
              if (vp && vp.scrollWidth > vp.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                vp.scrollLeft += e.deltaY; e.preventDefault();
              }
            }}>
              <AgGridReact
                theme="legacy"
                rowData={[
                  { sno: 17, module: 'Projects',      alhw: '25-06-2026', cpa: '30-06-2026', cochin: '01-07-2026', csl: '15-06-2026', dpa: '27-06-2026', dgll: '12-06-2026', dgs: '17-06-2026', dci: '13-04-2026', ipgl: '-', imu: '13-01-2025', ipa: '-', iprc: '-', iwai: '18-12-2024', jnpa: '29-06-2026', kpl: '18-06-2026', mpa2: '30-06-2026', mbpa: '01-07-2026', nmpa: '01-07-2026', paradip: '30-06-2026', sfc: '-', sci: '11-06-2026', smpa_hdc: '01-07-2026', smpa_kds: '30-06-2026', tamp: '-', voc: '26-06-2026', vizag: '30-06-2026' },
                  { sno: 18, module: 'CSR Projects',  alhw: '-', cpa: '28-02-2025', cochin: '09-03-2026', csl: '-', dpa: '01-06-2026', dgll: '-', dgs: '-', dci: '-', ipgl: '-', imu: '-', ipa: '-', iprc: '-', iwai: '-', jnpa: '15-06-2026', kpl: '19-01-2026', mpa2: '04-06-2026', mbpa: '24-02-2025', nmpa: '11-06-2026', paradip: '15-06-2026', sfc: '-', sci: '10-06-2026', smpa_hdc: '-', smpa_kds: '24-06-2026', tamp: '-', voc: '09-06-2026', vizag: '25-06-2026' },
                  { sno: 19, module: 'HR Management', alhw: '03-06-2026', cpa: '19-06-2026', cochin: '05-06-2026', csl: '02-06-2026', dpa: '10-06-2026', dgll: '22-09-2025', dgs: '10-06-2026', dci: '05-06-2026', ipgl: '-', imu: '04-06-2026', ipa: '15-05-2026', iprc: '14-11-2025', iwai: '01-08-2025', jnpa: '19-06-2026', kpl: '25-05-2026', mpa2: '25-06-2026', mbpa: '11-06-2026', nmpa: '11-06-2026', paradip: '23-05-2026', sfc: '10-04-2026', sci: '09-06-2026', smpa_hdc: '17-06-2026', smpa_kds: '10-06-2026', tamp: '-', voc: '25-06-2026', vizag: '30-06-2026' },
                  { sno: 20, module: 'Court Cases',   alhw: '25-06-2026', cpa: '12-06-2026', cochin: '23-06-2026', csl: '05-06-2026', dpa: '29-06-2026', dgll: '09-06-2026', dgs: '01-07-2026', dci: '09-03-2026', ipgl: '-', imu: '27-05-2026', ipa: '-', iprc: '19-05-2026', iwai: '14-05-2026', jnpa: '04-03-2026', kpl: '12-06-2026', mpa2: '05-06-2026', mbpa: '03-07-2025', nmpa: '27-05-2026', paradip: '12-06-2026', sfc: '-', sci: '26-06-2026', smpa_hdc: '19-06-2026', smpa_kds: '01-07-2026', tamp: '02-12-2025', voc: '01-07-2026', vizag: '19-05-2026' },
                ]}
                columnDefs={[
                  { headerName: 'S.No',    field: 'sno',       width: 65,   pinned: 'left', cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center border-r border-slate-200' },
                  { headerName: 'Module',  field: 'module',    minWidth: 160, pinned: 'left', cellClass: 'font-semibold text-slate-700 flex items-center pl-4 border-r border-slate-200' },
                  { headerName: 'Organisations', marryChildren: true, children: [
                    { headerName: 'ALHW',         field: 'alhw',      minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'Chennai PA',   field: 'cpa',       minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'Cochin PA',    field: 'cochin',    minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'CSL',          field: 'csl',       minWidth: 100, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'Deendayal PA', field: 'dpa',       minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'DGLL',         field: 'dgll',      minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'DGS',          field: 'dgs',       minWidth: 100, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'DCI',          field: 'dci',       minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'IPGL',         field: 'ipgl',      minWidth: 100, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'IMU',          field: 'imu',       minWidth: 100, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'IPA',          field: 'ipa',       minWidth: 100, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'IPRC',         field: 'iprc',      minWidth: 100, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'IWAI',         field: 'iwai',      minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'JNPA',         field: 'jnpa',      minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'Kamarajar PL', field: 'kpl',       minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'Mormugao PA',  field: 'mpa2',      minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'Mumbai PA',    field: 'mbpa',      minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'New Mang PA',  field: 'nmpa',      minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'Paradip PA',   field: 'paradip',   minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'SFC',          field: 'sfc',       minWidth: 100, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'SCI',          field: 'sci',       minWidth: 100, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'SMPA-HDC',     field: 'smpa_hdc',  minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'SMPA-KDS',     field: 'smpa_kds',  minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'TAMP',         field: 'tamp',      minWidth: 100, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'VOC PA',       field: 'voc',       minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                    { headerName: 'Vizag PA',     field: 'vizag',     minWidth: 110, cellClass: 'text-center flex items-center justify-center border-r border-slate-100', cellRenderer: DateCellRenderer },
                  ]},
                ]}
                domLayout="autoHeight"
                rowHeight={46}
                headerHeight={44}
                suppressColumnVirtualisation={true}
                autoSizeStrategy={{ type: 'fitCellContents' }}
                onFirstDataRendered={(params) => {
                  const allCols = params.api.getAllGridColumns();
                  const totalColWidth = allCols.reduce((sum, col) => sum + col.getActualWidth(), 0);
                  const containerWidth = (params.api.getGridBodyViewportElement?.() || params.api.getGridBodyElement?.())?.clientWidth || 0;
                  if (containerWidth > 0 && totalColWidth < containerWidth) params.api.sizeColumnsToFit();
                }}
              />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
