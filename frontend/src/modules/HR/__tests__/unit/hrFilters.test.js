/* global describe, it, expect, jest */
import { render, screen, fireEvent } from '@testing-library/react';
import { matchesIdOrName, nameOf } from '../../utils/hrFilters';
import { classChangeUpdate } from '../../hooks/useHrFilterOptions';
import { DeptPostClassFilters, HrFilterPanel } from '../../components/HrFilterPanel';

jest.mock('../../api', () => ({ fetchHrDepartments: jest.fn(), fetchHrPostsByDepartment: jest.fn() }));

describe('matchesIdOrName', () => {
  it('uses the row id when there is one, else the name', () => {
    expect(matchesIdOrName('007', 'Traffic', '007', 'Traffic')).toBe(true);
    expect(matchesIdOrName('007 ', 'x', '007', 'Traffic')).toBe(true);
    expect(matchesIdOrName('001', 'Traffic', '007', 'Traffic')).toBe(false);
    expect(matchesIdOrName(undefined, ' traffic ', '007', 'Traffic')).toBe(true); // name only, ignoring case
    expect(matchesIdOrName(undefined, 'Marine', '007', 'Traffic')).toBe(false);
    expect(matchesIdOrName(undefined, 'Marine', '', '')).toBe(true); // no filter
  });

  it('names a chosen id from a master list', () => {
    expect(nameOf([{ department_id: '007', department_name: 'Traffic' }], 'department_id', 'department_name', '007')).toBe('Traffic');
    expect(nameOf([], 'department_id', 'department_name', '007')).toBe('');
  });
});

describe('classChangeUpdate', () => {
  const deptPosts = [{ post_id: 'P1', class_id: 1 }, { post_id: 'P4', class_id: 4 }];
  it('keeps a post of the new class and clears one of another class', () => {
    expect(classChangeUpdate('IV/D', 'P4', deptPosts)).toEqual({ className: 'IV/D' });
    expect(classChangeUpdate('IV/D', 'P1', deptPosts)).toEqual({ className: 'IV/D', postId: '' });
    expect(classChangeUpdate('', 'P1', deptPosts)).toEqual({ className: '' });
  });
});

describe('DeptPostClassFilters', () => {
  const base = {
    departments: [{ department_id: '007', department_name: 'Traffic' }],
    departmentId: '', onDepartmentChange: jest.fn(),
    posts: [{ post_id: 'P4', post_name: 'Gateman' }], postId: '', onPostChange: jest.fn(),
    className: '', onClassChange: jest.fn(),
  };

  it('needs a department before a post, and an organisation first for ministry users', () => {
    const { rerender } = render(<HrFilterPanel show><DeptPostClassFilters {...base} /></HrFilterPanel>);
    expect(screen.getByLabelText('Post Name')).toBeDisabled();
    expect(screen.getByText('Select Dept First')).toBeInTheDocument();
    expect(screen.queryByLabelText('Organisation')).toBeNull();

    rerender(<HrFilterPanel show><DeptPostClassFilters {...base} organisations={[{ organisation_id: 1, organisation_name: 'Chennai Port Authority' }]}
      organisationId="" onOrganisationChange={jest.fn()} departmentId="007" needsOrganisation /></HrFilterPanel>);
    expect(screen.getByLabelText('Organisation')).toBeInTheDocument();
    expect(screen.getByText('Select Organisation First')).toBeInTheDocument();

    rerender(<HrFilterPanel show><DeptPostClassFilters {...base} departmentId="007" /></HrFilterPanel>);
    expect(screen.getByLabelText('Post Name')).not.toBeDisabled();
    fireEvent.change(screen.getByLabelText('Class'), { target: { value: 'IV/D' } });
    expect(base.onClassChange).toHaveBeenCalledWith('IV/D');
  });

  it('renders nothing while the panel is closed', () => {
    const { container } = render(<HrFilterPanel show={false}><span>x</span></HrFilterPanel>);
    expect(container).toBeEmptyDOMElement();
  });
});
