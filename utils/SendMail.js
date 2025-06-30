const nodemailer = require("nodemailer"); //  liabrary in node js

const sendmail = (options) => {
  // 1)create a transport ( service that will send email like "gmail","Mailgun", "mialtrap", sendGrid)

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true,   // if secure false port = 587, if true port= 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // 2) Define email options (like from, to, subject, email content)
  const mailOPtions = {
    from: "Marasil Company <Marasil@gmail.com>",
    to: options.to,
    subject: options.subject,
    text: options.text,
  };

  // 3) send email
  ////////////function
  transporter.sendMail(mailOPtions);
};


module.exports = sendmail;