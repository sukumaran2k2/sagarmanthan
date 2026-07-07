import nodemailer from 'nodemailer';

async function sendEmail({ to, subject, text, cc = [] }) {
    let transporter = nodemailer.createTransport({
        host: "smtp.outlook.com",
        port: 587,
        secure: false,
        auth: {
            user: 'support@ntcpwc.iitm.ac.in',
            pass: 'R@nj!009'
        },
        tls: {
            rejectUnauthorized: false
        }
    });

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
