import { IndianRupee, Ship, Users, Gauge, Leaf } from 'lucide-react';

/**
 * KPI Major Ports input sections — full set from legacy kpiMajorPortInput.html.
 * Reports are not part of this module shell.
 */
export const MAJOR_PORTS_SECTIONS = [
  {
    id: 'financialParameters',
    code: '1',
    label: 'Financial Parameters',
    fullLabel: 'Financial Parameters for Major Ports',
    description: 'Operating income, expenditure, surplus and per-tonne profitability indicators.',
    icon: IndianRupee,
  },
  {
    id: 'traffic',
    code: '2',
    label: 'Traffic',
    fullLabel: 'Traffic',
    description: 'Cargo traffic actuals and targets by commodity, direction and organisation.',
    icon: Ship,
  },
  {
    id: 'cruisePassengerTraffic',
    code: '3',
    label: 'Cruise and Passenger Traffic',
    fullLabel: 'Cruise and Passenger Traffic',
    description: 'Cruise and passenger vessel traffic movements at major ports.',
    icon: Users,
  },
  {
    id: 'portPerformance',
    code: '4',
    label: 'Port Performance',
    fullLabel: 'Port Performance',
    description: 'Turnaround time, pre-berthing detention and container productivity KPIs.',
    icon: Gauge,
  },
  {
    id: 'renewableEnergy',
    code: '5',
    label: 'Renewable Energy',
    fullLabel: 'Renewable Energy',
    description: 'Renewable energy generation and green power utilisation at major ports.',
    icon: Leaf,
  },
];

export const MAJOR_PORTS_SECTION_IDS = MAJOR_PORTS_SECTIONS.map((s) => s.id);
