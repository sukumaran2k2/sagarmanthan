# Form Builder - Manual Test Cases

Test users: a Ministry user (e.g. role 4, DIRECTOR) and an organisation user (role 7 or 8, e.g. a Cochin Port Authority officer). Times and due dates are India time (IST).

## Access & visibility
1. User without FORM_BUILDER access → cannot load Directory, Inbox or Studio data; the API returns 403.
2. Ministry user → Form Studio tab and menu item shown; Directory lists every form with Clone, Edit, the Active/Inactive switch and Delete on all cards.
3. Organisation user → no Form Studio tab or top-menu item; opening /form-builder/studio or /edit lands on Inbox.
4. Organisation user → Directory lists only forms assigned to their organisation or wing; cards show Submissions only (no Clone, Edit, Active/Inactive switch, trash).
5. Organisation user → creating, editing, deleting, switching or cloning a form via the API returns 403 "Only Ministry users can create or change forms".
6. Organisation user → Submissions shows only their own organisation's responses.
7. Expired session → Directory and Inbox show a red "session has expired" banner with Retry, not mock forms.
8. Backend unreachable → red "Could not load ..." banner with Retry; Retry after recovery loads real forms.

## Form Studio
9. Publish with no name, no fields, or organisation assignment with no organisation picked → warning, nothing saved.
10. Publish → form appears in Directory with the right name, description, due date, assignment and fields.
11. Wing assignment, including "DGLL, Parliament & TRW" (comma in the name) → form reaches users of that wing.
12. Due-date picker greys out past days; typing a past date and publishing → "The due date cannot be in the past".
13. Due date today → publishes. No due date → publishes and never closes by date.
14. Edit a form → organisations/wings pre-selected; publish updates the same form (no duplicate).
15. Edit fields of a form with no responses → fields change.
16. Edit fields of a form with any response (draft or submitted) → refused, "fields are locked"; name, description, due date and assignment can still change.
17. Save Draft → appears in Load Draft; survives a page reload.
18. Load a draft, change it, Save Draft again → still one draft, with the change.
19. Publish a loaded draft → draft removed from Load Draft.
20. Delete a draft → removed; another user never sees your drafts.

## Form Directory
21. Card shows status badge (ACTIVE / INACTIVE / OVERDUE), submission count, organisations and due date.
22. Click the switch on an Active form → it reads Inactive, badge INACTIVE; persists after reload; form leaves the Inbox and stops accepting responses.
23. Click it again → Active, badge ACTIVE; back in the Inbox.
24. Form past its due date → OVERDUE badge, switch still reads Active/Inactive as set; not in the Inbox.
25. Set a past-due form to Active → warning that it stays closed until the due date is extended.
26. Extend the due date of an overdue form → ACTIVE again.
27. Clone → "Name (Copy)" card with 0 submissions, same fields and assignment; cloning again gives "(Copy 2)".
28. Delete → confirm dialog warns submissions are removed; card disappears and stays gone after reload.
29. Delete a form with uploaded files → its files are removed too.

## Inbox & filling a form
30. Inbox lists only active, not-overdue forms assigned to the user's organisation or wing.
31. Status per form: Pending (nothing saved), Draft Saved, Submitted.
32. Fill Form → Save Draft with some fields → "Draft saved", status Draft Saved.
33. Reopen a draft → earlier answers filled in.
34. Submit with a required field empty → blocked with a message.
35. Invalid values (text in a number, bad email, decimal in a whole-number field) → red message in the form footer.
36. Submit → "Form submitted", status Submitted, Directory count +1.
37. Edit Response → answers filled in; submit again → "Response updated", count unchanged.
38. Save Draft on an already submitted response → refused ("already been submitted"); the response stays Submitted.
39. Form set to Inactive or past its due date while open → submit refused with a clear message.

## File fields
40. Required file field empty → "Please select a file", nothing submitted.
41. Attach a file and submit → succeeds; Edit Response shows "Saved: <name> (click to replace)".
42. Resubmit without choosing a new file → saved file kept, required check passes.
43. Replace the file → new file shown; download gives the new one.
44. File over 50 MB → refused, nothing saved.
45. File name with accents or quotes (e.g. `rép"ort.pdf`) → shown and downloaded with the same name.

## Submissions
46. Page uses the brown report theme (header, Export, table header, pager), like the other modules' Reports pages.
47. Columns: S.No, Port Authority, Submitted By, Submission Date, Status, then one column per form field.
48. Submission Date shown in IST.
49. Submitted responses listed first (newest first), then one red "Not submitted" row per assigned organisation or wing that hasn't submitted, A-Z, with empty fields.
50. An organisation with only a draft still shows as Not submitted; its row disappears once someone there submits.
51. Organisation user → sees only their own organisation: their responses, or a single Not submitted row.
52. More than 10 rows → 10 per page, pager shows total entries; S.No continues across pages (page 2 starts at 11).
53. Search by organisation or officer name → filters on the server (including Not submitted rows), returns to page 1; `%` and `_` match literally.
54. Stats strip (Total Submissions, Submission Rate, Not Submitted) covers all rows, not just the page or search.
55. File column → download button saves the file under its original name.
56. Export → Excel downloads a CSV with every matching row, including Not submitted rows and the Status column, that opens correctly in Excel.
