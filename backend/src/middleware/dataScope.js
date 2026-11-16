export function getDataScope(user) {
  const scope = String(user?.dataScopeCode || '').toUpperCase();
  const organisationId = Number(user?.organisationId);
  // No data scope sees no organisation's data (every portal role has one)
  const isWide = scope === 'MASTER' || scope === 'MINISTRY';
  const isOrganisation = scope === 'ORGANISATION';
  return { scope, organisationId, isWide, isOrganisation };
}

export function applyDataScope(request, user, options = {}) {
  const {
    strategy = 'directOrgColumn',
    alias = 't',
    createdByColumn = 'created_by',
    orgColumn = 'organisation_id',
  } = options;

  const { organisationId, isWide, isOrganisation } = getDataScope(user);

  if (isWide) {
    return { joinSql: '', whereSql: '' };
  }

  if (!isOrganisation) {
    return { joinSql: '', whereSql: ' AND 1 = 0 ' };
  }

  if (!Number.isFinite(organisationId) || organisationId <= 0) {
    return { joinSql: '', whereSql: ' AND 1 = 0 ' };
  }

  request.input('dataScopeOrgId', organisationId);

  // No organisation_id on the table (e.g. parliamentary issues)
  if (strategy === 'viaCreatedBy') {
    return {
      joinSql: `
        INNER JOIN tbl_user scope_user
          ON scope_user.user_id = ${alias}.${createdByColumn}
      `,
      whereSql: ' AND scope_user.organisation_id = @dataScopeOrgId ',
    };
  }

  return {
    joinSql: '',
    whereSql: ` AND ${alias}.${orgColumn} = @dataScopeOrgId `,
  };
}

/**
 * The same data scope as applyDataScope(), but as a single SQL boolean expression
 * instead of a JOIN + WHERE pair.
 *
 * Dashboards and reports aggregate with LEFT JOINs and GROUP BY, where adding the
 * INNER JOIN that applyDataScope() returns would silently turn an outer join into an
 * inner one and drop the zero-count rows those reports exist to show. This predicate
 * drops into a WHERE clause or into a LEFT JOIN's ON clause without changing the
 * shape of the join.
 *
 * Returns '1 = 1' for Ministry / master scope, '1 = 0' when the user has no usable
 * scope (fail closed), and an EXISTS / column test for organisation scope.
 */
export function dataScopePredicate(request, user, options = {}) {
  const {
    strategy = 'directOrgColumn',
    alias = 't',
    createdByColumn = 'created_by',
    orgColumn = 'organisation_id',
    paramName = 'dataScopeOrgId',
  } = options;

  const { organisationId, isWide, isOrganisation } = getDataScope(user);

  if (isWide) return '1 = 1';
  if (!isOrganisation) return '1 = 0';
  if (!Number.isFinite(organisationId) || organisationId <= 0) return '1 = 0';

  // mssql rejects a second input() under the same name, so one request object can
  // build several scoped queries without re-declaring the parameter.
  if (!request.parameters || !request.parameters[paramName]) {
    request.input(paramName, organisationId);
  }

  if (strategy === 'viaCreatedBy') {
    return `EXISTS (
      SELECT 1 FROM tbl_user AS scope_user
      WHERE scope_user.user_id = ${alias}.${createdByColumn}
        AND scope_user.organisation_id = @${paramName}
    )`;
  }

  return `${alias}.${orgColumn} = @${paramName}`;
}

export default {
  getDataScope,
  applyDataScope,
  dataScopePredicate,
};

// The Ministry of Ports, Shipping and Waterways in mmt_organisation (2.0 numbering)
export const MOPSW_ORGANISATION_ID = 14;

// For routes that take a user id in the address and decide access from that user's role:
// always use the signed-in user, so nobody can borrow a Ministry user's access by changing the id.
export function pinOwnUser(paramName = 'userID') {
  return (req, res, next) => {
    const userId = Number(req.user?.userId);
    if (!(Number.isFinite(userId) && userId > 0)) {
      return res.status(401).json({ message: 'Unauthorized!' });
    }
    req.params[paramName] = String(userId);
    return next();
  };
}

// Ministry-internal modules (Audit Paras, E-Office, Attendance) hold MoPSW data with no
// organisation column, so only Ministry / master scope and MoPSW's own staff may use them -
// not another organisation's login, whatever rights are ticked for it (QC AP-01). MoPSW staff
// with an organisation-level role (e.g. Organisation-Senior Officers) are let in (QC G-04).
export function ministryOnly(req, res, next) {
  const { isWide, organisationId } = getDataScope(req.user);
  if (!isWide && organisationId !== MOPSW_ORGANISATION_ID) {
    return res.status(403).json({ message: 'This module is for Ministry users only.' });
  }
  return next();
}

// Data scope of a role, read from the role's RBAC data-scope mapping (cached briefly), for
// code that only has a role_id (e.g. looked up from tbl_user) and not the logged-in user object.
// Replaces hardcoded role-id lists, so renumbering roles cannot change who sees what.
const ROLE_SCOPE_TTL_MS = 60 * 1000;
const roleScopeCache = new Map();

export async function getRoleDataScopeCode(roleId) {
  const id = Number(roleId);
  if (!Number.isInteger(id) || id <= 0) return '';
  const hit = roleScopeCache.get(id);
  if (hit && Date.now() - hit.at < ROLE_SCOPE_TTL_MS) return hit.code;
  const { pool } = await import('../db.js');
  const conn = await pool;
  const result = await conn
    .request()
    .input('roleId', id)
    .query(`SELECT TOP 1 ds.data_scope_code
            FROM tbl_rbac_role_data_scope rds
            INNER JOIN mmt_rbac_data_scope ds ON ds.data_scope_id = rds.data_scope_id
            WHERE rds.role_id = @roleId`);
  const code = String(result.recordset[0]?.data_scope_code || '').toUpperCase();
  roleScopeCache.set(id, { code, at: Date.now() });
  return code;
}

// True for Ministry / Master data scope - same meaning as getDataScope(user).isWide
export async function isWideRole(roleId) {
  const code = await getRoleDataScopeCode(roleId);
  return code === 'MASTER' || code === 'MINISTRY';
}

// True for Organisation data scope - same meaning as getDataScope(user).isOrganisation
export async function isOrganisationRole(roleId) {
  return (await getRoleDataScopeCode(roleId)) === 'ORGANISATION';
}
