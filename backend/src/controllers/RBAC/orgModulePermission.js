import sql from 'mssql';
import { pool } from '../../db.js';

async function getUsermatrixCategories(req, res) {
  try {
    const conn = await pool;
    const result = await conn.request().query(`
      SELECT organisation_usermatrix_category_id AS category_id,
             organisation_usermatrix_category_name AS category_name
      FROM mmt_organisation_usermatrix_category
      ORDER BY organisation_usermatrix_category_id
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('getUsermatrixCategories:', error);
    res.status(500).json({ message: 'Failed to load categories' });
  }
}

async function getOrganisationsByCategory(req, res) {
  const categoryId = req.query.categoryId;
  try {
    const conn = await pool;
    const request = conn.request();
    let sqlText = `
      SELECT o.organisation_id,
             o.organisation_name,
             o.organisation_code,
             o.organisation_usermatrix_category_id AS category_id,
             c.organisation_usermatrix_category_name AS category_name,
             o.status
      FROM mmt_organisation o
      LEFT JOIN mmt_organisation_usermatrix_category c
        ON c.organisation_usermatrix_category_id = o.organisation_usermatrix_category_id
      WHERE ISNULL(o.status, 1) = 1
    `;
    if (categoryId && categoryId !== 'all') {
      request.input('categoryId', Number(categoryId));
      sqlText += ` AND o.organisation_usermatrix_category_id = @categoryId`;
    }
    sqlText += ` ORDER BY c.organisation_usermatrix_category_name, o.organisation_name`;
    const result = await request.query(sqlText);
    res.json(result.recordset);
  } catch (error) {
    console.error('getOrganisationsByCategory:', error);
    res.status(500).json({ message: 'Failed to load organisations' });
  }
}

async function getActiveModules(req, res) {
  try {
    const conn = await pool;
    const result = await conn.request().query(`
      SELECT module_id, module_name, module_code, is_active
      FROM tbl_modules
      WHERE ISNULL(is_active, 1) = 1
      ORDER BY module_name
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('getActiveModules:', error);
    res.status(500).json({ message: 'Failed to load modules' });
  }
}

async function getOrgModulePermissions(req, res) {
  const raw = req.query.organisationIds || '';
  const organisationIds = String(raw)
    .split(',')
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (organisationIds.length === 0) {
    return res.status(400).json({ message: 'organisationIds required' });
  }

  try {
    const conn = await pool;
    const idList = organisationIds.join(',');

    const result = await conn.request().query(`
      SELECT
        o.organisation_id,
        o.organisation_name,
        m.module_id,
        m.module_name,
        m.module_code,
        CAST(COALESCE(p.is_allowed, 0) AS BIT) AS is_allowed
      FROM mmt_organisation o
      CROSS JOIN tbl_modules m
      LEFT JOIN tbl_rbac_org_module_permission p
        ON p.organisation_id = o.organisation_id
       AND p.module_id = m.module_id
      WHERE o.organisation_id IN (${idList})
        AND ISNULL(m.is_active, 1) = 1
      ORDER BY o.organisation_name, m.module_name
    `);

    const byOrg = {};
    for (const row of result.recordset) {
      if (!byOrg[row.organisation_id]) {
        byOrg[row.organisation_id] = {
          organisationId: row.organisation_id,
          organisationName: row.organisation_name,
          modules: [],
        };
      }
      byOrg[row.organisation_id].modules.push({
        module_id: row.module_id,
        module_name: row.module_name,
        module_code: row.module_code,
        is_allowed: !!row.is_allowed,
      });
    }

    res.json(Object.values(byOrg));
  } catch (error) {
    console.error('getOrgModulePermissions:', error);
    res.status(500).json({ message: 'Failed to load org module permissions' });
  }
}

async function saveOrgModulePermissions(req, res) {
  const { organisationIds, modules, updatedBy } = req.body || {};

  if (!Array.isArray(organisationIds) || organisationIds.length === 0) {
    return res.status(400).json({ message: 'organisationIds required' });
  }
  if (!Array.isArray(modules) || modules.length === 0) {
    return res.status(400).json({ message: 'modules required' });
  }

  const rawActor = req.user?.userId ?? updatedBy;
  const actorId = Number(rawActor);
  const resolvedActorId = Number.isFinite(actorId) && actorId > 0 ? actorId : null;

  const rows = [];
  for (const organisationId of organisationIds) {
    const orgId = Number(organisationId);
    if (!orgId) continue;
    for (const mod of modules) {
      const moduleId = Number(mod.moduleId);
      if (!moduleId) continue;
      rows.push({
        organisation_id: orgId,
        module_id: moduleId,
        is_allowed: mod.isAllowed ? 1 : 0,
      });
    }
  }

  if (rows.length === 0) {
    return res.status(400).json({ message: 'No valid rows to save' });
  }

  try {
    const conn = await pool;
    const request = conn.request();
    request.input('actorId', sql.Int, resolvedActorId);
    request.input('payload', sql.NVarChar(sql.MAX), JSON.stringify(rows));
    request.input(
      'targetSummary',
      sql.NVarChar(500),
      `${organisationIds.length} org(s), ${modules.length} module(s), ${rows.length} row(s)`
    );
    request.input(
      'payloadJson',
      sql.NVarChar(sql.MAX),
      JSON.stringify({ organisationIds, modules })
    );

    await request.query(`
      BEGIN TRY
        BEGIN TRAN;

        ;WITH src AS (
          SELECT
            organisation_id,
            module_id,
            CAST(is_allowed AS BIT) AS is_allowed
          FROM OPENJSON(@payload)
          WITH (
            organisation_id INT '$.organisation_id',
            module_id       INT '$.module_id',
            is_allowed      INT '$.is_allowed'
          )
        )
        MERGE dbo.tbl_rbac_org_module_permission AS t
        USING src AS s
          ON t.organisation_id = s.organisation_id
         AND t.module_id = s.module_id
        WHEN MATCHED THEN
          UPDATE SET
            is_allowed = s.is_allowed,
            updated_at = SYSUTCDATETIME(),
            updated_by = @actorId
        WHEN NOT MATCHED THEN
          INSERT (organisation_id, module_id, is_allowed, created_at, updated_at, created_by, updated_by)
          VALUES (s.organisation_id, s.module_id, s.is_allowed, SYSUTCDATETIME(), SYSUTCDATETIME(), @actorId, @actorId);

        INSERT INTO dbo.tbl_rbac_org_module_permission_log
          (created_by, target_summary, payload_json, created_date)
        VALUES
          (@actorId, @targetSummary, @payloadJson, SYSUTCDATETIME());

        COMMIT TRAN;
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        THROW;
      END CATCH
    `);

    res.json({ message: 'Organisation module permissions saved', rowsAffected: rows.length });
  } catch (error) {
    console.error('saveOrgModulePermissions:', error);
    res.status(500).json({
      message: 'Failed to save org module permissions',
      detail: error.message,
    });
  }
}

async function getAllowedModulesForOrganisation(req, res) {
  const organisationId = Number(req.params.organisationId);
  if (!organisationId) {
    return res.status(400).json({ message: 'organisationId required' });
  }

  try {
    const conn = await pool;
    const request = conn.request();
    request.input('organisationId', organisationId);

    const result = await request.query(`
      SELECT m.module_id, m.module_name, m.module_code
      FROM tbl_rbac_org_module_permission p
      INNER JOIN tbl_modules m ON m.module_id = p.module_id
      WHERE p.organisation_id = @organisationId
        AND p.is_allowed = 1
        AND ISNULL(m.is_active, 1) = 1
      ORDER BY m.module_name
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('getAllowedModulesForOrganisation:', error);
    res.status(500).json({ message: 'Failed to load allowed modules' });
  }
}

export default {
  getUsermatrixCategories,
  getOrganisationsByCategory,
  getActiveModules,
  getOrgModulePermissions,
  saveOrgModulePermissions,
  getAllowedModulesForOrganisation,
};
