const nodemailer = require("nodemailer");

function hasSmtpConfig() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendRiskAlertEmail({ toEmail, userName, riskLevel, riskScore, explanation }) {
  if (!hasSmtpConfig()) {
    return { sent: false, reason: "SMTP is not configured on backend." };
  }

  const fromEmail = process.env.ALERT_FROM_EMAIL || process.env.SMTP_USER;
  const transporter = createTransporter();

  await transporter.sendMail({
    from: fromEmail,
    to: toEmail,
    subject: `[InnoVest Alert] ${riskLevel} risk detected`,
    text: [
      `Hello ${userName || "User"},`,
      "",
      `A risk alert has been triggered.`,
      `Risk Level: ${riskLevel}`,
      `Risk Score: ${riskScore}`,
      "",
      "AI Explanation:",
      explanation || "No explanation provided.",
      "",
      "Please review the dashboard and take required action.",
    ].join("\n"),
  });

  return { sent: true };
}

module.exports = { sendRiskAlertEmail };
