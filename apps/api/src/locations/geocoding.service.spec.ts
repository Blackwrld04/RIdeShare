import { loadConfig } from "@commuteshare/config";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RedisService } from "../infrastructure/redis.service.js";
import { GeocodingService } from "./geocoding.service.js";

const config = loadConfig({
  DATABASE_URL: "postgresql://commuteshare:commuteshare@localhost/commuteshare",
  REDIS_URL: "redis://localhost:6379",
  AUTH_ACCESS_TOKEN_SECRET: "a".repeat(32),
  AUTH_REFRESH_TOKEN_SECRET: "b".repeat(32),
  OTP_HMAC_SECRET: "c".repeat(32),
  OTP_DEV_CODE: "000000",
  NINJA_PUBLIC_KEY: "ninja-public-key",
  NINJA_SECRET_KEY: "ninja-secret-key",
  IDENTITY_ENCRYPTION_KEY: "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
  IDENTITY_HMAC_SECRET: "identity-hmac-secret-change-me-0001",
  PAYSTACK_SECRET_KEY: "sk_test_commuteshare_local",
  STORAGE_BUCKET: "commuteshare-private",
  STORAGE_ACCESS_KEY_ID: "commuteshare",
  STORAGE_SECRET_ACCESS_KEY: "commuteshare-local-secret",
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GeocodingService", () => {
  it("maps and caches an explicit Nigerian place search", async () => {
    const connection = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
    };
    const redis = {
      ping: vi.fn().mockResolvedValue(undefined),
      connection,
    } as unknown as RedisService;
    const fetchImplementation = vi.fn().mockResolvedValue(
      Response.json([
        {
          osm_type: "node",
          osm_id: 123,
          display_name: "Yaba Bus Terminal, Lagos, Nigeria",
          lat: "6.5095",
          lon: "3.3711",
          category: "amenity",
          type: "bus_station",
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchImplementation);
    const geocoding = new GeocodingService(config, redis);

    await expect(
      geocoding.search({ q: "Yaba Bus Terminal", limit: 5 }),
    ).resolves.toEqual([
      {
        source: "openstreetmap",
        externalId: "node:123",
        label: "Yaba Bus Terminal, Lagos, Nigeria",
        latitude: 6.5095,
        longitude: 3.3711,
        category: "amenity",
        type: "bus_station",
      },
    ]);

    const [url, request] = fetchImplementation.mock.calls[0] ?? [];
    expect(String(url)).toContain("countrycodes=ng");
    expect(request?.headers).toMatchObject({
      "User-Agent": "CommuteShare/1.0",
    });
    expect(connection.set).toHaveBeenCalledTimes(2);
  });

  it("fails closed when the upstream request lock is held", async () => {
    const redis = {
      ping: vi.fn().mockResolvedValue(undefined),
      connection: {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(null),
      },
    } as unknown as RedisService;
    const fetchImplementation = vi.fn();
    vi.stubGlobal("fetch", fetchImplementation);
    const geocoding = new GeocodingService(config, redis);

    await expect(
      geocoding.search({ q: "Yaba Bus Terminal", limit: 5 }),
    ).rejects.toMatchObject({ status: 429 });
    expect(fetchImplementation).not.toHaveBeenCalled();
  });
});
