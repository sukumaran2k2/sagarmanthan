# Cabinet Notes MoPSW — Manual Test Cases

## Access & permissions
1. User without `CABINET_NOTES_MOPSW` read → Restricted Access screen.
2. User without create → Input Form tab hidden (shell + menu).
3. View Only Admin → can list/report; cannot create/edit/delete/upload.

## Data List
4. List loads with wing, division, status, docs, last updated.
5. Filters: wing → division cascade; status; search; Clear.
6. Edit opens form with mapped Yes/No + dates.
7. Delete confirms and removes note (+ documents when present).
8. Docs column opens modal; download works with auth.

## Input Form
9. Subject, wing, division required.
10. Stages unlock sequentially (Yes/No or date on prior stage).
11. Dates cannot be after today; min date respects prior stage date.
12. Clearing a stage to No clears subsequent stages.
13. Remarks capped at 250 words.
14. Create posts note, optional PDF upload, returns to list.
15. Update persists stage remarks and stage_id (highest Yes).

## Reports
16. Wing-wise matrix loads with all 11 stages (including DCM).
17. Wing name → division abstract.
18. Stage count → detail rows.
19. Back navigation works through drilldown path.

## Scope
20. ORGANISATION data scope only shows notes created by users in the same org.
