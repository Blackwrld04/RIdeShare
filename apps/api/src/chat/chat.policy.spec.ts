import { BookingStatus, RideStatus } from "@commuteshare/database";
import { describe, expect, it } from "vitest";
import { canReadChat, canSendChatMessage } from "./chat.policy.js";

describe("chat policy", () => {
  it("allows confirmed participants to chat before and during a ride", () => {
    expect(
      canSendChatMessage(BookingStatus.CONFIRMED, RideStatus.PUBLISHED),
    ).toBe(true);
    expect(
      canSendChatMessage(BookingStatus.IN_PROGRESS, RideStatus.IN_PROGRESS),
    ).toBe(true);
  });

  it("makes completed and cancelled conversations read only", () => {
    expect(canReadChat(BookingStatus.COMPLETED)).toBe(true);
    expect(canReadChat(BookingStatus.CANCELLED)).toBe(true);
    expect(
      canSendChatMessage(BookingStatus.COMPLETED, RideStatus.COMPLETED),
    ).toBe(false);
    expect(
      canSendChatMessage(BookingStatus.CANCELLED, RideStatus.CANCELLED),
    ).toBe(false);
  });
});
