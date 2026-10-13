export const MAJOR_PORTS_SECTIONS = [
  {
    id: 'financialParameters',
    fullLabel: 'Financial Parameters for Major Ports',
    description: 'Operating income, expenditure, surplus and per-tonne profitability indicators.',
  },
  {
    id: 'traffic',
    fullLabel: 'Traffic',
    description: 'Cargo traffic actuals and targets by commodity, direction and organisation.',
  },
  {
    id: 'cruisePassengerTraffic',
    fullLabel: 'Cruise and Passenger Traffic',
    description: 'Cruise and passenger vessel traffic movements at major ports.',
  },
  {
    id: 'portPerformance',
    fullLabel: 'Port Performance',
    description: 'Turnaround time, pre-berthing detention and container productivity KPIs.',
  },
  {
    id: 'renewableEnergy',
    fullLabel: 'Renewable Energy',
    description: 'Renewable energy generation and green power utilisation at major ports.',
  },
];

export const MAJOR_PORTS_SECTION_IDS = MAJOR_PORTS_SECTIONS.map((s) => s.id);
