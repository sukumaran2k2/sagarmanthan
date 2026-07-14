import React, { useState, useMemo, useEffect } from 'react';
import { Plus, X, Calendar } from 'lucide-react';
import FormField from '../../components/FormField';

export default function ReferenceForm({
  editingRef,
  onClose,
  onSave,
  wings = [],
  divisions = [],
  statusSteps = {}
}) {
  const [formSubject, setFormSubject] = useState('');
  const [formEofficeFile, setFormEofficeFile] = useState('');
  const [formWing, setFormWing] = useState('');
  const [formDivision, setFormDivision] = useState('');
  const [formRefNumber, setFormRefNumber] = useState('');
  const [formReceivedFrom, setFormReceivedFrom] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formStatusSteps, setFormStatusSteps] = useState({
    1: 'Yes', 2: 'No', 3: 'No', 4: 'No', 5: 'No', 6: 'No'
  });
  const [formStatusDates, setFormStatusDates] = useState({});

  // Initialize form fields on edit mode or add mode
  useEffect(() => {
    if (editingRef) {
      setFormSubject(editingRef.subject || '');
      setFormEofficeFile(editingRef.eofficeFile || '');
      setFormWing(editingRef.wing || '');
      setFormDivision(editingRef.division || '');
      setFormRefNumber(editingRef.refNumber || '');
      setFormReceivedFrom(editingRef.receivedFrom || '');
      setFormRemarks(editingRef.remarks || '');
      setFormDeadline(editingRef.deadline || '');
      setFormStatusSteps({ ...editingRef.statusSteps });
      setFormStatusDates(editingRef.statusDates || {});
    } else {
      setFormSubject('');
      setFormEofficeFile('');
      // Default to first wing if available
      const defaultWing = wings[0]?.wing_name || '';
      setFormWing(defaultWing);
      setFormRefNumber('');
      setFormReceivedFrom('');
      setFormRemarks('');
      setFormDeadline('');
      setFormStatusSteps({
        1: 'Yes', 2: 'No', 3: 'No', 4: 'No', 5: 'No', 6: 'No'
      });
      setFormStatusDates({ 1: new Date().toISOString().split('T')[0] });
    }
  }, [editingRef, wings]);

  // Set default division when wing changes
  const filteredDivisions = useMemo(() => {
    if (!formWing) return [];
    const selectedWingObj = wings.find(w => w.wing_name === formWing);
    if (!selectedWingObj) return [];
    return divisions.filter(d => d.wing_id === selectedWingObj.wing_id);
  }, [formWing, wings, divisions]);

  useEffect(() => {
    // If current division isn't in the filtered list of divisions, select the first one
    if (filteredDivisions.length > 0) {
      const exists = filteredDivisions.some(d => d.division_name === formDivision);
      if (!exists) {
        setFormDivision(filteredDivisions[0].division_name);
      }
    } else {
      setFormDivision('');
    }
  }, [filteredDivisions]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      !formSubject.trim() ||
      !formEofficeFile.trim() ||
      !formWing.trim() ||
      !formDivision.trim() ||
      !formRefNumber.trim() ||
      !formReceivedFrom.trim()
    ) {
      alert('Please fill in all required fields marked with *');
      return;
    }

    if (formStatusSteps[1] === 'Yes' && !formStatusDates[1]) {
      alert('Please enter the Date Received for Step 1.');
      return;
    }

    const wordCount = formRemarks.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > 250) {
      alert('Remarks cannot exceed 250 words.');
      return;
    }

    onSave({
      subject: formSubject,
      eofficeFile: formEofficeFile,
      wing: formWing,
      division: formDivision,
      refNumber: formRefNumber,
      receivedFrom: formReceivedFrom,
      remarks: formRemarks,
      deadline: formDeadline,
      statusSteps: formStatusSteps,
      statusDates: formStatusDates
    });
  };

  const handleStepCheckboxChange = (stepNum, checked) => {
    setFormStatusSteps(prev => {
      const updated = { ...prev };
      if (checked) {
        for (let i = 1; i <= stepNum; i++) {
          updated[i] = 'Yes';
        }
      } else {
        for (let i = stepNum; i <= 6; i++) {
          updated[i] = 'No';
        }
      }
      return updated;
    });

    setFormStatusDates(prev => {
      const updated = { ...prev };
      if (checked) {
        const today = new Date().toISOString().split('T')[0];
        for (let i = 1; i <= stepNum; i++) {
          if (!updated[i]) {
            updated[i] = today;
          }
        }
      } else {
        for (let i = stepNum; i <= 6; i++) {
          delete updated[i];
        }
      }
      return updated;
    });
  };

  const handleDateChangeForStep = (stepNum, dateVal) => {
    setFormStatusDates(prev => ({
      ...prev,
      [stepNum]: dateVal
    }));
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-inner space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <h2 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Plus className="h-5 w-5 text-blue-800" />
          {editingRef ? 'Update VIP Reference Letter' : 'Register New VIP Letter'}
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField
            label="Subject of VIP Reference"
            type="textarea"
            value={formSubject}
            onChange={(e) => setFormSubject(e.target.value)}
            placeholder="Details of the letter..."
            required
            rows={2}
          />
          <FormField
            label="E-Office File Number"
            type="text"
            value={formEofficeFile}
            onChange={(e) => setFormEofficeFile(e.target.value)}
            placeholder="e.g. E-100244"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <FormField
            label="Wing"
            type="select"
            value={formWing}
            onChange={(e) => setFormWing(e.target.value)}
            required
            options={wings.map(w => w.wing_name)}
          />
          <FormField
            label="Division"
            type="select"
            value={formDivision}
            onChange={(e) => setFormDivision(e.target.value)}
            required
            options={filteredDivisions.map(d => d.division_name)}
          />
          <FormField
            label="Reference Letter Number"
            type="text"
            value={formRefNumber}
            onChange={(e) => setFormRefNumber(e.target.value)}
            placeholder="e.g. 647/25"
            required
          />
          <FormField
            label="Received From (Sender)"
            type="text"
            value={formReceivedFrom}
            onChange={(e) => setFormReceivedFrom(e.target.value)}
            placeholder="e.g. Shri Ajay Kumar Mandal, MP"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField
            label="Remarks"
            type="textarea"
            value={formRemarks}
            onChange={(e) => setFormRemarks(e.target.value)}
            placeholder="Max 250 words"
            rows={2}
          />
          <FormField
            label="Deadline"
            type="date"
            value={formDeadline}
            onChange={(e) => setFormDeadline(e.target.value)}
          />
        </div>

        <div className="space-y-3.5">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">
            Processing Milestone Stages & Action Dates
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((stepNum) => {
              const stepLabel = statusSteps[stepNum];
              const isChecked = formStatusSteps[stepNum] === 'Yes';
              return (
                <div
                  key={stepNum}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isChecked ? 'bg-white border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center space-x-2 text-xs font-bold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleStepCheckboxChange(stepNum, e.target.checked)}
                        className="rounded border-slate-350 text-blue-800 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                      />
                      <span>{stepNum}. {stepLabel}</span>
                    </label>
                  </div>

                  {isChecked && (
                    <div className="space-y-1 pl-6">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date of Action</label>
                      <input
                        type="date"
                        value={formStatusDates[stepNum] || ''}
                        onChange={(e) => handleDateChangeForStep(stepNum, e.target.value)}
                        required={isChecked}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-250 rounded-lg focus:outline-none focus:border-blue-500 font-semibold text-slate-700"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4.5 py-2.5 border border-slate-250 text-slate-655 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-slate-850 transition cursor-pointer"
          >
            Discard
          </button>
          <button
            type="submit"
            className="px-5.5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/10 hover:shadow-lg transition-all cursor-pointer"
          >
            Save Reference
          </button>
        </div>
      </form>
    </div>
  );
}
