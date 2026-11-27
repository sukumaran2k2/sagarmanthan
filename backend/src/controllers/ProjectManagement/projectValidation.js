// Server copy of the key rules the Project Basic Information form already enforces
// (QC PRJ-BE-05), so a request sent straight to the API cannot skip them.
// Returns an error message, or null when the data is fine.
export function checkProjectBasics({ projectName, estimatedProjectCost, projectInitiatedDate, targetCompletionDate }) {
    if (!String(projectName ?? '').trim()) {
        return 'Project name is required';
    }
    const cost = Number(estimatedProjectCost);
    if (estimatedProjectCost === null || estimatedProjectCost === undefined || String(estimatedProjectCost).trim() === ''
        || !Number.isFinite(cost) || cost <= 0) {
        return 'Estimated project cost must be greater than 0';
    }
    if (projectInitiatedDate && targetCompletionDate) {
        const start = new Date(projectInitiatedDate);
        const end = new Date(targetCompletionDate);
        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
            return 'Target completion date cannot be before the project initiated date';
        }
    }
    return null;
}
