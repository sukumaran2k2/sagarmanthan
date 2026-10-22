import React, { useState, useEffect, useRef, useMemo } from 'react';
import { axiosInstance as axios } from '../../../api';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  X, 
  Loader2, 
  AlertCircle,
  Building2,
  Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../../../config/api';
import { 
  getCurrentUserId, 
  getSessionOrganisationId, 
  getSessionOrganisationName 
} from '../../../utils/authSession';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const TEMPLATE_HEADERS = [
  'Department',
  'Post ID',
  'Post Name',
  'Class',
  'Vacant or filled',
  'Date of Arise in Vacancy',
  'Employee Joining Date',
  'Name of Employee',
  'Should this post be expempted from Abolishment?',
  'Staff Reference ID / Personnel Number',
  'Aadhar Number',
  'Gender',
  'Domicile State',
  'Community',
  'Religion',
  'Date of Birth',
  'Date of Retirement',
  'Whether PwBD?',
  'Whether Ex-Serviceman Personnal?',
  'Payscale Range'
];

export default function NonPortMonthlyUploadForm({ triggerNotification, onCancel }) {
  const currentOrgId = getSessionOrganisationId() || 20;
  const currentOrgName = getSessionOrganisationName() || 'Non-Port Organisation';
  const currentUserId = getCurrentUserId() || 1;

  const currentYear = new Date().getFullYear();
  const currentMonth = MONTH_NAMES[new Date().getMonth()];

  const [uploadYear, setUploadYear] = useState(String(currentYear));
  const [uploadMonth, setUploadMonth] = useState(currentMonth);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [lastUploadDate, setLastUploadDate] = useState(null);
  const fileInputRef = useRef(null);

  // Year options: past 4 years to next 2 years
  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = currentYear + 1; y >= currentYear - 4; y--) {
      years.push(String(y));
    }
    return years;
  }, [currentYear]);

  // Fetch last upload date
  useEffect(() => {
    let isMounted = true;
    const fetchLastUpload = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/get-last-upload-date-by-org/${currentOrgId}`);
        if (isMounted && res.data?.lastUploadDate) {
          setLastUploadDate(res.data.lastUploadDate);
        }
      } catch (err) {
        // Optional info, ignore error
      }
    };
    fetchLastUpload();
    return () => { isMounted = false; };
  }, [currentOrgId]);

  const notify = (msg, type = 'success') => {
    if (triggerNotification) {
      triggerNotification(msg, type);
    } else {
      alert(msg);
    }
  };

  // Download Excel Template
  const handleDownloadTemplate = () => {
    try {
      const sampleRow = {
        'Department': 'Mechanical / Operations',
        'Post ID': 'CSL-01',
        'Post Name': 'Manager (Technical)',
        'Class': 'Class I',
        'Vacant or filled': 'filled',
        'Date of Arise in Vacancy': '2023-01-15',
        'Employee Joining Date': '2020-04-01',
        'Name of Employee': 'Rajesh Kumar',
        'Should this post be expempted from Abolishment?': 'No',
        'Staff Reference ID / Personnel Number': 'EMP10023',
        'Aadhar Number': 'XXXX-XXXX-1234',
        'Gender': 'Male',
        'Domicile State': 'Kerala',
        'Community': 'OBC',
        'Religion': 'Hindu',
        'Date of Birth': '1985-06-20',
        'Date of Retirement': '2045-06-30',
        'Whether PwBD?': 'No',
        'Whether Ex-Serviceman Personnal?': 'No',
        'Payscale Range': '60000-180000'
      };

      const ws = XLSX.utils.json_to_sheet([sampleRow], { header: TEMPLATE_HEADERS });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Vacancy_Template');
      ws['!cols'] = TEMPLATE_HEADERS.map(h => ({ wch: Math.max(h.length + 4, 16) }));

      XLSX.writeFile(wb, 'Non_Port_Vacancy_Details_Template.xlsx');
      notify('Template downloaded successfully!', 'success');
    } catch (err) {
      console.error('Template Download Error:', err);
      notify('Failed to generate template', 'error');
    }
  };

  const handleFileChange = (file) => {
    if (!file) return;
    const validExtensions = ['.xlsx', '.xls'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(fileExt)) {
      notify('Please select an Excel file (.xlsx or .xls)', 'warning');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      notify('File size exceeds 10MB limit', 'warning');
      return;
    }
    setSelectedFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploadYear(String(currentYear));
    setUploadMonth(currentMonth);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      notify('Please select an Excel file to upload', 'warning');
      return;
    }
    if (!uploadYear || !uploadMonth) {
      notify('Please select both Year and Month', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('financialYear', uploadYear);
    formData.append('month', uploadMonth);
    formData.append('userID', currentUserId);
    formData.append('organisationID', currentOrgId);

    setUploading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/upload-vacany-details-file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      notify(res.data?.message || 'Vacancy details Excel uploaded successfully!', 'success');
      handleReset();
    } catch (err) {
      console.error('Upload Error:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to upload vacancy details file';
      notify(errMsg, 'error');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Meta Bar: Organisation Context + Download Template */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-[#0f417a] dark:text-blue-300 rounded-lg">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Organisation
            </div>
            <div className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
              {currentOrgName}
            </div>
          </div>
          {lastUploadDate && (
            <div className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-200 dark:border-slate-700 text-xs text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Last Upload: <strong>{lastUploadDate}</strong></span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg shadow-2xs transition cursor-pointer"
        >
          <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Download Excel Template</span>
        </button>
      </div>

      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Year and Month Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Financial Year <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={uploadYear}
                onChange={(e) => setUploadYear(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#0f417a] font-medium"
              >
                <option value="">-- Select Year --</option>
                {yearOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Month <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={uploadMonth}
                onChange={(e) => setUploadMonth(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#0f417a] font-medium"
              >
                <option value="">-- Select Month --</option>
                {MONTH_NAMES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* File Dropzone */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Select Vacancy Excel File <span className="text-rose-500">*</span>
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            onChange={(e) => handleFileChange(e.target.files[0])}
            className="hidden"
          />

          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragOver 
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' 
                  : 'border-slate-300 dark:border-slate-700 hover:border-[#0f417a] dark:hover:border-blue-400 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="p-3.5 bg-blue-50 dark:bg-slate-700 rounded-full text-[#0f417a] dark:text-blue-400">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Click to browse or drag and drop your file here
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Accepts Microsoft Excel files (.xlsx, .xls) up to 10MB
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-lg">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span>{selectedFile.name}</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {formatFileSize(selectedFile.size)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
                title="Remove file"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Instructions Card */}
        <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-slate-600 dark:text-slate-300 space-y-2">
          <div className="font-bold text-[#0f417a] dark:text-blue-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>Upload Guidelines:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 pl-1">
            <li>Ensure the column structure precisely matches the official downloaded template.</li>
            <li>All dates must follow standard <code className="bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700">YYYY-MM-DD</code> format.</li>
            <li>Uploading a file for the same Year and Month will update existing monthly vacancy records for your organisation.</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="submit"
            disabled={uploading || !selectedFile}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white text-sm font-bold rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload Excel</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={uploading}
            className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-lg transition cursor-pointer"
          >
            Reset
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={uploading}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-lg transition cursor-pointer"
            >
              Exit
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
