import type { AppConfig } from "@commuteshare/config";

export interface OtpMessage {
  phoneE164: string;
  code: string;
  expiresInSeconds: number;
}

export abstract class OtpDelivery {
  abstract send(message: OtpMessage): Promise<string>;
}

export class DevelopmentOtpDelivery extends OtpDelivery {
  async send(): Promise<string> {
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
      message: `Your CommuteShare code is ${message.code}. It expires in ${minutes} minutes.`,
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

export function createOtpDelivery(config: AppConfig): OtpDelivery {
  const primary = providerDelivery(config.SMS_PROVIDER, config);
  if (config.SMS_FALLBACK_PROVIDER === "none") {
    return primary;
  }
  return new FallbackOtpDelivery(
    primary,
    providerDelivery(config.SMS_FALLBACK_PROVIDER, config),
  );
}
