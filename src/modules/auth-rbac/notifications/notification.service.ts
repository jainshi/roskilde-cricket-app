import nodemailer from "nodemailer";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface NotificationService {
  sendEmail(
    options: SendEmailOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export class ConsoleNotificationAdapter implements NotificationService {
  async sendEmail(
    options: SendEmailOptions
  ): Promise<{ success: boolean; messageId?: string }> {
    const recipients = Array.isArray(options.to) ? options.to.join(", ") : options.to;
    console.log("--------------------------------------------------");
    console.log(`[NotificationService:Console] Sending Email`);
    console.log(`To: ${recipients}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Content:\n${options.text || options.html}`);
    console.log("--------------------------------------------------");
    return { success: true, messageId: `console-${Date.now()}` };
  }
}

export class SmtpNotificationAdapter implements NotificationService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "localhost",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASSWORD || "",
      },
    });
  }

  async sendEmail(
    options: SendEmailOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const from = process.env.SMTP_FROM || "Roskilde Cricket Club <noreply@roskildecricket.dk>";
      const info = await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      return { success: true, messageId: info.messageId };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "SMTP Send Error";
      console.error("[SmtpNotificationAdapter] Failed to send email:", errorMessage);
      return { success: false, error: errorMessage };
    }
  }
}

/**
 * Factory resolving the active NotificationService adapter based on NOTIFICATION_PROVIDER env var.
 */
export function getNotificationService(): NotificationService {
  const provider = process.env.NOTIFICATION_PROVIDER?.toLowerCase();
  if (provider === "smtp") {
    return new SmtpNotificationAdapter();
  }
  return new ConsoleNotificationAdapter();
}

export const notificationService = getNotificationService();
