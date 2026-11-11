
import { pool } from "../../db.js";
import { supportMailer, temporaryPassword } from "../../utils/mailer.js";
import bcrypt from "bcrypt";
import forge from 'node-forge';

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
// Indian mobile number: 10 digits starting 6-9
const MOBILE_PATTERN = /^[6-9]\d{9}$/;
// At least 8 characters with upper and lower case letters, a number and a special character
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_RULE_MESSAGE = "Password must be at least 8 characters with upper and lower case letters, a number and a special character";


async function createuser(req, res) {
    const title = req.body.title;
    const name = req.body.name;
    const designation = req.body.designation;
    const role = req.body.role;
    const organisation = req.body.organisation;
    const wingId = req.body.wingId;
    const divisionId = req.body.divisionId;
    let email = String(req.body.email || '').trim();
    const phone = String(req.body.phone || '').trim();

    if (!EMAIL_PATTERN.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
    }
    if (!MOBILE_PATTERN.test(phone)) {
        return res.status(400).json({ message: "Please enter a valid 10-digit mobile number" });
    }

    const defaultPassword = temporaryPassword(); // emailed to the user, changed at first login
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
        // Same address in another case or with spaces counts as a duplicate
        let checkIfExists = await request.query(`SELECT count(*) as count FROM tbl_user
            WHERE LOWER(LTRIM(RTRIM(email))) = LOWER(@email);`);
        console.log(checkIfExists.recordset)
        if (checkIfExists.recordset[0].count > 0) {
            return res.status(409).json({ message: "Email already exists. User cannot be created." });
        }
        else {
            try {
                const insertResult = await request.query(`INSERT INTO tbl_user (
                    title, name, designation, role_id, organisation_id,
                    wing_id, division_id, email, password, phone, status, password_status
                )
                OUTPUT INSERTED.user_id
                VALUES (
                    @title, @name, @designation, @role, @organisation,
                    @wingId, @divisionId, @email, @password, @phone, 1, 1
                )`);

                const newUserId = insertResult.recordset?.[0]?.user_id || null;

                try {
                    const transporter = supportMailer();

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
                            <li><strong>Email: </strong>${email}</li>
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
                } catch (emailError) {
                    console.error("Error sending email:", emailError);
                }

                return res.status(200).json({
                    message: "User created successfully",
                    userId: newUserId,
                });
            } catch (insertError) {
                console.error("Error creating user:", insertError);
                return res.status(500).json({ message: "Failed to create user" });
            }
        }
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

// One row per user, as the user list shows it
const USER_LIST_SELECT = `SELECT tbl_user.user_id, tbl_user.title, tbl_user.name, tbl_user.designation,
        tbl_user.role_id, tbl_role.role_name, tbl_role.role_code, tbl_user.organisation_id, tbl_user.wing_id, wing_name, tbl_user.division_id,
        division_name,
        CASE
          WHEN tbl_role.role_code = 'SUPERADMIN' THEN 'System (SUPERADMIN)'
          ELSE mmt_organisation.organisation_name
        END AS organisation_name,
        mmt_organisation.organisation_category_id,
        tbl_user.email, tbl_user.phone, tbl_user.status,
        tbl_user.state_id, state_name, tbl_user.district_id, district_name, tbl_user.last_login
        FROM tbl_user
        INNER JOIN tbl_role on tbl_role.role_id = tbl_user.role_id
        LEFT JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_user.organisation_id
        LEFT JOIN mmt_state on mmt_state.state_id = tbl_user.state_id
        LEFT JOIN mmt_district on mmt_district.district_id = tbl_user.district_id
        LEFT JOIN mmt_wings on mmt_wings.wing_id = tbl_user.wing_id
        LEFT JOIN mmt_division on mmt_division.division_id = tbl_user.division_id`;

async function getUserData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`${USER_LIST_SELECT}
        order by user_id;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

// The signed-in user's own row (the Profile page)
async function getMyProfile(req, res) {
    const conn = await pool;
    const request = conn.request();
    request.input("userID", req.user.userId);
    try {
        const result = await request.query(`${USER_LIST_SELECT}
        WHERE tbl_user.user_id = @userID;`);
        if (!result.recordset.length) return res.status(404).json({ message: 'User not found.' });
        res.json(result.recordset[0]);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

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
                tbl_role.role_code,
                tbl_user.organisation_id, 
                mmt_organisation.organisation_name AS organisation_name, 
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
    const email = String(req.body.email || '').trim();
    const phone = String(req.body.phone || '').trim();
    const loginUser = req.user?.userId ?? null; // the signed-in user, not a value sent in the request

    if (!EMAIL_PATTERN.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
    }
    if (!MOBILE_PATTERN.test(phone)) {
        return res.status(400).json({ message: "Please enter a valid 10-digit mobile number" });
    }

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
        const duplicate = await request.query(`
            SELECT COUNT(*) AS count
            FROM tbl_user
            WHERE LOWER(LTRIM(RTRIM(email))) = LOWER(@email) AND user_id <> @userID
        `);

        if (duplicate.recordset[0].count > 0) {
            return res.status(409).json({
                message: "Email already exists for another user",
            });
        }

        await request.query(`UPDATE tbl_user SET title = @title, name = @name, designation = @designation,
        role_id = @role, organisation_id = @organisation, wing_id = @wingId, division_id = @divisionId, email = @email, 
        phone = @phone, updated_on = GETDATE(), updated_by = @loginUser WHERE user_id = @userID`);

        return res.status(200).json({ message: "User updated successfully" });
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

// A user's own details; their organisation, wing and division are set by the admin only
async function editUserProfileData(req, res) {
    const userID = req.body.userID;
    const title = req.body.title;
    const name = req.body.name;
    const designation = req.body.designation;
    const email = req.body.email;
    const phone = req.body.phone;
    const stateID = req.body.state;
    const districtID = req.body.district;
    const loginUser = req.user?.userId ?? null; // the signed-in user, not a value sent in the request

    const conn = await pool;
    const request = conn.request();

    request.input("userID", userID);
    request.input("title", title);
    request.input("name", name);
    request.input("designation", designation);
    request.input("email", email);
    request.input("phone", phone);
    request.input("stateID", stateID);
    request.input("districtID", districtID);
    request.input("loginUser", loginUser);

    try {
        // The email is the login ID, so it must stay unique (as in updateUser)
        const duplicate = await request.query(`
            SELECT COUNT(*) AS count
            FROM tbl_user
            WHERE email = @email AND user_id <> @userID
        `);
        if (duplicate.recordset[0].count > 0) {
            return res.status(409).json({ message: "Email already exists for another user" });
        }

        const result = await request.query(`
            UPDATE tbl_user
            SET title = @title, name = @name, designation = @designation,
                email = @email, phone = @phone,
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
    const loginUser = req.user?.userId ?? null; // the signed-in user, not a value sent in the request

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
    const encryptedNewPassword = req.body.newPassword; // RSA-encrypted, as on Login and Profile
    const loginUser = req.user?.userId ?? null; // the signed-in user, not a value sent in the request
    if (!userID || !encryptedNewPassword) {
        return res.status(400).json({ message: "New password is required" });
    }

    let newPassword;
    try {
        const privateKeyPem = (process.env.RSA_PRIVATE_KEY || "").replace(/\\n/g, "\n");
        const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
        newPassword = forge.util.decodeUtf8(privateKey.decrypt(forge.util.decode64(encryptedNewPassword), 'RSA-OAEP', {
            md: forge.md.sha256.create(),
            mgf1: { md: forge.md.sha256.create() },
        }));
    } catch (decryptErr) {
        console.error("Change password decrypt error:", decryptErr);
        return res.status(400).json({ message: "Password could not be read. Please try again." });
    }

    if (!PASSWORD_PATTERN.test(newPassword)) {
        return res.status(400).json({ message: PASSWORD_RULE_MESSAGE });
    }

  try {
        const hash = bcrypt.hashSync(newPassword, 10);
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
        const transporter = supportMailer();
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
        // The password is already changed: a failed email must not report the reset as failed
        try {
            await transporter.sendMail(mailOptions);
            console.log("Password change email sent");
        } catch (emailError) {
            console.error("Error sending password change email:", emailError);
        }

        return res.sendStatus(200);

    } catch (err) {
        console.error("Change password error:", err);
        return res.sendStatus(500);
    }
}

// Wrong current passwords per account; after MAX_PASSWORD_FAILURES within the window the
// account's password can't be changed this way until the window ends (stops password guessing)
const MAX_PASSWORD_FAILURES = 5;
const PASSWORD_FAILURE_WINDOW_MS = 15 * 60 * 1000;
const passwordFailures = new Map();

function isPasswordChangeLocked(key) {
    const entry = passwordFailures.get(key);
    if (!entry) return false;
    if (Date.now() - entry.since > PASSWORD_FAILURE_WINDOW_MS) {
        passwordFailures.delete(key);
        return false;
    }
    return entry.count >= MAX_PASSWORD_FAILURES;
}

function recordPasswordFailure(key) {
    const entry = passwordFailures.get(key);
    if (!entry || Date.now() - entry.since > PASSWORD_FAILURE_WINDOW_MS) {
        passwordFailures.set(key, { count: 1, since: Date.now() });
    } else {
        entry.count += 1;
    }
}

// Changing a password needs the current one (or the code emailed by Forgot Password, which is
// set as the password), so it also works from the login page without a session. The user is
// found by userID or, from Forgot Password, by email.
async function updatePassword(req, res) {
    const userID = req.body.userID;
    let email  = req.body.email;
    const loginUser = req.body.loginUser;
    const encryptedOldPassword = req.body.oldPassword;
    const encryptedNewPassword = req.body.newPassword;
    if (!encryptedOldPassword || !encryptedNewPassword || (!userID && !email)) {
        return res.status(400).json({ message: "Current and new password are required" });
    }

    const failureKey = userID ? `id:${Number(userID)}` : `email:${String(email).trim().toLowerCase()}`;
    if (isPasswordChangeLocked(failureKey)) {
        return res.status(429).json({ message: "Too many wrong attempts. Please try again after 15 minutes." });
    }

    const privateKeyPem = (process.env.RSA_PRIVATE_KEY || "").replace(/\\n/g, "\n");
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
            const result = await request.query(userID
                ? `SELECT user_id, email, password FROM tbl_user WHERE user_id = @userID`
                : `SELECT user_id, email, password FROM tbl_user WHERE LOWER(email) = LOWER(@email)`);
            const userData = result.recordset[0];

            // An unknown account gets the same answer as a wrong password, so this can't be used
            // to find out which emails have accounts
            if (!userData || !bcrypt.compareSync(decryptedOldPassword, userData.password)) {
                recordPasswordFailure(failureKey);
                return res.status(400).json({ message: "Current password is incorrect" });
            }
            passwordFailures.delete(failureKey);
            // The confirmation goes to the address on file, and the update to the user found
            email = userData.email;
            request.input("targetUserID", userData.user_id);

            // Hash and update the new password
            const saltRounds = 10;
            const hashedNewPassword = await bcrypt.hash(decryptedNewPassword, saltRounds);
            console.log("hi2")

            request.input("newPassword", hashedNewPassword);

            const sqlQuery = ` UPDATE tbl_user SET password = @newPassword, password_status = 1, password_updated_on = GETDATE(),
                password_updated_by = @targetUserID WHERE user_id = @targetUserID  `;

            // res.status(200).json({ message: "Password changed successfully" });
            await request.query(sqlQuery);

          console.log("Password changed successfully");



                    const transporter = supportMailer();


            
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

export default { createuser, getUserData, getMyProfile, updateUser, toggleUserStatusData, changePasswordAction, updatePassword, editUserProfileData, getOrgUserData,
    getUserDetails
 };