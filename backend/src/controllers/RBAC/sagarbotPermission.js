import { pool } from '../../db.js';

// Default Master Module & Dashboard Definitions
export const DEFAULT_SAGARBOT_ITEMS = [
  { itemKey: 'dashboard', itemName: 'Main Ministry Dashboard', category: 'Dashboard & Overview', isEnabled: true },
  { itemKey: 'PROJECTS', itemName: 'Project Monitoring', category: 'Projects & Strategies', isEnabled: true },
  { itemKey: 'CSR_PROJECTS', itemName: 'CSR Projects & Fund', category: 'Projects & Strategies', isEnabled: true },
  { itemKey: 'MIV_2030', itemName: 'Maritime India Vision 2030 (MIV)', category: 'Projects & Strategies', isEnabled: true },
  { itemKey: 'GMIS_MOU', itemName: 'GMIS & IMW MoUs', category: 'Projects & Strategies', isEnabled: true },
  { itemKey: 'ONE_VISION_ONE_DOCUMENT', itemName: 'One Vision One Document (OVOD / Drishti)', category: 'Projects & Strategies', isEnabled: true },
  { itemKey: 'CAPEX', itemName: 'Capex Outlay & Tracking', category: 'Projects & Strategies', isEnabled: true },
  { itemKey: 'EXPENDITURE', itemName: 'Expenditure Details', category: 'Projects & Strategies', isEnabled: true },
  { itemKey: 'KPI_MAJOR_PORTS', itemName: 'Major Ports KPI', category: 'KPI & Performance', isEnabled: true },
  { itemKey: 'KPI_DGS', itemName: 'Directorate General of Shipping (DGS)', category: 'KPI & Performance', isEnabled: true },
  { itemKey: 'KPI_IWAI', itemName: 'Inland Waterways Authority (IWAI)', category: 'KPI & Performance', isEnabled: true },
  { itemKey: 'KPI_DGLL', itemName: 'Directorate General of Lighthouses (DGLL)', category: 'KPI & Performance', isEnabled: true },
  { itemKey: 'KPI_CSL', itemName: 'Cochin Shipyard Limited (CSL)', category: 'KPI & Performance', isEnabled: true },
  { itemKey: 'KPI_IMU', itemName: 'Indian Maritime University (IMU)', category: 'KPI & Performance', isEnabled: true },
  { itemKey: 'KPI_SCI', itemName: 'Shipping Corporation of India (SCI)', category: 'KPI & Performance', isEnabled: true },
  { itemKey: 'ATTENDANCE', itemName: 'Attendance Monitoring', category: 'Governance & Operations', isEnabled: true },
  { itemKey: 'EOFFICE', itemName: 'E-Office Pendency & Disposal', category: 'Governance & Operations', isEnabled: true },
  { itemKey: 'CPGRAMS', itemName: 'CPGRAMS Public Grievances', category: 'Governance & Operations', isEnabled: true },
  { itemKey: 'VIP_REFERENCE', itemName: 'VIP References (6 Stages)', category: 'Governance & Operations', isEnabled: true },
  { itemKey: 'CABINET_NOTES', itemName: 'Cabinet Notes (MoPSW)', category: 'Governance & Operations', isEnabled: true },
  { itemKey: 'CABINET_NOTES_OTHER', itemName: 'Cabinet Notes (Other Ministries)', category: 'Governance & Operations', isEnabled: true },
  { itemKey: 'PARLIAMENTARY_ISSUES', itemName: 'Parliamentary Issues', category: 'Governance & Operations', isEnabled: true },
  { itemKey: 'GEM_PROCUREMENT', itemName: 'GeM Procurement', category: 'Governance & Operations', isEnabled: true },
  { itemKey: 'MEDIA_OUTREACH', itemName: 'Social Media & Outreach', category: 'Governance & Operations', isEnabled: true },
  { itemKey: 'AUDIT_PARA', itemName: 'Audit Para & Observations', category: 'Governance & Operations', isEnabled: true },
  { itemKey: 'DECISION_IMPLEMENTATION', itemName: 'Decision Implementation', category: 'Governance & Operations', isEnabled: true },
  { itemKey: 'INTER_STATE', itemName: 'Inter-State Issues', category: 'Governance & Operations', isEnabled: true },
  { itemKey: 'INTER_MINISTERIAL', itemName: 'Inter-Ministerial Issues', category: 'Governance & Operations', isEnabled: true },
  { itemKey: 'OFFICIAL_FOREIGN_VISIT', itemName: 'Official Foreign Visits', category: 'Governance & Operations', isEnabled: true },
  { itemKey: 'FLAGGED_SHIPS', itemName: 'Flagged Vessels & Ships', category: 'Governance & Operations', isEnabled: true },
  { itemKey: 'CRUISE_PORTS', itemName: 'Cruise Terminals & Ports', category: 'Governance & Operations', isEnabled: true },
  { itemKey: 'REVIEW_ITEMS', itemName: 'MoPSW Review Items', category: 'Governance & Operations', isEnabled: true },
  { itemKey: 'YOUNG_PROFESSIONALS', itemName: 'Young Professionals (YP)', category: 'HR & Capacity', isEnabled: true },
  { itemKey: 'CONSULTANT_APPOINTMENT', itemName: 'Consultant Appointments', category: 'HR & Capacity', isEnabled: true },
  { itemKey: 'HR_MANAGEMENT', itemName: 'HR Management & Vacancies', category: 'HR & Capacity', isEnabled: true },
  { itemKey: 'COURT_CASES', itemName: 'Court Cases & Arbitrations', category: 'Legal & Regulations', isEnabled: true },
  { itemKey: 'ACTS_AND_RULES', itemName: 'Acts & Pre-Constitution Bills', category: 'Legal & Regulations', isEnabled: true },
];

// Fallback in-memory cache
let inMemoryPermissions = {
  globalEnabled: true,
  items: DEFAULT_SAGARBOT_ITEMS.map(i => ({ ...i }))
};

// Ensure database table exists
async function ensureTable(conn) {
  try {
    const checkTableSql = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='tbl_sagarbot_module_permissions' AND xtype='U')
      BEGIN
        CREATE TABLE tbl_sagarbot_module_permissions (
          id INT IDENTITY(1,1) PRIMARY KEY,
          item_key VARCHAR(100) NOT NULL UNIQUE,
          item_name NVARCHAR(200) NOT NULL,
          category NVARCHAR(100) NOT NULL,
          is_enabled BIT NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT GETDATE(),
          updated_at DATETIME DEFAULT GETDATE()
        );
      END
    `;
    await conn.request().query(checkTableSql);
  } catch (err) {
    console.warn('[SagarBot Permissions] ensureTable warning:', err.message);
  }
}

// 1. GET /api/sagarbot-permissions
export async function getSagarbotPermissions(req, res) {
  try {
    const conn = await pool;
    if (conn) {
      await ensureTable(conn);
      const queryResult = await conn.request().query(`
        SELECT item_key, item_name, category, is_enabled 
        FROM tbl_sagarbot_module_permissions
      `);

      if (queryResult.recordset && queryResult.recordset.length > 0) {
        const dbItems = queryResult.recordset;
        const mapped = DEFAULT_SAGARBOT_ITEMS.map(def => {
          const found = dbItems.find(d => d.item_key.toUpperCase() === def.itemKey.toUpperCase());
          return {
            itemKey: def.itemKey,
            itemName: def.itemName,
            category: def.category,
            isEnabled: found ? Boolean(found.is_enabled) : def.isEnabled
          };
        });

        const globalFound = dbItems.find(d => d.item_key === '__GLOBAL__');
        const globalEnabled = globalFound ? Boolean(globalFound.is_enabled) : inMemoryPermissions.globalEnabled;

        return res.json({
          globalEnabled,
          permissions: mapped
        });
      }
    }

    // Fallback to in-memory store
    return res.json({
      globalEnabled: inMemoryPermissions.globalEnabled,
      permissions: inMemoryPermissions.items
    });
  } catch (error) {
    console.error('getSagarbotPermissions error:', error);
    return res.json({
      globalEnabled: inMemoryPermissions.globalEnabled,
      permissions: inMemoryPermissions.items
    });
  }
}

// 2. PUT /api/sagarbot-permissions
export async function updateSagarbotPermissions(req, res) {
  try {
    const { globalEnabled, permissions } = req.body;

    if (globalEnabled !== undefined) {
      inMemoryPermissions.globalEnabled = Boolean(globalEnabled);
    }

    if (permissions && typeof permissions === 'object') {
      inMemoryPermissions.items = inMemoryPermissions.items.map(item => {
        if (permissions[item.itemKey] !== undefined) {
          return { ...item, isEnabled: Boolean(permissions[item.itemKey]) };
        }
        return item;
      });
    }

    const conn = await pool;
    if (conn) {
      await ensureTable(conn);

      // Save Global toggle
      if (globalEnabled !== undefined) {
        const globalReq = conn.request();
        globalReq.input('item_key', '__GLOBAL__');
        globalReq.input('item_name', 'Global Master Switch');
        globalReq.input('category', 'Global');
        globalReq.input('is_enabled', globalEnabled ? 1 : 0);
        await globalReq.query(`
          IF EXISTS (SELECT 1 FROM tbl_sagarbot_module_permissions WHERE item_key = @item_key)
          BEGIN
            UPDATE tbl_sagarbot_module_permissions 
            SET is_enabled = @is_enabled, updated_at = GETDATE()
            WHERE item_key = @item_key;
          END
          ELSE
          BEGIN
            INSERT INTO tbl_sagarbot_module_permissions (item_key, item_name, category, is_enabled)
            VALUES (@item_key, @item_name, @category, @is_enabled);
          END
        `);
      }

      // Save Module toggles
      if (permissions && typeof permissions === 'object') {
        for (const item of inMemoryPermissions.items) {
          if (permissions[item.itemKey] !== undefined) {
            const reqItem = conn.request();
            reqItem.input('item_key', item.itemKey);
            reqItem.input('item_name', item.itemName);
            reqItem.input('category', item.category);
            reqItem.input('is_enabled', permissions[item.itemKey] ? 1 : 0);
            await reqItem.query(`
              IF EXISTS (SELECT 1 FROM tbl_sagarbot_module_permissions WHERE item_key = @item_key)
              BEGIN
                UPDATE tbl_sagarbot_module_permissions 
                SET is_enabled = @is_enabled, updated_at = GETDATE()
                WHERE item_key = @item_key;
              END
              ELSE
              BEGIN
                INSERT INTO tbl_sagarbot_module_permissions (item_key, item_name, category, is_enabled)
                VALUES (@item_key, @item_name, @category, @is_enabled);
              END
            `);
          }
        }
      }
    }

    return res.json({
      success: true,
      message: 'SagarBot Copilot permissions updated successfully.',
      globalEnabled: inMemoryPermissions.globalEnabled,
      permissions: inMemoryPermissions.items
    });
  } catch (error) {
    console.error('updateSagarbotPermissions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update SagarBot permissions: ' + error.message,
      globalEnabled: inMemoryPermissions.globalEnabled,
      permissions: inMemoryPermissions.items
    });
  }
}

// 3. POST /api/sagarbot-permissions/reset
export async function resetSagarbotPermissions(req, res) {
  try {
    inMemoryPermissions = {
      globalEnabled: true,
      items: DEFAULT_SAGARBOT_ITEMS.map(i => ({ ...i, isEnabled: true }))
    };

    const conn = await pool;
    if (conn) {
      await ensureTable(conn);
      await conn.request().query(`
        UPDATE tbl_sagarbot_module_permissions 
        SET is_enabled = 1, updated_at = GETDATE();
      `);
    }

    return res.json({
      success: true,
      message: 'All SagarBot Copilot permissions reset to enabled.',
      globalEnabled: true,
      permissions: inMemoryPermissions.items
    });
  } catch (error) {
    console.error('resetSagarbotPermissions error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
