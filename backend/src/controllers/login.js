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

  const RECAPTCHA_SECRET_KEY = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';

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

    const recaptchaVerifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${reCaptchaResponse}`;
    const recaptchaRes = await axios.post(recaptchaVerifyUrl);

    if (!recaptchaRes.data.success) {
      return res.status(400).json({
        message: 'Captcha verification failed',
        errorCodes: recaptchaRes.data['error-codes'],
      });
    }

    const result =
      await request.query(`SELECT user_id, password, email, tbl_user.role_id, tbl_role.role_name, status,vibhas_id,
            password_status, tbl_user.wing_id, tbl_user.organisation_id,password_updated_on FROM tbl_user
            INNER JOIN tbl_role on tbl_role.role_id = tbl_user.role_id 
            WHERE email = @email`);

    const userData = result.recordset[0];
    if (userData) {
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

        // Get allowed modules for the user's organization category
        let organisationId = userData.organisation_id;

        // LOG 4: Checking org category
        console.log('[LOGIN_ORG_CHECK]', { email, userId: userData.user_id, organisationId });

        // Get organisation_usermatrix_category_id for the user's organisation
        let categoryQuery = await request.query(`
        SELECT mo.organisation_usermatrix_category_id
        FROM mmt_organisation mo
        WHERE mo.organisation_id = ${organisationId}      
      `);
        let orgUserMatrixCategoryId = categoryQuery.recordset[0]?.organisation_usermatrix_category_id;

        if (!orgUserMatrixCategoryId) {
          // LOG 5: Org category not found
          console.error('[LOGIN_ERROR] ORG_CATEGORY_NOT_FOUND', {
            email,
            userId: userData.user_id,
            organisationId
          });
          res.status(400).send("User's organisation category not found");
          return;
        }

        // Get allowed modules for the organisation_usermatrix_category_id
        let moduleQuery = await request.query(`
        SELECT p.module_id 
        FROM tbl_usermatrix_category_module_permission p
        WHERE p.organisation_usermatrix_category_id = ${orgUserMatrixCategoryId} 
        AND p.permission = 1
      `);
        let allowedModules = moduleQuery.recordset.map(row => row.module_id);

        // LOG 6: Allowed modules
        console.log('[LOGIN_MODULES]', {
          email,
          userId: userData.user_id,
          roleId: userData.role_id,
          allowedModules,
          allowedModulesCount: allowedModules.length
        });

        // Add restriction for SUPERADMIN
        if (userData.user_id === 5) {
          const specificModules = [1, 2, 3, 4, 5, 6, 7, 8, 62];
          allowedModules = Array.from(new Set([...specificModules]));
        }

        const chainlitAccessToken = generateChainlitToken(userData);

        // Assign allowed modules to token payload
        const tokenPayload = {
          userId: userData.user_id,
          // hashPassword: userData.password,
          roleId: userData.role_id,
          email: userData.email,
          status: userData.status,
          passwordStatus: userData.password_status,
          passwordUpdatedOn: userData.password_updated_on,
          organisationId: userData.organisation_id,
          wingId: userData.wing_id,
          vibhasId: userData.vibhas_id,
          chainlitAccessToken,
          allowedModules,
        };

        if (userData.role_id === 7) {
          let modulePermissions = [];

          // FIX: Guard against empty allowedModules
          if (allowedModules.length > 0) {
            // LOG 7: Role 7 permissions check
            console.log('[LOGIN_ROLE7_PERMISSIONS]', {
              email,
              userId: userData.user_id,
              allowedModules
            });

            let modulePermissionsQuery = await request.query(`
              SELECT 
                p.module_id,
                p.create_permission,
                p.read_permission,
                p.update_permission,
                p.delete_permission
              FROM tbl_usermatrix_user_module_crud_permission p
              WHERE p.module_id IN (${allowedModules.join(",")}) AND p.user_id = ${userData.user_id}
            `);

            // Map the permissions to their corresponding modules
            modulePermissions = modulePermissionsQuery.recordset.map(row => ({
              moduleId: row.module_id,
              create: !!row.create_permission,
              read: !!row.read_permission,
              update: !!row.update_permission,
              delete: !!row.delete_permission,
            }));
          } else {
            // LOG 8: Role 7 but no allowed modules
            console.warn('[LOGIN_WARNING] ROLE7_NO_MODULES', {
              email,
              userId: userData.user_id,
              organisationId
            });
          }

          // Add permissions to the token payload
          tokenPayload.modulePermissions = modulePermissions;
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
  const RECAPTCHA_SECRET_KEY = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';

  if (!email || !reCaptchaResponse) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  try {
    const recaptchaVerifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${reCaptchaResponse}`;
    const recaptchaRes = await axios.post(recaptchaVerifyUrl);

    if (!recaptchaRes.data.success) {
      return res.status(400).json({
        message: 'Captcha verification failed',
        errorCodes: recaptchaRes.data['error-codes'],
      });
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