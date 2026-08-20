import React, { useState, useEffect, useMemo } from 'react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';
import { useConsultantPermissions } from './hooks/useConsultantPermissions';
import { fetchConsultantAppointments, fetchWings, fetchDivisions } from './api';

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

const toBool = (val) => val === 'Yes' || val === 1 || val === true;
const formatDate = (d) => (d ? new Date(d).toISOString().split('T')[0] : '');

function parseAppointmentRow(b) {
  const stages = {
    adminApproval: toBool(b.admin_approval_for_nkg_consultant),
    adminApprovalDate: formatDate(b.admin_approval_for_nkg_consultant_date),
    tenderPublished: toBool(b.tender_published),
    tenderPublishedDate: formatDate(b.tender_published_date),
    preBidQueries: toBool(b.pre_bid_queries_responded),
    preBidQueriesDate: formatDate(b.pre_bid_queries_responded_date),
    bidReceived: toBool(b.bid_received),
    bidReceivedDate: formatDate(b.bid_received_date),
    techBidFinalized: toBool(b.technical_bid_finalized),
    techBidFinalizedDate: formatDate(b.technical_bid_finalized_date),
    finBidFinalized: toBool(b.financial_bid_finalized),
    finBidFinalizedDate: formatDate(b.financial_bid_finalized_date),
    workOrderIssued: toBool(b.work_order_issued),
    workOrderIssuedDate: formatDate(b.work_order_issued_date),
    contractSigned: toBool(b.contract_signed),
    contractSignedDate: formatDate(b.contract_signed_date),
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

  const handleEdit = (ca) => {
    setEditData(ca);
  };

  const handleSuccess = () => {
    setEditData(null);
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
              onEdit={handleEdit}
              triggerNotification={triggerNotification}
              wings={wings}
              divisions={divisions}
              canEdit={canEdit}
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
