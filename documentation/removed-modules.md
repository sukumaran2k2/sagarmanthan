# Removed Modules — Cleanup Record

**Branch:** `chore/remove-unused-modules`
**Date:** 19 November 2026
**Scope:** Sagarmanthan 3.0 code (`backend/` and `frontend/`). The old portal and the database were not changed.

## Why

These 12 modules are not part of Sagarmanthan 3.0. They had no menu entry and no screen. Their backend APIs were still live: any signed-in user could call them, with no module-permission check. That included creating and deleting records, for example `DELETE /cpgrams/:id`. All of this code has now been removed.

| # | Module | Frontend removed | Backend files removed | API routes removed |
|---|---|---|---|---|
| 1 | Expenditure | – | 1 | 0 |
| 2 | KPI – IWAI | – | 18 | 90 |
| 3 | KPI – CMEC | – | 1 | 20 |
| 4 | CPGRAMS | page, route, link | 7 | 30 |
| 5 | Promotion of Indian Ships on FOB Basis | – | 1 | 5 |
| 6 | Cruise Shipping | – | 1 | 6 |
| 7 | MoM of PSW Meetings | – | 1 | 13 |
| 8 | Interstate & Interministerial Issues | registry entry, breadcrumb | 2 | 10 |
| 9 | Review Items | – | 1 | 7 |
| 10 | AKV 2047 | registry entry, links, Contact Us text | 1 | 9 |
| 11 | MoPSW Tracker | registry entry, links, breadcrumb | 1 | 6 |
| 12 | SOM (Senior Officers Meeting) | registry entry, links, breadcrumb | 0 (none existed) | 0 |
| | **Total** | | **35** | **196** |

Every removed route was also checked against the frontend. No remaining screen calls any of them.

---

## 1. Expenditure

**Backend files deleted**
- `backend/src/controllers/ProjectManagement/expenditureOutlay.js`: scheme-wise expenditure (`tbl_expenditure_scheme_*`, `tbl_expenditure_year_main`, `tbl_expenditure_data_main`, `tbl_expenditure_log_table`). Nothing imported this file, so no route used it.

**Kept on purpose:** Projects expenditure (`projectExpenditureAction.js`, the expenditure logs and expenditure outlay screens), CSR expenditure, Capex actual expenditure, and the Expenditure columns in HR Training. These belong to live modules and are a different feature from the old Expenditure module.

## 2. KPI – IWAI

**Backend files deleted** (all in `backend/src/controllers/KPI/`; each one only reads or writes a `tbl_iwai_*` table):

| File | Table |
|---|---|
| `cargoHandle.js` | `tbl_iwai_cargo_handle` |
| `cargoOperation.js` | `tbl_iwai_cargo_operations` |
| `cargoTerminal.js` | `tbl_iwai_nw_cargo_handle` |
| `cargoVessel.js` | `tbl_iwai_Cargovessel` |
| `cruiseController.js` | `tbl_iwai_cruise` |
| `digitalPortals.js` | `tbl_iwai_digitalportal` |
| `DredgersController.js` | `tbl_iwai_dredgers` |
| `iwaiPassenger.js` | `tbl_iwai_IWAIpassenger_movement` |
| `iwaiVessel.js` | `tbl_iwai_IWAIvessel_movement` |
| `JettiesVessels.js` | `tbl_iwai_jetties_vessels` |
| `passenger.js` | `tbl_iwai_nw_passengers` |
| `passengerMove.js` | `tbl_iwai_passenger_movement` |
| `PassengerTerminal.js` | `tbl_iwai_nw_passenger_terminal` |
| `ropax.js` | `tbl_iwai_ropax` |
| `roro.js` | `tbl_iwai_roro` |
| `survey.js` | `tbl_iwai_survey_vessels` |
| `surveyVessel.js` | `tbl_iwai_surveyvessel` |
| `vesselTerminal.js` | `tbl_iwai_nw_vessel_movement` |

**API routes removed (90):** 18 data groups. Each group had 5 routes: `POST /<group>`, `GET /<group>`, and the monthly, quarterly and annually `GET` versions.
Groups: `passenger`, `Roro`, `RoPax`, `Cargo-Vessel`, `Survey-Vessel`, `cargo-operations-data`, `cruise-passenger-data` / `cruise-data`, `digital-data`, `dredgers-data`, `survey-vessel-data`, `iwai-vessel-movement-data`, `passenger-movement-data`, `iwai-passenger-movement-data`, `cargo-handled-data`, `jetties-vessels-data`, `vessel-movement-data`, `passenger-terminal-data`, `cargo-terminal-data`.

**Kept on purpose:**
- IWAI as an **organisation**: the organisation lists, the Projects "Lumpsum – IWAI" page, and the Projects IWAI reports (`/iwai-*-report`).
- **"Cruise and Passenger Traffic"** in KPI Major Ports (`cruisePassengerTrafficEntry.js`, `/kpi/cruise-passenger-traffic/*`, and the external data feed `/cruise-and-passenger-traffic-actual|target`).

## 3. KPI – CMEC

**Backend files deleted**
- `backend/src/controllers/KPI/cmec.js`: researchers, publications, policy advisory notes, maritime talks (`tbl_cmec_*`).

**API routes removed (20)**
- Researchers: `POST /add-cmec-researchers-data`, `GET /cmec-Research-list/:userID`, `GET /update-cmec-research-data/:cmecResearchId`, `PUT /cmec-resaerch-update-data`, `GET /get-cmec-year-wise-report`
- Publications: `POST /add-cmec-publications-data`, `GET /cmec-Publications-list/:userID`, `GET /update-cmec-publications-data/:cmecPublicationsId`, `PUT /cmec-publications-update-data`
- Policy advisory: `POST /add-policy-advisory-data`, `POST /cmecdocumentuploader`, `GET /policy-advisory-list/:userID`, `GET /cmec-list/:cmecAdvisoryId`, `GET /download-cmecfile-pdf-document`, `DELETE /delete-cmecfile`, `PUT /update-cmec-list`
- Maritime talks: `POST /add-cmec-maritime-talks-data`, `GET /maritime-public-list/:userID`, `GET /update-cmec-maritime-data/:cmecmaritimeId`, `PUT /cmec-Maritime-talks-update-data`

**Kept on purpose:** CMEC as an **organisation** name (in `frontend/src/utils/authSession.js` and the organisation icons).

## 4. CPGRAMS

**Frontend**
- Deleted `frontend/src/modules/CPGRAMS/CPGRAMS.jsx`. It was a page with made-up sample grievance data, not real data.
- `frontend/src/App.jsx`: removed the `CPGRAMSView` import and the `governance/cpgrams` route.
- `frontend/src/layouts/MainLayout.jsx`: removed the `'CPGRAMS'` link entry.
- `frontend/src/modules/UserManagement/utils.js`: removed the CPGRAMS icon rule and its now-unused `MessageSquare` import.

**Backend files deleted** (in `backend/src/controllers/Governance/`)
- `cpgrams.js`, `cpgramsdata.js`, `cpgramNew.js`, `cpgramInput.js`, `cpgramProgress.js`, `cpgramPH3.js`, `cpgramAge.js`

**API routes removed (30)**
- `GET|POST /cpgrams`, `GET /cpgrams/download/:id`, `DELETE /cpgrams/:id`, `POST /cpgrams/storecsv/:id`, `GET /cpgramsData`
- For each of `category`, `progress`, `PH3` and `age`: `GET /<x>-cpgram/:Month/:Year`, `GET /<x>-cpgram-all`, `POST /<x>-cpgram-create`, `PUT /<x>-cpgram-update`, `GET /<x>-cpgram-check`, `GET /<x>-cpgram-History`

## 5. Promotion of Indian Ships on FOB Basis

**Backend files deleted**
- `backend/src/controllers/Governance/flaggedShip.js` (`tbl_flagged_ship`)

**API routes removed (5)**
- `GET /get-flag-data`, `GET /get-flag-update-data/:ID`, `POST /add-flag-data`, `PUT /update-flag-data`, `POST /get-flag-report`

**Frontend:** removed `'fob'` from the ship icon rule in `UserManagement/utils.js`.

## 6. Cruise Shipping

**Backend files deleted**
- `backend/src/controllers/Governance/cruisePorts.js` (`tbl_cruise_ports`)

**API routes removed (6)**
- `POST /submit-cruise-port`, `GET /get-cruise-ports-report-data`, `GET /get-cruise-ports-data`, `GET /cruise-list/:roleID/:organisationID`, `GET /update-cruise-shipping-data/:CruiseShippingId`, `PUT /update-cruise-data-edit`

**Frontend:** removed `'cruise'` from the ship icon rule in `UserManagement/utils.js`.

**Kept on purpose:** KPI Major Ports "Cruise and Passenger Traffic". It is a different, live feature (see section 2).

## 7. MoM of PSW Meetings

**Backend files deleted**
- `backend/src/controllers/Governance/addminutesofmeeting.js` (`tbl_psw_meeting`, `tbl_psw_meeting_file`, `tbl_psw_action_points`)

**API routes removed (13)**
- `POST /mom-of-psw-meeting`, `POST /mom-of-psw-meeting-edit`, `POST /mom-of-file-psw`
- `GET /meeting-status-summary/:roleID/:userID/:organisationID/:WingId`, `GET /meeting-status-summary-edit/...`
- `GET /view-post-mom-request/:meetingId/:status`
- `POST /actionpointdocument`, `PUT /update-action-points-fileupload`, `GET /download-actionpoints-pdf-document`, `DELETE /delete-actionpointsfile`, `DELETE /delete-momfile`
- `GET /mompsw-report`, `GET /mompsw-report-data/:meetingId`

**Kept on purpose:** MIV 2030 meetings (`/meeting`, `/meeting/download/:id`). They belong to MIV 2030.

## 8. Interstate & Interministerial Issues

**Frontend**
- `frontend/src/config/moduleRegistry.js`: removed the `INTERSTATE_INTERMINISTERIAL` entry.
- `frontend/src/layouts/MainLayout.jsx`: removed `'Inter State & Inter Ministerial'` from the Governance breadcrumb list.

**Backend files deleted**
- `backend/src/controllers/Governance/interState.js` (`tbl_IT_inter_state`, `tbl_IT_inter_state_file`)
- `backend/src/controllers/Governance/interMinisterial.js` (`tbl_IT_inter_Ministerial`, `tbl_IT_inter_Ministerial_file`)

**API routes removed (10)**
- `GET|POST|PUT /inter-ministerial`, `GET /inter-ministerial/:ID`, `POST /inter-ministerial-document`
- `GET|POST|PUT /inter-state`, `GET /inter-state/:ID`, `POST /inter-state-document`

**Kept on purpose:** Decision Implementation (`decisionImplement.js`, `/decision-implement`). It is not in the list of modules to remove.

## 9. Review Items

**Backend files deleted**
- `backend/src/controllers/Governance/reviewItems.js` (`tbl_review_items`, `tbl_review_items_issue`)

**API routes removed (7)**
- `POST /add-issue-review-items`, `POST /add-review-items`, `GET /get-unique-rid-Number`, `GET /get-unique-issue-Number`, `GET /get-review-item-data`, `GET /get-review-item-total/:reviewItemCode`, `GET /get-review-item-code-data-by-id/:reviewItemCode`

## 10. AKV 2047 (Amrit Kaal Vision)

**Frontend**
- `frontend/src/config/moduleRegistry.js`: removed the `AKV_2047` entry (tabs "Vision 2047" and "Blue Economy Policy").
- `frontend/src/layouts/MainLayout.jsx`: removed the "Vision 2047" and "Blue Economy Policy" links and breadcrumbs.
- `frontend/src/modules/Contact/Contact.jsx`: removed "AKV 2047" from the Deputy Director's module list on the Contact Us page. This was the only place a user could see it.

**Backend files deleted**
- `backend/src/controllers/LongTermStrategies/amritKaal.js` (`tbl_amritkaal`, `tbl_amritkaal_file`, `mmt_akv_*`)

**API routes removed (9)**
- `GET|POST /AKV-data`, `PUT /AKV-data-update`, `GET /AKV-datas/:ID`, `POST /AKV-data/upload-files`, `GET /akv-report`, `GET /get-akv-initiative-name/:initiativeID`, `GET /AKV-Entity-data`, `GET /MIV-initiative-count`
- `/MIV-initiative-count` lived in the AKV file. The MIV 2030 screens do not call it.

**Kept on purpose:**
- OVOD's **"MAKV 2047"** yes/no field and theme filter. It is part of OVOD.
- "Maritime India Summit". It belongs to MIV 2030.
- The `mmt_akv_initiatives` option in Master Management. It is a generic master-table viewer.

## 11. MoPSW Tracker

**Frontend**
- `frontend/src/config/moduleRegistry.js`: removed the `MOPSW_TRACKER` entry.
- `frontend/src/layouts/MainLayout.jsx`: removed the "Project Milestones" and "Delay Analysis" links and the "MoPSW Tracker" breadcrumb.

**Backend files deleted**
- `backend/src/controllers/MopswTracker/mopsw_tracker.js` (the folder is now empty and gone)

**API routes removed (6)**
- `GET /tracker-list`, `GET /checkData-tracker/:year/:month/`, `GET /get_addtracker_masterdata/:year/:month`, `POST /add-mopswtracker`, `GET /get-mopswtracker-report`, `GET /download-tracker-excel`
- Some of these were checked against the Cabinet Notes – MoPSW permission. The Cabinet Notes – MoPSW screens never call them, so that module is not affected.

## 12. SOM (Senior Officers Meeting)

There was no backend code or screen for this module. Only these leftovers were removed:
- `frontend/src/config/moduleRegistry.js`: removed the `SENIOR_OFFICE_MEETINGS` entry.
- `frontend/src/layouts/MainLayout.jsx`: removed the "Meeting Schedule", "Minutes of Meeting" and "Action Taken Report" links and the "Senior Officers Meeting" breadcrumb.

**Kept on purpose:** the "Senior Officer" **user role** (`ORG_SENIOR_OFFICER`) and its User List access. That role has nothing to do with this module.

---

## Other irrelevant files removed

| File | Why |
|---|---|
| `backend/user_manual/Governance/Attendance_Manual.pdf` | Old-portal user manual. No link anywhere in 3.0. |
| `backend/user_manual/KnowledgeRepository/KR - User Manual.pdf` | Same as above. |
| `backend/user_manual/ProjectManagement/Project_Manual.pdf` | Same as above. |
| `backend/src/controllers/UserManuals/userManual.js` | Only served the three PDFs above. Its routes (`GET /attendance/user-manual`, `/project/user-manual`, `/kr/user-manual`) were removed too. |
| `backend/testclam.js` | One-off ClamAV test script. The real virus scan code is in `backend/src/utils/clamav.js` and `clamScan.js`, which are unchanged. |
| `test.html` (repo root) | Unused dashboard mock-up page. |
| `package-lock.json` (repo root) | Empty lock file. There is no `package.json` at the root. |
| `frontend/src/modules/UserManagement/walkthrough.md` | Old developer note. |
| `backend/delete_log/cabinet_notes_other/…20260818_123000.txt` | A runtime delete log that had been committed by mistake. It is **no longer tracked by git, but the file is still on disk**. `backend/delete_log/` was added to `.gitignore`. The backend creates these folders when it needs them. |

**Not removed:** `Capex/CAPEX_CHATBOT_CONTEXT.md` and `GEMProcurement/GEM_CHATBOT_CONTEXT.md`. No code uses them, but they are reference notes for setting up the SagarBot chatbot.

## What was intentionally left in place

1. **The hidden-module list** (`HIDDEN_PERMISSION_MODULE_CODES` in `frontend/src/config/moduleRegistry.js`). The 12 modules still have rows in the database table `tbl_modules`. This list keeps them off the User / Module Permission screens. **Do not remove it** unless those rows are also set to `is_active = 0`.
2. **Database tables and data.** Nothing in the database was changed. Tables such as `tbl_iwai_*`, `tbl_cmec_*`, `tbl_cpgrams`, `tbl_psw_meeting` and `tbl_amritkaal` still exist and still hold their data. Dropping them would be a separate, deliberate step.
3. **The old portal** (`c:\xampp\htdocs\sagarmanthan`) and the old backend repository were not changed.

## How this was checked

- Every backend route was mapped to its controller file. Each one being removed was searched for in the frontend source, and none is called.
- No remaining code imports any deleted file. `backend/src/routes.js` loads without errors (1,366 routes registered).
- Frontend production build (`vite build`) succeeds.
- Frontend lint: the edited files have exactly the same lint errors as on `main`, all of them older than this change. No new errors.
- Frontend tests: 645 of 650 pass. The 5 failures (in Attendance, OVOD and VIP Reference tests) also fail on `main` without these changes, so they are not caused by this cleanup.
