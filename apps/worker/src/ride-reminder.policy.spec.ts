import { describe, expect, it } from "vitest";
import { buildRideReminderNotifications } from "./ride-reminder.policy.js";

const ride = {
  id: "ride-id",
  departureAt: new Date("2026-10-15T07:00:00.000Z"),
  driverUserId: "driver-id",
  passengerUserIds: ["passenger-id", "passenger-id"],
  originLabel: "Yaba",
  destinationLabel: "Marina",
};

describe("ride reminder policy", () => {
  it("creates idempotent reminders for unique participants", () => {
    const notifications = buildRideReminderNotifications(
      [ride],
      new Date("2026-10-15T06:30:00.000Z"),
    );

    expect(notifications).toHaveLength(2);
    expect(notifications.map((item) => item.userId)).toEqual([
      "driver-id",
      "passenger-id",
    ]);
    expect(notifications[0]?.idempotencyKey).toContain("reminder:1h");
  });

  it("ignores rides outside the reminder window", () => {
    expect(
      buildRideReminderNotifications(
        [ride],
        new Date("2026-10-14T06:00:00.000Z"),
      ),
    ).toEqual([]);
  });
});
