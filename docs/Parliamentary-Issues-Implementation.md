# Parliamentary Issues — Implementation Document

**Module area:** Governance  
**Canonical tab key:** `Parliamentary Issue`  
**Display title:** Parliamentary Issues  
**Permission / module code:** `PARLIAMENTARY_ISSUES`  
**Database module ID:** `24`  
**URL path slug:** `governance/parliamentary-issue`  
**API base path:** `/parliamentary-issue`

---

## 1. Purpose

The Parliamentary Issues module lets authorised users:

- Capture and update parliamentary assurances, matters raised, and PSC reports
- Track workflow stages via Yes/No + date fields
- List, filter, and export issues
- Run wing → division → stage drilldown reports

Navigation is **tab-based** (not React Router page routes). `App.jsx` holds `activeTab` and syncs it to a URL path.

---

## 2. Naming conventions

| Surface | Value |
|---------|--------|
| Menu / App `activeTab` | `Parliamentary Issue` |
| Page title / Landing label | `Parliamentary Issues` |
| JWT / RBAC module code | `PARLIAMENTARY_ISSUES` |
| Backend middleware ID map | `PARLIAMENTARY_ISSUES: 24` |
| REST base | `/parliamentary-issue` |
| Main table | `tbl_parliamentary_issue` |
| Stage master | `mmt_parliamentary_stage` |

Keep the **singular** tab string (`Parliamentary Issue`) consistent in `Tabs.jsx`, `App.jsx`, and `ROUTE_MAP`. Plural aliases are only for access maps / Landing.

---

## 3. Architecture overview

```
Login (JWT)
  → allowedModuleCodes
  → modulePermissions (create/read/update/delete)
  → uiViewCode, dataScopeCode, roleCode
        │
        ▼
Tabs.jsx ── filterMenuByAccess ── TAB_TO_MODULE['Parliamentary Issue']
        │                              = PARLIAMENTARY_ISSUES
        ▼
App.jsx (activeTab === 'Parliamentary Issue')
        │
        ▼
ParliamentaryIssues.jsx (shell)
  ├── useParliamentaryPermissions()
  ├── Sub-tabs: Input Form | Data List | Report
  ├── views/ (uiViewCode → list component)
  └── api.js ──► Backend
                    ├── auth
                    ├── requireModulePermission(...)
                    ├── applyDataScope (viaCreatedBy)
                    └── SQL on tbl_parliamentary_issue
```

---

## 4. File structure

### 4.1 Frontend module

```
frontend/src/modules/ParliamentaryIssues/
├── ParliamentaryIssues.jsx          # Shell: access gate, sub-tabs, shared masters
├── api.js                           # Axios client (CRUD + dropdowns + reports)
├── hooks/
│   └── useParliamentaryPermissions.js
├── pages/
│   ├── IssueForm.jsx                # Create / edit form
│   ├── IssueListPage.jsx            # List + edit/delete orchestration
│   └── Reports.jsx                  # Wing / division / stage reports
├── components/
│   ├── IssueListTable.jsx           # AG Grid list, filters, export
│   └── YesNoDateField.jsx           # Yes/No + optional date field
├── utils/
│   ├── mapIssue.js                  # API row ↔ list/form shape
│   └── stageHelpers.js              # Issue types, stage_id, payload builders
└── views/
    ├── index.js                     # resolveParliamentaryListView(uiViewCode)
    ├── StandardListView.jsx
    ├── DirectorListView.jsx
    └── SecretaryJsListView.jsx
```

### 4.2 Frontend wiring (outside the module folder)

| File | Responsibility |
|------|----------------|
| `frontend/src/App.jsx` | Import, `ROUTE_MAP`, conditional render |
| `frontend/src/components/Tabs.jsx` | Governance menu item |
| `frontend/src/utils/moduleAccess.js` | Tab → `PARLIAMENTARY_ISSUES` |
| `frontend/src/utils/modulePermissions.js` | CRUD flags from JWT |
| `frontend/src/utils/authSession.js` | JWT claims (`uiViewCode`, `dataScopeCode`, roles) |
| `frontend/src/modules/Landing/Landing.jsx` | Landing tile → tab navigation |

### 4.3 Backend

| File | Responsibility |
|------|----------------|
| `backend/src/controllers/Governance/parliamentaryIssue.js` | CRUD handlers |
| `backend/src/controllers/Reports/parliamentaryReports.js` | Report aggregates |
| `backend/src/middleware/modulePermission.js` | Module code → ID + CRUD gate |
| `backend/src/middleware/dataScope.js` | Row filtering by org scope |
| `backend/src/authenticate.js` | JWT → `req.user` |
| `backend/src/routes.js` | Route registration |

### 4.4 Database objects

| Object | Purpose |
|--------|---------|
| `tbl_parliamentary_issue` | Main issue records |
| `mmt_parliamentary_stage` | Stage master (`parlia_stage_id`, `parlia_stage_name`, `parlia_issue_type`) |
| `mmt_wings` / `mmt_division` | Wing / division masters |
| `tbl_modules` | Module registry (`PARLIAMENTARY_ISSUES`, id `24`) |
| `tbl_rbac_org_module_permission` | Organisation allowed modules |
| `tbl_rbac_user_module_crud` | Per-user create/read/update/delete |

There is **no ORM model**; controllers use raw MSSQL via `mssql` / connection pool.

---

## 5. How the module is registered (checklist)

Registration is **manual** (not driven by a shared module registry today).

1. **Menu** — `Tabs.jsx` Governance item: `{ label: 'Parliamentary Issue', ... }`
2. **App mount** — `App.jsx`:
   - Import `ParliamentaryIssues`
   - `ROUTE_MAP['Parliamentary Issue'] = 'governance/parliamentary-issue'`
   - Render when `activeTab === 'Parliamentary Issue'`
3. **Access map** — `moduleAccess.js`:
   - `'Parliamentary Issue': 'PARLIAMENTARY_ISSUES'`
   - `'Parliamentary Issues': 'PARLIAMENTARY_ISSUES'` (alias)
4. **Backend ID map** — `modulePermission.js`: `PARLIAMENTARY_ISSUES: 24`
5. **Routes** — `routes.js` CRUD with `auth` + `requireModulePermission`
6. **RBAC data** — org permission + user CRUD rows for module id `24`

---

## 6. Permissions model

### 6.1 Login → JWT

On successful login (non–superadmin), the backend packs:

- `allowedModuleCodes` — modules allowed for the user’s organisation
- `modulePermissions[]` — per-module `{ moduleId, moduleCode, create, read, update, delete }`
- `uiViewCode` — e.g. `STANDARD`, `DIRECTOR`, `SECRETARY_JS`
- `dataScopeCode` — e.g. `MASTER`, `MINISTRY`, `ORGANISATION`
- `roleCode` — e.g. normal user, `VIEW_ONLY_ADMIN`, `SUPERADMIN`

### 6.2 Tab visibility (frontend)

```
canAccessTab(tab)
  → resolveTabKey / normalizeTab
  → TAB_TO_MODULE[tab] → module code
  → hasModuleAccess(code) against JWT allowedModuleCodes
```

Special cases:

| Role | Behaviour |
|------|-----------|
| `SUPERADMIN` | Module data tabs hidden; admin menus only |
| `VIEW_ONLY_ADMIN` | Module visible if allowed; CRUD forced to read-only |
| Normal user | Tab shown only if org allows module |

`filterMenuByAccess` strips menu items the user cannot access.

`App.jsx` also gates the active tab: if `!canAccessTab(activeTab)` → `<RestrictedAccess />`.

### 6.3 In-module CRUD UI

`useParliamentaryPermissions()`:

| Hook field | Source |
|------------|--------|
| `canView` | `read` |
| `canAdd` | `create` |
| `canEdit` | `update` |
| `canRemove` | `delete` |
| `uiViewCode` | JWT |
| `dataScopeCode` | JWT |
| `isViewOnlyAdmin` | JWT role |

Shell behaviour:

- `!canView` → `<RestrictedAccess moduleName="Parliamentary Issues" />`
- **Input Form** sub-tab only if `canAdd`
- **Data List** and **Report** available when `canView`
- List actions respect `canEdit` / `canRemove`

### 6.4 API enforcement (backend)

`requireModulePermission(moduleCode, action)` middleware:

1. Request must be authenticated (`req.user`)
2. `SUPERADMIN` → **403** on module data APIs
3. Module must appear in `allowedModuleCodes`
4. `VIEW_ONLY_ADMIN` → only `read` if module allowed; writes denied
5. Otherwise user must have the matching CRUD flag for that module

CRUD routes are protected as follows:

| Method | Path | Required action |
|--------|------|-----------------|
| `GET` | `/parliamentary-issue` | `read` |
| `POST` | `/parliamentary-issue` | `create` |
| `GET` | `/parliamentary-issue/:parliamentaryIssueID` | `read` |
| `PUT` | `/parliamentary-issue` | `update` |
| `DELETE` | `/parliamentary-issue/:parliamentaryIssueID/:userID` | `delete` |

### 6.5 Data scope (row-level)

List / get / delete apply:

```js
applyDataScope(request, req.user, { strategy: "viaCreatedBy", alias: "tpi" })
```

Because `tbl_parliamentary_issue` has no `organisation_id`, scope joins via `created_by` → user organisation.

Typical behaviour:

- `MASTER` / `MINISTRY` — broader / all rows (per dataScope implementation)
- `ORGANISATION` — only rows created by users in the same organisation

---

## 7. Frontend behaviour by layer

### 7.1 Shell — `ParliamentaryIssues.jsx`

1. Load permissions via hook  
2. Preload wings, divisions, parliamentary stages (shared by form)  
3. Derive issue-type options from stage master (`issueTypesFromStages`)  
4. Build sub-tabs from permissions  
5. Resolve list component from `uiViewCode`  
6. Render active sub-tab content  

### 7.2 Views — `views/index.js`

```js
VIEW_REGISTRY = {
  SECRETARY_JS: SecretaryJsListView,
  DIRECTOR: DirectorListView,
  STANDARD: StandardListView,
}
```

Today all three wrap the same `IssueListPage`. The registry exists so role-specific list UIs can diverge later without changing the shell.

### 7.3 List — `IssueListPage` + `IssueListTable`

- Fetch all issues → map rows → AG Grid
- Filters, CSV/print export
- Edit: fetch by id → map to form → `IssueForm`
- Delete: permission-gated API call
- Create path usually goes through shell **Input Form** sub-tab

### 7.4 Form — `IssueForm` + `YesNoDateField` + `stageHelpers`

**Canonical issue types:**

- Assurance
- Matter Raised In Zero Hours
- Matter Raised Under Rule 377
- Special Mention In Rajya Sabha
- PSC Report

Workflow fields are largely Yes/No (+ date). Client-side helpers:

- Canonicalise issue type labels
- Compute `parlia_stage_id` from workflow answers
- Build API payload (`buildIssuePayload`)

Create → `POST /parliamentary-issue`  
Update → `PUT /parliamentary-issue`

### 7.5 Reports — `Reports.jsx`

Drilldown pattern:

1. Wing-wise abstract  
2. Division-wise abstract (for selected wing)  
3. Stage-level detail  

Separate endpoint families for Assurance, Matter Raised, and PSC.

### 7.6 API client — `api.js`

Axios instance with:

- `baseURL` from `VITE_API_BASE_URL` (fallback localhost)
- Request interceptor attaching `Authorization: Bearer <accessToken>`

---

## 8. Backend API reference

### 8.1 CRUD

| Method | Endpoint | Handler | Notes |
|--------|----------|---------|-------|
| GET | `/parliamentary-issue` | `getParliamentaryIssue` | Joins stage, wing, division; data scope |
| POST | `/parliamentary-issue` | `createParliamentaryIssue` | Insert; returns new id |
| GET | `/parliamentary-issue/:id` | `getUpdateParliamentaryIssueData` | Single row for edit |
| PUT | `/parliamentary-issue` | `editParliamentaryIssue` | Full update |
| DELETE | `/parliamentary-issue/:id/:userID` | `deleteParliamentaryIssue` | Delete + file log under `./delete_log/Parlimentry_Issue` |

Helpers in the controller:

- `toBit` — Yes/No / 1/0 / true/false → SQL bit  
- `bindIssueFields` — binds body fields onto the MSSQL request  
- `normalizeWings` — array or string of wing names/ids for storage  

### 8.2 Master dropdowns

| Endpoint | Use |
|----------|-----|
| `GET /mmt-dropdown/mmt_wings` | Wings |
| `GET /mmt-dropdown/mmt_division` | Divisions |
| `GET /mmt-dropdown/mmt_parliamentary_stage` | Stages / issue types |

### 8.3 Reports

**Assurance**

| Endpoint |
|----------|
| `GET /assurancewingwise-report` |
| `GET /assurancedivisionwise-report/:wingID/` |
| `GET /getwingwise-assurance/:wingID/:parliamentaryStage` |
| `GET /getdivisionwise-assurance/:divisionID/:parliamentaryStage` |

**Matter raised**

| Endpoint |
|----------|
| `GET /matterraised-wingwisereport/:issueType/` |
| `GET /matterraised-divisionwise/:wingID/:issueType/` |
| `GET /getwingwise-matter/:wingID/:parliamentaryStage/:IssueType/` |
| `GET /getdivisionwise-matter/:divisionID/:parliamentaryStage/:IssueType/` |

**PSC**

| Endpoint |
|----------|
| `GET /psnwingwise-report` |
| `GET /psndivisionwise-report/:wingID/` |
| `GET /getwingwise-psc/:wingID/:parliamentaryStage` |
| `GET /getdivisionwise-psc/:divisionID/:parliamentaryStage` |

> **Note:** Report routes are currently registered in `routes.js` **without** `auth` / `requireModulePermission` (legacy gap). CRUD routes are fully gated.

---

## 9. End-to-end user flows

### 9.1 Open module

1. User logs in; JWT includes `PARLIAMENTARY_ISSUES` in `allowedModuleCodes`  
2. Governance menu shows **Parliamentary Issue**  
3. Click sets `activeTab` and URL `governance/parliamentary-issue`  
4. App checks `canAccessTab`; module shell checks `canView`  

### 9.2 Create issue

1. User needs `create` → sees **Input Form**  
2. Selects issue type, wing, division, subject, workflow Yes/No fields  
3. Client computes stage id and payload  
4. `POST /parliamentary-issue` with create permission  
5. On success, shell refreshes list and switches to **Data List**  

### 9.3 Edit / delete

1. From list, user with `update` opens edit → `GET` by id → form  
2. Save → `PUT /parliamentary-issue`  
3. Delete → `DELETE /parliamentary-issue/:id/:userID` if `delete` allowed  

### 9.4 Reports

User with `read` opens **Report** sub-tab and drills wing → division → stage using report APIs.

---

## 10. Role / view matrix (summary)

| Concern | Mechanism |
|---------|-----------|
| See menu item | Org `allowedModuleCodes` |
| See module content | User `read` (or VIEW_ONLY_ADMIN + module allowed) |
| Create | User `create` |
| Edit | User `update` |
| Delete | User `delete` |
| List layout variant | JWT `uiViewCode` → `views/` registry |
| Which rows visible | JWT `dataScopeCode` + `applyDataScope` |

---

## 11. How to mirror this for a new module

1. Create DB table(s) and optional masters; add `tbl_modules` row with stable `module_code` and `module_id`  
2. Implement controller under `controllers/<Area>/`  
3. Register routes with `auth` + `requireModulePermission("YOUR_CODE", action)`  
4. Add `YOUR_CODE: <id>` to `MODULE_ID_BY_CODE`  
5. Assign org module permission + user CRUD (login already serialises these into JWT)  
6. Create `frontend/src/modules/YourModule/` with shell, `api.js`, pages, permissions hook, utils  
7. Wire UI:
   - Import + conditional render in `App.jsx`
   - `ROUTE_MAP` entry
   - Menu item in `Tabs.jsx`
   - Tab label(s) in `moduleAccess.js` `TAB_TO_MODULE`
   - Optional Landing navigation map  
8. Gate shell with `getModuleCrud` / RestrictedAccess  
9. If table has no `organisation_id`, use `applyDataScope(..., { strategy: 'viaCreatedBy' })`  
10. Optionally add `uiViewCode` view registry like Parliamentary Issues  

---

## 12. Key source references

| Topic | Location |
|-------|----------|
| Module shell | `frontend/src/modules/ParliamentaryIssues/ParliamentaryIssues.jsx` |
| Permissions hook | `frontend/src/modules/ParliamentaryIssues/hooks/useParliamentaryPermissions.js` |
| Tab → module map | `frontend/src/utils/moduleAccess.js` |
| CRUD from JWT | `frontend/src/utils/modulePermissions.js` |
| API client | `frontend/src/modules/ParliamentaryIssues/api.js` |
| Stage / payload helpers | `frontend/src/modules/ParliamentaryIssues/utils/stageHelpers.js` |
| Backend CRUD | `backend/src/controllers/Governance/parliamentaryIssue.js` |
| Backend reports | `backend/src/controllers/Reports/parliamentaryReports.js` |
| Permission middleware | `backend/src/middleware/modulePermission.js` |
| Route wiring | `backend/src/routes.js` (Parliamentary Issue + report sections) |

---

## 13. Known gaps / follow-ups

- Report endpoints lack the same `auth` + `requireModulePermission` stack as CRUD  
- `Director` / `SecretaryJs` list views currently share `IssueListPage` (hooks only)  
- Delete log folder name uses legacy spelling `Parlimentry_Issue`  
- Module registration is still hardcoded across App / Tabs / moduleAccess rather than a single registry

---

*Document generated for the Sagarmanthan Parliamentary Issues (Governance) implementation.*
