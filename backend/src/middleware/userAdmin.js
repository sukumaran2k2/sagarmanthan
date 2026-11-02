import { pool } from "../db.js";

// Who may manage users and permissions, matching the User Management screens:
// - Superadmin: every user, the organisation module list and the permission matrix
// - Organisation Senior Officer: only the Nodal Officers of their own organisation
// - Anyone else: only their own profile and password
// Use after `auth`.

const roleCodeOf = (user) => String(user?.roleCode || '').toUpperCase();
export const isSuperAdminUser = (user) => roleCodeOf(user) === 'SUPERADMIN' || Number(user?.roleId) === 1;
export const isSeniorOfficerUser = (user) => roleCodeOf(user) === 'ORG_SENIOR_OFFICER';
const NODAL_ROLE_CODE = 'ORG_NODAL_OFFICER';

const deny = (res, message) => res.status(403).json({ status: 'fail', message });

export function requireSuperAdmin(req, res, next) {
    if (isSuperAdminUser(req.user)) return next();
    return deny(res, 'Only the superadmin can do this');
}

// Superadmin or Senior Officer (the senior officer's limits are checked per user below)
export function requireUserAdmin(req, res, next) {
    if (isSuperAdminUser(req.user) || isSeniorOfficerUser(req.user)) return next();
    return deny(res, 'You cannot manage users');
}

async function roleCodeById(roleId) {
    const request = (await pool).request();
    request.input("roleId", Number(roleId) || 0);
    const result = await request.query(`SELECT role_code FROM tbl_role WHERE role_id = @roleId`);
    return String(result.recordset[0]?.role_code || '').toUpperCase();
}

// True when a senior officer may manage this user: a Nodal Officer of their organisation
async function isOwnNodalOfficer(actor, userId) {
    const request = (await pool).request();
    request.input("userId", Number(userId) || 0);
    const result = await request.query(`SELECT u.organisation_id, r.role_code
        FROM tbl_user u INNER JOIN tbl_role r ON r.role_id = u.role_id
        WHERE u.user_id = @userId`);
    const target = result.recordset[0];
    return !!target
        && Number(target.organisation_id) === Number(actor.organisationId)
        && String(target.role_code).toUpperCase() === NODAL_ROLE_CODE;
}

// Creating or changing one user. `userIdOf(req)` gives the existing user (none when creating);
// `checkNewRole` also checks the role and organisation being set from the body.
export function guardManagedUser({ userIdOf = null, checkNewRole = false } = {}) {
    return async (req, res, next) => {
        try {
            if (isSuperAdminUser(req.user)) return next();
            if (!isSeniorOfficerUser(req.user)) return deny(res, 'You cannot manage users');
            if (userIdOf && !(await isOwnNodalOfficer(req.user, userIdOf(req)))) {
                return deny(res, 'You can only manage Nodal Officers in your organisation');
            }
            if (checkNewRole) {
                if (Number(req.body?.organisation) !== Number(req.user.organisationId)) {
                    return deny(res, 'You can only add users to your organisation');
                }
                if ((await roleCodeById(req.body?.role)) !== NODAL_ROLE_CODE) {
                    return deny(res, 'You can only add Nodal Officers');
                }
            }
            return next();
        } catch (err) {
            console.error('User permission check failed:', err);
            return res.sendStatus(500);
        }
    };
}

// Permission matrix changes for a list of users (body.userIds)
export async function guardManagedUserList(req, res, next) {
    try {
        if (isSuperAdminUser(req.user)) return next();
        if (!isSeniorOfficerUser(req.user)) return deny(res, 'You cannot manage users');
        const ids = Array.isArray(req.body?.userIds) ? req.body.userIds : [];
        for (const id of ids) {
            if (!(await isOwnNodalOfficer(req.user, id))) {
                return deny(res, 'You can only manage Nodal Officers in your organisation');
            }
        }
        return next();
    } catch (err) {
        console.error('User permission check failed:', err);
        return res.sendStatus(500);
    }
}

// Lists for one organisation: a senior officer only gets their own
export function guardOrganisation(orgIdOf) {
    return (req, res, next) => {
        if (isSuperAdminUser(req.user)) return next();
        if (isSeniorOfficerUser(req.user) && Number(orgIdOf(req)) === Number(req.user.organisationId)) return next();
        return deny(res, 'You can only see users of your organisation');
    };
}

// A user's own record (profile, password), or any user's for the superadmin
export function requireSelf(userIdOf) {
    return (req, res, next) => {
        if (isSuperAdminUser(req.user) || Number(userIdOf(req)) === Number(req.user?.userId)) return next();
        return deny(res, 'You can only change your own details');
    };
}

// Matrix user lists: a senior officer always gets their own organisation's users
export function ownOrganisationQuery(req, res, next) {
    if (isSeniorOfficerUser(req.user)) req.query.organisationId = String(req.user.organisationId);
    return next();
}

// Reading the rights of a list of users (query.userIds): a senior officer only for users of
// their own organisation
export async function guardUserIdsQuery(req, res, next) {
    try {
        if (isSuperAdminUser(req.user)) return next();
        if (!isSeniorOfficerUser(req.user)) return deny(res, 'You cannot manage users');
        const ids = String(req.query.userIds || '').split(',').map((id) => Number(id.trim())).filter((id) => id > 0);
        if (!ids.length) return next();
        const request = (await pool).request();
        request.input("orgId", Number(req.user.organisationId) || 0);
        const result = await request.query(`SELECT COUNT(*) AS n FROM tbl_user
            WHERE organisation_id = @orgId AND user_id IN (${ids.join(',')})`);
        if (result.recordset[0].n !== new Set(ids).size) return deny(res, 'You can only see users of your organisation');
        return next();
    } catch (err) {
        console.error('User permission check failed:', err);
        return res.sendStatus(500);
    }
}
