import type { AppConfig } from "@commuteshare/config";

export interface OtpMessage {
  phoneE164: string;
  code: string;
  expiresInSeconds: number;
}

export abstract class OtpDelivery {
  abstract send(message: OtpMessage): Promise<void>;
}

export class DevelopmentOtpDelivery extends OtpDelivery {
  async send(): Promise<void> {
    await Promise.resolve();
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

  async send(message: OtpMessage): Promise<void> {
    const endpoint = new URL("/api/sms/send", this.config.TERMII_BASE_URL);
    const minutes = Math.ceil(message.expiresInSeconds / 60);
    const response = await this.fetchImplementation(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: this.config.TERMII_API_KEY,
        to: message.phoneE164.slice(1),
        from: this.config.TERMII_SENDER_ID,
        sms: `Your CommuteShare code is ${message.code}. It expires in ${minutes} minutes.`,
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
  }
}

export function createOtpDelivery(config: AppConfig): OtpDelivery {
  return config.SMS_PROVIDER === "termii"
    ? new TermiiOtpDelivery(config)
    : new DevelopmentOtpDelivery();
}
