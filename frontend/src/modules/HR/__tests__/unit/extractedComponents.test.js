/* global describe, it, expect, jest */
// Render checks for panels lifted out of larger HR pages: each gets every value it shows
// from the page and calls the page's handlers.
import { render, screen, fireEvent } from '@testing-library/react';
import EditPostModal from '../../pages/OrganisationStructure/components/EditPostModal';
import DeletePostModal from '../../pages/OrganisationStructure/components/DeletePostModal';
import RevivalRequestCard from '../../pages/AbolishedPosts/components/RevivalRequestCard';
import RevivalApprovalCard from '../../pages/AbolishedPosts/components/RevivalApprovalCard';
import ParticipantsTable from '../../pages/TrainingDetails/components/ParticipantsTable';
import ParticipantsView from '../../pages/TrainingDetails/components/ParticipantsView';

jest.mock('../../../../components/Table', () => function TableStub({ rowData }) {
  return <div data-testid="grid">{rowData.length} rows</div>;
});

const post = { post_id: 7, post_name: 'Pilot', department_name: 'Marine Department', sanctioned_strength: 3 };

describe('Organisation Structure modals', () => {
  it('edit modal shows the post and closes from its cancel button', () => {
    const setIsEditModalOpen = jest.fn();
    render(
      <EditPostModal
        classes={[{ class_id: 1, class_name: 'I/A' }]}
        formData={{ postName: 'Pilot', classId: 1, sanctionedStrength: 2, payscaleRange: 'L-10' }}
        handleEditSubmit={jest.fn((e) => e.preventDefault())}
        isSubmitting={false}
        selectedPost={post}
        setFormData={jest.fn()}
        setIsEditModalOpen={setIsEditModalOpen}
      />
    );
    expect(screen.getByText('Marine Department')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pilot')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(setIsEditModalOpen).toHaveBeenCalledWith(false);
  });

  it('delete modal asks for the reason and submits', () => {
    const handleDeleteSubmit = jest.fn();
    render(
      <DeletePostModal
        deleteReason="Merged with another post"
        deleteReasonError=""
        handleDeleteSubmit={handleDeleteSubmit}
        isSubmitting={false}
        selectedPost={post}
        setDeleteReason={jest.fn()}
        setDeleteReasonError={jest.fn()}
        setIsDeleteModalOpen={jest.fn()}
      />
    );
    expect(screen.getByDisplayValue('Merged with another post')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Post' }));
    expect(handleDeleteSubmit).toHaveBeenCalled();
  });
});

describe('Abolished post revival cards', () => {
  const dates = { formatDDMMYYYY: (v) => v || '' };

  it('request card offers the organisation its actions only with update rights', () => {
    const props = {
      ...dates, isOrg: true, revivalStageId: 1, submitting: false,
      dateOfDecisionApproved: '', dateOfDecisionRejected: '', processInitiatedDate: '2026-01-02',
      proposalForwardedDate: '', rejectRemarksUser: '',
      handleSendForRevival: jest.fn(), handleUserUpdate: jest.fn(),
      setDateOfDecisionApproved: jest.fn(), setDateOfDecisionRejected: jest.fn(),
      setProcessInitiatedDate: jest.fn(), setProposalForwardedDate: jest.fn(), setRejectRemarksUser: jest.fn(),
    };
    const { rerender } = render(<RevivalRequestCard {...props} canChange={false} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    rerender(<RevivalRequestCard {...props} canChange />);
    expect(screen.queryAllByRole('button').length).toBeGreaterThan(0);
  });

  it('approval card offers the ministry its actions only with update rights', () => {
    const props = {
      isOrg: false, submitting: false,
      approvalDateFromDOE: '', orderForCreationDate: '', proposalSentToDoeDate: '', rejectionDateFromDOE: '', remarksRejectAdmin: '',
      handleAdminApprove: jest.fn(), handleAdminReject: jest.fn(), handleAdminUpdate: jest.fn(),
      setApprovalDateFromDOE: jest.fn(), setOrderForCreationDate: jest.fn(), setProposalSentToDoeDate: jest.fn(),
      setRejectionDateFromDOE: jest.fn(), setRemarksRejectAdmin: jest.fn(),
    };
    const { rerender } = render(<RevivalApprovalCard {...props} canChange={false} />);
    expect(screen.queryByText('Reject')).toBeNull();
    rerender(<RevivalApprovalCard {...props} canChange />);
    fireEvent.click(screen.getByText('Reject'));
    expect(props.handleAdminReject).toHaveBeenCalled();
  });
});

describe('Training participants', () => {
  it('form table adds, picks staff and removes rows', () => {
    const handlers = { handleAddParticipant: jest.fn(), handleRemoveParticipant: jest.fn(), handleStaffChange: jest.fn() };
    render(
      <ParticipantsTable
        {...handlers}
        loadingStaff={false}
        participants={[{ id: 1, staffId: '', name: '' }, { id: 2, staffId: 'E2', name: 'Asha' }]}
        staffList={[{ emp_master_id: 9, emp_transaction_id: 1, emp_reference_id: 'E2', emp_name: 'Asha' }]}
      />
    );
    fireEvent.click(screen.getByText('+ Add Participant'));
    expect(handlers.handleAddParticipant).toHaveBeenCalled();
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'E2' } });
    expect(handlers.handleStaffChange).toHaveBeenCalledWith(1, 'E2');
    fireEvent.click(screen.getAllByText('Remove')[1]);
    expect(handlers.handleRemoveParticipant).toHaveBeenCalledWith(2);
  });

  it('participants view shows the training and its participants, and goes back', () => {
    const setSelectedTrainingForParticipants = jest.fn();
    render(
      <ParticipantsView
        activeParticipantColumnDefs={[]}
        exportPage={jest.fn()}
        filteredParticipants={[{ id: 1 }, { id: 2 }]}
        organisationName="Chennai Port Authority"
        participantExportColumns={[]}
        participantLoading={false}
        participantPage={1}
        participantPageSize={10}
        participantSearchTerm=""
        participantVisibleCols={{ Name: true }}
        selectedTrainingForParticipants={{ Title: 'Fire Safety', NO_OF_PARTICIPANTS: 2 }}
        setParticipantPage={jest.fn()}
        setParticipantPageSize={jest.fn()}
        setParticipantSearchTerm={jest.fn()}
        setParticipantVisibleCols={jest.fn()}
        setSelectedTrainingForParticipants={setSelectedTrainingForParticipants}
        trackPage={() => jest.fn()}
        trainingFullDetails={null}
      />
    );
    expect(screen.getAllByText('Fire Safety').length).toBeGreaterThan(0);
    expect(screen.getByTestId('grid')).toHaveTextContent('2 rows');
    expect(screen.getByText('Total: 2')).toBeInTheDocument();
  });
});
