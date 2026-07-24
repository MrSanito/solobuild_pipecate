import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST;
const port = parseInt(process.env.SMTP_PORT || "465", 10);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.SMTP_FROM || (user ? `"Solobuild AI" <${user}>` : "");

export const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465, // true for 465, false for other ports (e.g. 587)
  auth: {
    user,
    pass,
  },
});

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export async function sendEmail({ to, subject, text, html, from: customFrom }: SendEmailOptions) {
  if (!host || !user || !pass) {
    throw new Error("SMTP configuration is incomplete. Please check environment variables.");
  }

  try {
    const info = await transporter.sendMail({
      from: customFrom || from,
      to,
      subject,
      text,
      html,
    });
    console.log("Email sent successfully. Message ID:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("Failed to send email:", error);
    throw error;
  }
}
