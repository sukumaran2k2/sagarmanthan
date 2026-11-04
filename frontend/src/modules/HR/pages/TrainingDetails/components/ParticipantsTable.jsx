// Participant rows of the Training form: staff picker per row, add / remove
export default function ParticipantsTable({ handleAddParticipant, handleRemoveParticipant, handleStaffChange, loadingStaff, participants, staffList }) {
  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-lg">Participant Details</h3>
        <button
          type="button"
          onClick={handleAddParticipant}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          + Add Participant
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-3 py-2">S.No</th>
              <th className="border px-3 py-2">Staff ID</th>
              <th className="border px-3 py-2">Name</th>
              <th className="border px-3 py-2">Designation</th>
              <th className="border px-3 py-2">Department</th>
              <th className="border px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((participant, index) => (
              <tr key={participant.id}>
                <td className="border px-3 py-2 text-center">{index + 1}</td>
                <td className="border px-3 py-2">
                  <select
                    value={participant.staffId}
                    onChange={(e) => handleStaffChange(participant.id, e.target.value)}
                    className="w-full border rounded px-2 py-2"
                  >
                    <option value="">{loadingStaff ? 'Loading Staff...' : 'Select Staff ID'}</option>
                    {staffList.map((staff) => (
                      <option
                        key={`${staff.emp_master_id}-${staff.emp_transaction_id}`}
                        value={staff.emp_reference_id}
                      >
                        {staff.emp_reference_id} - {staff.emp_name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border px-3 py-2">
                  <input type="text" value={participant.name} readOnly className="w-full border rounded px-2 py-2 bg-gray-100" />
                </td>
                <td className="border px-3 py-2">
                  <input type="text" value={participant.designation} readOnly className="w-full border rounded px-2 py-2 bg-gray-100" />
                </td>
                <td className="border px-3 py-2">
                  <input type="text" value={participant.department} readOnly className="w-full border rounded px-2 py-2 bg-gray-100" />
                </td>
                <td className="border px-3 py-2 text-center">
                  {participants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipant(participant.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
