/* global describe, it, expect, jest */
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteActionButton, EditActionButton, FormActions, ModalButtons } from '../../components/HrFormControls';

describe('HR action buttons (shared design)', () => {
  it('row actions are labelled icon buttons', () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    render(<><EditActionButton label="Edit Post" onClick={onEdit} /><DeleteActionButton label="Delete Post" onClick={onDelete} /></>);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Post' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Post' }));
    expect(onEdit).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Delete Post' }).className).toMatch(/text-rose-600/);
  });

  it('form footer: Exit outlined, submit primary; busy disables both and shows progress', () => {
    const onExit = jest.fn();
    const onSubmit = jest.fn((e) => e.preventDefault());
    const { rerender } = render(<form onSubmit={onSubmit}><FormActions onExit={onExit} submitLabel="Update" /></form>);
    expect(screen.getByText(/mandatory/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }));
    expect(onExit).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(onSubmit).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Update' }).className).toMatch(/bg-\[#0f417a\]/);

    rerender(<form onSubmit={onSubmit}><FormActions onExit={onExit} submitLabel="Update" busyLabel="Updating..." busy /></form>);
    expect(screen.getByRole('button', { name: /Updating/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Exit' })).toBeDisabled();
  });

  it('popup footer can be a destructive action', () => {
    const onSubmit = jest.fn();
    render(<ModalButtons onCancel={jest.fn()} onSubmit={onSubmit} submitVariant="danger" submitLabel="Delete Post" />);
    const del = screen.getByRole('button', { name: 'Delete Post' });
    expect(del.className).toMatch(/bg-rose-600/);
    fireEvent.click(del);
    expect(onSubmit).toHaveBeenCalled();
  });
});
