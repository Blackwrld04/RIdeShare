import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  API_HOST: z.string().min(1).default("0.0.0.0"),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  REDIS_URL: z.string().url().startsWith("redis://"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug"])
    .default("info"),
});

export type AppConfig = z.infer<typeof environmentSchema>;

export function loadConfig(environment: NodeJS.ProcessEnv): AppConfig {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    throw new Error(z.prettifyError(result.error));
  }

  return result.data;
}
