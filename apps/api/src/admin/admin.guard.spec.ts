import { UserRole, UserStatus } from "@commuteshare/database";
import { type ExecutionContext, ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { DatabaseService } from "../infrastructure/database.service.js";
import { AdminGuard } from "./admin.guard.js";

function context(): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ auth: { userId: "operator-id" } }),
    }),
  } as unknown as ExecutionContext;
}

describe("AdminGuard", () => {
  it("allows active reviewers and administrators", async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValueOnce({
        role: UserRole.REVIEWER,
        status: UserStatus.ACTIVE,
      })
      .mockResolvedValueOnce({
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      });
    const guard = new AdminGuard({
      client: { user: { findUnique } },
    } as unknown as DatabaseService);

    await expect(guard.canActivate(context())).resolves.toBe(true);
    await expect(guard.canActivate(context())).resolves.toBe(true);
  });

  it("rejects ordinary and inactive users", async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValueOnce({ role: UserRole.USER, status: UserStatus.ACTIVE })
      .mockResolvedValueOnce({
        role: UserRole.ADMIN,
        status: UserStatus.SUSPENDED,
      });
    const guard = new AdminGuard({
      client: { user: { findUnique } },
    } as unknown as DatabaseService);

    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
