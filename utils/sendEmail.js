const nodemailer = require("nodemailer");
const { Resend } = require("resend");

const RESEND_FROM = process.env.RESEND_FROM || "Zonex 2026 <noreply@techmnhub.com>";
const SMTP_FROM = process.env.SMTP_FROM || RESEND_FROM;
const EMAIL_PROVIDER = String(process.env.EMAIL_PROVIDER || "auto").toLowerCase();

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const toSmtpAttachments = (attachments = []) => {
  return attachments.map((file) => ({
    filename: file.filename,
    content: file.content,
    contentType: file.contentType,
    cid: file.contentId,
    encoding: typeof file.content === "string" ? "base64" : undefined,
  }));
};

const getSmtpTransporter = () => {
  const user = process.env.BREVO_EMAIL || process.env.SMTP_USER || process.env.EMAIL;
  const pass = process.env.BREVO_PASSWORD || process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error("SMTP credentials not configured");
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: { user, pass },
  });
};

const getGmailTransporter = () => {
  const email = process.env.EMAIL;
  const password = process.env.EMAIL_PASS;

  if (!email || !password) {
    throw new Error("Gmail credentials (EMAIL, EMAIL_PASS) not configured");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: email,
      pass: password,
    },
  });
};

const sendWithResend = async ({ to, subject, html, attachments }) => {
  if (!resend) {
    throw new Error("RESEND_API_KEY missing");
  }

  const payload = {
    from: RESEND_FROM,
    to,
    subject,
    html,
    attachments: attachments.length > 0 ? attachments : undefined,
  };

  const { data, error } = await resend.emails.send(payload);

  if (error) {
    throw new Error(error.message || "Unknown Resend error");
  }

  return data;
};

const sendWithSmtp = async ({ to, subject, html, attachments }) => {
  const transporter = getSmtpTransporter();

  const info = await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    html,
    attachments: toSmtpAttachments(attachments),
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  };
};

const sendWithGmail = async ({ to, subject, html, attachments }) => {
  const transporter = getGmailTransporter();

  const info = await transporter.sendMail({
    from: process.env.EMAIL,
    to,
    subject,
    html,
    attachments: toSmtpAttachments(attachments),
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  };
};

const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  console.log(`📤 Sending email to ${to} with subject: ${subject}`);
  console.log(`📨 Email provider mode: ${EMAIL_PROVIDER}`);
  if (attachments.length > 0) {
    console.log(
      `📎 Attaching ${attachments.length} file(s):`,
      attachments.map((a) => ({ filename: a.filename, type: a.contentType })),
    );
  }

  if (EMAIL_PROVIDER === "resend") {
    const resendResult = await sendWithResend({ to, subject, html, attachments });
    console.log("✅ Email sent via Resend:", resendResult);
    return { provider: "resend", data: resendResult };
  }

  if (EMAIL_PROVIDER === "smtp") {
    const smtpResult = await sendWithSmtp({ to, subject, html, attachments });
    console.log("✅ Email sent via SMTP:", smtpResult);
    return { provider: "smtp", data: smtpResult };
  }

  if (EMAIL_PROVIDER === "gmail") {
    const gmailResult = await sendWithGmail({ to, subject, html, attachments });
    console.log("✅ Email sent via Gmail:", gmailResult);
    return { provider: "gmail", data: gmailResult };
  }

  if (EMAIL_PROVIDER !== "auto") {
    throw new Error(`Unsupported EMAIL_PROVIDER: ${EMAIL_PROVIDER}. Use auto, resend, smtp, or gmail.`);
  }

  try {
    const resendResult = await sendWithResend({ to, subject, html, attachments });
    console.log("✅ Email sent via Resend:", resendResult);
    return { provider: "resend", data: resendResult };
  } catch (resendErr) {
    console.error("❌ Resend failed, trying Gmail fallback:", resendErr.message || resendErr);
  }

  try {
    const gmailResult = await sendWithGmail({ to, subject, html, attachments });
    console.log("✅ Email sent via Gmail fallback:", gmailResult);
    return { provider: "gmail", data: gmailResult };
  } catch (gmailErr) {
    console.error("❌ Gmail fallback failed, trying SMTP:", gmailErr.message || gmailErr);
  }

  try {
    const smtpResult = await sendWithSmtp({ to, subject, html, attachments });
    console.log("✅ Email sent via SMTP fallback:", smtpResult);
    return { provider: "smtp", data: smtpResult };
  } catch (smtpErr) {
    console.error("❌ SMTP fallback failed:", smtpErr.message || smtpErr);
    throw new Error(`Email delivery failed. All providers exhausted. Last error: ${smtpErr.message}`);
  }
};

module.exports = sendEmail;
