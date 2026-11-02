import { ArrowLeft, BookOpen, Users, IndianRupee, MapPin, Globe, Award } from 'lucide-react';
import Table from '../../../../../components/Table';
import { HrColumnPicker, HrCopyExport, HrRowsSelect, HrSearchBox, HrTotalBadge } from '../../../components/HrListToolbar';
import { formatDateYYYYMMDD, formatExpenditureInLakh, getParticipantCount } from '../trainingConfig';

// One training: its details and the participant table (opened from the training list)
export default function ParticipantsView({ activeParticipantColumnDefs, exportPage, filteredParticipants, organisationName, participantExportColumns, participantLoading, participantPage, participantPageSize, participantSearchTerm, participantVisibleCols, selectedTrainingForParticipants, setParticipantPage, setParticipantPageSize, setParticipantSearchTerm, setParticipantVisibleCols, setSelectedTrainingForParticipants, trackPage, trainingFullDetails }) {
  // Dynamic fields extracted directly from selected row and API details
  const trainingTitle =
    trainingFullDetails?.TITLE ||
    trainingFullDetails?.Title ||
    selectedTrainingForParticipants['Title'] ||
    selectedTrainingForParticipants['Training Title'] ||
    selectedTrainingForParticipants['TRAINING TITLE'] ||
    selectedTrainingForParticipants.title ||
    '-';

  const trainingType =
    trainingFullDetails?.TRAINING_TYPE_NAME ||
    trainingFullDetails?.['Training Type'] ||
    selectedTrainingForParticipants['Training Type'] ||
    selectedTrainingForParticipants['TRAINING TYPE'] ||
    selectedTrainingForParticipants.training_type ||
    '-';

  const fromDateRaw =
    trainingFullDetails?.from_date ||
    selectedTrainingForParticipants['From date'] ||
    selectedTrainingForParticipants['From Date'] ||
    selectedTrainingForParticipants['FROM DATE'] ||
    selectedTrainingForParticipants.from_date;

  const toDateRaw =
    trainingFullDetails?.to_date ||
    selectedTrainingForParticipants['To date'] ||
    selectedTrainingForParticipants['To Date'] ||
    selectedTrainingForParticipants['TO DATE'] ||
    selectedTrainingForParticipants.to_date;

  const fromDateFormatted = formatDateYYYYMMDD(fromDateRaw);
  const toDateFormatted = formatDateYYYYMMDD(toDateRaw);

  const trainingSource =
    trainingFullDetails?.training_source ||
    selectedTrainingForParticipants['Training Source'] ||
    selectedTrainingForParticipants.training_source ||
    '-';

  const outsideAgencyName =
    trainingFullDetails?.outside_agency_name ||
    selectedTrainingForParticipants['Outside Agency name'] ||
    selectedTrainingForParticipants.outside_agency_name ||
    '-';

  const country =
    trainingFullDetails?.country_name ||
    trainingFullDetails?.country ||
    selectedTrainingForParticipants['Country'] ||
    selectedTrainingForParticipants.country ||
    'India';

  const location =
    trainingFullDetails?.location ||
    selectedTrainingForParticipants['Location'] ||
    selectedTrainingForParticipants.location ||
    '-';

  const expenditureInLakh = formatExpenditureInLakh(
    trainingFullDetails?.expenditure ??
    selectedTrainingForParticipants['Expenditure'] ??
    selectedTrainingForParticipants['Expenditure (In Lakh)'] ??
    selectedTrainingForParticipants.expenditure
  );

  const participantCount =
selectedTrainingForParticipants?.NO_OF_PARTICIPANTS !== null &&
selectedTrainingForParticipants?.NO_OF_PARTICIPANTS !== undefined
  ? getParticipantCount(selectedTrainingForParticipants)
  : getParticipantCount(trainingFullDetails);
  const participantExport = {
    rows: filteredParticipants, page: participantPage, size: participantPageSize, columns: participantExportColumns,
    title: `${trainingTitle} - Participant Details`, fileName: `${trainingTitle.replace(/\s+/g, '_')}_Participants`,
    label: 'Participants', busy: participantLoading,
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100 pb-6">

      {/* ONE Combined Main Content Card for Training Data & Participant Details */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">

        {/* 1. Header Bar with Back Navigation */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <button
              type="button"
              onClick={() => setSelectedTrainingForParticipants(null)}
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
              title="Back to Trainings"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg md:text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide font-display flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-[#0f417a] dark:text-blue-400" />
                  <span>Training Details</span>
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {organisationName}
                </span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {trainingType}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                {trainingTitle} &bull; Schedule: {fromDateFormatted} to {toDateFormatted}
              </p>
            </div>
          </div>

          {/* Telemetry Chips & Back Button */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 text-xs">
              <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Participants:</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-300">{participantCount} Personnel</span>
            </div>
            {expenditureInLakh !== '-' && (
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 text-xs">
                <IndianRupee className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Exp:</span>
                <span className="font-extrabold text-amber-600 dark:text-amber-300">₹ {expenditureInLakh} L</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setSelectedTrainingForParticipants(null)}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition cursor-pointer flex items-center space-x-1.5"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Back to Trainings</span>
            </button>
          </div>
        </div>

        {/* 2. Training Data Details Grid */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
              <Award className="h-4 w-4" />
              <span>Training Program Information</span>
            </h3>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Specifications & Parameters
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

            {/* Training Type */}
            <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Training Type <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                {trainingType}
              </div>
            </div>

            {/* Training Title */}
            <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm sm:col-span-2 flex flex-col justify-between">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Training Title <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="text-xs font-extrabold text-[#0f417a] dark:text-blue-400">
                {trainingTitle}
              </div>
            </div>

            {/* Expenditure (In Lakh) */}
            <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Expenditure (In Lakh) <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                {expenditureInLakh !== '-' ? `₹ ${expenditureInLakh} L` : '-'}
              </div>
            </div>

            {/* From Date */}
            <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                From Date <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                {fromDateFormatted}
              </div>
            </div>

            {/* To Date */}
            <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                To Date <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                {toDateFormatted}
              </div>
            </div>

            {/* Training Source */}
            <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Training Source <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                {trainingSource}
              </div>
            </div>

            {/* Name of Agency */}
            <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Name of Agency <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate" title={outsideAgencyName}>
                {outsideAgencyName}
              </div>
            </div>

            {/* Country */}
            <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Globe className="h-3 w-3 text-slate-400" />
                <span>Country <span className="text-rose-500 font-bold">*</span></span>
              </label>
              <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                {country}
              </div>
            </div>

            {/* Location */}
            <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-400" />
                <span>Location <span className="text-rose-500 font-bold">*</span></span>
              </label>
              <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                {location}
              </div>
            </div>

          </div>
        </div>

        {/* 3. Participant Details Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col lg:flex-row lg:items-center justify-between gap-4">

          {/* Left: Participant Details Heading & Show Entries */}
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
              <span>Participant Details</span>
            </h3>

            <HrRowsSelect value={participantPageSize} onChange={setParticipantPageSize} />
            <HrTotalBadge count={filteredParticipants.length} />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 justify-end">
            <HrSearchBox placeholder="Search participant..." value={participantSearchTerm} onChange={setParticipantSearchTerm} />
            <HrColumnPicker
              capitalize
              label="Column visibility"
              columns={Object.keys(participantVisibleCols).map(col => ({ key: col, label: col, visible: participantVisibleCols[col] }))}
              onToggle={(col) => setParticipantVisibleCols(prev => ({ ...prev, [col]: !prev[col] }))}
            />
            <HrCopyExport
              onCopy={() => exportPage('copy', participantExport)}
              onExcel={() => exportPage('excel', participantExport)}
              onPdf={() => exportPage('pdf', participantExport)}
            />
          </div>
        </div>

        {/* 4. Participant Dynamic Table Area */}
        <div className="ag-theme-quartz module-datalist-grid w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm dark:border-slate-800">
          <Table
            rowData={filteredParticipants}
            onPaginationChanged={trackPage(setParticipantPage)}
            columnDefs={activeParticipantColumnDefs}
            loading={participantLoading}
            pagination={true}
            paginationPageSize={participantPageSize}
            defaultColDef={{
              minWidth: 120,
              flex: 1,
              filter: true,
              sortable: true,
              resizable: true,
            }}
          />
        </div>

      </div>

    </div>
  );
}
