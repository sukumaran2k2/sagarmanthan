export function getDataScope(user) {
  const scope = String(user?.dataScopeCode || '').toUpperCase();
  const organisationId = Number(user?.organisationId);
  const isWide = scope === 'MASTER' || scope === 'MINISTRY' || !scope;
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
