import { ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { HealthController } from "./health.controller.js";
import type { ReadinessService } from "./infrastructure/readiness.service.js";

describe("HealthController", () => {
  it("reports API liveness", () => {
    const readiness = { check: vi.fn() } as unknown as ReadinessService;
    const controller = new HealthController(readiness);

    expect(controller.health()).toEqual({
      status: "ok",
      service: "api",
      timestamp: expect.any(String),
    });
  });

  it("reports dependency readiness", async () => {
    const report = {
      status: "ok" as const,
      checks: { database: "up" as const, redis: "up" as const },
    };
    const readiness = {
      check: vi.fn().mockResolvedValue(report),
    } as unknown as ReadinessService;
    const controller = new HealthController(readiness);

    await expect(controller.ready()).resolves.toEqual(report);
  });

  it("rejects traffic when a dependency is unavailable", async () => {
    const readiness = {
      check: vi.fn().mockResolvedValue({
        status: "error",
        checks: { database: "down", redis: "up" },
      }),
    } as unknown as ReadinessService;
    const controller = new HealthController(readiness);

    await expect(controller.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
