# VIP Reference Pagination & Filtering Implementation

I have successfully implemented dynamic database-level pagination, filtering, and searching for the VIP Reference module.

## Backend Changes

### 1. Updated Controller: `getVipReference`
- **File:** [vipReference.js](file:///c:/Users/dwara/Desktop/sagarmanthan-v2/backend/src/controllers/Governance/vipReference.js)
- **Action:** 
  - Commented out the old simple `getVipReference` API completely.
  - Implemented SQL-level query filtering in a robust `WHERE` clause:
    - **Wing Filter:** Matches `mmt_wings.wing_name`.
    - **Division Filter:** Matches `mmt_division.division_name`.
    - **Status Filter:** Matches `mmt_vip_stage.stage_name` (with fallback logic mapping steps `1-6`).
    - **Search Query:** Performs a wildcard search (`LIKE %search%`) on `subject`, `ref_letter_num`, `received_from`, `wing_name`, and `division_name`.
  - Added SQL Server pagination (`OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`).
  - Added window function `COUNT(*) OVER() AS total_count` for overall totals.

## Frontend Changes

### 1. Paginated Orchestrator: `VIPReferenceInput`
- **File:** [VIPReferenceInput.jsx](file:///c:/Users/dwara/Desktop/sagarmanthan-v2/frontend/src/modules/VIPReference/VIPReferenceInput.jsx)
- **Action:**
  - Integrated server-side pagination parameters (`page`, `limit`) and filters (`wing`, `division`, `status`, `search`) in the HTTP request.
  - Fetches data dynamically on pagination or filter modifications.
  - Added debounced searching to avoid triggering rapid database scans during typing.
