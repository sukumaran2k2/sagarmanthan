export const OVOD_VISIONS = [
  { id: '0', label: 'Show All' },
  { id: '1', label: 'Maritime India Vision (MIV) 2030' },
  { id: '2', label: 'Maritime Amrit Kaal Vision (MAKV) 2047' },
  { id: '3', label: 'SGOS' },
  { id: '4', label: 'Additional Items' }
];

export const OVOD_PRIORITIES = [
  { id: '0', label: 'Show All' },
  { id: '1', label: 'Priority I' },
  { id: '2', label: 'Priority II' },
  { id: '3', label: 'Priority III' }
];

export const OVOD_STATUSES = [
  { id: '0', label: 'Show All' },
  { id: 'No Update', label: 'No Update' },
  { id: 'Yet to be Started', label: 'Yet to be Started' },
  { id: 'Under Implementation - On Time', label: 'Under Implementation - On Time' },
  { id: 'Under Implementation - Delayed', label: 'Under Implementation - Delayed' },
  { id: 'Completed', label: 'Completed' },
  { id: 'Not Applicable', label: 'Not Applicable' },
  { id: 'Dropped', label: 'Dropped' }
];

export const OVOD_WINGS = [
  { id: '0', label: 'Show All' },
  { id: '1', label: 'Administration' },
  { id: '2', label: 'Coord-I' },
  { id: '3', label: 'Coord-II' },
  { id: '4', label: 'Development' },
  { id: '5', label: 'DGLL, Parliament & TRW' },
  { id: '6', label: 'Finance' },
  { id: '7', label: 'Information Technology' },
  { id: '8', label: 'IWT' },
  { id: '9', label: 'Office of Economic Advisor' },
  { id: '10', label: 'Ports' },
  { id: '11', label: 'Sagarmala' },
  { id: '12', label: 'Shipping' },
  { id: '13', label: 'Special Initiatives & Projects' },
  { id: '14', label: 'Vigilance' }
];

export const OVOD_VIBHAS = [
  { id: '0', label: 'Show All' },
  { id: '1', label: 'Capacity building, outreach and advocacy' },
  { id: '2', label: 'Communication' },
  { id: '3', label: 'Cooperation with foreign ports and countries' },
  { id: '4', label: 'Digital transformation' },
  { id: '5', label: 'Environmental sustainability' },
  { id: '6', label: 'Financial sustainability' },
  { id: '7', label: 'Infrastructure development' },
  { id: '8', label: 'Institutional reforms, HR/Capacity Building, Process Improvement' },
  { id: '9', label: 'Legal and regulatory framework' },
  { id: '10', label: 'Safety and security' }
];

export const MIV_CHAPTERS = [
  { id: '0', label: 'Show All' },
  ...Array.from({ length: 10 }, (_, i) => ({ id: String(i + 1), label: `Chapter ${i + 1}` }))
];

export const MAKV_THEMES = [
  { id: '0', label: 'Show All' },
  ...Array.from({ length: 14 }, (_, i) => ({ id: String(i + 1), label: `Theme ${i + 1}` }))
];

export const REPORT_TABS = [
  { id: 'wing', label: 'Mopsw Wing' },
  { id: 'port', label: 'Major Ports' },
  { id: 'other', label: 'Other Organisations' }
];

export const CATEGORY_MAP = {
  1: 'Policy/Guidelines',
  2: 'Regulatory (Acts/Legislations/Rules)',
  3: 'Schemes/Programs',
  4: 'Institutional reforms',
  5: 'Process',
  6: 'Finance',
  7: 'HR/Capacity Building',
  8: 'Infrastructure',
  9: 'Technology',
  10: 'Policy/Regulatory reforms',
  11: 'Others',
  12: 'Collaborations'
};

export const WINGS_MAP = {
  1: 'Shipping',
  2: 'Vigilance',
  3: 'Ports',
  4: 'IWT',
  5: 'Administration',
  6: 'Coord-I',
  7: 'Coord-II',
  8: 'DGLL, Parliament & TRW',
  9: 'Development',
  10: 'Finance',
  11: 'Sagarmala',
  12: 'Information Technology',
  13: 'Office of Economic Advisor',
  14: 'Special Initiatives & Projects'
};

export const PRIORITY_MAP = {
  '1': 'I',
  '2': 'II',
  '3': 'III',
  1: 'I',
  2: 'II',
  3: 'III'
};

export const VIBHAS_MAP = {
  1: 'Projects and schemes, PPP',
  2: 'International cooperation',
  3: 'Maritime Finance, Insurance, Leasing, Ownership and Registration',
  4: 'Green initiatives including pollution control',
  5: 'Tourism and ferries',
  6: 'Communication',
  7: 'IT/E-governance',
  8: 'Financial matters, insurance',
  9: 'Ship building, repair and recycling',
  10: 'New Technology & Innovation/Research/Startups and Entrepreneurship',
  11: 'MIV and Blue Economy',
  12: 'Land, asset, port led industrialization',
  13: 'Traffic, cargo operation',
  14: 'Capacity building, outreach, Education',
  15: 'CSR & community outreach',
  16: 'Economic analysis, appraisal, policy research',
  17: 'HR (Departmental + Institutional)',
  18: 'Legal (arbitration - shipping + Institutional)',
  19: 'Data analytics, statistics, knowledge repository',
  20: 'Media and public outreach',
  21: 'States',
  22: 'Inter-ministerial issues',
  23: 'Health, Safety, Security & Disaster Management - Safety & Disaster Management'
};
