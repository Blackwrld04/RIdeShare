import "dotenv/config";
import "reflect-metadata";
import type { AppConfig } from "@commuteshare/config";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.js";
import { APP_CONFIG } from "./config.provider.js";

const logger = new Logger("Bootstrap");

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { rawBody: true },
  );
  const config = app.get<AppConfig>(APP_CONFIG);

  app.setGlobalPrefix("api/v1");
  app.enableShutdownHooks();

  await app.listen(config.API_PORT, config.API_HOST);
  logger.log(`API listening on http://${config.API_HOST}:${config.API_PORT}`);
}

bootstrap().catch((error: unknown) => {
  logger.error(error);
  process.exitCode = 1;
});
