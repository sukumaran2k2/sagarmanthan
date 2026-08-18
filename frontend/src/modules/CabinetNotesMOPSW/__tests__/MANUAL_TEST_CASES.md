# Cabinet Notes MoPSW — Manual Test Cases

## Access & permissions
1. User without `CABINET_NOTES_MOPSW` read → Restricted Access screen.
2. User without create → Input Form tab hidden (shell + menu).
3. View Only Admin → can list/report; cannot create/edit/delete/upload.

## Data List
4. List loads with wing, division, status, docs, last updated.
5. Active / Completed tabs show unfiltered totals; switching tabs resets stage filter and page.
6. Active tab filters: wing → division cascade; stage (excluding Completed); search; Clear.
7. Completed tab hides the stage filter.
8. Edit opens form with mapped dates and stage remarks.
9. Delete confirms and removes note (+ documents when present).
10. Docs column opens modal; download works with auth.

## Input Form
11. Two-column layout: Note Information on the left, Stages Checklist & Dates on the right.
12. Subject, wing, division required.
13. Stages unlock sequentially when the previous stage has a date.
14. Dates cannot be after today; min date respects prior stage date.
15. Clearing a stage date clears subsequent stages.
16. Stage remarks appear when a date is set.
17. Remarks capped at 250 words.
18. Create posts note, optional PDF upload, returns to list.
19. Update persists stage remarks and stage_id (highest dated stage).

## Reports
20. Report View dropdown: Wing, Division, Wing and Division. Title and columns update without leaving the report.
21. Wing name (Wing view) → division abstract.
22. Stage count → detail rows.
23. Back navigation works through drilldown path.
24. Empty data does not crash.

## Scope
25. ORGANISATION data scope only shows notes created by users in the same org.
