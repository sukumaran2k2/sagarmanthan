/* global describe, it, expect */
import { render, screen } from '@testing-library/react';
import ScrollTable from '../../components/ScrollTable';

const columns = [
  { key: 'n', label: 'S.No', width: '3.5rem', render: (r, i) => i + 1 },
  { key: 'name', label: 'Post Name', render: (r) => r.name },
  { key: 'count', label: 'Count', width: '6rem', align: 'right', render: (r) => r.count },
];
const rows = Array.from({ length: 30 }, (_, i) => ({ name: `Post ${i}`, count: i }));

describe('ScrollTable', () => {
  it('scrolls the rows only: header and totals sit outside the scrolling body', () => {
    render(<ScrollTable columns={columns} rows={rows} maxHeight="10rem" footer={['Total', '', 435]} />);
    const header = screen.getByRole('columnheader', { name: 'Post Name' });
    const firstCell = screen.getByText('Post 0');
    const total = screen.getByText('435');

    const body = firstCell.closest('div');
    expect(body.style.maxHeight).toBe('10rem');
    expect(body.className).toMatch(/overflow-y-auto/);
    expect(body.contains(header)).toBe(false);
    expect(body.contains(total)).toBe(false);
    // Header, body and footer reserve the scrollbar's space so their columns line up
    expect(header.closest('div').style.scrollbarGutter).toBe('stable');
    expect(body.style.scrollbarGutter).toBe('stable');
    // Same column widths in every part
    document.querySelectorAll('colgroup').forEach((cg) => expect(cg.children[2].style.width).toBe('6rem'));
  });

  it('shows the empty message and no totals without rows', () => {
    render(<ScrollTable columns={columns} rows={[]} footer={['Total', '', 0]} emptyText="No records found" />);
    expect(screen.getByText('No records found')).toBeInTheDocument();
    expect(screen.queryByText('Total')).toBeNull();
  });
});
