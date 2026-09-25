"""
Sagarmanthan Real Database Schema Context for LLM.
Grounded strictly on actual MS SQL Server tables in `sagarmanthan_revamp`.
"""

DB_SCHEMA = """
=== SAGARMANTHAN REAL MS SQL SERVER SCHEMA ===

-- PORT AUTHORITIES / ORGANISATION MASTER
mmt_organisation (
  organisation_id INT PRIMARY KEY,
  organisation_name NVARCHAR(255),    -- e.g. 'Chennai Port Authority', 'Jawaharlal Nehru Port Authority', 'Deendayal Port Authority'
  organisation_code NVARCHAR(50),     -- e.g. 'ChPA', 'MbPA', 'JNPA', 'DPA', 'NMPT', 'PPA', 'SyPPA', 'VOCPA', 'COCHIN'
  status INT
)

-- COURT CASES & LITIGATION
tbl_court_case (
  court_case_id INT PRIMARY KEY,
  organisation_id INT,               -- JOIN mmt_organisation.organisation_id
  case_name NVARCHAR(255),           -- Title / Name of the case
  case_number NVARCHAR(100),         -- Official case registration number
  case_type NVARCHAR(100),           -- Type (e.g. 'Civil', 'Writ Petition', 'Arbitration', 'Criminal')
  type_of_court NVARCHAR(100),       -- Court (e.g. 'High Court', 'Supreme Court', 'District Court', 'Arbitration Tribunal')
  financial_value_matter FLOAT,      -- Financial exposure in Rs / Crores
  disposed INT,                      -- 0 = Pending/Active, 1 = Disposed
  disposed_date DATETIME,            -- Date of disposal if disposed = 1
  created_date DATETIME,
  updated_date DATETIME
)

-- CAPEX (Capital Expenditure & Allocations)
tbl_capex (
  capex_id INT PRIMARY KEY,
  capex_financial_year NVARCHAR(50), -- e.g. '2024-25', '2025-26'
  capex_organisation_id INT,        -- JOIN mmt_organisation.organisation_id
  capex_gbs_value FLOAT,             -- Gross Budgetary Support value (Rs Cr)
  capex_iebr_value FLOAT,            -- Internal and Extra Budgetary Resources value (Rs Cr)
  capex_total_value FLOAT,           -- Total Capex value (Rs Cr)
  capex_ppp_value FLOAT              -- Public Private Partnership value (Rs Cr)
)
tbl_capex_monthly (
  capex_monthly_id INT PRIMARY KEY,
  capex_id INT,
  organisation_id INT,
  month NVARCHAR(20),
  year NVARCHAR(10),
  expenditure_value FLOAT            -- Actual monthly Capex spent
)
tbl_project_capex (
  id INT PRIMARY KEY,
  organisation_id INT,
  project_name NVARCHAR(255),
  sanctioned_cost FLOAT,
  expenditure_till_date FLOAT,
  status NVARCHAR(50)
)

-- GEM PROCUREMENT (Goods, Services, Works)
tbl_gem_procurement (
  gem_procurement_id INT PRIMARY KEY,
  organisation_id INT,               -- JOIN mmt_organisation.organisation_id
  financial_year NVARCHAR(50),
  month NVARCHAR(50),
  goods_potential_through_gem FLOAT,
  goods_procurement_through_gem FLOAT,
  goods_procurement_outside_gem FLOAT,
  service_potential_through_gem FLOAT,
  service_procurement_through_gem FLOAT,
  service_procurement_outside_gem FLOAT,
  works_potential_through_gem FLOAT,
  created_date DATETIME
)
tbl_gem_procurement_goods (
  id INT PRIMARY KEY,
  organisation_id INT,
  financial_year NVARCHAR(50),
  month NVARCHAR(50),
  procurement_amount FLOAT
)

-- CSR EXPENDITURE
tbl_csr_expenditure (
  csr_expenditure_id INT PRIMARY KEY,
  csr_project_id INT,
  year NVARCHAR(20),
  csr_expenditure_cost FLOAT         -- Total CSR expenditure cost
)

-- MINISTRY TRACKER & KPIs
tbl_mopsw_tracker (
  tracker_id INT PRIMARY KEY,
  year NVARCHAR(10),
  month NVARCHAR(20),
  code_id NVARCHAR(50),
  indicator_name NVARCHAR(255),       -- KPI Indicator description
  concerned_mopsw_official NVARCHAR(255),
  value FLOAT                        -- Achievement / Metric value
)

-- CONSULTANTS & HR
tbl_consultant_appointment (
  id INT PRIMARY KEY,
  organisation_id INT,
  candidate_name NVARCHAR(255),
  designation NVARCHAR(255),
  status NVARCHAR(50),
  created_date DATETIME
)

-- SYSTEM USERS
tbl_user (
  user_id INT PRIMARY KEY,
  user_name NVARCHAR(255),
  organisation_id INT,
  role_id INT,
  is_active INT
)

=== SQL GENERATION INSTRUCTIONS ===
1. Use real MS SQL Server T-SQL syntax.
2. Table for Court Cases is `tbl_court_case` (NOT tbl_court_cases).
3. To get Port Authority Name, JOIN `tbl_court_case` or `tbl_capex` or `tbl_gem_procurement` with `mmt_organisation o ON o.organisation_id = t.organisation_id`.
4. Disposed court cases: `disposed = 1`. Active/Pending court cases: `disposed = 0 OR disposed IS NULL`.
5. Return ONLY valid T-SQL SELECT statements.
"""
