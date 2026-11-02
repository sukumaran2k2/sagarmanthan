import { alertMailer } from "../../utils/mailer.js";

async function sendEmail({ to, subject, text, cc = [] }) {
    let transporter = alertMailer();

    let mailOptions = {
        from: '"Sagarmanthan" <support@ntcpwc.iitm.ac.in>',
        to: to,
        subject: subject,
        text: text,
        html: `${text}
        <br><br>
        This is an auto generated email. Please do not reply.
        <br><br>
        Regards,<br>
        Sagarmanthan Team`,
        cc: cc
    };

    await transporter.sendMail(mailOptions);
}

export { sendEmail };
