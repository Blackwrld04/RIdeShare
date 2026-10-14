import { describe, expect, it } from "vitest";
import {
  listChatMessagesSchema,
  sendChatMessageSchema,
} from "./chat.schemas.js";

describe("chat schemas", () => {
  it("normalizes message pagination", () => {
    expect(listChatMessagesSchema.parse({ limit: "25" })).toEqual({
      limit: 25,
    });
  });

  it("trims messages and requires an idempotency key", () => {
    expect(
      sendChatMessageSchema.parse({
        clientMessageId: "7ac8b51a-4156-4fcf-83ac-fb5f0fe6faba",
        body: "  I am at the pickup point  ",
      }),
    ).toEqual({
      clientMessageId: "7ac8b51a-4156-4fcf-83ac-fb5f0fe6faba",
      body: "I am at the pickup point",
    });
  });
});
