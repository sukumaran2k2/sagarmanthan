import React, { useState, useEffect } from 'react';
import axios from 'axios';
import InternalNavigation from '../../components/InternalNavigation';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';

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
  const [activeSubTab, setActiveSubTab] = useState('list'); // 'list' | 'report' | 'add'
  const [loading, setLoading] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [editData, setEditData] = useState(null);
  const [wings, setWings] = useState([]);
  const [divisions, setDivisions] = useState([]);

  const tabs = [
    { id: 'add', label: 'Input Form' },
    { id: 'list', label: 'Data List' },
    { id: 'report', label: 'Report' }
  ];

  useEffect(() => {
    if (activeSubTabProp === 'Consultant Input Form') {
      setActiveSubTab('add');
    } else if (activeSubTabProp === 'Consultant Reports') {
      setActiveSubTab('report');
    } else if (activeSubTabProp === 'Consultant Data List') {
      setActiveSubTab('list');
    }
  }, [activeSubTabProp]);

  useEffect(() => {
    axios.get("http://localhost:3000/mmt-dropdown/mmt_wings")
      .then(res => setWings(res.data || []))
      .catch(err => console.error("Error loading wings:", err));

    axios.get("http://localhost:3000/mmt-dropdown/mmt_division")
      .then(res => setDivisions(res.data || []))
      .catch(err => console.error("Error loading divisions:", err));
  }, []);

  const fetchData = () => {
    setLoading(true);
    axios.get("http://localhost:3000/consultant-appointment")
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
