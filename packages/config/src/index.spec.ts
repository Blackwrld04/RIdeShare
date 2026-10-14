import { describe, expect, it } from "vitest";
import { loadConfig } from "./index.js";

const requiredEnvironment = {
  DATABASE_URL:
    "postgresql://commuteshare:commuteshare@localhost:5432/commuteshare",
  REDIS_URL: "redis://localhost:6379",
};

describe("loadConfig", () => {
  it("applies development defaults", () => {
    expect(loadConfig(requiredEnvironment)).toEqual({
      NODE_ENV: "development",
      API_HOST: "0.0.0.0",
      API_PORT: 3000,
      DATABASE_URL: requiredEnvironment.DATABASE_URL,
      REDIS_URL: requiredEnvironment.REDIS_URL,
      LOG_LEVEL: "info",
    });
  });

  it("coerces a valid API port", () => {
    expect(
      loadConfig({ ...requiredEnvironment, API_PORT: "4100" }).API_PORT,
    ).toBe(4100);
  });

  it("rejects missing infrastructure configuration", () => {
    expect(() => loadConfig({})).toThrow("DATABASE_URL");
  });
});
