export const WINGS = ['All', 'Ports', 'Finance', 'Shipping', 'Sagarmala', 'Administration', 'Development'];
export const DIVISIONS = ['All', 'PD-III', 'PPP', 'PHRD', 'Finance', 'Shipping-II', 'Sagarmala-I', 'Admn-I', 'Dev-II'];
export const CATEGORIES = ['All', 'Audit Para', 'Draft Para', 'Test Audit Note'];

export const STATUS_STEPS = {
  1: 'Received at Ministry',
  2: 'Comments Sought from Organisation',
  3: 'Comments Received from organisation',
  4: 'Under Clarification',
  5: 'Comments Furnished to CAG',
  6: 'Accepted by CAG',
  7: 'Dropped'
};

export const INITIAL_AUDIT_PARAS = [
  {
    id: 1,
    number: '9.1 of Report no. 7/2025, VoCPA',
    subject: 'Non-realisation of Wharfage charges towards Minimum Guaranteed Traffic',
    wing: 'Ports',
    division: 'PD-III',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'No', 4: 'No', 5: 'No', 6: 'No', 7: 'No' },
    remarks: 'Comments sought from VoCPA.'
  },
  {
    id: 2,
    number: '9.1',
    subject: 'Non relaization of Minimum Guaranteed Traffic "relating to V.O. Chidambaranar Port Authority',
    wing: 'Ports',
    division: 'PD-III',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'No', 5: 'No', 6: 'No', 7: 'No' },
    remarks: 'Comments received and under review.'
  },
  {
    id: 3,
    number: '7.2 of Report No. 3 of 2020',
    subject: 'Non-recovery of Liquidated Damages from Concessionaires for under performance by VPA',
    wing: 'Ports',
    division: 'PPP',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'Yes', 5: 'No', 6: 'No', 7: 'No' },
    remarks: 'Under clarification from PPP division.'
  },
  {
    id: 4,
    number: '6.3 of Report No. 10/2020',
    subject: 'Excess Payment of employees due to inclusion of House Rent Allowance for calculation of Overtime Allowance',
    wing: 'Ports',
    division: 'PHRD',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'Yes', 5: 'Yes', 6: 'Yes', 7: 'Yes' },
    remarks: 'Para dropped by CAG.'
  },
  {
    id: 5,
    number: '3.4.2(C) of Report No. 21/2023',
    subject: 'Accumulation of balances under suspense head (C. Reserve Bank Suspense Central Accounts Office)',
    wing: 'Finance',
    division: 'Finance',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'Yes', 5: 'Yes', 6: 'Yes', 7: 'Yes' },
    remarks: 'Dropped.'
  },
  {
    id: 6,
    number: '3.8.2.3 (Figure 3.12-Sr. No. 13) of Report No. 21/2023',
    subject: 'Booking under Minor Head 800 other Receipts Statement No. 8',
    wing: 'Finance',
    division: 'Finance',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'Yes', 5: 'Yes', 6: 'Yes', 7: 'Yes' },
    remarks: 'Dropped.'
  },
  {
    id: 7,
    number: '4.2.2.2 (Annexure 4.3B- Sr. No. 103-106) of Report No. 21/2023',
    subject: 'Other significant saving at minor head - sub head level',
    wing: 'Finance',
    division: 'Finance',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'Yes', 5: 'Yes', 6: 'Yes', 7: 'Yes' },
    remarks: 'Dropped.'
  },
  {
    id: 8,
    number: '4.8.1 (Annexure 4.8 ) of Report No. 21/2023',
    subject: 'Incorrect use of Object Head with Major Head',
    wing: 'Finance',
    division: 'Finance',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'Yes', 5: 'Yes', 6: 'Yes', 7: 'Yes' },
    remarks: 'Dropped.'
  },
  {
    id: 9,
    number: '4.16 (Figure No. 4.17) of Report No. 21/2023',
    subject: 'Outstanding Utilization Certificate',
    wing: 'Finance',
    division: 'Finance',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'Yes', 5: 'Yes', 6: 'Yes', 7: 'Yes' },
    remarks: 'Dropped.'
  },
  {
    id: 10,
    number: '4.2.2 (Annex. 4.2 -Sr. No. 43) of Report No. 21/2023',
    subject: 'Analysis of Saving Segment wise',
    wing: 'Finance',
    division: 'Finance',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'Yes', 5: 'Yes', 6: 'Yes', 7: 'Yes' },
    remarks: 'Dropped.'
  },
  {
    id: 11,
    number: '5.1 of Report No. 4 of 2021',
    subject: 'Avoidable expenditure on procurement of tugs',
    wing: 'Shipping',
    division: 'Shipping-II',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'No', 4: 'No', 5: 'No', 6: 'No', 7: 'No' },
    remarks: 'Awaiting comments from SCI.'
  },
  {
    id: 12,
    number: '2.4 of Report No. 12 of 2022',
    subject: 'Delay in completion of cruise terminal infrastructure',
    wing: 'Shipping',
    division: 'Shipping-II',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'No', 5: 'No', 6: 'No', 7: 'No' },
    remarks: 'Comments received from Port Trust.'
  },
  {
    id: 13,
    number: '1.2 of Report No. 15 of 2023',
    subject: 'Underutilisation of budget allocations for Sagarmala projects',
    wing: 'Sagarmala',
    division: 'Sagarmala-I',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'Yes', 5: 'No', 6: 'No', 7: 'No' },
    remarks: 'Under clarification regarding state contribution.'
  },
  {
    id: 14,
    number: '8.3 of Report No. 6 of 2024',
    subject: 'Shortfall in target accomplishment for coastal shipping promotion',
    wing: 'Sagarmala',
    division: 'Sagarmala-I',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'Yes', 5: 'Yes', 6: 'No', 7: 'No' },
    remarks: 'Comments submitted to CAG.'
  },
  {
    id: 15,
    number: '3.1 of Report No. 18 of 2020',
    subject: 'Irregularities in appointment of consultants',
    wing: 'Administration',
    division: 'Admn-I',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'Yes', 5: 'Yes', 6: 'Yes', 7: 'Yes' },
    remarks: 'Para dropped.'
  },
  {
    id: 16,
    number: '4.6 of Report No. 22 of 2022',
    subject: 'Unproductive expenditure on software procurement',
    wing: 'Development',
    division: 'Dev-II',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'No', 4: 'No', 5: 'No', 6: 'No', 7: 'No' },
    remarks: 'Sought replies from CDAC.'
  },
  {
    id: 17,
    number: '6.1 of Report No. 8 of 2021',
    subject: 'Non-recovery of damage charges from contractor',
    wing: 'Ports',
    division: 'PD-III',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'No', 5: 'No', 6: 'No', 7: 'No' },
    remarks: 'Arbitration in progress.'
  },
  {
    id: 18,
    number: '7.5 of Report No. 2 of 2022',
    subject: 'Loss of revenue due to incorrect billing parameters',
    wing: 'Ports',
    division: 'PPP',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'Yes', 5: 'No', 6: 'No', 7: 'No' },
    remarks: 'Under clarification.'
  },
  {
    id: 19,
    number: '3.4 of Report No. 11 of 2023',
    subject: 'Idle investment on container terminal expansion',
    wing: 'Ports',
    division: 'PD-III',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'Yes', 5: 'Yes', 6: 'No', 7: 'No' },
    remarks: 'Submitted response to CAG.'
  },
  {
    id: 20,
    number: '2.1 of Report No. 21/2023',
    subject: 'Misclassification of capital expenditure as revenue',
    wing: 'Finance',
    division: 'Finance',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'Yes', 5: 'Yes', 6: 'Yes', 7: 'Yes' },
    remarks: 'Dropped.'
  },
  {
    id: 21,
    number: '1.5 of Report No. 21/2023',
    subject: 'Discrepancy in treasury cash balances reconciliation',
    wing: 'Finance',
    division: 'Finance',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'Yes', 5: 'Yes', 6: 'Yes', 7: 'Yes' },
    remarks: 'Dropped.'
  },
  {
    id: 22,
    number: '9.3 of Report No. 7/2025',
    subject: 'Shortfall in maintenance dredging depth',
    wing: 'Ports',
    division: 'PD-III',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'No', 4: 'No', 5: 'No', 6: 'No', 7: 'No' },
    remarks: 'Comments sought from organisation.'
  },
  {
    id: 23,
    number: '8.1 of Report No. 10/2020',
    subject: 'Overpayment of allowances to dredging crew',
    wing: 'Ports',
    division: 'PHRD',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'Yes', 5: 'Yes', 6: 'Yes', 7: 'Yes' },
    remarks: 'Dropped.'
  },
  {
    id: 24,
    number: '4.5 of Report No. 21/2023',
    subject: 'Unspent balances left in scheme bank accounts',
    wing: 'Finance',
    division: 'Finance',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'Yes', 5: 'Yes', 6: 'Yes', 7: 'Yes' },
    remarks: 'Dropped.'
  },
  {
    id: 25,
    number: '5.2 of Report No. 12 of 2022',
    subject: 'Idle machinery in warehouse complex',
    wing: 'Shipping',
    division: 'Shipping-II',
    category: 'Audit Para',
    statusSteps: { 1: 'Yes', 2: 'Yes', 3: 'Yes', 4: 'Yes', 5: 'Yes', 6: 'Yes', 7: 'Yes' },
    remarks: 'Dropped.'
  }
];
