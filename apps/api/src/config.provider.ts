import { type AppConfig, loadConfig } from "@commuteshare/config";
import type { Provider } from "@nestjs/common";

export const APP_CONFIG = Symbol("APP_CONFIG");

export const appConfigProvider: Provider<AppConfig> = {
  provide: APP_CONFIG,
  useFactory: () => loadConfig(process.env),
};
