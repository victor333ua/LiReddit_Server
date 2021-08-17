import nodemailer from 'nodemailer';

export async function sendEmail(to: string, html: string): Promise<Boolean> {
// let testAccount = await nodemailer.createTestAccount();
// console.log('testAccount: ', testAccount);

// create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: 'h6si3vj4acdmsuss@ethereal.email', // generated ethereal user
        pass: 'vWC8GvUnstsvDsjFsn', // generated ethereal password
    },
    });

    // send mail with defined transport object
    let info = await transporter.sendMail({
    from: '"Server 👻" <foo@example.com>', // sender address
    to: to,
    subject: "Forgot password ✔", // Subject line
    html
    });

    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    
    return !!info.messageId;
};