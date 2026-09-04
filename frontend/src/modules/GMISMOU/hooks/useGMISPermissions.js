import { useState, useEffect } from 'react';

/**
 * Hook to retrieve user permissions for the GMIS & IMW MoU Tracking module.
 * Falls back to full permissions if user is superadmin/admin.
 */
export function useGMISPermissions() {
  const [permissions, setPermissions] = useState({
    canAdd: true,
    canEdit: true,
    canRemove: true,
    canView: true,
    isReadOnly: false,
    roleId: 2,
    organisationId: null,
  });

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const roleId = Number(user.role_id || user.roleId || 2);
        const organisationId = user.organisation_id || user.organisationId || null;

        // Admin roles (1: SuperAdmin, 2: Ministry, 3: Admin, 4: Director, 5: Joint Sec)
        const isAdmin = [1, 2, 3, 4, 5].includes(roleId);

        // Check custom module permissions if stored in localStorage
        const modulePermissions = user.permissions?.['GMIS_IMW_MOU_TRACKING'] || user.permissions?.['GMIS_MOU'] || user.permissions?.['gmis_mou'] || {};

        const canAdd = isAdmin || !!modulePermissions.create || !!modulePermissions.canAdd || roleId <= 6;
        const canEdit = isAdmin || !!modulePermissions.update || !!modulePermissions.canEdit || roleId <= 6;
        const canRemove = isAdmin || !!modulePermissions.delete || !!modulePermissions.canRemove;
        const canView = true;

        setPermissions({
          canAdd,
          canEdit,
          canRemove,
          canView,
          isReadOnly: !canAdd && !canEdit,
          roleId,
          organisationId,
        });
      }
    } catch (e) {
      console.warn('Error reading GMIS permissions:', e);
    }
  }, []);

  return permissions;
}
