import { BookingStatus, RideStatus } from "@commuteshare/database";
import { describe, expect, it } from "vitest";
import {
  canCreateTripShare,
  canRecordTripLocation,
  canTriggerSos,
  isSafetyParticipant,
} from "./safety.policy.js";

describe("safety policy", () => {
  it("limits passenger access to confirmed trip participants", () => {
    expect(isSafetyParticipant(false, BookingStatus.CONFIRMED)).toBe(true);
    expect(isSafetyParticipant(false, BookingStatus.PENDING)).toBe(false);
    expect(isSafetyParticipant(true, null)).toBe(true);
  });

  it("limits live location to trips in progress", () => {
    expect(canRecordTripLocation(RideStatus.IN_PROGRESS)).toBe(true);
    expect(canRecordTripLocation(RideStatus.PUBLISHED)).toBe(false);
    expect(canCreateTripShare(RideStatus.PUBLISHED)).toBe(true);
  });

  it("opens the SOS window around departure and during a trip", () => {
    const now = new Date("2026-10-15T08:00:00.000Z");
    expect(
      canTriggerSos(
        RideStatus.PUBLISHED,
        new Date("2026-10-15T09:00:00.000Z"),
        now,
      ),
    ).toBe(true);
    expect(
      canTriggerSos(
        RideStatus.PUBLISHED,
        new Date("2026-10-15T12:00:00.000Z"),
        now,
      ),
    ).toBe(false);
    expect(canTriggerSos(RideStatus.IN_PROGRESS, now, now)).toBe(true);
  });
});
