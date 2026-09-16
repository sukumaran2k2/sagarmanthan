# Audit Paras - Manual Test Cases

## Access & permissions
1. User without read → Restricted Access screen.
2. User without create → Input Form tab hidden (shell + menu).
3. User without edit → Update button hidden/disabled from Data List.
4. View Only Admin → can list/report; cannot create/edit.

## Data List
5. List loads (Para No., Subject, Wing, Division, Category, Status, Remarks, Last Updated).
6. Filters: Wing, Division, Category, Status, search; Clear works.
7. Entries-per-page selector (5/10/20/50) changes visible row count.
8. Pagination controls navigate correctly; page resets to 1 on any filter change.
9. Clicking Update opens the record with correctly mapped values.

## Input Form
10. Required fields (Para Number, Subject, Wing, Division, Category) empty → cannot save.
11. Wing/Division dropdowns are populated live from the API, not hardcoded.
12. Remarks word limit (250 words, general + stage remarks combined) enforced.
13. Create saves and returns to Data List.
14. Update persists changes after refresh.
15. userID recorded on save matches the actual logged-in user (not hardcoded to 1).

## Stages (7 total)
16. Stage 1 ("Received but yet to be sent for Comments") has no prerequisite; always fillable.
17. Stages 2, 3, 5, 6, 7 are locked (disabled) until the prior stage's date is filled — only when adding a new entry.
18. Stage 4 ("Under Clarification") has no date field — checkbox-only, locked until Stage 3 has a date.
19. Editing an existing entry does not re-lock later stages (sequential lock only applies on create).
20. Filling a stage reveals its remark field; leaving the remark empty does not block save.
21. `selectedStage` sent to the backend matches the highest stage actually reached.

## Reports
22. Wing-wise abstract report loads with correct counts per wing.
23. Totals row sums correctly across all wings.
24. Empty data (zero paras for a wing) does not crash the report.
