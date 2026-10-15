import "dotenv/config";
import "reflect-metadata";
import type { IncomingMessage } from "node:http";
import type { Http2ServerRequest } from "node:http2";
import { type AppConfig, loadConfig } from "@commuteshare/config";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import { HttpStatus, Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.js";
import { APP_CONFIG } from "./config.provider.js";
import { DatabaseService } from "./infrastructure/database.service.js";
import { RedisService } from "./infrastructure/redis.service.js";
import { ApiExceptionFilter } from "./shared/api-exception.filter.js";
import {
  isRateLimitExemptPath,
  resolveRequestId,
} from "./shared/api-runtime.policy.js";

const logger = new Logger("Bootstrap");

async function bootstrap(): Promise<void> {
  const bootstrapConfig = loadConfig(process.env);
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: bootstrapConfig.API_BODY_LIMIT_BYTES,
      forceCloseConnections: "idle",
      genReqId: (request: IncomingMessage | Http2ServerRequest) =>
        resolveRequestId(request.headers["x-request-id"]),
      logger:
        bootstrapConfig.NODE_ENV === "test"
          ? false
          : {
              level: bootstrapConfig.LOG_LEVEL,
              redact: {
                paths: [
                  "req.headers.authorization",
                  "req.headers.cookie",
                  "res.headers.set-cookie",
                ],
                censor: "[REDACTED]",
              },
            },
      requestIdHeader: false,
      requestTimeout: bootstrapConfig.API_REQUEST_TIMEOUT_MS,
      return503OnClosing: true,
      trustProxy:
        bootstrapConfig.TRUSTED_PROXY_CIDRS.length > 0
          ? bootstrapConfig.TRUSTED_PROXY_CIDRS
          : false,
    }),
    { rawBody: true },
  );
  const config = app.get<AppConfig>(APP_CONFIG);
  const database = app.get(DatabaseService);
  const redis = app.get(RedisService);

  try {
    await Promise.all([database.ping(), redis.ping()]);
  } catch (error) {
    await app.close();
    throw error;
  }

  app.setGlobalPrefix("api/v1");
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  await app.register(fastifyHelmet);
  await app.register(fastifyCors, {
    origin: config.CORS_ORIGINS,
    credentials: false,
    allowedHeaders: ["authorization", "content-type", "x-request-id"],
    exposedHeaders: [
      "x-request-id",
      "ratelimit-limit",
      "ratelimit-remaining",
      "ratelimit-reset",
      "retry-after",
    ],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 600,
  });
  await app.register(fastifyRateLimit, {
    global: true,
    max: config.API_RATE_LIMIT_MAX,
    timeWindow: config.API_RATE_LIMIT_WINDOW_SECONDS * 1_000,
    redis: redis.connection,
    nameSpace: "commuteshare-rate-limit-",
    allowList: (request) => isRateLimitExemptPath(request.url),
    enableDraftSpec: true,
    errorResponseBuilder: (request, context) => ({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      code: "RATE_LIMITED",
      error: "Too Many Requests",
      message: "Request rate limit exceeded",
      details: {
        retryAfterSeconds: Math.max(1, Math.ceil(context.ttl / 1_000)),
      },
      requestId: request.id,
      timestamp: new Date().toISOString(),
      path: request.url,
    }),
  });
  app
    .getHttpAdapter()
    .getInstance()
    .addHook("onRequest", async (request, reply) => {
      reply.header("x-request-id", request.id);
      reply.header("cache-control", "no-store");
    });

  await app.listen(config.API_PORT, config.API_HOST);
  logger.log(`API listening on http://${config.API_HOST}:${config.API_PORT}`);
}

bootstrap().catch((error: unknown) => {
  logger.error(error);
  process.exitCode = 1;
});
