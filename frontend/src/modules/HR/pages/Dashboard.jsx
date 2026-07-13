import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Users, 
  CheckCircle, 
  FileText, 
  UserX, 
  LayoutDashboard,
  Filter,
  BarChart2 as ChartIcon,
  Table as TableIcon
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import PageBanner from '../../../components/PageBanner';
import Table from '../../../components/Table';

const COLORS = ['#0f417a', '#2ECC71', '#F1C40F', '#E74C3C', '#9b59b6', '#34495e', '#1abc9c', '#e67e22', '#3498db'];

export default function Dashboard() {
  const [organisations, setOrganisations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('55'); // Default to 55 (Haldia Dock Complex)
  const [loading, setLoading] = useState(true);

  // Switch modes for each section individually
  const [empViewMode, setEmpViewMode] = useState('visualization'); // 'visualization' | 'table'
  const [vacViewMode, setVacViewMode] = useState('visualization'); // 'visualization' | 'table'

  const [stats, setStats] = useState({
    sanctioned: 0,
    filled: 0,
    vacant: 0,
    abolished: 0
  });

  const [genderData, setGenderData] = useState([]);
  const [exServiceData, setExServiceData] = useState([]);
  const [disabilityData, setDisabilityData] = useState([]);
  const [communityData, setCommunityData] = useState([]);
  const [vacancyAnalytics, setVacancyAnalytics] = useState([]);

  // Load organisations list
  useEffect(() => {
    axios.get("http://localhost:3000/mmt-dropdown/mmt_organisation")
      .then(res => setOrganisations(res.data || []))
      .catch(err => console.error("Error loading organisations:", err));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedOrg) return;
      try {
        setLoading(true);

        // Fetch Dashboard Content (KPI Stats)
        const dashboardRes = await axios.get(`http://localhost:3000/get-admin-hr-dashboard-content/1/${selectedOrg}`);
        if (dashboardRes.data) {
          const totals = dashboardRes.data.clusterTotals || dashboardRes.data.combinedTotals;
          if (totals) {
            const sanctionedStrength = totals.totalSanctionedAndFilledPost?.total_sanctioned_strength ?? totals.totalSanctionedAndFilledPost ?? 0;
            const filledPost = totals.totalSanctionedAndFilledPost?.filled_post ?? totals.filled_post ?? 0;
            const liveVacantPost = totals.totalLiveVacantPost?.totalLiveVacantPost ?? totals.totalLiveVacantPost ?? 0;
            const abolishedVacantPost = totals.totalAbolishedVacantPost?.totalAbolishedVacantPost ?? totals.totalAbolishedVacantPost ?? 0;

            setStats({
              sanctioned: typeof sanctionedStrength === 'object' ? 0 : sanctionedStrength,
              filled: typeof filledPost === 'object' ? 0 : filledPost,
              vacant: typeof liveVacantPost === 'object' ? 0 : liveVacantPost,
              abolished: typeof abolishedVacantPost === 'object' ? 0 : abolishedVacantPost
            });
          }
        }

        // Fetch Gender Analytics
        const genderRes = await axios.get(`http://localhost:3000/get-gender-wise-cont-by-org/1/${selectedOrg}`);
        if (genderRes.data) {
          const list = genderRes.data.value || genderRes.data || [];
          setGenderData(list.map((item) => ({
            name: item.emp_gender || 'Not Specified',
            value: parseFloat(item.count_of_emp) || 0
          })));
        }

        // Fetch Ex-Service Status
        const exServiceRes = await axios.get(`http://localhost:3000/get-experienced-emp-count/1/${selectedOrg}`);
        if (exServiceRes.data) {
          const list = exServiceRes.data.value || exServiceRes.data || [];
          // Group ex-service vs non ex-service counts
          const groups = {};
          list.forEach(item => {
            const statusKey = item.ex_service_or_not === 1 ? 'Ex-service' : 'Non Ex-service';
            groups[statusKey] = (groups[statusKey] || 0) + (item.emp_count || 0);
          });
          setExServiceData(Object.entries(groups).map(([name, value]) => ({ name, value })));
        }

        // Fetch Disability Data
        const disabilityRes = await axios.get(`http://localhost:3000/get-pwbd-wise-count/1/${selectedOrg}`);
        if (disabilityRes.data) {
          const list = disabilityRes.data.value || disabilityRes.data || [];
          setDisabilityData(list.map(item => ({
            name: item.emp_disability || 'No Disability',
            value: parseFloat(item.total_count) || 0
          })));
        }

        // Fetch Community Data
        const communityRes = await axios.get(`http://localhost:3000/get-community-wise-count-by-org/1/${selectedOrg}`);
        if (communityRes.data) {
          const list = communityRes.data.value || communityRes.data || [];
          if (list.length) {
            const item = list[0];
            setCommunityData([
              { name: 'UR', value: item.ur_count || 0 },
              { name: 'OBC', value: item.obc_count || item.ob_count || 0 },
              { name: 'SC', value: item.sc_count || 0 },
              { name: 'ST', value: item.st_count || 0 },
              { name: 'EWS', value: item.ews_count || 0 }
            ]);
          }
        }

        // Fetch Vacancy Analytics
        const vacancyRes = await axios.get(`http://localhost:3000/get-department-wise-post-status/1/${selectedOrg}`);
        if (vacancyRes.data) {
          const list = vacancyRes.data.value || vacancyRes.data || [];
          setVacancyAnalytics(list.map(item => ({
            department: item.department_name || 'General',
            sanctioned: item.total_sanctioned_strength || 0,
            filled: item.filled_post || 0,
            vacant: item.totalLivePost || 0,
            abolished: item.totalAbolishedPost || 0
          })));
        }
      } catch (err) {
        console.error("Error loading HR dashboard analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedOrg]);

  // Column definitions for the tables using the common Table component
  const demographicColDefs = useMemo(() => [
    { field: 'name', headerName: 'Classification / Metric', minWidth: 150, pinned: 'left', cellClass: 'font-bold text-slate-800' },
    { field: 'value', headerName: 'Total Count', minWidth: 120, cellClass: 'text-right font-bold text-blue-700' }
  ], []);

  const vacancyColDefs = useMemo(() => [
    { field: 'department', headerName: 'Department', minWidth: 180, pinned: 'left', cellClass: 'font-semibold text-slate-900' },
    { field: 'sanctioned', headerName: 'Sanctioned Strength', minWidth: 140, cellClass: 'text-right font-bold' },
    { field: 'filled', headerName: 'Filled Posts', minWidth: 130, cellClass: 'text-right font-bold text-emerald-600' },
    { field: 'vacant', headerName: 'Live Vacancies', minWidth: 130, cellClass: 'text-right font-bold text-blue-600' },
    { field: 'abolished', headerName: 'Abolished Posts', minWidth: 130, cellClass: 'text-right font-bold text-rose-600' }
  ], []);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageBanner 
        title="HR Dashboard" 
        description="Comprehensive demographic breakdowns, sanctioned strength, and vacancy status across MoPSW."
        icon={LayoutDashboard}
      />

      {/* Organisation Selection Row */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <span className="text-sm font-bold text-slate-800 font-display">Target Organisation</span>
        <div className="relative min-w-[240px]">
          <select
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
            className="w-full text-xs pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-105 font-bold text-slate-700 cursor-pointer"
          >
            <option value="">--Select Organisation--</option>
            {organisations.map(o => (
              <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>
            ))}
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <Filter className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Sanctioned Strength */}
        <div className="bg-[#fff9e6] border border-[#f5e4bd] rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-amber-800">
              <Users className="h-4.5 w-4.5" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Sanctioned Strength</span>
            </div>
          </div>
          <div className="bg-[#fbd38d] border border-[#f6ad55] text-amber-950 font-black text-xl px-5 py-2.5 rounded-lg shadow-inner min-w-[90px] text-center">
            {stats.sanctioned}
          </div>
        </div>

        {/* Card 2: Total Filled Posts */}
        <div className="bg-[#e6f4ea] border border-[#bbf7d0] rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-emerald-800">
              <CheckCircle className="h-4.5 w-4.5" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Total Filled Posts</span>
            </div>
          </div>
          <div className="bg-[#a7f3d0] border border-[#34d399] text-emerald-950 font-black text-xl px-5 py-2.5 rounded-lg shadow-inner min-w-[90px] text-center">
            {stats.filled}
          </div>
        </div>

        {/* Card 3: Live Vacant Posts */}
        <div className="bg-[#ebf8ff] border border-[#bee3f8] rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-blue-800">
              <FileText className="h-4.5 w-4.5" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Live Vacant Posts</span>
            </div>
          </div>
          <div className="bg-[#90cdf4] border border-[#63b3ed] text-blue-950 font-black text-xl px-5 py-2.5 rounded-lg shadow-inner min-w-[90px] text-center">
            {stats.vacant}
          </div>
        </div>

        {/* Card 4: Abolished Vacant Posts */}
        <div className="bg-[#fff5f5] border border-[#fed7d7] rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-rose-800">
              <UserX className="h-4.5 w-4.5" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Abolished Vacant Posts</span>
            </div>
          </div>
          <div className="bg-[#feb2b2] border border-[#fc8181] text-rose-950 font-black text-xl px-5 py-2.5 rounded-lg shadow-inner min-w-[90px] text-center">
            {stats.abolished}
          </div>
        </div>
      </div>

      {/* SECTION 1: EMPLOYEE ANALYTICS */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="text-sm font-extrabold text-slate-800 tracking-tight uppercase">Employee Analytics</h3>
          
          {/* Switcher matching Landing.jsx design pattern */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setEmpViewMode('visualization')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                empViewMode === 'visualization'
                  ? 'bg-[#0f417a] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Visualization View"
            >
              <ChartIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setEmpViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                empViewMode === 'table'
                  ? 'bg-[#0f417a] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table Report View"
            >
              <TableIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {empViewMode === 'visualization' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gender Pie Chart */}
            <div className="border border-slate-100 rounded-xl p-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gender Distribution</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, value }) => `${name} (${value})`}
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ex-Service Pie Chart */}
            <div className="border border-slate-100 rounded-xl p-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ex-Service Status</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={exServiceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={0}
                      outerRadius={75}
                      dataKey="value"
                      label={({ name, value }) => `${name} (${value})`}
                    >
                      {exServiceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Disability Pie Chart */}
            <div className="border border-slate-100 rounded-xl p-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Employee Disability Breakdowns</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={disabilityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, value }) => `${name} (${value})`}
                    >
                      {disabilityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 5) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Community Bar Chart */}
            <div className="border border-slate-100 rounded-xl p-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Community Analytics</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={communityData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0f417a" radius={[4, 4, 0, 0]}>
                      {communityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gender Table */}
            <div className="border border-slate-100 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gender Distribution</h4>
              <Table 
                rowData={genderData} 
                columnDefs={demographicColDefs} 
                pagination={false} 
                enableExport={true}
                exportFileName="Gender_Distribution_Report"
                exportPdfTitle="Gender Distribution Data"
              />
            </div>

            {/* Ex-Service Table */}
            <div className="border border-slate-100 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ex-Service Status</h4>
              <Table 
                rowData={exServiceData} 
                columnDefs={demographicColDefs} 
                pagination={false} 
                enableExport={true}
                exportFileName="ExService_Status_Report"
                exportPdfTitle="Ex-Service Status Data"
              />
            </div>

            {/* Disability Table */}
            <div className="border border-slate-100 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Disability Classification</h4>
              <Table 
                rowData={disabilityData} 
                columnDefs={demographicColDefs} 
                pagination={false} 
                enableExport={true}
                exportFileName="Disability_Classification_Report"
                exportPdfTitle="Disability Classification Data"
              />
            </div>

            {/* Community Table */}
            <div className="border border-slate-100 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Community Demographics</h4>
              <Table 
                rowData={communityData} 
                columnDefs={demographicColDefs} 
                pagination={false} 
                enableExport={true}
                exportFileName="Community_Demographics_Report"
                exportPdfTitle="Community Demographics Data"
              />
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: VACANCY ANALYTICS */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="text-sm font-extrabold text-slate-800 tracking-tight uppercase">Vacancy Analytics</h3>
          
          {/* Switcher matching Landing.jsx design pattern */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setVacViewMode('visualization')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                vacViewMode === 'visualization'
                  ? 'bg-[#0f417a] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Visualization View"
            >
              <ChartIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setVacViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                vacViewMode === 'table'
                  ? 'bg-[#0f417a] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table Report View"
            >
              <TableIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {vacViewMode === 'visualization' ? (
          <div className="border border-slate-100 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Department-wise Strength & Vacancies Chart</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vacancyAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sanctioned" fill="#F1C40F" name="Sanctioned Strength" />
                  <Bar dataKey="filled" fill="#2ECC71" name="Filled Posts" />
                  <Bar dataKey="vacant" fill="#3498db" name="Live Vacancies" />
                  <Bar dataKey="abolished" fill="#E74C3C" name="Abolished Posts" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="border border-slate-100 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Department-wise Strength & Vacancies</h4>
            <Table 
              rowData={vacancyAnalytics} 
              columnDefs={vacancyColDefs} 
              pagination={true}
              paginationPageSize={10} 
              enableExport={true}
              exportFileName="Department_Vacancy_Analytics_Report"
              exportPdfTitle="Department-wise Post Status Report"
              defaultColDef={{
                minWidth: 120,
                flex: 1,
                filter: true,
                sortable: true,
                resizable: true,
                suppressSizeToFit: false
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
