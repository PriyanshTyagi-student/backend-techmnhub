const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "Zonex 2026 <noreply@techmnhub.com>",  // verified domain
      to: to,
      subject: subject,
      html: html,
    });

    if (error) {
      console.error("❌ Resend Error:", error);
      throw error;
    }

    console.log("✅ Email Sent:", data);
    return data;

  } catch (err) {
    console.error("❌ Email failed:", err);
    throw err;
  }
};

module.exports = sendEmail;
