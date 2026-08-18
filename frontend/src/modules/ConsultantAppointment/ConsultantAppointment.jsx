import React, { useState, useEffect, useMemo } from 'react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';
import { useConsultantPermissions } from './hooks/useConsultantPermissions';
import { fetchConsultantAppointments, fetchWings, fetchDivisions, deleteConsultantAppointment } from './api';
import { getCurrentUserId } from '../../utils/authSession';

const STAGES = [
  { key: 'adminApproval', label: 'Admin Approval for engaging Consultant' },
  { key: 'tenderPublished', label: 'Tender Published' },
  { key: 'preBidQueries', label: 'Pre-bid Queries Responded' },
  { key: 'bidReceived', label: 'Bid Received' },
  { key: 'techBidFinalized', label: 'Technical Bid Finalized' },
  { key: 'finBidFinalized', label: 'Financial Bid Finalized' },
  { key: 'workOrderIssued', label: 'Work Order Issued' },
  { key: 'contractSigned', label: 'Contract Signed' },
];

const formatDate = (d) => (d ? new Date(d).toISOString().split('T')[0] : '');
const formatDateTime = (d) => {
  if (!d) return '';
  const str = typeof d === 'string' ? d : d.toISOString ? d.toISOString() : String(d);
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    const y = match[1];
    const m = match[2];
    const day = match[3];
    const hStr = match[4];
    const min = match[5];
    const sec = match[6];
    
    // If midnight without explicit time recorded
    if (hStr === '00' && min === '00' && sec === '00') {
      return `${day}/${m}/${y}`;
    }

    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    const hFormatted = String(h).padStart(2, '0');
    return `${day}/${m}/${y}, ${hFormatted}:${min} ${ampm}`;
  }
  return String(d);
};

function parseAppointmentRow(b) {
  const stages = {
    adminApproval: !!b.admin_approval_for_nkg_consultant_date,
    adminApprovalDate: formatDate(b.admin_approval_for_nkg_consultant_date),
    tenderPublished: !!b.tender_published_date,
    tenderPublishedDate: formatDate(b.tender_published_date),
    preBidQueries: !!b.pre_bid_queries_responded_date,
    preBidQueriesDate: formatDate(b.pre_bid_queries_responded_date),
    bidReceived: !!b.bid_received_date,
    bidReceivedDate: formatDate(b.bid_received_date),
    techBidFinalized: !!b.technical_bid_finalized_date,
    techBidFinalizedDate: formatDate(b.technical_bid_finalized_date),
    finBidFinalized: !!b.financial_bid_finalized_date,
    finBidFinalizedDate: formatDate(b.financial_bid_finalized_date),
    workOrderIssued: !!b.work_order_issued_date,
    workOrderIssuedDate: formatDate(b.work_order_issued_date),
    contractSigned: !!b.contract_signed_date,
    contractSignedDate: formatDate(b.contract_signed_date),
  };

  const remarks = {
    adminApproval: b.admin_approval_for_nkg_consultant_remarks || '',
    tenderPublished: b.tender_published_remarks || '',
    preBidQueries: b.pre_bid_queries_responded_remarks || '',
    bidReceived: b.bid_received_remarks || '',
    techBidFinalized: b.technical_bid_finalized_remarks || '',
    finBidFinalized: b.financial_bid_finalized_remarks || '',
    workOrderIssued: b.work_order_issued_remarks || '',
    contractSigned: b.contract_signed_remarks || '',
  };

  return {
    id: b.consultant_appointment_id,
    wing_id: b.wing,
    division_id: b.division,
    wing: b.wing_name || 'Unknown',
    division: b.division_name || 'Unknown',
    appointmentType: b.appointment_type || 'Full Time',
    numResources: b.number_of_resources || 1,
    status: getStatusFromStages(stages),
    stages,
    remarks,
    created_date: b.created_date,
    updated_date: b.updated_date,
    lastUpdated: formatDateTime(b.updated_date || b.created_date),
    createdDateFormatted: formatDateTime(b.created_date),
    updatedDateFormatted: formatDateTime(b.updated_date),
    raw: b,
  }; 
}

const getStatusFromStages = (stages) => {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (stages[STAGES[i].key]) {
      return STAGES[i].label;
    }
  }
  return 'Initiated';
};

export default function ConsultantAppointmentView({ activeSubTab: activeSubTabProp, setActiveSubTab: setActiveSubTabProp, triggerNotification }) {
  const permissions = useConsultantPermissions();
  const { canAdd, canEdit, canRemove, canView, isViewOnlyAdmin } = permissions;

  const [activeSubTab, setActiveSubTab] = useState(canAdd ? 'add' : (canView ? 'list' : 'add'));
  const [loading, setLoading] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [editData, setEditData] = useState(null);
  const [wings, setWings] = useState([]);
  const [divisions, setDivisions] = useState([]);

  const tabs = useMemo(() => {
    const list = [];
    if (canAdd) list.push({ id: 'add', label: 'Input Form' });
    if (canView) list.push({ id: 'list', label: 'Data List' });
    if (canView) list.push({ id: 'report', label: 'Report' });
    return list;
  }, [canAdd, canView]);

  useEffect(() => {
    if (activeSubTabProp === 'Consultant Input Form') {
      if (canAdd) setActiveSubTab('add');
      else if (canView) setActiveSubTab('list');
    } else if (activeSubTabProp === 'Consultant Reports') {
      if (canView) setActiveSubTab('report');
      else if (canAdd) setActiveSubTab('add');
    } else if (activeSubTabProp === 'Consultant Data List') {
      if (canView) setActiveSubTab('list');
      else if (canAdd) setActiveSubTab('add');
    }
  }, [activeSubTabProp, canAdd, canView]);

  useEffect(() => {
    fetchWings()
      .then(res => setWings(res.data || []))
      .catch(err => console.error("Error loading wings:", err));

    fetchDivisions()
      .then(res => setDivisions(res.data || []))
      .catch(err => console.error("Error loading divisions:", err));
  }, []);

  const fetchData = () => {
    setLoading(true);
    fetchConsultantAppointments()
      .then(res => {
        setRowData(res.data.map(parseAppointmentRow));
      })
      .catch(err => console.error("Error loading CA data list:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (ca) => {
    setEditData(ca);
  };

  const handleSuccess = () => {
    setEditData(null);
    fetchData();
    setActiveSubTab('list');
    if (setActiveSubTabProp) {
      setActiveSubTabProp('Consultant Data List');
    }
  };

  const handleBack = () => {
    setEditData(null);
    setActiveSubTab('list');
    if (setActiveSubTabProp) {
      setActiveSubTabProp('Consultant Data List');
    }
  };

  const handleDelete = async (ca) => {
    if (!window.confirm(`Are you sure you want to delete this Consultant Appointment record (${ca.wing} / ${ca.division})? This will also remove associated candidate records and documents.`)) {
      return;
    }
    const userId = getCurrentUserId() || 1;
    try {
      await deleteConsultantAppointment(ca.id, userId);
      if (triggerNotification) {
        triggerNotification("Consultant Appointment and associated candidates deleted successfully.", "success");
      }
      fetchData();
    } catch (err) {
      console.error("Error deleting consultant appointment:", err);
      if (triggerNotification) {
        triggerNotification("Failed to delete Consultant Appointment.", "error");
      }
    }
  };

  if (!canAdd && !canView && !canEdit) {
    return <RestrictedAccess moduleName="Consultant Appointment" />;
  }

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] tracking-wide uppercase font-display">
            Consultant Appointment
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium font-sans">
            Manage and monitor Consultant Appointments across various wings and divisions.
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={activeSubTab}
          onTabChange={(tabId) => {
            if (tabId !== 'add') {
              setEditData(null);
            }
            setActiveSubTab(tabId);
            if (setActiveSubTabProp) {
              if (tabId === 'add') setActiveSubTabProp('Consultant Input Form');
              else if (tabId === 'report') setActiveSubTabProp('Consultant Reports');
              else if (tabId === 'list') setActiveSubTabProp('Consultant Data List');
            }
          }}
        />
      </div>

      <div className="space-y-8">
        {activeSubTab === 'list' && (
          editData ? (
            <InputForm
              wings={wings}
              divisions={divisions}
              onBack={handleBack}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
              editData={editData}
            />
          ) : (
            <DataList
              rowData={rowData}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddClick={() => {
                setActiveSubTab('add');
                if (setActiveSubTabProp) {
                  setActiveSubTabProp('Consultant Input Form');
                }
              }}
              triggerNotification={triggerNotification}
              wings={wings}
              divisions={divisions}
              canEdit={canEdit}
              canAdd={canAdd}
              canRemove={canRemove}
            />
          )
        )}

        {activeSubTab === 'add' && (
          <InputForm
            wings={wings}
            divisions={divisions}
            onBack={handleBack}
            onSuccess={handleSuccess}
            triggerNotification={triggerNotification}
            editData={null}
          />
        )}

        {activeSubTab === 'report' && (
          <Reports
            wings={wings}
            triggerNotification={triggerNotification}
          />
        )}
      </div>
    </div>
  );
}
