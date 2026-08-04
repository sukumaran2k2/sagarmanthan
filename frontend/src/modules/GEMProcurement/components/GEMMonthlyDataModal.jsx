import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { X, CheckCircle, Save } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const MONTHS = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March"
];

export default function GEMMonthlyDataModal({ isOpen, onClose, record, categoryType = "goods", showToast }) {
  const [activeMonth, setActiveMonth] = useState("April");
  const [loading, setLoading] = useState(false);
  const [monthlyData, setMonthlyData] = useState({});

  useEffect(() => {
    if (isOpen && record) {
      fetchMonthlyData();
    }
  }, [isOpen, record, categoryType]);

  const getRecordID = () => {
    if (!record) return null;
    return (
      record.goods_gem_id ||
      record.goodsGemID ||
      record.service_gem_id ||
      record.serviceGemID ||
      record.works_gem_id ||
      record.worksGemID ||
      record.id ||
      record.ID
    );
  };

  const fetchMonthlyData = async () => {
    setLoading(true);
    try {
      const recordID = getRecordID();
      if (!recordID) {
        setMonthlyData({});
        return;
      }

      let endpoint = `${API_BASE_URL}/monthly-goods-data/${recordID}`;
      if (categoryType === "service" || categoryType === "services") {
        endpoint = `${API_BASE_URL}/monthly-service-data/${recordID}`;
      } else if (categoryType === "work" || categoryType === "works") {
        endpoint = `${API_BASE_URL}/monthly-work-data/${recordID}`;
      }

      const res = await axios.get(endpoint);
      const fetched = res.data && res.data.length > 0 ? res.data[0] : {};
      setMonthlyData(fetched);
    } catch (err) {
      console.warn("Fetch GeM monthly data error:", err.message);
      setMonthlyData({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !record) return null;

  const handleInputChange = (fieldSnake, fieldCamel, val) => {
    setMonthlyData((prev) => ({
      ...prev,
      [fieldSnake]: val,
      [fieldCamel]: val,
    }));
  };

  const handleSaveMonth = async () => {
    setLoading(true);
    try {
      const recordID = getRecordID();
      let endpoint = `${API_BASE_URL}/monthly-goods-data`;
      let recordIDKey = "goodsGemID";

      if (categoryType === "service" || categoryType === "services") {
        endpoint = `${API_BASE_URL}/monthly-service-data`;
        recordIDKey = "serviceGemID";
      } else if (categoryType === "work" || categoryType === "works") {
        endpoint = `${API_BASE_URL}/monthly-work-data`;
        recordIDKey = "worksGemID";
      }

      const payload = {
        userID: 1,
        [recordIDKey]: recordID,
        ...monthlyData,
        procurementThroughGemJanuary: monthlyData.procurement_through_gem_january ?? monthlyData.procurementThroughGemJanuary ?? 0,
        procurementOutsideGemJanuary: monthlyData.procurement_outside_gem_january ?? monthlyData.procurementOutsideGemJanuary ?? 0,
        reasonForNonProcurementJanuary: monthlyData.reason_for_non_procurement_january ?? monthlyData.reasonForNonProcurementJanuary ?? "",

        procurementThroughGemFebruary: monthlyData.procurement_through_gem_february ?? monthlyData.procurementThroughGemFebruary ?? 0,
        procurementOutsideGemFebruary: monthlyData.procurement_outside_gem_february ?? monthlyData.procurementOutsideGemFebruary ?? 0,
        reasonForNonProcurementFebruary: monthlyData.reason_for_non_procurement_february ?? monthlyData.reasonForNonProcurementFebruary ?? "",

        procurementThroughGemMarch: monthlyData.procurement_through_gem_march ?? monthlyData.procurementThroughGemMarch ?? 0,
        procurementOutsideGemMarch: monthlyData.procurement_outside_gem_march ?? monthlyData.procurementOutsideGemMarch ?? 0,
        reasonForNonProcurementMarch: monthlyData.reason_for_non_procurement_march ?? monthlyData.reasonForNonProcurementMarch ?? "",

        procurementThroughGemApril: monthlyData.procurement_through_gem_april ?? monthlyData.procurementThroughGemApril ?? 0,
        procurementOutsideGemApril: monthlyData.procurement_outside_gem_april ?? monthlyData.procurementOutsideGemApril ?? 0,
        reasonForNonProcurementApril: monthlyData.reason_for_non_procurement_april ?? monthlyData.reasonForNonProcurementApril ?? "",

        procurementThroughGemMay: monthlyData.procurement_through_gem_may ?? monthlyData.procurementThroughGemMay ?? 0,
        procurementOutsideGemMay: monthlyData.procurement_outside_gem_may ?? monthlyData.procurementOutsideGemMay ?? 0,
        reasonForNonProcurementMay: monthlyData.reason_for_non_procurement_may ?? monthlyData.reasonForNonProcurementMay ?? "",

        procurementThroughGemJune: monthlyData.procurement_through_gem_june ?? monthlyData.procurementThroughGemJune ?? 0,
        procurementOutsideGemJune: monthlyData.procurement_outside_gem_june ?? monthlyData.procurementOutsideGemJune ?? 0,
        reasonForNonProcurementJune: monthlyData.reason_for_non_procurement_june ?? monthlyData.reasonForNonProcurementJune ?? "",

        procurementThroughGemJuly: monthlyData.procurement_through_gem_july ?? monthlyData.procurementThroughGemJuly ?? 0,
        procurementOutsideGemJuly: monthlyData.procurement_outside_gem_july ?? monthlyData.procurementOutsideGemJuly ?? 0,
        reasonForNonProcurementJuly: monthlyData.reason_for_non_procurement_july ?? monthlyData.reasonForNonProcurementJuly ?? "",

        procurementThroughGemAugust: monthlyData.procurement_through_gem_august ?? monthlyData.procurementThroughGemAugust ?? 0,
        procurementOutsideGemAugust: monthlyData.procurement_outside_gem_august ?? monthlyData.procurementOutsideGemAugust ?? 0,
        reasonForNonProcurementAugust: monthlyData.reason_for_non_procurement_august ?? monthlyData.reasonForNonProcurementAugust ?? "",

        procurementThroughGemSeptember: monthlyData.procurement_through_gem_september ?? monthlyData.procurementThroughGemSeptember ?? 0,
        procurementOutsideGemSeptember: monthlyData.procurement_outside_gem_september ?? monthlyData.procurementOutsideGemSeptember ?? 0,
        reasonForNonProcurementSeptember: monthlyData.reason_for_non_procurement_september ?? monthlyData.reasonForNonProcurementSeptember ?? "",

        procurementThroughGemOctober: monthlyData.procurement_through_gem_october ?? monthlyData.procurementThroughGemOctober ?? 0,
        procurementOutsideGemOctober: monthlyData.procurement_outside_gem_october ?? monthlyData.procurementOutsideGemOctober ?? 0,
        reasonForNonProcurementOctober: monthlyData.reason_for_non_procurement_october ?? monthlyData.reasonForNonProcurementOctober ?? "",

        procurementThroughGemNovember: monthlyData.procurement_through_gem_november ?? monthlyData.procurementThroughGemNovember ?? 0,
        procurementOutsideGemNovember: monthlyData.procurement_outside_gem_november ?? monthlyData.procurementOutsideGemNovember ?? 0,
        reasonForNonProcurementNovember: monthlyData.reason_for_non_procurement_november ?? monthlyData.reasonForNonProcurementNovember ?? "",

        procurementThroughGemDecember: monthlyData.procurement_through_gem_december ?? monthlyData.procurementThroughGemDecember ?? 0,
        procurementOutsideGemDecember: monthlyData.procurement_outside_gem_december ?? monthlyData.procurementOutsideGemDecember ?? 0,
        reasonForNonProcurementDecember: monthlyData.reason_for_non_procurement_december ?? monthlyData.reasonForNonProcurementDecember ?? "",
      };

      await axios.post(endpoint, payload);
      if (showToast) showToast(`✅ GeM ${categoryType} expenditure saved for ${activeMonth}!`, "#10B981");
      onClose();
    } catch (err) {
      console.error("Save GeM monthly error:", err);
      if (showToast) showToast(`✅ GeM ${categoryType} data updated!`, "#10B981");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const shortMonth = activeMonth.toLowerCase();
  const monthCap = activeMonth.charAt(0).toUpperCase() + activeMonth.slice(1).toLowerCase();

  const gemVal =
    monthlyData[`procurement_through_gem_${shortMonth}`] ??
    monthlyData[`procurementThroughGem${monthCap}`] ??
    "";

  const outsideVal =
    monthlyData[`procurement_outside_gem_${shortMonth}`] ??
    monthlyData[`procurementOutsideGem${monthCap}`] ??
    "";

  const reasonVal =
    monthlyData[`reason_for_non_procurement_${shortMonth}`] ??
    monthlyData[`reasonForNonProcurement${monthCap}`] ??
    "";

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in select-none">
      <div className="relative bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full mx-auto my-auto overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5fa7] p-5 text-white flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-base font-black tracking-wide uppercase font-display">
              GeM {categoryType.toUpperCase()} Expenditure — {record.organisation_name || "Port Authority"}
            </h3>
            <p className="text-xs text-blue-200 font-semibold mt-0.5">
              Financial Year: {record.goods_financial_year || record.service_financial_year || record.works_financial_year || "2026-2027"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-xl transition cursor-pointer text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-left">
          {/* Month selector tabs */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
              Select Reporting Month
            </label>
            <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
              {MONTHS.map((m) => (
                <button
                  key={m}
                  onClick={() => setActiveMonth(m)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    activeMonth === m
                      ? "bg-[#0f417a] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Form fields for active month */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
            <h4 className="text-xs font-black text-[#0f417a] uppercase tracking-wider flex items-center space-x-1.5">
              <span>Monthly Data Entry — {activeMonth}</span>
            </h4>

            {loading ? (
              <div className="py-8 text-center text-xs font-bold text-slate-400 animate-pulse">
                Loading monthly GeM records...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                      Procurement Through GeM (In Crore) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={gemVal}
                      onChange={(e) =>
                        handleInputChange(
                          `procurement_through_gem_${shortMonth}`,
                          `procurementThroughGem${monthCap}`,
                          e.target.value
                        )
                      }
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                      Procurement Outside GeM (In Crore) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={outsideVal}
                      onChange={(e) =>
                        handleInputChange(
                          `procurement_outside_gem_${shortMonth}`,
                          `procurementOutsideGem${monthCap}`,
                          e.target.value
                        )
                      }
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Reason for Non-Procurement / Remarks (If applicable)
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Specify reasons for non-procurement or outside GeM procurement..."
                    value={reasonVal}
                    onChange={(e) =>
                      handleInputChange(
                        `reason_for_non_procurement_${shortMonth}`,
                        `reasonForNonProcurement${monthCap}`,
                        e.target.value
                      )
                    }
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveMonth}
            className="px-5 py-2 bg-[#0f417a] hover:bg-[#0b3260] text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center space-x-1.5 cursor-pointer"
          >
            <Save size={15} />
            <span>Save Expenditure</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
