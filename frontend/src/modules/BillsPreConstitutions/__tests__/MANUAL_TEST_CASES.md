# Bills/PreConstitutions Act - Manual Test Cases

## Access & permissions
1. User without read → Restricted Access screen.
2. User without create → Input Form tab hidden (shell + menu).
3. User without edit → Data List action button shows "View Bill" and opens a read-only form.
4. Read-only form disables all fields and hides the Save/Cancel footer.

## Data List
5. List loads with Active/Disposed category toggle.
6. Filters: Wing, Division; each filters correctly.
7. Clicking the Actions button opens the record with correctly mapped values.

## Input Form
8. Required fields (Subject, Wing, Division, General Remarks) empty → cannot save.
9. Wing/Division dropdowns are populated live from the API, not hardcoded.
10. Remarks word limit (250 words) enforced.
11. Create saves and returns to Data List.
12. Update persists changes after refresh.
13. userID recorded on save reflects the actual logged-in user (decoded from JWT).

## Stages (15 total)
14. Sequence: Pre-Draft Bill Prepared → Pre-Draft Bill Approved → Circulated for IMC → IMC Comments Received → DCN Draft Prepared → DCN Draft Approved → Submitted for Legal Vetting → Legal Vetting Completed → Final DCN Approved → Advance Copy Sent → Approved by Cabinet → Introduced in Parliament → Bill Passed → Bill Notified → Completed.
15. Each stage is locked until the prior stage's date is filled — only when adding a new entry.
16. Filling a stage reveals its remark field; leaving the remark empty does not block save.
17. Date pickers enforce min/max bounds based on adjacent filled stages.

## Reports
18. Wing-wise summary report loads, with drill-down into division-wise breakdown per wing.
19. Drilling into a specific stage from the wing/division summary shows the correct detail list.
20. Empty data at any drill-down level does not crash the report.

## Sidebar Navigation
21. The flyout header "BILLS/PRECONSTITUTIONS ACT" is clickable and navigates to the default (Data List) tab.
