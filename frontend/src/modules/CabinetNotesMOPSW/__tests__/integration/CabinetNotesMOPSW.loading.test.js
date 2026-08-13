/**
 * Smoke test: Cabinet Notes MoPSW page loads and shows its title.
 */
import { render, screen } from '@testing-library/react';
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
  resolveCabinetNotesListView: () => () => <div>List loaded</div>,
}));

describe('CabinetNotesMOPSW page', () => {
  it('loads and shows the page title', () => {
    render(<CabinetNotesMOPSW />);

    expect(
      screen.getByRole('heading', { name: /cabinet notes - mopsw/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Data List')).toBeInTheDocument();
    expect(screen.getByText('List loaded')).toBeInTheDocument();
  });
});
