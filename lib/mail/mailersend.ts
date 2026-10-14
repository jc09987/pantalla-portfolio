import nodemailer from "nodemailer";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

export function mailerSendConfigured() {
  return Boolean(
    env("MAILERSEND_SMTP_USER") &&
      env("MAILERSEND_SMTP_PASS") &&
      env("MAILERSEND_FROM_EMAIL") &&
      env("CONTACT_TO_EMAIL"),
  );
}

export function createMailerSendTransport() {
  return nodemailer.createTransport({
    host: env("MAILERSEND_SMTP_HOST") || "smtp.mailersend.net",
    port: Number(env("MAILERSEND_SMTP_PORT") || 587),
    secure: false,
    requireTLS: true,
    auth: {
      user: env("MAILERSEND_SMTP_USER"),
      pass: env("MAILERSEND_SMTP_PASS"),
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

export function mailerSendFrom() {
  const email = env("MAILERSEND_FROM_EMAIL");
  const name = env("MAILERSEND_FROM_NAME") || "Pantalla";
  return { email, name };
}

export function contactInbox() {
  return env("CONTACT_TO_EMAIL");
}
