/**
 * Smoke test: Parliamentary Issues page loads and shows its title.
 */
import { render, screen } from '@testing-library/react';
import ParliamentaryIssues from '../ParliamentaryIssues';

jest.mock('../hooks/useParliamentaryPermissions', () => ({
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

jest.mock('../api', () => ({
  fetchWings: jest.fn(() => Promise.resolve({ data: [] })),
  fetchDivisions: jest.fn(() => Promise.resolve({ data: [] })),
  fetchParliamentaryStages: jest.fn(() => Promise.resolve({ data: [] })),
  fetchParliamentaryIssues: jest.fn(() => Promise.resolve({ data: [] })),
}));

jest.mock('../views', () => ({
  resolveParliamentaryListView: () => () => <div>List loaded</div>,
}));

describe('ParliamentaryIssues page', () => {
  it('loads and shows the page title', () => {
    render(<ParliamentaryIssues />);

    expect(
      screen.getByRole('heading', { name: /parliamentary issues/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Data List')).toBeInTheDocument();
    expect(screen.getByText('List loaded')).toBeInTheDocument();
  });
});
