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
