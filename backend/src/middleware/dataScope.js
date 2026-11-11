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

export default {
  getDataScope,
  applyDataScope,
};

// The Ministry of Ports, Shipping and Waterways in mmt_organisation (2.0 numbering)
export const MOPSW_ORGANISATION_ID = 14;

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
