
import { pool } from "../../db.js";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import forge from 'node-forge';


async function createuser(req, res) {
    const title = req.body.title;
    const name = req.body.name;
    const designation = req.body.designation;
    const role = req.body.role;
    const organisation = req.body.organisation;
    const wingId = req.body.wingId;
    const divisionId = req.body.divisionId;
    let email = req.body.email;
    const phone = req.body.phone;

    const defaultPassword = 'Sagarmanthan@123';
    const hashedPassword = bcrypt.hashSync(defaultPassword, 10);

    const conn = await pool;
    const request = conn.request();
    request.input("title", title);
    request.input("name", name);
    request.input("designation", designation);
    request.input("role", role);
    request.input("organisation", organisation);
    request.input("wingId", wingId);
    request.input("divisionId", divisionId);
    request.input("email", email);
    request.input("phone", phone);
    request.input("password", hashedPassword);

    try {
        let checkIfExists = await request.query(`SELECT count(*) as count FROM tbl_user WHERE email = @email;`);
        console.log(checkIfExists.recordset)
        if (checkIfExists.recordset[0].count > 0) {
            return res.status(205).json({ message: "User Already Exists!" });
        }
        else {
            try {
                const result = await request.query(`INSERT INTO tbl_user (title, name, designation, role_id, organisation_id, 
                    wing_id, division_id, email, password, phone) 
                VALUES (@title, @name, @designation, @role, @organisation, @wingId, @divisionId, @email, @password, @phone)`);

                //console.log("User registered successfully");

                const transporter = nodemailer.createTransport({
                    host: "smtp.office365.com",
                    port: 587,
                    auth: {
                        user: "sagarmanthansupport@ntcpwc.iitm.ac.in",
                        pass: "Sagarmanthan@123",
                    },
                });

                const mailOptions = {
                    from: "sagarmanthansupport@ntcpwc.iitm.ac.in",
                    to: email,
                    subject: "Sagarmanthan Portal – User Account Credentials",
                    html: `<strong>Dear User</strong>,
                          <br><br>
                          Welcome to the Sagarmanthan Portal.
                          <br><br>
                          Your user account has been successfully created. Please find your login credentials below:
                          <br><br>
                          <ul>
                            <li><strong>User ID: </strong>${email}</li>
                            <li><strong>Temporary Password: </strong>${defaultPassword}</li>
                          </ul>
                          For security purposes, you are required to reset your password immediately upon your first login.
                          <br><br>
                          Should you experience any difficulties or require technical assistance, please contact the support team at support@ntcpwc.iitm.ac.in.
                          <br><br>
                          Warm regards,
                          <br><br>
                           <strong>Sagarmanthan Portal Team</strong>
                           <br>
                           <strong>Ministry of Ports, Shipping and Waterways</strong>
                           <br>
                           <strong>Government of India</strong>
                          <br><br>`,
                };

                await transporter.sendMail(mailOptions);
                console.log("Email Sent Successfully");
                return res.sendStatus(200);
            } catch (emailError) {
                console.error("Error sending email:", emailError);
                return res.sendStatus(500);
            }
        }
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function createNodalUser(req, res) {
    const title = req.body.title;
    const name = req.body.name;
    const designation = req.body.designation;
    const role = req.body.role;
    const organisation = req.body.organisation;
    let email = req.body.email;
    const phone = req.body.phone;
    const permissions = req.body.permissions;

    console.log(role);
    const defaultPassword = 'Sagarmanthan@123';
    const hashedPassword = bcrypt.hashSync(defaultPassword, 10);

    const conn = await pool;
    const request = conn.request();
    request.input("title", title);
    request.input("name", name);
    request.input("designation", designation);
    request.input("role", role);
    request.input("organisation", organisation);
    request.input("email", email);
    request.input("phone", phone);
    request.input("password", hashedPassword);

    try {
        const checkIfExists = await request.query(
            `SELECT count(*) as count FROM tbl_user WHERE email = @email;`
        );

        if (checkIfExists.recordset[0].count > 0) {
            return res.status(400).json({ message: "User Already Exists!" });
        } else {
            try {
                // Insert the new user into tbl_user
                const result = await request.query(`
                    INSERT INTO tbl_user (title, name, designation, role_id, organisation_id, email, password, phone) 
                    OUTPUT INSERTED.user_id
                    VALUES (@title, @name, @designation, @role, @organisation, @email, @password, @phone)
                `);

                console.log("res.record", result.recordset);

                const userId = result.recordset[0].user_id;

                for (const permission of permissions) {
                    const permissionRequest = conn.request();
                    permissionRequest.input("userId", userId);
                    permissionRequest.input("moduleId", permission.module_id);
                    permissionRequest.input("create", permission.create_permission);
                    permissionRequest.input("read", permission.read_permission);
                    permissionRequest.input("update", permission.update_permission);
                    permissionRequest.input("delete", permission.delete_permission)

                    await permissionRequest.query(`
                INSERT INTO tbl_usermatrix_user_module_crud_permission (user_id, module_id, create_permission, read_permission, update_permission, delete_permission)
                VALUES (@userId, @moduleId, @create, @read, @update, @delete)
            `);
                }

                const transporter = nodemailer.createTransport({
                    host: "smtp.office365.com",
                    port: 587,
                    auth: {
                        user: "sagarmanthansupport@ntcpwc.iitm.ac.in",
                        pass: "Sagarmanthan@123",
                    },
                });

                const mailOptions = {
                    from: "sagarmanthansupport@ntcpwc.iitm.ac.in",
                    to: email,
                    subject: "Sagarmanthan Portal – User Account Credentials",
                    html: `<strong>Dear User</strong>,
                          <br><br>
                          Welcome to the Sagarmanthan Portal!
                          <br><br>
                          Your user account has been successfully created. Please find your login credentials below:
                          <br><br>
                          <ul>
                            <li><strong>User ID: </strong>${email}</li>
                            <li><strong>Temporary Password: </strong>${defaultPassword}</li>
                          </ul>
                          For security purposes, you are required to reset your password immediately upon your first login.
                          <br><br>
                          Should you experience any difficulties or require technical assistance, please contact the support team at support@ntcpwc.iitm.ac.in.
                          <br><br>
                          Warm regards,
                          <br><br>
                          <strong>Sagarmanthan Portal Team</strong>
                          <strong>Ministry of Ports, Shipping and Waterways</strong>
                          <strong>Government of India</strong>
                          <br><br>`,
                };

                await transporter.sendMail(mailOptions);
                console.log("Email Sent Successfully");
                return res.sendStatus(200);
            } catch (emailError) {
                console.error("Error sending email:", emailError);
                return res.sendStatus(500);
            }
        }
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};



async function getUserData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT tbl_user.user_id, tbl_user.title, tbl_user.name, tbl_user.designation,
        tbl_user.role_id, tbl_role.role_name, tbl_user.organisation_id, tbl_user.wing_id, wing_name, tbl_user.division_id,
        division_name, mmt_organisation.organisation_name, tbl_user.email, tbl_user.phone, tbl_user.status,
        tbl_user.state_id, state_name, tbl_user.district_id, district_name
        FROM tbl_user
        INNER JOIN tbl_role on tbl_role.role_id = tbl_user.role_id
        INNER JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_user.organisation_id
        LEFT JOIN mmt_state on mmt_state.state_id = tbl_user.state_id
        LEFT JOIN mmt_district on mmt_district.district_id = tbl_user.district_id
        LEFT JOIN mmt_wings on mmt_wings.wing_id = tbl_user.wing_id
        LEFT JOIN mmt_division on mmt_division.division_id = tbl_user.division_id

        order by user_id;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getOrgUserData(req, res) {
    const organisation = req.params.organisation;
    const conn = await pool;
    const request = conn.request();

    request.input("organisation", organisation);

    try {
        const result = await request.query(`
            SELECT 
                tbl_user.user_id, 
                tbl_user.title, 
                tbl_user.name, 
                tbl_user.designation, 
                tbl_user.role_id, 
                tbl_role.role_name,
                tbl_user.organisation_id, 
                mmt_organisation.organisation_name, 
                tbl_user.email, 
                tbl_user.phone, 
                tbl_user.status, 
                tbl_user.wing_id, 
                tbl_user.division_id, 
                tbl_user.state_id, 
                tbl_user.district_id
            FROM tbl_user
            INNER JOIN tbl_role ON tbl_role.role_id = tbl_user.role_id
            INNER JOIN mmt_organisation ON mmt_organisation.organisation_id = tbl_user.organisation_id
            WHERE tbl_user.organisation_id = @organisation 
            ORDER BY user_id;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function updateUser(req, res) {
    const userID = req.body.userID;
    const title = req.body.title;
    const name = req.body.name;
    const designation = req.body.designation;
    const role = req.body.role;
    const organisation = req.body.organisation;
    const wingId = req.body.wingId;
    const divisionId = req.body.divisionId;
    const email = req.body.email;
    const phone = req.body.phone;
    const loginUser = req.body.loginUser;
    
    const conn = await pool;
    const request = conn.request();
    request.input("userID", userID);
    request.input("title", title);
    request.input("name", name);
    request.input("designation", designation);
    request.input("role", role);
    request.input("organisation", organisation);
    request.input("wingId", wingId);
    request.input("divisionId", divisionId);
    request.input("email", email);
    request.input("phone", phone);
    request.input("loginUser", loginUser);
     

    

    try {
        const result = await request.query(`UPDATE tbl_user SET title = @title, name = @name, designation = @designation,
        role_id = @role, organisation_id = @organisation, wing_id = @wingId, division_id = @divisionId, email = @email, 
        phone = @phone, updated_on = GETDATE(), updated_by = @loginUser WHERE user_id = @userID`);

        res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function updateNodalUser(req, res) {
    const userID = req.body.userID;
    const title = req.body.title;
    const name = req.body.name;
    const designation = req.body.designation;
    const email = req.body.email;
    const phone = req.body.phone;
    const organisation = req.body.organisation;
    const loginUser = req.body.loginUser;

    const conn = await pool;
    const request = conn.request();
    request.input("userID", userID);
    request.input("title", title);
    request.input("name", name);
    request.input("designation", designation);
    request.input("email", email);
    request.input("phone", phone);
    request.input("organisation", organisation);
    request.input("loginUser", loginUser);

    try {
        const result = await request.query(`
            UPDATE tbl_user 
            SET 
                title = @title, 
                name = @name, 
                designation = @designation, 
                email = @email, 
                phone = @phone,
                updated_on = GETDATE(), 
                updated_by = @loginUser

            WHERE user_id = @userID
        `);

        return res.sendStatus(200);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
};


async function editUserProfileData(req, res) {
    const userID = req.body.userID;
    const title = req.body.title;
    const name = req.body.name;
    const designation = req.body.designation;
    const email = req.body.email;
    const phone = req.body.phone;
    const organisationId = req.body.organisationId;
    const wingID = req.body.wing;
    const divisionID = req.body.division;
    const stateID = req.body.state;
    const districtID = req.body.district;
    const loginUser = req.body.loginUser;

    const conn = await pool;
    const request = conn.request();

    request.input("userID", userID);
    request.input("title", title);
    request.input("name", name);
    request.input("designation", designation);
    request.input("email", email);
    request.input("phone", phone);
    request.input("organisationId", organisationId);
    request.input("wingID", wingID);
    request.input("divisionID", divisionID);
    request.input("stateID", stateID);
    request.input("districtID", districtID);
    request.input("loginUser", loginUser);

    try {
        const result = await request.query(`
            UPDATE tbl_user
            SET title = @title, name = @name, designation = @designation,
                email = @email, phone = @phone, organisation_id = @organisationId, 
                wing_id = @wingID, division_id = @divisionID,
                state_id = @stateID, district_id = @districtID, updated_on = GETDATE(), updated_by = @loginUser
            WHERE user_id = @userID
        `);

        res.sendStatus(200);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


async function toggleUserStatusData(req, res) {
    const userID = req.body.userID;
    const userStatus = req.body.userStatus;
    const loginUser = req.body.loginUser;

    const conn = await pool;
    const request = conn.request();

    request.input("userID", userID);
    request.input("userStatus", userStatus);
    request.input("loginUser", loginUser);

    try {

        const result = await request.query(`UPDATE tbl_user SET status = @userStatus, updated_on = GETDATE(), updated_by = @loginUser
            WHERE user_id = @userID`);

        res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function changePasswordAction(req, res) {
    const userID = req.body.userID;
    const confirmPassword = req.body.confirmPassword;
    const loginUser = req.body.loginUser;
  try {
        const hash = bcrypt.hashSync(confirmPassword, 10);
        const conn = await pool;
        const updateResult = await conn.request()
            .input("userID", userID)
            .input("confirmPassword", hash)
            .input("loginUser", loginUser)
            .query(`
                UPDATE tbl_user 
                SET password = @confirmPassword,
                    password_status = 1,
                    password_updated_on = GETDATE(),
                    password_updated_by = @loginUser
                WHERE user_id = @userID
            `);

        if (updateResult.rowsAffected[0] === 0) {
            return res.status(404).send("User not found");
        }
        const emailResult = await conn.request()
            .input("userID", userID)
            .query(`SELECT email FROM tbl_user WHERE user_id = @userID`);

        const email = emailResult.recordset[0].email;
        const transporter = nodemailer.createTransport({
            host: "smtp.office365.com",
            port: 587,
            secure: false,
            auth: {
                user: "sagarmanthansupport@ntcpwc.iitm.ac.in",
                pass: "Sagarmanthan@123",
            },
        });
        const mailOptions = {
            from: "sagarmanthansupport@ntcpwc.iitm.ac.in",
            to: email,
            subject: "Sagarmanthan Portal Password Reset Successful",
            html: `
                <strong>Dear User</strong>,
                <br><br>
                This is to confirm that the password for your <strong> Sagarmanthan Portal </strong>account has been successfully reset.
                <br><br>
                You may now log in using your updated credentials.
                <br><br>
                If you did not perform this action or believe your account may have been accessed without authorization, please contact our support team immediately at support@ntcpwc.iitm.ac.in.
                <br><br>
                For security reasons, we recommend that you:
                <ul style="margin-left:20px; padding-left:20px;">
                    <li>Keep your password confidential</li>
                    <li>Avoid sharing login credentials with anyone</li>
                    <li>Update your password periodically</li>  
                </ul>
                 Warm regards,
                 <br><br>
                <strong>Sagarmanthan Portal Team</strong><br>
                <strong>Ministry of Ports, Shipping and Waterways</strong><br>
                <strong>Government of India</strong>
            `,
        };
        await transporter.sendMail(mailOptions);
        console.log("Password change email sent");

        return res.sendStatus(200);

    } catch (err) {
        console.error("Change password error:", err);
        return res.sendStatus(500);
    }
}

async function updatePassword(req, res) {
    const userID = req.body.userID;
    const email  = req.body.email;
    const loginUser = req.body.loginUser;
    const encryptedOldPassword = req.body.oldPassword;
    const encryptedNewPassword = req.body.newPassword;

    const privateKeyPem = `
    -----BEGIN RSA PRIVATE KEY-----
    MIICXgIBAAKBgQCtKadrC6eRM6dVJzCMaYEb9u6J3bmQ5yzMER6Jsa5xr2SoVRwn
    phar1ch/fqz+nWKu52Phztsx6r9ZE3Q7yDjXzsFrJ3ynq8UGpdHAVJ0BkL2bXp+E
    1ZDbUI0Xl8Dv6hWCQXlvkGi6fNOHSYlqNgNQHsZ1IlQP88vCQeRFJf3bCQIDAQAB
    AoGAKXV+ow+ASDCQ0L94TTX5doORqyqOAlaHEDjNEfSbqpZuyCrQeeG3Ld8aiQQA
    UVnHRc8ax/ap3nKw65fPzXxrt0EdncLjOLS+SMcpShaDD4h6bk9PYRG9p5/00NFN
    /6m0JkHD5xUYvrYvU/Yo0sS12lBQt6jhf5W61XOkMhcTm4ECQQD+yNd/BOtCcwIl
    HstC2cPr0ut2bQ7UgpBWzcwGQRZc69yMet6427XG15oVKxiYAtTEN6dKBkRSoJdO
    3M/rVBEZAkEArf0hdehVQG9X9qPDjmx+JS/AmgEFImiKvcQL69bLHg9dRPjwh6zN
    pgspmFWfwfuabmV+pEnv/f6f54hiVPOncQJBAOKlUSW5/3nGCyNwSEp4o1OV9kYL
    78RVPQcq3RK3NaiFXFVPO+9f600uH/AyvRcEdbby9wrflkmWd+L8hK0HxIkCQQCK
    rq/TGcOKPrXwpAwmJBhQb8Wne5SqHoYoSHHwJB928Gw5o+ulWXn6Ff+rquRSbMhl
    ooTVUxH2dNTkanNmn2ghAkEA8vuv2fNrQXH0bSkiDwZGwCzbskS/3fBiXuI2Lu3n
    J209E6WnEWR0lMMaPJIhXAtv3iH32m+WaO/Eyml9QhbwCQ==
    -----END RSA PRIVATE KEY-----
    `;
    try{
        try {
            const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

            const decryptedOldPassword = privateKey.decrypt(forge.util.decode64(encryptedOldPassword), 'RSA-OAEP', {
                md: forge.md.sha256.create(),
                mgf1: { md: forge.md.sha256.create() },
            });

            const decryptedNewPassword = privateKey.decrypt(forge.util.decode64(encryptedNewPassword), 'RSA-OAEP', {
                md: forge.md.sha256.create(),
                mgf1: { md: forge.md.sha256.create() },
            });

            const conn = await pool;
            const request = conn.request();

            // Fetch the current hashed password
            request.input("userID", userID);
            request.input("email", email);
            request.input("loginUser", loginUser);
            const result = await request.query(`SELECT password FROM tbl_user WHERE user_id = @userID`);
            const userData = result.recordset[0];

            if (!userData) {
                return res.status(404).json({ message: "User not found" });
            }

            // Compare old password
            const isPasswordMatch = bcrypt.compareSync(decryptedOldPassword, userData.password);
            if (!isPasswordMatch) {
                return res.status(400).json({ message: "Current password is incorrect" });
            }

            // Hash and update the new password
            const saltRounds = 10;
            const hashedNewPassword = await bcrypt.hash(decryptedNewPassword, saltRounds);
            console.log("hi2")

            request.input("newPassword", hashedNewPassword);

            const sqlQuery = ` UPDATE tbl_user SET password = @newPassword, password_status = 1, password_updated_on = GETDATE(),
                password_updated_by = @userID WHERE user_id = @userID  `;

            // res.status(200).json({ message: "Password changed successfully" });
            await request.query(sqlQuery);

          console.log("Password changed successfully");



                    const transporter = nodemailer.createTransport({
                    host: "smtp.office365.com",
                    port: 587,
                    auth: {
                        user: "sagarmanthansupport@ntcpwc.iitm.ac.in",
                        pass: "Sagarmanthan@123",
                    },
                });


            
                    const mailOptions = {
                    from: "sagarmanthansupport@ntcpwc.iitm.ac.in",
                    to: email,
                     subject: "Sagarmanthan Portal Password Reset Successful",
            html: `
                <strong>Dear User</strong>,
                <br><br>
                This is to confirm that the password for your <strong> Sagarmanthan Portal </strong>account has been successfully reset.
                <br><br>
                You may now log in using your updated credentials.
                <br><br>
                If you did not perform this action or believe your account may have been accessed without authorization, please contact our support team immediately at support@ntcpwc.iitm.ac.in.
                <br><br>
                For security reasons, we recommend that you:
                <ul style="margin-left:20px; padding-left:20px;">
                    <li>Keep your password confidential</li>
                    <li>Avoid sharing login credentials with anyone</li>
                    <li>Update your password periodically</li>  
                </ul>
                 Warm regards,
                 <br><br>
                <strong>Sagarmanthan Portal Team</strong><br>
                <strong>Ministry of Ports, Shipping and Waterways</strong><br>
                <strong>Government of India</strong>
            `,
        };
            
                    await transporter.sendMail(mailOptions);
                    console.log("Email Sent Successfully");
                    return res.sendStatus(200);
                } catch (emailError) {
                    console.error("Error sending email:", emailError);
                    return res.sendStatus(500);
                }

             } catch (error) {
        console.error("Error updating password:", error);
        res.status(500).json({ message: "Internal server error" });
    }

    
}

// async function getUpdateUser (req, res) 
// {    
//     const userID = req.params.userId;

//     const conn = await pool;
//     const request = conn.request();
//     request.input("userID", userID);

//     try
//     {
//         const result = await request.query(`SELECT * FROM tbl_user WHERE tbl_user.user_id = @userID;`);
//         console.log(result);
//         res.json(result.recordset);
//     }
//     catch(err)
//     {
//         console.log(err);
//         return res.sendStatus(500);
//     }
// };

async function getPermissionModulesData(req, res) {
    const { userId, organisationId } = req.params;

    try {
        const conn = await pool;
        const request = conn.request();
        request.input("userId", userId);
        request.input("organisationId", organisationId);

        const result = await request.query(`
            SELECT 
                m.module_id, 
                m.module_name, 
                COALESCE(p.create_permission, 0) AS create_permission,
                COALESCE(p.read_permission, 0) AS read_permission,
                COALESCE(p.update_permission, 0) AS update_permission,
                COALESCE(p.delete_permission, 0) AS delete_permission
            FROM 
                tbl_usermatrix_category_module_permission mp
            INNER JOIN 
                tbl_modules m 
                ON m.module_id = mp.module_id
            INNER JOIN 
                mmt_organisation o 
                ON o.organisation_usermatrix_category_id = mp.organisation_usermatrix_category_id
            LEFT JOIN 
                tbl_usermatrix_user_module_crud_permission p 
                ON p.module_id = mp.module_id AND p.user_id = @userId
            WHERE 
                o.organisation_id = @organisationId 
                AND mp.permission = 1;
        `);

        res.status(200).json({ modules: result.recordset });
    } catch (err) {
        console.error("Error fetching permission modules:", err);
        res.status(500).json({ message: "Error fetching modules" });
    }
}


async function updatePermissions(req, res) {
    const userId = req.body.userId;
    const permissionsData = req.body.permissionsData;
    const conn = await pool;

    if (!userId || !Array.isArray(permissionsData)) {
        return res.status(400).json({ message: "Invalid userId or permissions data" });
    }

    try {
        const groupedPermissions = permissionsData.reduce((acc, curr) => {
            const { module_id, permission_type, value } = curr;

            if (!acc[module_id]) {
                acc[module_id] = { create: 0, read: 0, update: 0, deletePermission: 0 };
            }
            acc[module_id][permission_type] = value;
            return acc;
        }, {});

        for (const [moduleId, permissions] of Object.entries(groupedPermissions)) {
            const { create, read, update, delete: deletePermission } = permissions;

            const requestCheck = conn.request();
            requestCheck.input("userId", userId);
            requestCheck.input("moduleId", moduleId);

            const checkResult = await requestCheck.query(`
                SELECT 1 FROM tbl_usermatrix_user_module_crud_permission 
                WHERE user_id = @userId AND module_id = @moduleId
            `);

            const request = conn.request();
            request.input("create", create || 0);
            request.input("read", read || 0);
            request.input("update", update || 0);
            request.input("delete", deletePermission || 0);
            request.input("userId", userId);
            request.input("moduleId", moduleId);

            if (checkResult.recordset.length > 0) {
                await request.query(`
                    UPDATE tbl_usermatrix_user_module_crud_permission
                    SET 
                        create_permission = @create,
                        read_permission = @read,
                        update_permission = @update,
                        delete_permission = @delete
                    WHERE user_id = @userId AND module_id = @moduleId
                `);
            } else {
                await request.query(`
                    INSERT INTO tbl_usermatrix_user_module_crud_permission
                    (user_id, module_id, create_permission, read_permission, update_permission, delete_permission)
                    VALUES (@userId, @moduleId, @create, @read, @update, @delete)
                `);
            }
        }

        res.status(200).json({ message: "Permissions updated successfully!" });

    } catch (error) {
        console.error("Error updating permissions:", error);
        res.status(500).json({ message: "Error updating permissions", error: error.message });
    }
}


async function getUserDetails(req, res) {
    const userId = req.params.userId;
    const conn = await pool;
    const request = conn.request();
    request.input("userId", userId);
    try {
        const result = await request.query(`SELECT tbl_user.name FROM tbl_user WHERE user_id = @userID AND status = 1`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

export default { createuser, getUserData, updateUser, toggleUserStatusData, changePasswordAction, updatePassword, editUserProfileData, getOrgUserData, createNodalUser, updateNodalUser,
    getPermissionModulesData, updatePermissions, getUserDetails
 };