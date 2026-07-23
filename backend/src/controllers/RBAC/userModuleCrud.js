import sql from 'mssql';
import { pool } from '../../db.js';

async function getMatrixUsers(req, res) {
  const { categoryId, organisationId, roleId } = req.query;

  try {
    const conn = await pool;
    const request = conn.request();

    let sqlText = `
      SELECT
        u.user_id,
        u.title,
        u.name,
        u.email,
        u.designation,
        u.role_id,
        r.role_name,
        r.role_code,
        u.organisation_id,
        o.organisation_name,
        o.organisation_usermatrix_category_id AS category_id,
        c.organisation_usermatrix_category_name AS category_name,
        u.wing_id,
        u.division_id,
        u.status
      FROM tbl_user u
      INNER JOIN tbl_role r ON r.role_id = u.role_id
      INNER JOIN mmt_organisation o ON o.organisation_id = u.organisation_id
      LEFT JOIN mmt_organisation_usermatrix_category c
        ON c.organisation_usermatrix_category_id = o.organisation_usermatrix_category_id
      WHERE ISNULL(u.status, 1) = 1
        AND ISNULL(r.is_active, 1) = 1
    `;

    if (categoryId && categoryId !== 'all') {
      request.input('categoryId', Number(categoryId));
      sqlText += ` AND o.organisation_usermatrix_category_id = @categoryId`;
    }
    if (organisationId && organisationId !== 'all') {
      request.input('organisationId', Number(organisationId));
      sqlText += ` AND u.organisation_id = @organisationId`;
    }
    if (roleId && roleId !== 'all') {
      request.input('roleId', Number(roleId));
      sqlText += ` AND u.role_id = @roleId`;
    }

    sqlText += ` ORDER BY u.name`;

    const result = await request.query(sqlText);
    res.json(result.recordset);
  } catch (error) {
    console.error('getMatrixUsers:', error);
    res.status(500).json({ message: 'Failed to load users' });
  }
}

async function getUserModuleCrud(req, res) {
  const rawUsers = req.query.userIds || '';
  const organisationId = req.query.organisationId
    ? Number(req.query.organisationId)
    : null;

  const userIds = String(rawUsers)
    .split(',')
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (userIds.length === 0) {
    return res.status(400).json({ message: 'userIds required' });
  }

  try {
    const conn = await pool;
    const idList = userIds.join(',');
    const request = conn.request();

    let moduleFilterSql = '';
    if (organisationId) {
      request.input('organisationId', organisationId);
      moduleFilterSql = `
        AND m.module_id IN (
          SELECT p.module_id
          FROM tbl_rbac_org_module_permission p
          WHERE p.organisation_id = @organisationId AND p.is_allowed = 1
        )
      `;
    }

    const result = await request.query(`
      SELECT
        u.user_id,
        m.module_id,
        m.module_name,
        m.module_code,
        CAST(COALESCE(c.can_create, 0) AS BIT) AS can_create,
        CAST(COALESCE(c.can_read, 0) AS BIT) AS can_read,
        CAST(COALESCE(c.can_update, 0) AS BIT) AS can_update,
        CAST(COALESCE(c.can_delete, 0) AS BIT) AS can_delete
      FROM tbl_user u
      CROSS JOIN tbl_modules m
      LEFT JOIN tbl_rbac_user_module_crud c
        ON c.user_id = u.user_id AND c.module_id = m.module_id
      WHERE u.user_id IN (${idList})
        AND ISNULL(m.is_active, 1) = 1
        ${moduleFilterSql}
      ORDER BY u.user_id, m.module_name
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('getUserModuleCrud:', error);
    res.status(500).json({ message: 'Failed to load user CRUD permissions' });
  }
}

async function saveUserModuleCrud(req, res) {
  const { userIds, permissions, updatedBy } = req.body || {};

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ message: 'userIds required' });
  }
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return res.status(400).json({ message: 'permissions required' });
  }

  const rawActor = req.user?.userId ?? updatedBy;
  const actorId = Number(rawActor);
  const resolvedActorId = Number.isFinite(actorId) && actorId > 0 ? actorId : null;

  const rows = [];
  for (const userId of userIds) {
    const uid = Number(userId);
    if (!uid) continue;
    for (const perm of permissions) {
      const moduleId = Number(perm.moduleId);
      if (!moduleId) continue;
      rows.push({
        user_id: uid,
        module_id: moduleId,
        can_create: perm.canCreate ? 1 : 0,
        can_read: perm.canRead ? 1 : 0,
        can_update: perm.canUpdate ? 1 : 0,
        can_delete: perm.canDelete ? 1 : 0,
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
      `${userIds.length} user(s), ${permissions.length} module(s), ${rows.length} row(s)`
    );
    request.input(
      'payloadJson',
      sql.NVarChar(sql.MAX),
      JSON.stringify({ userIds, permissions })
    );

    await request.query(`
      BEGIN TRY
        BEGIN TRAN;

        ;WITH src AS (
          SELECT
            user_id,
            module_id,
            CAST(can_create AS BIT) AS can_create,
            CAST(can_read AS BIT) AS can_read,
            CAST(can_update AS BIT) AS can_update,
            CAST(can_delete AS BIT) AS can_delete
          FROM OPENJSON(@payload)
          WITH (
            user_id    INT '$.user_id',
            module_id  INT '$.module_id',
            can_create INT '$.can_create',
            can_read   INT '$.can_read',
            can_update INT '$.can_update',
            can_delete INT '$.can_delete'
          )
        )
        MERGE dbo.tbl_rbac_user_module_crud AS t
        USING src AS s
          ON t.user_id = s.user_id AND t.module_id = s.module_id
        WHEN MATCHED THEN
          UPDATE SET
            can_create = s.can_create,
            can_read   = s.can_read,
            can_update = s.can_update,
            can_delete = s.can_delete,
            updated_at = SYSUTCDATETIME(),
            updated_by = @actorId
        WHEN NOT MATCHED THEN
          INSERT (user_id, module_id, can_create, can_read, can_update, can_delete,
                  created_at, updated_at, created_by, updated_by)
          VALUES (s.user_id, s.module_id, s.can_create, s.can_read, s.can_update, s.can_delete,
                  SYSUTCDATETIME(), SYSUTCDATETIME(), @actorId, @actorId);

        INSERT INTO dbo.tbl_rbac_user_module_crud_log
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

    res.json({ message: 'User permissions saved', rowsAffected: rows.length });
  } catch (error) {
    console.error('saveUserModuleCrud:', error);
    res.status(500).json({
      message: 'Failed to save user permissions',
      detail: error.message,
    });
  }
}

export default {
  getMatrixUsers,
  getUserModuleCrud,
  saveUserModuleCrud,
};
