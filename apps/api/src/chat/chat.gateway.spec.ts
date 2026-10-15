import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { TokenService } from "../auth/token.service.js";
import type { DatabaseService } from "../infrastructure/database.service.js";
import { ChatGateway } from "./chat.gateway.js";
import type { ChatService } from "./chat.service.js";

describe("realtime chat", () => {
  it("rejects sockets without an access token", async () => {
    const client = {
      handshake: { auth: {}, headers: {} },
      data: {},
    };
    const gateway = new ChatGateway(
      {} as TokenService,
      {} as DatabaseService,
      {} as ChatService,
    );
    const server = { use: vi.fn() };
    gateway.afterInit(server as never);
    const middleware = server.use.mock.calls[0]?.[0];
    const next = vi.fn();
    await middleware(client, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it("authenticates sockets against an active session", async () => {
    const userId = randomUUID();
    const sessionId = randomUUID();
    const tokens = {
      verifyAccessToken: vi.fn().mockResolvedValue({ userId, sessionId }),
    };
    const database = {
      client: {
        authSession: {
          findFirst: vi.fn().mockResolvedValue({ id: sessionId }),
        },
      },
    };
    const client = {
      handshake: { auth: { token: "access-token" }, headers: {} },
      data: {},
    };
    const gateway = new ChatGateway(
      tokens as unknown as TokenService,
      database as unknown as DatabaseService,
      {} as ChatService,
    );
    const server = { use: vi.fn() };
    gateway.afterInit(server as never);
    const middleware = server.use.mock.calls[0]?.[0];
    const next = vi.fn();
    await middleware(client, next);
    expect(client.data).toEqual({ auth: { userId, sessionId } });
    expect(next).toHaveBeenCalledWith();
  });
});
