/* global jest, describe, it, expect */
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ParliamentaryIssues from '../../ParliamentaryIssues';

jest.mock('../../hooks/useParliamentaryPermissions', () => ({
  useParliamentaryPermissions: () => ({
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
  fetchParliamentaryStages: jest.fn(() => Promise.resolve({ data: [] })),
  fetchParliamentaryIssues: jest.fn(() => Promise.resolve({ data: [] })),
}));

jest.mock('../../views', () => ({
  resolveParliamentaryListView: () => () => <div>List loaded</div>,
}));

// The Dashboard tab draws amCharts (ES modules only, which Jest can't load); this test doesn't open it
jest.mock('../../pages/Dashboard', () => () => <div>Dashboard</div>);

// The page's tabs are nested routes; mount it the way MainLayout does, on the Data List tab
const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/*" element={<ParliamentaryIssues />} />
    </Routes>
  </MemoryRouter>
);

describe('ParliamentaryIssues page', () => {
  it('loads and shows the page title', () => {
    renderAt('/data-list');

    expect(
      screen.getByRole('heading', { name: /parliamentary issues/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Data List')).toBeInTheDocument();
    expect(screen.getByText('List loaded')).toBeInTheDocument();
  });
});
