/* global describe, it, expect, jest */
import { render, screen, fireEvent } from '@testing-library/react';
import {
  HrColumnPicker,
  HrFilterToggle,
  HrRowsSelect,
  HrSearchBox,
  HrTotalBadge,
} from '../../components/HrListToolbar';

describe('HrListToolbar pieces', () => {
  it('filter toggle shows the active count and offers a reset only while filters are set', () => {
    const onToggle = jest.fn();
    const onReset = jest.fn();
    const { rerender } = render(<HrFilterToggle open={false} activeCount={0} onToggle={onToggle} onReset={onReset} />);
    expect(screen.queryByTitle('Reset Filters')).toBeNull();
    fireEvent.click(screen.getByText('Filters'));
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(<HrFilterToggle open activeCount={2} onToggle={onToggle} onReset={onReset} />);
    expect(screen.getByText('2')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Reset Filters'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('search box reports typing and clears', () => {
    const onChange = jest.fn();
    const { rerender } = render(<HrSearchBox value="" onChange={onChange} placeholder="Search posts" />);
    expect(screen.queryByLabelText('Clear search')).toBeNull();
    fireEvent.change(screen.getByPlaceholderText('Search posts'), { target: { value: 'pilot' } });
    expect(onChange).toHaveBeenLastCalledWith('pilot');

    rerender(<HrSearchBox value="pilot" onChange={onChange} placeholder="Search posts" />);
    fireEvent.click(screen.getByLabelText('Clear search'));
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('rows select passes the page size as a number', () => {
    const onChange = jest.fn();
    render(<HrRowsSelect value={10} onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '50' } });
    expect(onChange).toHaveBeenCalledWith(50);
  });

  it('total badge shows the count', () => {
    render(<HrTotalBadge count={42} />);
    expect(screen.getByText('Total: 42')).toBeInTheDocument();
  });

  it('column picker lists every column (hidden ones too), toggles, and closes on an outside click', () => {
    const onToggle = jest.fn();
    render(
      <div>
        <span>outside</span>
        <HrColumnPicker
          columns={[
            { key: 'post_name', label: 'Post Name', visible: true },
            { key: 'class', label: 'Class', visible: false },
          ]}
          onToggle={onToggle}
        />
      </div>
    );
    expect(screen.queryByText('Post Name')).toBeNull();
    fireEvent.click(screen.getByText('Visibility'));

    const hidden = screen.getByLabelText('Class');
    expect(hidden).not.toBeChecked();
    expect(screen.getByLabelText('Post Name')).toBeChecked();
    fireEvent.click(hidden);
    expect(onToggle).toHaveBeenCalledWith('class');

    fireEvent.mouseDown(screen.getByText('outside'));
    expect(screen.queryByText('Post Name')).toBeNull();
  });
});
