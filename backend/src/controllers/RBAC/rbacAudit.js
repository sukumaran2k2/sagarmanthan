import { pool } from '../../db.js';

async function insertLog(tableName, { createdBy, targetSummary, payload }) {
  const payloadJson = JSON.stringify(payload ?? {});
  const conn = await pool;
  const request = conn.request();
  request.input('createdBy', createdBy || null);
  request.input('targetSummary', targetSummary || null);
  request.input('payloadJson', payloadJson);

  await request.query(`
    INSERT INTO dbo.${tableName}
      (created_by, target_summary, payload_json, created_date)
    VALUES
      (@createdBy, @targetSummary, @payloadJson, SYSUTCDATETIME())
  `);
}

export async function writeOrgModulePermissionLog({
  createdBy,
  targetSummary,
  payload,
}) {
  try {
    await insertLog('tbl_rbac_org_module_permission_log', {
      createdBy,
      targetSummary,
      payload,
    });
  } catch (err) {
    console.error('writeOrgModulePermissionLog failed:', err.message);
  }
}

export async function writeUserModuleCrudLog({
  createdBy,
  targetSummary,
  payload,
}) {
  try {
    await insertLog('tbl_rbac_user_module_crud_log', {
      createdBy,
      targetSummary,
      payload,
    });
  } catch (err) {
    console.error('writeUserModuleCrudLog failed:', err.message);
  }
}

export async function getOrgModulePermissionLog(req, res) {
  return getLog(req, res, 'tbl_rbac_org_module_permission_log');
}

export async function getUserModuleCrudLog(req, res) {
  return getLog(req, res, 'tbl_rbac_user_module_crud_log');
}

async function getLog(req, res, tableName) {
  const createdBy = req.query.createdBy ? Number(req.query.createdBy) : null;
  const fromDate = req.query.fromDate || null;
  const toDate = req.query.toDate || null;
  const top = Math.min(Number(req.query.top) || 100, 500);

  try {
    const conn = await pool;
    const request = conn.request();
    request.input('top', top);

    let sql = `
      SELECT TOP (@top)
        a.log_id,
        a.created_by,
        u.name AS created_by_name,
        a.target_summary,
        a.payload_json,
        a.created_date
      FROM dbo.${tableName} a
      LEFT JOIN dbo.tbl_user u ON u.user_id = a.created_by
      WHERE 1 = 1
    `;

    if (createdBy) {
      request.input('createdBy', createdBy);
      sql += ` AND a.created_by = @createdBy`;
    }
    if (fromDate) {
      request.input('fromDate', fromDate);
      sql += ` AND a.created_date >= @fromDate`;
    }
    if (toDate) {
      request.input('toDate', toDate);
      sql += ` AND a.created_date <= @toDate`;
    }

    sql += ` ORDER BY a.created_date DESC, a.log_id DESC`;

    const result = await request.query(sql);
    res.json(result.recordset);
  } catch (error) {
    console.error(`getLog(${tableName}):`, error);
    res.status(500).json({
      message: `Failed to load log. Ensure ${tableName} exists.`,
    });
  }
}
