/* global jest, describe, it, expect */
/**
 * Smoke test: Cabinet Notes MoPSW page loads and shows its title.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CabinetNotesMOPSW from '../../CabinetNotesMOPSW';

jest.mock('../../hooks/useCabinetNotesPermissions', () => ({
  useCabinetNotesPermissions: () => ({
    canView: true,
    canAdd: true,
    canEdit: true,
    canRemove: true,
    uiViewCode: 'STANDARD',
    dataScopeCode: 'ALL',
    isViewOnlyAdmin: false,
  }),
}));

jest.mock('../../api', () => ({
  fetchWings: jest.fn(() => Promise.resolve({ data: [] })),
  fetchDivisions: jest.fn(() => Promise.resolve({ data: [] })),
  fetchCabinetStages: jest.fn(() => Promise.resolve({ data: [] })),
  fetchCabinetNotes: jest.fn(() => Promise.resolve({ data: [] })),
}));

jest.mock('../../views', () => ({
  CABINET_NOTES_LIST_VIEWS: { STANDARD: () => <div>List loaded</div> },
  listViewKey: () => 'STANDARD',
}));

// The Dashboard tab draws amCharts (ES modules only, which Jest can't load); this test doesn't open it
jest.mock('../../pages/Dashboard', () => () => <div>Dashboard</div>);

// The page's tabs are nested routes; mount it the way MainLayout does, on the Data List tab
const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/*" element={<CabinetNotesMOPSW />} />
    </Routes>
  </MemoryRouter>
);

describe('CabinetNotesMOPSW page', () => {
  it('loads and shows the page title', () => {
    renderAt('/data-list');

    expect(
      screen.getByRole('heading', { name: /cabinet notes - mopsw/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Data List')).toBeInTheDocument();
    expect(screen.getByText('List loaded')).toBeInTheDocument();
  });
});
