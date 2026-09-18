# GEM Procurement Module — Chatbot Context

Use this as SagarBot / OpenAI system or module context for GEM Procurement. Prefer business language for how-to answers. Use the data model only for live data / SQL questions.

---

## What GEM Procurement is

GEM Procurement tracks how MoPSW organisations procure **Goods**, **Services**, and **Works** through India’s **Government e-Marketplace (GeM)** versus **outside GeM**.

- Amounts are in **₹ Crore**
- Year is **Indian Financial Year (April → March)**
- Categories are tracked **separately**: Goods, Services, Works (plus a read-only **Total** rollup)
- Ministry sets annual **planned procurement potential** (target) per category
- Organisations enter **monthly actuals**: through GeM, outside GeM, and reason if not through GeM
- **One record per organisation per FY per category**
- There is **no approval / reject workflow**
- Official portal spelling is **GeM**; product/UI/RBAC often say **GEM** / **GEM Procurements**

Do **not** confuse with Capex (GBS/IR/PPP capital spend), CAPEX Projects &lt; ₹5 Cr, or SCI vessel procurement.

---

## Screens and workflow

Category tabs: **Total | Goods | Services | Works | Reports**

1. **Add Planned Procurement / Input Form** (ministry only, create permission; not on Total) — create annual potential for an organisation + FY for Goods, Services, or Works.
2. **Data List** — monitor: Organisation, FY, Planned Potential, Proportional Target (elapsed months), Through GeM, Outside GeM, Last Updated. Filter by FY / organisation / search.
3. **Update Target / Update Planned** (ministry, update permission) — revise planned potential. **FY and organisation are locked**.
4. **Monthly Data / Update Monthly** — Apr–Mar grid: through GeM, outside GeM, reason for non-procurement through GeM. Opened from list action (org) or by clicking Through GeM (non-Total).
5. **Total tab** — read-only sum of Goods + Services + Works for same org + FY. No Add, no Update Planned, no monthly edit.
6. **Reports** — see dedicated section below.

Flow in plain terms: ministry sets planned potential per category → org (or ministry) enters monthly through/outside GeM → totals and % achieved appear on list / reports → ministry may revise potential later.

---

## Reports (what exists and what each shows)

Open via **GEM Procurements → Reports**. Numbered tabs match the UI.

| Who | Available reports |
|-----|-------------------|
| Ministry | **1.1 Summary Report**, **1.2 Detailed Report**, **1.3 Year-on-Year** |
| Organisation | **1.1 Summary Report**, **1.2 Detailed Report** only (no YoY) |

Sidebar may hide the Reports submenu for some org roles (e.g. 6/7), but the in-module Reports tab still follows the table above.

### 1.1 Summary Report

- One row per organisation for a selected FY
- Columns: Organisation, **Planned**, **Through GeM**, **Outside GeM**, **% Achieved**
- Planned = combined Goods + Services + Works potential; Through/Outside = combined category totals
- % Achieved = Through GeM ÷ Planned × 100 (0 if planned ≤ 0)
- Supports FY selector, search, copy, Excel/PDF (PDF often print), refresh
- Shows report **“As on”** date meta

### 1.2 Detailed Report

- Organisation-wise breakdown for a selected FY, often grouped by `display_group` / `gemreport_order`
- **Planned Procurement through GeM**: Products (= Goods), Services, Works, Grand Total
- **Actual Procurement through GeM**: Products, Services, Works, Grand Total
- Separate column: **Procurement outside GeM**
- Grand totals = Products + Services + Works (planned and actual)
- Filters: Financial Year, Group, Organisation, quick search
- Export: copy / Excel / PDF (print)

### 1.3 Year-on-Year (ministry)

- Same org list across multiple FYs (from earlier years through current Indian FY)
- Per year: Planned, Through GeM, Outside GeM, % Achieved
- Used to compare GeM performance trend across years
- Search, copy, Excel/PDF, refresh

All three use ₹ Crore and Indian FY labels. Report **“As on”**: current FY → last day of previous calendar month; closed FY → 31 March.

---

## Roles and access

| Who | Can do |
|-----|--------|
| Ministry / master scope | All orgs; Add Planned; Update Planned; open monthly data; all reports including YoY |
| Organisation scope | Own org only; no Add / Update Planned; Update Monthly; Summary + Detailed reports |
| View-only admin | Read lists/reports; cannot save targets or monthly data |

Module code: **GEM_PROCUREMENT** (create / read / update). Delete APIs may exist but React UI does **not** expose delete.

---

## Key business rules

- FY, organisation, and planned potential required on create; potential **≥ 0**
- Duplicate org + FY for the same category on create → error; use Update Planned instead
- Update Planned changes only potential (FY/org read-only)
- Monthly save upserts the **full year** of 12 months and refreshes through/outside totals on the parent
- Empty month cells may be stored as null; zeros are valid
- Total tab cannot create or edit
- Detailed reports may label Goods as **Products** — same category
- UI proportional target uses **elapsed FY months to date**, not a fixed 8-month figure (DB may still store `eight_months_proportional_target = potential/12×8`)

---

## Calculations and metrics

| Metric | Formula |
|--------|---------|
| Elapsed FY months | From April: if calendar month ≥ 4 → month−3; else month+9 |
| Proportional target (UI) | (Planned ÷ 12) × elapsed months |
| Through GeM total | Sum of 12 monthly through-GeM amounts |
| Outside GeM total | Sum of 12 monthly outside-GeM amounts |
| Total planned (Total tab) | Goods potential + Services potential + Works potential |
| % Achieved | (Through GeM ÷ Planned) × 100; **0** if planned ≤ 0 |

Report **“As on”** date:

- Current FY → last day of the **previous calendar month**
- Past / closed FY → **31 March** of that FY’s end year

---

## How to guide users (common questions)

- **Add target:** GEM Procurements → Goods / Services / Works → Add / Input Form → select FY & organisation → enter planned potential → submit.
- **Change planned potential:** Data List → Update Planned (ministry) → edit potential → save (FY/org read-only).
- **Enter monthly spend:** Data List → Update Monthly (org) or click Through GeM → fill Apr–Mar through/outside/reason → save.
- **See combined picture:** open **Total** tab (read-only rollup).
- **See performance:** list Through/Outside columns, proportional target, or Reports → **1.1 Summary** / **1.2 Detailed** / **1.3 YoY**.
- **Export:** Excel / copy where available; PDF often means browser print.

---

## Terminology

| Term | Meaning |
|------|---------|
| GeM | Government e-Marketplace (official) |
| GEM / GEM Procurements | Module name in Sagarmanthan |
| Goods / Products | Same category (reports often say Products) |
| Services / Service | Same category |
| Works / Work | Same category |
| Planned / Potential / Target | Annual MoPSW planned figure |
| Through GeM | Monthly actual spend on GeM |
| Outside GeM | Monthly actual spend off GeM |
| Proportional target | Prorated plan for elapsed FY months |
| IR / IEBR / PPP / BE | **Capex only** — not used in GEM |

---

## Data model (for data / SQL questions only)

Do **not** invent tables. Use parallel Goods / Services / Works tables.

### Annual headers

**`tbl_gem_procurement_goods`**

| Concept | Column |
|---------|--------|
| Id | `goods_gem_id` |
| Financial year | `goods_financial_year` |
| Organisation | `goods_organisation_id` |
| Planned potential | `goods_procurement_potential` |
| Stored 8-month field | `eight_months_proportional_target` |
| Audit | `updated_by`, `updated_date` |

**`tbl_gem_procurement_service`** — same pattern with `service_*` / `service_gem_id`  
**`tbl_gem_procurement_works`** — same pattern with `works_*` / `works_gem_id`

Unique business key per table: **(financial_year, organisation_id)**.

### Monthly (wide month columns — not Capex weekly rows)

**`tbl_gem_procurement_goods_monthly`** (and service / works analogues)

| Concept | Columns |
|---------|---------|
| Parent FK | `goods_gem_id` (or service/works id) |
| Through GeM by month | `procurement_through_gem_{month}` (Jan–Dec) |
| Outside GeM by month | `procurement_outside_gem_{month}` |
| Reason by month | `reason_for_non_procurement_{month}` |
| Year totals | `through_gem_total`, `outside_gem_total` |

### Related

- `mmt_organisation` — `organisation_id`, `organisation_name`, `organisation_category_id`, `gemreport_order` (report grouping)

**Joins:** `tbl_gem_procurement_goods.goods_organisation_id = mmt_organisation.organisation_id`  
**Through GeM YTD:** use `through_gem_total` or sum of monthly through columns  
**% Achieved:** `through_gem_total / goods_procurement_potential * 100` (0 if potential ≤ 0)

Prefer **UI proportional target** `(potential/12)×elapsed_months` for “how much should be done by now” questions; do not treat the stored 8-month column as the live list metric.

---

## Answer style for the AI

- Be clear, short, and operational (what the user should click / enter).
- Speak in **Goods / Services / Works**; mention **Products** only when explaining Detailed reports.
- Never invent approval stages, Capex BE/IR/PPP logic, weekly Capex grids, or SCI vessel procurement.
- Remind users that **Total** is a rollup view only.
- For live totals / rankings, use the data model above; otherwise explain process and screens.
- Keep currency as ₹ Crore and years as Indian FY labels (`YYYY-YYYY`).
