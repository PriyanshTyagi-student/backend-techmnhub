const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  try {
    const payload = {
      from: "Zonex 2026 <noreply@techmnhub.com>",  // verified domain
      to: to,
      subject: subject,
      html: html,
    };

    if (attachments.length > 0) {
      console.log(`📎 Attaching ${attachments.length} file(s):`, attachments.map(a => ({ filename: a.filename, type: a.contentType })));
      payload.attachments = attachments;
    }

    console.log(`📤 Sending email to ${to} with subject: ${subject}`);
    const { data, error } = await resend.emails.send(payload);

    if (error) {
      console.error("❌ Resend Error:", error);
      throw new Error(`Resend failed: ${error.message}`);
    }

    console.log("✅ Email Sent:", data);
    return data;

  } catch (err) {
    console.error("❌ Email failed:", err.message || err);
    throw err;
  }
};

module.exports = sendEmail;
