import { describe, expect, it } from "vitest";
import { createRideSeriesSchema } from "./ride-series.schemas.js";

const route = {
  origin: { label: "Yaba", latitude: 6.5095, longitude: 3.3711 },
  destination: { label: "Marina", latitude: 6.4541, longitude: 3.3947 },
  path: [
    { latitude: 6.5095, longitude: 3.3711 },
    { latitude: 6.4541, longitude: 3.3947 },
  ],
  distanceMeters: 8_200,
  durationSeconds: 1_500,
  routingSource: "osrm",
};

describe("ride series schemas", () => {
  it("accepts a recurring route in an IANA timezone", () => {
    const result = createRideSeriesSchema.parse({
      departureTime: "07:30",
      daysOfWeek: [1, 2, 3, 4, 5],
      startsOn: "2026-10-15",
      passengerSeats: 3,
      contributionKobo: 250_000,
      route,
    });

    expect(result).toMatchObject({
      timezone: "Africa/Lagos",
      lookaheadDays: 14,
      currency: "NGN",
    });
  });

  it("rejects duplicate weekdays and incomplete geometry", () => {
    expect(
      createRideSeriesSchema.safeParse({
        departureTime: "07:30",
        daysOfWeek: [1, 1],
        startsOn: "2026-10-15",
        passengerSeats: 3,
        contributionKobo: 250_000,
        route: {
          origin: route.origin,
          destination: route.destination,
        },
      }).success,
    ).toBe(false);
  });
});
