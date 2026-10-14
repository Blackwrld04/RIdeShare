import "dotenv/config";
import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker.module.js";

const logger = new Logger("WorkerBootstrap");

async function bootstrap(): Promise<void> {
  const application = await NestFactory.createApplicationContext(WorkerModule);
  application.enableShutdownHooks();
  logger.log("Worker started");
}

bootstrap().catch((error: unknown) => {
  logger.error(error);
  process.exitCode = 1;
});
