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
        const mapped = res.data.map((b) => ({
          id: b.consultant_appointment_id,
          wing_id: b.wing,
          division_id: b.division,
          wing: b.wing_name || 'Unknown',
          division: b.division_name || 'Unknown',
          appointmentType: b.appointment_type || 'Full Time',
          numResources: b.number_of_resources || 1,
          consultingFirmName: b.name_of_consulting_firm || '',
          status: getStatusFromStages({
            adminApproval: b.admin_approval_for_nkg_consultant === 'Yes' || b.admin_approval_for_nkg_consultant === 1 || b.admin_approval_for_nkg_consultant === true,
            tenderPublished: b.tender_published === 'Yes' || b.tender_published === 1 || b.tender_published === true,
            preBidQueries: b.pre_bid_queries_responded === 'Yes' || b.pre_bid_queries_responded === 1 || b.pre_bid_queries_responded === true,
            bidReceived: b.bid_received === 'Yes' || b.bid_received === 1 || b.bid_received === true,
            techBidFinalized: b.technical_bid_finalized === 'Yes' || b.technical_bid_finalized === 1 || b.technical_bid_finalized === true,
            finBidFinalized: b.financial_bid_finalized === 'Yes' || b.financial_bid_finalized === 1 || b.financial_bid_finalized === true,
            workOrderIssued: b.work_order_issued === 'Yes' || b.work_order_issued === 1 || b.work_order_issued === true,
            contractSigned: b.contract_signed === 'Yes' || b.contract_signed === 1 || b.contract_signed === true
          }),
          stages: {
            adminApproval: b.admin_approval_for_nkg_consultant === 'Yes' || b.admin_approval_for_nkg_consultant === 1 || b.admin_approval_for_nkg_consultant === true,
            adminApprovalDate: b.admin_approval_for_nkg_consultant_date ? new Date(b.admin_approval_for_nkg_consultant_date).toISOString().split('T')[0] : '',
            tenderPublished: b.tender_published === 'Yes' || b.tender_published === 1 || b.tender_published === true,
            tenderPublishedDate: b.tender_published_date ? new Date(b.tender_published_date).toISOString().split('T')[0] : '',
            preBidQueries: b.pre_bid_queries_responded === 'Yes' || b.pre_bid_queries_responded === 1 || b.pre_bid_queries_responded === true,
            preBidQueriesDate: b.pre_bid_queries_responded_date ? new Date(b.pre_bid_queries_responded_date).toISOString().split('T')[0] : '',
            bidReceived: b.bid_received === 'Yes' || b.bid_received === 1 || b.bid_received === true,
            bidReceivedDate: b.bid_received_date ? new Date(b.bid_received_date).toISOString().split('T')[0] : '',
            techBidFinalized: b.technical_bid_finalized === 'Yes' || b.technical_bid_finalized === 1 || b.technical_bid_finalized === true,
            techBidFinalizedDate: b.technical_bid_finalized_date ? new Date(b.technical_bid_finalized_date).toISOString().split('T')[0] : '',
            finBidFinalized: b.financial_bid_finalized === 'Yes' || b.financial_bid_finalized === 1 || b.financial_bid_finalized === true,
            finBidFinalizedDate: b.financial_bid_finalized_date ? new Date(b.financial_bid_finalized_date).toISOString().split('T')[0] : '',
            workOrderIssued: b.work_order_issued === 'Yes' || b.work_order_issued === 1 || b.work_order_issued === true,
            workOrderIssuedDate: b.work_order_issued_date ? new Date(b.work_order_issued_date).toISOString().split('T')[0] : '',
            contractSigned: b.contract_signed === 'Yes' || b.contract_signed === 1 || b.contract_signed === true,
            contractSignedDate: b.contract_signed_date ? new Date(b.contract_signed_date).toISOString().split('T')[0] : ''
          }
        }));
        setRowData(mapped);
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
