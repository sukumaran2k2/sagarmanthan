# Parliamentary Issues - Manual test cases

QA checklist for this module. Add more points whenever needed.

Tester:
Date:
Build / env:
Also compare with old portal (v2) where it matters.

---

Loading

- Module should open properly
- Heading Parliamentary Issues should be visible
- Check console for errors on load
- List should load in decent time (write if it feels slow)

Tabs and submenu

- Data List tab
- Input Form tab (if user can add)
- Report tab
- Switching tabs should not break anything
- Menu / submenu -> Data List opens list
- Menu / submenu -> Input Form opens form (or list if no add access)
- Menu / submenu -> Report opens report
- Whatever is selected in menu should match the tab on screen

CRUD

- List shows data (subject, wing, type, status, last updated etc)
- Open a record and check values look correct
- Save new issue - should succeed and show in list
- After save, back to list (or expected flow)
- Edit issue - changes should remain after refresh
- updated date / last updated should change after edit
- Delete when allowed - row should go from list
- Delete shows app modal (not browser localhost popup); Cancel should not delete
- Without create - cannot add
- Without edit - cannot edit (or read only)
- Without delete - cannot delete

Validations

- Required fields empty - should not save
- Yes/No with date - if Yes then date needed (where applicable)
- Remarks / word limit if we have it
- Error should be clear, not silent fail
- Proper data should save without wrong validation errors
- Compare validation with old portal

Stages - check each issue type

Assurance
- Right fields for Assurance
- Nothing selected -> No Status / default
- Received at ministry moves stage
- Comments sought / received moves stage
- Extension / implementation / matter disposed moves stage
- Highest stage should win (matter disposed over earlier ones)
- Same as old portal for same inputs

Matter (Zero Hours / Rule 377 / Special Mention)
- Correct fields for the type
- Debated / comments / reply stages
- Same as old portal

PSC Report
- PSC fields and stages
- Received / comments / reply
- Same as old portal

Data scope

Test with different scopes. Note which scope you used.

- User should only see data of their scope
- Higher scope should see wider correct data
- Other wing / division / org data should not show
- Filters (wing, division, type, status, search) should work inside that scope

Roles

Check module for each role - open, tabs, list, add, edit, delete.

- STANDARD
- DIRECTOR
- SECRETARY_JS
- Full CRUD user
- Read only user
- Create + read only (no edit/delete)
- No access - restricted screen

View only admin

- Can open and read
- Cannot create / update / delete
- Input Form should not be available (or blocked)
- View only indication if we show it

Speed

- First list load
- Refresh list
- Filter / search should not freeze
- Report load
- Should not feel clearly worse than old portal

Old portal (v2) check

- Same issue types
- Assurance stages same idea
- Matter / PSC same idea
- Same inputs -> similar save result as v2
- List fields make sense vs v2
- Reports (wing wise, division wise etc) make sense

Reports

Check each report tab:

- Report tab loads
- Assurance
- Matter Raised In Zero Hours
- Matter Raised Under Rule 377
- PSC Report
- Special Mention In Rajya Sabha
- No data - should not crash

Bugs

Date | Issue | Role | Remark
---- | ----- | ---- | ------

More points

(add below)
