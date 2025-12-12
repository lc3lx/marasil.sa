const nodemailer = require("nodemailer"); //  liabrary in node js

const sendmail = async (options) => {
  try {
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
    const mailOptions = {
      from: `Marasil Company <${process.env.EMAIL_USER || "Marasil@gmail.com"}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    // 3) send email
    const result = await transporter.sendMail(mailOptions);
    console.log("📧 Email sent successfully:", result.messageId);
    return result;

  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw error;
  }
};

// دالة خاصة لإرسال رمز تسجيل الدخول للموظف الجديد
const sendEmployeeWelcomeEmail = async (employeeData) => {
  const { name, email, tempPassword } = employeeData;

  const subject = "مرحباً بك في منصة مراسيل - بيانات تسجيل الدخول";
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>مرحباً بك في مراسيل</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; color: #333; }
        .temp-password { background-color: #f8f9fa; border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: bold; color: #dc3545; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 20px 0; color: #856404; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
        .button { display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>مرحباً بك في منصة مراسيل</h1>
          <p>تم إنشاء حسابك بنجاح</p>
        </div>

        <div class="content">
          <p>عزيزي/عزيزتي <strong>${name}</strong>,</p>

          <p>تم إنشاء حسابك في نظام إدارة مراسيل بنجاح. يمكنك الآن تسجيل الدخول إلى المنصة باستخدام البيانات التالية:</p>

          <div class="temp-password">
            كلمة المرور المؤقتة: <span style="font-size: 20px;">${tempPassword}</span>
          </div>

          <div class="warning">
            <strong>⚠️ تنبيه هام:</strong><br>
            يرجى تغيير كلمة المرور فور تسجيل الدخول الأول لأسباب الأمان.
          </div>

          <p>يمكنك تسجيل الدخول من خلال الرابط التالي:</p>
          <a href="${process.env.FRONTEND_URL || 'https://marasil.com/login'}" class="button">تسجيل الدخول إلى المنصة</a>

          <p>إذا كان لديك أي استفسارات، لا تتردد في التواصل معنا.</p>

          <p>مع خالص التحية,<br>
          فريق مراسيل</p>
        </div>

        <div class="footer">
          <p>© 2024 مراسيل. جميع الحقوق محفوظة.</p>
          <p>هذا البريد الإلكتروني تم إرساله تلقائياً، يرجى عدم الرد عليه.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    مرحباً ${name},

    تم إنشاء حسابك في نظام إدارة مراسيل بنجاح.

    كلمة المرور المؤقتة: ${tempPassword}

    ⚠️ تنبيه: يرجى تغيير كلمة المرور فور تسجيل الدخول الأول.

    يمكنك تسجيل الدخول من: ${process.env.FRONTEND_URL || 'https://marasil.com/login'}

    مع خالص التحية,
    فريق مراسيل
  `;

  return await sendmail({
    to: email,
    subject,
    text,
    html,
  });
};


module.exports = { sendmail, sendEmployeeWelcomeEmail };