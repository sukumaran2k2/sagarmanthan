import { pool } from "../db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import axios from "axios";
import forge from 'node-forge';

// const nodemailer = require('nodemailer');
// validation();

async function validation(req, res) {
  const email = req.body.email;
  const encryptedPassword = req.body.password;
  const reCaptchaResponse = req.body.recaptchaResponse;

  const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

  // LOG 1: Request received
  console.log('[LOGIN_START]', {
    email,
    timestamp: new Date().toISOString(),
    hasPassword: !!encryptedPassword,
    hasRecaptcha: !!reCaptchaResponse
  });

  if (!email || !encryptedPassword || !reCaptchaResponse) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  const conn = await pool;
  const request = conn.request();
  request.input("email", email);

  try {

    const params = new URLSearchParams();
    params.append('secret', RECAPTCHA_SECRET_KEY);
    params.append('response', reCaptchaResponse);

    const recaptchaRes = await axios.post('https://www.google.com/recaptcha/api/siteverify', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('[RECAPTCHA_RESULT]', {
      success: recaptchaRes.data.success,
      errorCodes: recaptchaRes.data['error-codes'],
      secretUsed: RECAPTCHA_SECRET_KEY ? RECAPTCHA_SECRET_KEY.substring(0, 6) + '...' : 'undefined'
    });

    if (!recaptchaRes.data.success) {
      if (RECAPTCHA_SECRET_KEY === '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe') {
        console.warn('[RECAPTCHA_WARNING] Bypassing recaptcha verification failure for Google test keys.');
      } else {
        return res.status(400).json({
          message: 'Captcha verification failed',
          errorCodes: recaptchaRes.data['error-codes'],
        });
      }
    }

    const result =
      await request.query(`SELECT user_id, password, email, tbl_user.role_id, tbl_role.role_name, status,vibhas_id,
            password_status, tbl_user.wing_id, tbl_user.organisation_id,password_updated_on FROM tbl_user
            INNER JOIN tbl_role on tbl_role.role_id = tbl_user.role_id 
            WHERE email = @email`);

    const userData = result.recordset[0];
    if (userData) {
      const privateKeyPem = (process.env.RSA_PRIVATE_KEY || "").replace(/\\n/g, "\n");

      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

      // LOG 2: About to decrypt
      console.log('[LOGIN_DECRYPT_START]', {
        email,
        userId: userData.user_id,
        encryptedPasswordLength: encryptedPassword?.length
      });

      // Decrypt the password
      let decryptedPassword;
      try {
        decryptedPassword = privateKey.decrypt(
          forge.util.decode64(encryptedPassword),
          'RSA-OAEP',
          {
            md: forge.md.sha256.create(),
            mgf1: { md: forge.md.sha256.create() },
          }
        );
        console.log('[LOGIN_DECRYPT_SUCCESS]', { email, userId: userData.user_id });
      } catch (decryptionError) {
        // LOG 3: RSA decryption failed
        console.error('[LOGIN_ERROR] RSA_DECRYPT_FAILED', {
          email,
          userId: userData.user_id,
          error: decryptionError.message,
          encryptedPasswordLength: encryptedPassword?.length
        });
        return res.status(400).json({ message: 'Decryption failed' });
      }

      // Validate password
      const isPasswordMatch = await bcrypt.compare(decryptedPassword, userData.password);
      if (isPasswordMatch) {

        let organisationId = userData.organisation_id;

        console.log('[LOGIN_ORG_CHECK]', { email, userId: userData.user_id, organisationId });

        const roleProfileQuery = await request.query(`
          SELECT
            r.role_id,
            r.role_code,
            r.role_name,
            uv.ui_view_code,
            ds.data_scope_code
          FROM tbl_role r
          LEFT JOIN tbl_rbac_role_ui_view ruv ON ruv.role_id = r.role_id
          LEFT JOIN mmt_rbac_ui_view uv ON uv.ui_view_id = ruv.ui_view_id
          LEFT JOIN tbl_rbac_role_data_scope rds ON rds.role_id = r.role_id
          LEFT JOIN mmt_rbac_data_scope ds ON ds.data_scope_id = rds.data_scope_id
          WHERE r.role_id = ${userData.role_id}
        `);
        const roleProfile = roleProfileQuery.recordset[0] || {};
        const roleCode = roleProfile.role_code || null;
        const uiViewCode = roleProfile.ui_view_code || null;
        const dataScopeCode = roleProfile.data_scope_code || null;

        // Single SUPERADMIN: hardcoded — no org, no module CRUD from tables
        const isSuperAdminLogin = roleCode === 'SUPERADMIN';

        let allowedModules = [];
        let modulePermissions = [];

        if (!isSuperAdminLogin && organisationId != null) {
          const moduleQuery = await request.query(`
            SELECT p.module_id
            FROM tbl_rbac_org_module_permission p
            INNER JOIN tbl_modules m ON m.module_id = p.module_id
            WHERE p.organisation_id = ${Number(organisationId)}
              AND p.is_allowed = 1
              AND ISNULL(m.is_active, 1) = 1
          `);
          allowedModules = moduleQuery.recordset.map(row => row.module_id);

          if (allowedModules.length > 0) {
            const modulePermissionsQuery = await request.query(`
              SELECT
                p.module_id,
                p.can_create,
                p.can_read,
                p.can_update,
                p.can_delete
              FROM tbl_rbac_user_module_crud p
              WHERE p.user_id = ${userData.user_id}
                AND p.module_id IN (${allowedModules.join(',')})
            `);

            modulePermissions = modulePermissionsQuery.recordset.map(row => ({
              moduleId: row.module_id,
              create: !!row.can_create,
              read: !!row.can_read,
              update: !!row.can_update,
              delete: !!row.can_delete,
            }));
          }
        }

        console.log('[LOGIN_MODULES]', {
          email,
          userId: userData.user_id,
          roleId: userData.role_id,
          roleCode,
          uiViewCode,
          dataScopeCode,
          isSuperAdminLogin,
          organisationId,
          allowedModules,
          allowedModulesCount: allowedModules.length
        });

        const chainlitAccessToken = generateChainlitToken(userData);

        const tokenPayload = {
          userId: userData.user_id,
          roleId: userData.role_id,
          roleCode,
          roleName: roleProfile.role_name || userData.role_name,
          uiViewCode,
          dataScopeCode,
          email: userData.email,
          status: userData.status,
          passwordStatus: userData.password_status,
          passwordUpdatedOn: userData.password_updated_on,
          organisationId: isSuperAdminLogin ? null : userData.organisation_id,
          wingId: userData.wing_id,
          vibhasId: userData.vibhas_id,
          chainlitAccessToken,
          allowedModules,
          modulePermissions,
        };

        try {
          const updateLoginRequest = conn.request();
          updateLoginRequest.input("userID", userData.user_id);
          await updateLoginRequest.query(`
            UPDATE tbl_user 
            SET last_login = GETDATE() 
            WHERE user_id = @userID
          `);
        } catch (updateLoginErr) {
          console.error("Error updating last_login timestamp:", updateLoginErr);
        }

        const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
          expiresIn: "30m",
        });
        const refreshToken = jwt.sign(tokenPayload, process.env.MIKR_REFRESH_SECRET, {
          expiresIn: "1d",
        });
        res.json({ accessToken, refreshToken });
      } else {
        console.error('[LOGIN_ERROR] WRONG_PASSWORD', { email, userId: userData.user_id });
        res.status(250).json({
          message: "Invalid Credentials",
          passwordUpdatedOn: userData?.password_updated_on || null
        });
      }
    } else {
      // LOG 11: User not found
      console.error('[LOGIN_ERROR] USER_NOT_FOUND', { email });
      res.status(250).json({
        message: "Invalid Credentials",
        passwordUpdatedOn: userData?.password_updated_on || null
      });
    }
  } catch (err) {
    // LOG 12: Unexpected error
    console.error('[LOGIN_ERROR] UNHANDLED_EXCEPTION', {
      email,
      error: err.message,
      stack: err.stack
    });
    return res.sendStatus(500);
  }
}

function generateChainlitToken(user) {
  const CHAINLIT_AUTH_SECRET = process.env.CHAINLIT_AUTH_SECRET;

  const payload = {
    identifier: String(user.user_id),
    metadata: {
      roleId: user.role_id,
      email: user.email,
      organisationId: user.organisation_id,
    },
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 15
  };

  return jwt.sign(payload, CHAINLIT_AUTH_SECRET, {
    algorithm: "HS256"
  });
}

async function resetpassword(req, res) {

  const email = req.body.email;
  const updated_on = req.body.updated_on;
  const reCaptchaResponse = req.body.recaptchaResponse;
  const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';

  if (!email || !reCaptchaResponse) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  try {
    const params = new URLSearchParams();
    params.append('secret', RECAPTCHA_SECRET_KEY);
    params.append('response', reCaptchaResponse);

    const recaptchaRes = await axios.post('https://www.google.com/recaptcha/api/siteverify', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!recaptchaRes.data.success) {
      if (RECAPTCHA_SECRET_KEY === '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe') {
        console.warn('[RECAPTCHA_WARNING] Bypassing recaptcha verification failure for Google test keys.');
      } else {
        return res.status(400).json({
          message: 'Captcha verification failed',
          errorCodes: recaptchaRes.data['error-codes'],
        });
      }
    }
  } catch (err) {
    console.log('Captcha verification error:', err);
    return res.status(500).json({ message: 'Captcha verification failed' });
  }

  const conn = await pool;
  const request = conn.request();
  request.input("email", email);

  try {
    const result = await request.query(
      `SELECT email, user_id, status FROM tbl_user WHERE email = @email`
    );

    // console.log("result",result);

    const userData = result.recordset[0];
    // console.log(userData);
    if (userData && userData.status === 1) {
      const newPassword = await generateRandomPassword();

      console.log("GENERATED_RESET_PASSWORD:", newPassword);
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      //console.log("hashedPassword",hashedPassword);

      try {
        try {
          const sqlQuery = `
                        UPDATE tbl_user 
                        SET password = @hashedPassword, password_status = 1 , password_updated_on = @updated_on
                        WHERE user_id = @userID
                    `;

          const request = conn.request();
          request.input("hashedPassword", hashedPassword);
          request.input("userID", userData.user_id);
          request.input("updated_on", updated_on);

          await request.query(sqlQuery);

          console.log("Password updated successfully");
        } catch (updateError) {
          console.error("Error updating password:", updateError);
          return res.sendStatus(250);
        }

        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || "smtp.office365.com",
          port: parseInt(process.env.SMTP_PORT || "587"),
          auth: {
            user: process.env.SMTP_USER || "sagarmanthansupport@ntcpwc.iitm.ac.in",
            pass: process.env.SMTP_PASS || "Sagarmanthan@123",
          },
        });

        const mailOptions = {
          from: process.env.SMTP_USER || "sagarmanthansupport@ntcpwc.iitm.ac.in",
          to: email,
          subject: "Sagarmanthan Portal – Password Reset Instructions",
          html: `Dear User,
                    <br><br>
                    This is to inform you that a request has been initiated to reset the password for your <strong>Sagarmanthan Portal</strong> user account.           
                    <br><br>
                    The new password is: <strong>${newPassword}</strong>
                    <br><br>
                    You can log in to your account and reset the password if needed.
                    <br><br>
                    In case you face any difficulty, please reach out to the helpline via email.
                    <br>
                    <a href="mailto:sagarmanthansupport@ntcpwc.iitm.ac.in">sagarmanthansupport@ntcpwc.iitm.ac.in</a>
                    <br><br>
                    This is an auto-generated email. Please do not reply.
                    <br><br>
                    Warm regards,
                           <br>
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
    } else {
      return res.sendStatus(250);
    }
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
  console.log(
    "--------------------------------------------------------------------------------"
  );
}

async function generateRandomPassword() {
  const length = 6;
  const characters = "1234567890";

  let randomPassword = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomPassword += characters.charAt(randomIndex);
  }

  return randomPassword;
}

export default { validation, resetpassword };