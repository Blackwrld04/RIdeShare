import nodemailer, { type Transporter } from "nodemailer";
import type { AppConfig } from "@commuteshare/config";

export interface OtpMessage {
  phoneE164: string;
  code: string;
  expiresInSeconds: number;
  email?: string | undefined;
}

export abstract class OtpDelivery {
  abstract send(message: OtpMessage): Promise<string>;
}

export class DevelopmentOtpDelivery extends OtpDelivery {
  async send(message: OtpMessage): Promise<string> {
    console.log(
      `[DevelopmentOtpDelivery] OTP Code: ${message.code} for phone: ${message.phoneE164}${
        message.email ? ` (email: ${message.email})` : ""
      }`,
    );
    await Promise.resolve();
    return "console";
  }
}

type FetchImplementation = typeof fetch;

export class TermiiOtpDelivery extends OtpDelivery {
  constructor(
    private readonly config: AppConfig,
    private readonly fetchImplementation: FetchImplementation = fetch,
  ) {
    super();
  }

  async send(message: OtpMessage): Promise<string> {
    const endpoint = new URL("/api/sms/send", this.config.TERMII_BASE_URL);
    const minutes = Math.ceil(message.expiresInSeconds / 60);
    const response = await this.fetchImplementation(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: this.config.TERMII_API_KEY,
        to: message.phoneE164.slice(1),
        from: this.config.TERMII_SENDER_ID,
        sms: `Your RideShare code is ${message.code}. It expires in ${minutes} minutes.`,
        type: "plain",
        channel: "generic",
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(
        `Termii rejected the OTP message with ${response.status}`,
      );
    }
    return "termii";
  }
}

export class AfricasTalkingOtpDelivery extends OtpDelivery {
  constructor(
    private readonly config: AppConfig,
    private readonly fetchImplementation: FetchImplementation = fetch,
  ) {
    super();
  }

  async send(message: OtpMessage): Promise<string> {
    const endpoint = new URL(
      "/version1/messaging",
      this.config.AFRICASTALKING_BASE_URL,
    );
    const minutes = Math.ceil(message.expiresInSeconds / 60);
    const body = new URLSearchParams({
      username: this.config.AFRICASTALKING_USERNAME ?? "",
      to: message.phoneE164,
      message: `Your RideShare code is ${message.code}. It expires in ${minutes} minutes.`,
      ...(this.config.AFRICASTALKING_SENDER_ID
        ? { from: this.config.AFRICASTALKING_SENDER_ID }
        : {}),
    });
    const response = await this.fetchImplementation(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        apiKey: this.config.AFRICASTALKING_API_KEY ?? "",
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(
        `Africa's Talking rejected the OTP message with ${response.status}`,
      );
    }
    return "africastalking";
  }
}

export class FallbackOtpDelivery extends OtpDelivery {
  constructor(
    private readonly primary: OtpDelivery,
    private readonly fallback: OtpDelivery,
  ) {
    super();
  }

  async send(message: OtpMessage): Promise<string> {
    try {
      return await this.primary.send(message);
    } catch {
      return this.fallback.send(message);
    }
  }
}

export class GmailSmtpOtpDelivery extends OtpDelivery {
  private transporter: Transporter;

  constructor(private readonly config: AppConfig) {
    super();
    this.transporter = nodemailer.createTransport({
      host: this.config.SMTP_HOST || "smtp.gmail.com",
      port: this.config.SMTP_PORT || 465,
      secure: this.config.SMTP_SECURE ?? true,
      auth: {
        user: this.config.SMTP_USER,
        pass: this.config.SMTP_PASS?.replace(/\s+/g, ""),
      },
    });
  }

  async send(message: OtpMessage): Promise<string> {
    const minutes = Math.ceil(message.expiresInSeconds / 60);
    const recipient = message.email || this.config.SMTP_USER;
    if (!recipient) {
      throw new Error("No recipient email specified for Gmail SMTP OTP delivery");
    }

    const fromAddress = this.config.EMAIL_FROM || `RideShare <${this.config.SMTP_USER}>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RideShare Verification Code</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0A0B0E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FFFFFF;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0A0B0E; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #14161C; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden; padding: 36px 28px;">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <span style="font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #FFFFFF;">Ride<span style="color: #10B981;">Share</span></span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #FFFFFF;">Your Verification Code</h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 28px;">
                    <p style="margin: 0; font-size: 14px; line-height: 22px; color: #94A3B8;">
                      Enter the 6-digit verification code below to sign in to your RideShare account.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 28px;">
                    <div style="background-color: #1C1F28; border: 1.5px solid rgba(16, 185, 129, 0.3); border-radius: 16px; padding: 18px 32px; display: inline-block;">
                      <span style="font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #10B981; font-family: monospace;">${message.code}</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <p style="margin: 0; font-size: 13px; color: #64748B;">
                      This code is valid for <strong>${minutes} minutes</strong>. For your security, do not share this code with anyone.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px;">
                    <p style="margin: 0; font-size: 11px; line-height: 16px; color: #64748B;">
                      RideShare Nigeria • Safe, verified carpooling across all 36 states & FCT Abuja.<br/>
                      If you did not request this verification code, please ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const info = await this.transporter.sendMail({
      from: fromAddress,
      to: recipient,
      subject: `Your RideShare Code: ${message.code}`,
      text: `Your RideShare verification code is: ${message.code}. It expires in ${minutes} minutes.`,
      html: htmlContent,
    });

    console.log(`[GmailSmtpOtpDelivery] Verification code ${message.code} sent to ${recipient} (id: ${info.messageId})`);
    return `smtp:${info.messageId}`;
  }
}

function providerDelivery(
  provider: "console" | "termii" | "africastalking",
  config: AppConfig,
): OtpDelivery {
  if (provider === "termii") {
    return new TermiiOtpDelivery(config);
  }
  if (provider === "africastalking") {
    return new AfricasTalkingOtpDelivery(config);
  }
  return new DevelopmentOtpDelivery();
}

export class HybridOtpDelivery extends OtpDelivery {
  private emailDelivery?: GmailSmtpOtpDelivery;
  private primarySms: OtpDelivery;

  constructor(private readonly config: AppConfig) {
    super();
    if (config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS) {
      this.emailDelivery = new GmailSmtpOtpDelivery(config);
    }
    const sms = providerDelivery(config.SMS_PROVIDER, config);
    if (config.SMS_FALLBACK_PROVIDER === "none") {
      this.primarySms = sms;
    } else {
      this.primarySms = new FallbackOtpDelivery(
        sms,
        providerDelivery(config.SMS_FALLBACK_PROVIDER, config),
      );
    }
  }

  async send(message: OtpMessage): Promise<string> {
    // If an email address is provided and SMTP is configured, send via Gmail SMTP
    if (message.email && this.emailDelivery) {
      try {
        const result = await this.emailDelivery.send(message);
        return result;
      } catch (err) {
        console.error("[GmailSmtpOtpDelivery] Failed to send email OTP:", err);
      }
    }

    // Otherwise, try SMS delivery
    try {
      return await this.primarySms.send(message);
    } catch (smsError) {
      // If SMS fails and we have email delivery with default SMTP user, send email copy
      if (this.emailDelivery && this.config.SMTP_USER) {
        return await this.emailDelivery.send({
          ...message,
          email: this.config.SMTP_USER,
        });
      }
      throw smsError;
    }
  }
}

export function createOtpDelivery(config: AppConfig): OtpDelivery {
  return new HybridOtpDelivery(config);
}
