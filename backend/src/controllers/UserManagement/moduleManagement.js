import { pool } from "../../db.js";

// Fetch all module permissions
async function getModulePermissions(req, res) {
    const conn = await pool;

    try {
        const categoriesQuery = `
            SELECT organisation_usermatrix_category_id, organisation_usermatrix_category_name 
            FROM mmt_organisation_usermatrix_category
        `;
        const categories = await conn.request().query(categoriesQuery);

        const results = await Promise.all(
            categories.recordset.map(async (category) => {
                const modulesQuery = `
                    SELECT m.module_id, m.module_name, 
                           COALESCE(p.permission, 0) AS permission 
                    FROM tbl_modules m 
                    LEFT JOIN tbl_usermatrix_category_module_permission p 
                    ON m.module_id = p.module_id 
                    AND p.organisation_usermatrix_category_id = ${category.organisation_usermatrix_category_id}
                `;
                const modules = await conn.request().query(modulesQuery);
                return {
                    organisation_usermatrix_category_id: category.organisation_usermatrix_category_id,
                    organisation_usermatrix_category_name: category.organisation_usermatrix_category_name,
                    modules: modules.recordset,
                };
            })
        );

        res.status(200).json(results);
    } catch (error) {
        console.error("Error fetching module permissions:", error);
        res.status(500).send("Internal Server Error");
    }
}

// Update a specific module permission
async function updateModulePermission(req, res) {
    const { categoryId, moduleId, permission } = req.body;

    if (!categoryId || !moduleId || permission === undefined) {
        return res.status(400).send("Missing required fields: categoryId, moduleId, or permission.");
    }

    const conn = await pool;

    try {
        const request = conn.request();
        request.input("categoryId", categoryId);
        request.input("moduleId", moduleId);
        request.input("permission", permission);

        const query = `
            IF EXISTS (
                SELECT 1 
                FROM tbl_usermatrix_category_module_permission 
                WHERE organisation_usermatrix_category_id = @categoryId 
                  AND module_id = @moduleId
            )
            BEGIN
                UPDATE tbl_usermatrix_category_module_permission
                SET permission = @permission
                WHERE organisation_usermatrix_category_id = @categoryId 
                  AND module_id = @moduleId;
            END
            ELSE
            BEGIN
                INSERT INTO tbl_usermatrix_category_module_permission 
                (organisation_usermatrix_category_id, module_id, permission)
                VALUES (@categoryId, @moduleId, @permission);
            END
        `;

        const result = await request.query(query);

        if (result.rowsAffected.length > 0) {
            res.status(200).send("Module permission updated successfully.");
        } else {
            res.status(400).send("Failed to update module permission.");
        }
    } catch (error) {
        console.error("Error updating module permission:", error);
        res.status(500).send("Internal Server Error");
    }
}

async function getModulesByOrganisationCategory(req, res) {
    const { organisationId } = req.params;

    try {
        const conn = await pool;
        const request = conn.request();
        request.input("organisationId", organisationId);

        const result = await request.query(`
           SELECT 
            mp.module_id, 
            m.module_name, 
            mp.permission
        FROM 
            tbl_usermatrix_category_module_permission mp
        INNER JOIN 
            tbl_modules m 
            ON m.module_id = mp.module_id
        INNER JOIN 
            mmt_organisation o 
            ON o.organisation_usermatrix_category_id = mp.organisation_usermatrix_category_id
        WHERE 
            o.organisation_id = @organisationId 
            AND mp.permission = 1;
        `);

        res.status(200).json({ modules: result.recordset });
    } catch (err) {
        console.error("Error fetching modules:", err);
        res.status(500).json({ message: "Error fetching modules" });
    }
};

const ModuleControllerTab = { getModulePermissions, updateModulePermission, getModulesByOrganisationCategory };
export default ModuleControllerTab;
