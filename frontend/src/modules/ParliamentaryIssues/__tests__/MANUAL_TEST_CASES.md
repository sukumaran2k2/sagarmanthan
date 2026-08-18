# Parliamentary Issues - Manual Test Cases

## Access & permissions
1. User without read → Restricted Access screen.
2. User without create → Input Form tab hidden (shell + menu).
3. User without edit → cannot edit from list.
4. User without delete → delete not available.
5. View Only Admin → can list/report; cannot create/edit/delete.

## Data List
6. List loads (subject, wing, type, status, last updated).
7. Filters: wing, division, type, status, search; Clear works.
8. Open/edit shows correct mapped values.
9. Delete shows in-app modal; Cancel keeps row; Confirm removes row.
10. After create/edit, list shows updated data and last-updated date.

## Input Form
11. Required fields empty → cannot save.
12. Stage date fields: date marks stage as Yes; optional stage remarks appear when date is set.
13. Create saves and returns to list.
14. Update persists changes after refresh.
15. Stage id saved matches highest selected stage for that issue type.

## Stages by issue type
16. Assurance: No Status → Received → Comments → later stages; Matter Disposed wins if set.
17. Matter (Zero Hours / Rule 377 / Special Mention): correct fields and stage progression.
18. PSC Report: correct fields and stage progression.

## Reports
19. Report tab loads for each type (Assurance, Zero Hours, Rule 377, PSC, Special Mention).
20. Report View dropdown: Wing, Division, Wing and Division. Title and columns update without leaving the report.
21. Empty data does not crash.
22. Drilldown / navigation works where available.

## Scope
23. User only sees data in their data scope (wing/division/org as configured).
24. Filters still work within that scope.
